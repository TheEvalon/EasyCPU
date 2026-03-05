"use strict";

const Assembler = (() => {

    const REGISTERS_8 = ['al','ah','bl','bh','cl','ch','dl','dh'];
    const REGISTERS_16 = ['ax','bx','cx','dx','sp','bp','si','di','ds','ss','cs','es','ip'];
    const ALL_REGISTERS = [...REGISTERS_8, ...REGISTERS_16];

    const MNEMONICS = [
        'mov','add','sub','inc','dec','cmp','and','or','not','xor',
        'rol','ror','shl','shr','jmp','jz','jnz','jc','jnc','je','jne',
        'js','jns','jg','jge','jl','jle','ja','jae','jb','jbe','jo','jno',
        'jnle','jnl','jnge','jng','jnbe','jna',
        'call','ret','iret','int','in','out','push','pop','nop',
        'mul','div','neg','test','xchg','lea','cbw','cwd',
        'stc','clc','cmc','std','cld','cli','sti','hlt',
        'loop','loope','loopne','loopz','loopnz',
        'movsb','cmpsb','lodsb','stosb','scasb',
        'rep','repe','repne','repz','repnz',
        'xlatb','lahf','sahf'
    ];

    const DIRECTIVES = ['.model','.stack','.data','.code','equ','db','dw','dd','end','org'];

    function isRegister8(s) { return REGISTERS_8.includes(s.toLowerCase()); }
    function isRegister16(s) { return REGISTERS_16.includes(s.toLowerCase()); }
    function isRegister(s) { return ALL_REGISTERS.includes(s.toLowerCase()); }

    function parseNumber(s) {
        if (s == null) return NaN;
        s = s.trim();
        if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
        if (/^[0-9a-fA-F]+h$/i.test(s)) {
            let hex = s.slice(0, -1);
            return parseInt(hex, 16);
        }
        if (/^[01]+b$/i.test(s)) return parseInt(s.slice(0, -1), 2);
        if (/^[0-9]+d?$/i.test(s)) return parseInt(s.replace(/d$/i, ''), 10);
        return NaN;
    }

    function parseOperand(token, labels, equates, dataSegAddr) {
        if (token == null || token === '') return null;
        let t = token.trim();
        let tl = t.toLowerCase();

        if (tl === '@data') {
            return { type: 'immediate', value: dataSegAddr, size: 16 };
        }

        if (isRegister8(tl)) {
            return { type: 'register', reg: tl, size: 8 };
        }
        if (isRegister16(tl)) {
            return { type: 'register', reg: tl, size: 16 };
        }

        let segOverride = null;
        let tokenClean = t;
        let segMatch = t.match(/^([a-zA-Z]{2})\s*:\s*(.+)$/);
        if (segMatch && ['ds','ss','cs','es'].includes(segMatch[1].toLowerCase())) {
            segOverride = segMatch[1].toLowerCase();
            tokenClean = segMatch[2].trim();
        }

        let memMatch = tokenClean.match(/^\[(.+)\]$/);
        if (memMatch) {
            let inner = memMatch[1].trim().toLowerCase();
            if (isRegister16(inner) || isRegister8(inner)) {
                return { type: 'memory_reg', reg: inner, size: 8, segment: segOverride };
            }
            let twoRegDisp = inner.match(/^(\w+)\s*\+\s*(\w+)\s*\+\s*(.+)$/);
            if (twoRegDisp && isRegister16(twoRegDisp[1]) && isRegister16(twoRegDisp[2])) {
                let dispVal = parseNumber(twoRegDisp[3]);
                if (isNaN(dispVal) && equates[twoRegDisp[3]]) dispVal = equates[twoRegDisp[3]];
                return { type: 'memory_reg2_disp', reg: twoRegDisp[1], reg2: twoRegDisp[2], disp: dispVal || 0, size: 8, segment: segOverride };
            }
            let twoReg = inner.match(/^(\w+)\s*\+\s*(\w+)$/);
            if (twoReg && isRegister16(twoReg[1]) && isRegister16(twoReg[2])) {
                return { type: 'memory_reg2', reg: twoReg[1], reg2: twoReg[2], size: 8, segment: segOverride };
            }
            let innerWithPlus = inner.match(/^(\w+)\s*\+\s*(.+)$/);
            if (innerWithPlus) {
                let base = innerWithPlus[1];
                let disp = innerWithPlus[2];
                let dispVal = parseNumber(disp);
                if (isNaN(dispVal) && equates[disp]) dispVal = equates[disp];
                if (isNaN(dispVal) && labels[disp] !== undefined) dispVal = labels[disp];
                return { type: 'memory_reg_disp', reg: base, disp: dispVal || 0, size: 8, segment: segOverride };
            }
            let num = parseNumber(inner);
            if (isNaN(num) && equates[inner] !== undefined) num = equates[inner];
            if (!isNaN(num)) {
                return { type: 'memory_direct', address: num & 0xFFFF, size: 8, segment: segOverride };
            }
            return { type: 'memory_direct', address: 0, size: 8, segment: segOverride };
        }

        let num = parseNumber(t);
        if (!isNaN(num)) {
            let size = num > 255 ? 16 : 8;
            return { type: 'immediate', value: num, size };
        }

        if (equates[tl] !== undefined) {
            let val = equates[tl];
            return { type: 'immediate', value: val, size: val > 255 ? 16 : 8 };
        }

        if (labels[tl] !== undefined) {
            return { type: 'label', name: tl, address: labels[tl] };
        }

        return { type: 'unknown', raw: t };
    }

    function splitOperands(operandStr) {
        if (!operandStr || !operandStr.trim()) return [];
        let result = [];
        let depth = 0;
        let current = '';
        for (let ch of operandStr) {
            if (ch === '[') depth++;
            if (ch === ']') depth--;
            if (ch === ',' && depth === 0) {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        if (current.trim()) result.push(current.trim());
        return result;
    }

    function assemble(source) {
        const lines = source.split('\n');
        const errors = [];
        const labels = {};
        const equates = {};
        const dataBytes = [];
        let dataSegAddr = 0x1000;
        let inDataSection = false;
        let inCodeSection = false;
        let dataOffset = 0;

        // pass 1: collect labels, equates, data, calculate addresses
        let instrIndex = 0;
        const parsedLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let originalLine = line;
            let lineNum = i + 1;

            let commentIdx = line.indexOf(';');
            if (commentIdx !== -1) line = line.substring(0, commentIdx);
            line = line.trim();
            if (!line) {
                parsedLines.push({ lineNum, original: originalLine, type: 'empty' });
                continue;
            }

            let lower = line.toLowerCase();

            if (lower === '.data') {
                inDataSection = true;
                inCodeSection = false;
                parsedLines.push({ lineNum, original: originalLine, type: 'directive', directive: '.data' });
                continue;
            }
            if (lower === '.code') {
                inDataSection = false;
                inCodeSection = true;
                parsedLines.push({ lineNum, original: originalLine, type: 'directive', directive: '.code' });
                continue;
            }
            if (lower.startsWith('.model') || lower.startsWith('.stack') || lower === 'end') {
                parsedLines.push({ lineNum, original: originalLine, type: 'directive', directive: lower.split(/\s/)[0] });
                continue;
            }

            // EQU directive
            let equMatch = line.match(/^(\w+)\s+equ\s+(.+)$/i);
            if (equMatch) {
                let name = equMatch[1].toLowerCase();
                let val = parseNumber(equMatch[2].trim());
                if (isNaN(val)) val = equMatch[2].trim().charCodeAt(0);
                equates[name] = val;
                parsedLines.push({ lineNum, original: originalLine, type: 'equ', name, value: val });
                continue;
            }

            // DB directive in data section
            if (inDataSection) {
                let dbMatch = line.match(/^(\w+)\s+db\s+(.+)$/i);
                if (dbMatch) {
                    let name = dbMatch[1].toLowerCase();
                    let valStr = dbMatch[2].trim();
                    let val = parseNumber(valStr);
                    if (!isNaN(val)) {
                        labels[name] = dataOffset;
                        dataBytes[dataOffset] = val & 0xFF;
                        dataOffset++;
                    }
                    parsedLines.push({ lineNum, original: originalLine, type: 'data', name });
                    continue;
                }
                let dbOnly = line.match(/^db\s+(.+)$/i);
                if (dbOnly) {
                    let vals = dbOnly[1].split(',');
                    for (let v of vals) {
                        let n = parseNumber(v.trim());
                        if (!isNaN(n)) {
                            dataBytes[dataOffset] = n & 0xFF;
                            dataOffset++;
                        }
                    }
                    parsedLines.push({ lineNum, original: originalLine, type: 'data' });
                    continue;
                }
            }

            // Check for label
            let label = null;
            let labelMatch = line.match(/^(\w+)\s*:\s*(.*)$/);
            if (labelMatch) {
                label = labelMatch[1].toLowerCase();
                line = labelMatch[2].trim();
                labels[label] = instrIndex;
            }

            if (!line) {
                parsedLines.push({ lineNum, original: originalLine, type: 'label', label });
                continue;
            }

            let parts = line.match(/^(\w+)(?:\s+(.*))?$/);
            if (!parts) {
                errors.push({ line: lineNum, message: `Syntax error: "${line}"` });
                parsedLines.push({ lineNum, original: originalLine, type: 'error' });
                continue;
            }

            let mnemonic = parts[1].toLowerCase();
            let operandStr = parts[2] ? parts[2].trim() : '';

            if (DIRECTIVES.includes(mnemonic) || mnemonic === '.model' || mnemonic === '.stack') {
                parsedLines.push({ lineNum, original: originalLine, type: 'directive', directive: mnemonic });
                continue;
            }

            if (!MNEMONICS.includes(mnemonic)) {
                if (label) {
                    // The "mnemonic" might actually be part of an instruction attached to label
                    // re-parse the whole rest
                    let fullRest = labelMatch ? (labelMatch[1] + ': ' + mnemonic + ' ' + operandStr).trim() : line;
                }
                if (!MNEMONICS.includes(mnemonic)) {
                    errors.push({ line: lineNum, message: `Unknown instruction: "${mnemonic}"` });
                    parsedLines.push({ lineNum, original: originalLine, type: 'error' });
                    continue;
                }
            }

            parsedLines.push({
                lineNum,
                original: originalLine,
                type: 'instruction',
                label,
                mnemonic,
                operandStr,
                index: instrIndex
            });
            instrIndex++;
        }

        // pass 2: resolve operands
        const instructions = [];
        for (let pl of parsedLines) {
            if (pl.type !== 'instruction') continue;

            let ops = splitOperands(pl.operandStr);
            let operands = ops.map(o => parseOperand(o, labels, equates, dataSegAddr));

            for (let op of operands) {
                if (op && op.type === 'unknown') {
                    let name = op.raw.toLowerCase();
                    if (labels[name] !== undefined) {
                        op.type = 'label';
                        op.name = name;
                        op.address = labels[name];
                    } else if (equates[name] !== undefined) {
                        op.type = 'immediate';
                        op.value = equates[name];
                        op.size = equates[name] > 255 ? 16 : 8;
                    } else {
                        errors.push({ line: pl.lineNum, message: `Unknown symbol: "${op.raw}"` });
                    }
                }
            }

            instructions.push({
                index: pl.index,
                mnemonic: pl.mnemonic,
                operands,
                sourceLine: pl.lineNum,
                label: pl.label
            });
        }

        // Build line-to-instruction mapping
        const lineMap = {};
        for (let instr of instructions) {
            lineMap[instr.sourceLine] = instr.index;
        }
        const indexToLine = {};
        for (let instr of instructions) {
            indexToLine[instr.index] = instr.sourceLine;
        }

        return {
            instructions,
            labels,
            equates,
            dataBytes,
            dataSegAddr,
            lineMap,
            indexToLine,
            errors
        };
    }

    return { assemble, parseNumber };
})();
