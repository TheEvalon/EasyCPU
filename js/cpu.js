"use strict";

const CPU = (() => {
    let regs = {};
    let flags = {};
    let memory = null;
    let ioPorts = {};
    let program = null;
    let halted = false;
    let maxSteps = 100000;
    let stepCount = 0;
    let onPortWrite = null;
    let onPortRead = null;
    let onHalt = null;
    let audioCtx = null;
    let directionFlag = 0;

    function init() {
        regs = {
            ax: 0, bx: 0, cx: 0, dx: 0,
            sp: 0x0100, bp: 0, si: 0, di: 0,
            ip: 0,
            ds: 0x1000, ss: 0x2000, cs: 0x0000, es: 0x0000
        };
        flags = { cf: 0, zf: 0, sf: 0, of: 0, pf: 0, af: 0 };
        memory = new Uint8Array(65536);
        ioPorts = {};
        halted = false;
        stepCount = 0;
        directionFlag = 0;
    }

    function loadProgram(assembled) {
        program = assembled;
        regs.ip = 0;
        regs.ds = assembled.dataSegAddr & 0xFFFF;
        halted = false;
        stepCount = 0;

        for (let addr in assembled.dataBytes) {
            let physAddr = (regs.ds + parseInt(addr)) & 0xFFFF;
            memory[physAddr] = assembled.dataBytes[addr];
        }
    }

    function reset() {
        init();
        program = null;
    }

    // 8-bit register accessors
    function getReg8(name) {
        switch (name) {
            case 'al': return regs.ax & 0xFF;
            case 'ah': return (regs.ax >> 8) & 0xFF;
            case 'bl': return regs.bx & 0xFF;
            case 'bh': return (regs.bx >> 8) & 0xFF;
            case 'cl': return regs.cx & 0xFF;
            case 'ch': return (regs.cx >> 8) & 0xFF;
            case 'dl': return regs.dx & 0xFF;
            case 'dh': return (regs.dx >> 8) & 0xFF;
            default: return 0;
        }
    }

    function setReg8(name, val) {
        val = val & 0xFF;
        switch (name) {
            case 'al': regs.ax = (regs.ax & 0xFF00) | val; break;
            case 'ah': regs.ax = (regs.ax & 0x00FF) | (val << 8); break;
            case 'bl': regs.bx = (regs.bx & 0xFF00) | val; break;
            case 'bh': regs.bx = (regs.bx & 0x00FF) | (val << 8); break;
            case 'cl': regs.cx = (regs.cx & 0xFF00) | val; break;
            case 'ch': regs.cx = (regs.cx & 0x00FF) | (val << 8); break;
            case 'dl': regs.dx = (regs.dx & 0xFF00) | val; break;
            case 'dh': regs.dx = (regs.dx & 0x00FF) | (val << 8); break;
        }
    }

    function getReg16(name) {
        switch (name) {
            case 'ax': return regs.ax;
            case 'bx': return regs.bx;
            case 'cx': return regs.cx;
            case 'dx': return regs.dx;
            case 'sp': return regs.sp;
            case 'bp': return regs.bp;
            case 'si': return regs.si;
            case 'di': return regs.di;
            case 'ip': return regs.ip;
            case 'ds': return regs.ds;
            case 'ss': return regs.ss;
            case 'cs': return regs.cs;
            case 'es': return regs.es;
            default: return 0;
        }
    }

    function setReg16(name, val) {
        val = val & 0xFFFF;
        switch (name) {
            case 'ax': regs.ax = val; break;
            case 'bx': regs.bx = val; break;
            case 'cx': regs.cx = val; break;
            case 'dx': regs.dx = val; break;
            case 'sp': regs.sp = val; break;
            case 'bp': regs.bp = val; break;
            case 'si': regs.si = val; break;
            case 'di': regs.di = val; break;
            case 'ip': regs.ip = val; break;
            case 'ds': regs.ds = val; break;
            case 'ss': regs.ss = val; break;
            case 'cs': regs.cs = val; break;
            case 'es': regs.es = val; break;
        }
    }

    function getRegValue(op) {
        if (op.size === 8) return getReg8(op.reg);
        return getReg16(op.reg);
    }

    function setRegValue(op, val) {
        if (op.size === 8) setReg8(op.reg, val);
        else setReg16(op.reg, val);
    }

    function getSegBase(op) {
        if (op.segment) return getReg16(op.segment);
        if (op.reg === 'bp' || op.reg === 'sp') return regs.ss;
        return regs.ds;
    }

    function effectiveAddress(op) {
        let seg = getSegBase(op);
        if (op.type === 'memory_direct') return (seg + op.address) & 0xFFFF;
        if (op.type === 'memory_reg') {
            let base = getReg16(op.reg) || getReg8(op.reg);
            return (seg + base) & 0xFFFF;
        }
        if (op.type === 'memory_reg_disp') {
            let base = getReg16(op.reg) || getReg8(op.reg);
            return (seg + base + op.disp) & 0xFFFF;
        }
        if (op.type === 'memory_reg2') {
            return (seg + getReg16(op.reg) + getReg16(op.reg2)) & 0xFFFF;
        }
        if (op.type === 'memory_reg2_disp') {
            return (seg + getReg16(op.reg) + getReg16(op.reg2) + op.disp) & 0xFFFF;
        }
        return 0;
    }

    function readMem(op) {
        let addr = effectiveAddress(op);
        return memory[addr] || 0;
    }

    function writeMem(op, val) {
        let addr = effectiveAddress(op);
        memory[addr] = val & 0xFF;
    }

    function getValue(op) {
        if (!op) return 0;
        switch (op.type) {
            case 'register': return getRegValue(op);
            case 'immediate': return op.value;
            case 'memory_direct':
            case 'memory_reg':
            case 'memory_reg_disp':
            case 'memory_reg2':
            case 'memory_reg2_disp':
                return readMem(op);
            case 'label': return op.address;
            default: return 0;
        }
    }

    function setValue(op, val) {
        if (!op) return;
        switch (op.type) {
            case 'register': setRegValue(op, val); break;
            case 'memory_direct':
            case 'memory_reg':
            case 'memory_reg_disp':
            case 'memory_reg2':
            case 'memory_reg2_disp':
                writeMem(op, val); break;
        }
    }

    function getOperandSize(op) {
        if (!op) return 8;
        if (op.size) return op.size;
        if (op.type === 'register') return op.size;
        return 8;
    }

    function parity(val) {
        val = val & 0xFF;
        let bits = 0;
        while (val) { bits += val & 1; val >>= 1; }
        return (bits % 2 === 0) ? 1 : 0;
    }

    function updateFlags8(result, op1, op2, isSub) {
        let r = result & 0xFF;
        flags.zf = (r === 0) ? 1 : 0;
        flags.sf = (r & 0x80) ? 1 : 0;
        flags.pf = parity(r);

        if (isSub) {
            flags.cf = (result < 0 || result > 0xFF) ? 1 : 0;
            let s1 = (op1 & 0x80) ? op1 - 256 : op1;
            let s2 = (op2 & 0x80) ? op2 - 256 : op2;
            let sr = s1 - s2;
            flags.of = (sr < -128 || sr > 127) ? 1 : 0;
            flags.af = ((op1 & 0x0F) < (op2 & 0x0F)) ? 1 : 0;
        } else {
            flags.cf = (result > 0xFF) ? 1 : 0;
            let s1 = (op1 & 0x80) ? op1 - 256 : op1;
            let s2 = (op2 & 0x80) ? op2 - 256 : op2;
            let sr = s1 + s2;
            flags.of = (sr < -128 || sr > 127) ? 1 : 0;
            flags.af = ((op1 & 0x0F) + (op2 & 0x0F) > 0x0F) ? 1 : 0;
        }
    }

    function updateFlags16(result, op1, op2, isSub) {
        let r = result & 0xFFFF;
        flags.zf = (r === 0) ? 1 : 0;
        flags.sf = (r & 0x8000) ? 1 : 0;
        flags.pf = parity(r & 0xFF);

        if (isSub) {
            flags.cf = (result < 0 || result > 0xFFFF) ? 1 : 0;
            let s1 = (op1 & 0x8000) ? op1 - 65536 : op1;
            let s2 = (op2 & 0x8000) ? op2 - 65536 : op2;
            let sr = s1 - s2;
            flags.of = (sr < -32768 || sr > 32767) ? 1 : 0;
        } else {
            flags.cf = (result > 0xFFFF) ? 1 : 0;
            let s1 = (op1 & 0x8000) ? op1 - 65536 : op1;
            let s2 = (op2 & 0x8000) ? op2 - 65536 : op2;
            let sr = s1 + s2;
            flags.of = (sr < -32768 || sr > 32767) ? 1 : 0;
        }
        flags.af = ((op1 & 0x0F) + (op2 & 0x0F) > 0x0F) ? 1 : 0;
    }

    function updateFlagsResult8(val) {
        val = val & 0xFF;
        flags.zf = (val === 0) ? 1 : 0;
        flags.sf = (val & 0x80) ? 1 : 0;
        flags.pf = parity(val);
        flags.cf = 0;
        flags.of = 0;
    }

    function updateFlagsResult16(val) {
        val = val & 0xFFFF;
        flags.zf = (val === 0) ? 1 : 0;
        flags.sf = (val & 0x8000) ? 1 : 0;
        flags.pf = parity(val & 0xFF);
        flags.cf = 0;
        flags.of = 0;
    }

    function pushStack(val) {
        regs.sp = (regs.sp - 2) & 0xFFFF;
        let addr = (regs.ss + regs.sp) & 0xFFFF;
        memory[addr] = val & 0xFF;
        memory[(addr + 1) & 0xFFFF] = (val >> 8) & 0xFF;
    }

    function popStack() {
        let addr = (regs.ss + regs.sp) & 0xFFFF;
        let val = memory[addr] | (memory[(addr + 1) & 0xFFFF] << 8);
        regs.sp = (regs.sp + 2) & 0xFFFF;
        return val;
    }

    function portWrite(port, val) {
        ioPorts[port] = val & 0xFF;
        if (onPortWrite) onPortWrite(port, val & 0xFF);
        if (port === 0x61) {
            playSpeaker(val);
        }
    }

    function portRead(port) {
        if (onPortRead) {
            const val = onPortRead(port);
            if (val !== null && val !== undefined) return val & 0xFF;
        }
        if (ioPorts[port] !== undefined) return ioPorts[port];
        return 0;
    }

    function playSpeaker(val) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (val & 0x01) {
                let osc = audioCtx.createOscillator();
                let gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.value = 800;
                gain.gain.value = 0.1;
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.05);
            }
        } catch (e) { /* audio not available */ }
    }

    function step() {
        if (halted || !program) return { halted: true };
        if (regs.ip >= program.instructions.length) {
            halted = true;
            if (onHalt) onHalt('Program ended (no more instructions)');
            return { halted: true };
        }
        if (stepCount >= maxSteps) {
            halted = true;
            if (onHalt) onHalt('Execution limit reached (' + maxSteps + ' steps)');
            return { halted: true };
        }

        stepCount++;
        let instr = program.instructions[regs.ip];
        let op = instr.operands;
        let jumped = false;

        switch (instr.mnemonic) {
            case 'nop':
                break;

            case 'hlt':
                halted = true;
                if (onHalt) onHalt('HLT instruction');
                return { halted: true, line: instr.sourceLine };

            case 'mov': {
                let val = getValue(op[1]);
                let destSize = getOperandSize(op[0]);
                if (destSize === 16 && op[1] && op[1].size === 8 && op[1].type === 'immediate') {
                    // zero-extend 8-bit immediate to 16-bit for 16-bit dest
                }
                setValue(op[0], val);
                break;
            }

            case 'add': {
                let a = getValue(op[0]);
                let b = getValue(op[1]);
                let size = getOperandSize(op[0]);
                let result = a + b;
                if (size === 8) {
                    updateFlags8(result, a, b, false);
                    setValue(op[0], result & 0xFF);
                } else {
                    updateFlags16(result, a, b, false);
                    setValue(op[0], result & 0xFFFF);
                }
                break;
            }

            case 'sub': {
                let a = getValue(op[0]);
                let b = getValue(op[1]);
                let size = getOperandSize(op[0]);
                let result = a - b;
                if (size === 8) {
                    updateFlags8(result, a, b, true);
                    setValue(op[0], result & 0xFF);
                } else {
                    updateFlags16(result, a, b, true);
                    setValue(op[0], result & 0xFFFF);
                }
                break;
            }

            case 'inc': {
                let a = getValue(op[0]);
                let size = getOperandSize(op[0]);
                let oldCf = flags.cf;
                let result = a + 1;
                if (size === 8) {
                    updateFlags8(result, a, 1, false);
                    setValue(op[0], result & 0xFF);
                } else {
                    updateFlags16(result, a, 1, false);
                    setValue(op[0], result & 0xFFFF);
                }
                flags.cf = oldCf; // INC doesn't affect CF
                break;
            }

            case 'dec': {
                let a = getValue(op[0]);
                let size = getOperandSize(op[0]);
                let oldCf = flags.cf;
                let result = a - 1;
                if (size === 8) {
                    updateFlags8(result, a, 1, true);
                    setValue(op[0], result & 0xFF);
                } else {
                    updateFlags16(result, a, 1, true);
                    setValue(op[0], result & 0xFFFF);
                }
                flags.cf = oldCf; // DEC doesn't affect CF
                break;
            }

            case 'cmp': {
                let a = getValue(op[0]);
                let b = getValue(op[1]);
                let size = getOperandSize(op[0]);
                let result = a - b;
                if (size === 8) {
                    updateFlags8(result, a, b, true);
                } else {
                    updateFlags16(result, a, b, true);
                }
                break;
            }

            case 'and': {
                let a = getValue(op[0]);
                let b = getValue(op[1]);
                let result = a & b;
                let size = getOperandSize(op[0]);
                if (size === 8) updateFlagsResult8(result);
                else updateFlagsResult16(result);
                setValue(op[0], result);
                break;
            }

            case 'or': {
                let a = getValue(op[0]);
                let b = getValue(op[1]);
                let result = a | b;
                let size = getOperandSize(op[0]);
                if (size === 8) updateFlagsResult8(result);
                else updateFlagsResult16(result);
                setValue(op[0], result);
                break;
            }

            case 'xor': {
                let a = getValue(op[0]);
                let b = getValue(op[1]);
                let result = a ^ b;
                let size = getOperandSize(op[0]);
                if (size === 8) updateFlagsResult8(result);
                else updateFlagsResult16(result);
                setValue(op[0], result);
                break;
            }

            case 'not': {
                let a = getValue(op[0]);
                let size = getOperandSize(op[0]);
                let result = (size === 8) ? (~a) & 0xFF : (~a) & 0xFFFF;
                setValue(op[0], result);
                break;
            }

            case 'neg': {
                let a = getValue(op[0]);
                let size = getOperandSize(op[0]);
                let result;
                if (size === 8) {
                    result = (-a) & 0xFF;
                    updateFlags8(256 - a, 0, a, true);
                } else {
                    result = (-a) & 0xFFFF;
                    updateFlags16(65536 - a, 0, a, true);
                }
                flags.cf = (a !== 0) ? 1 : 0;
                setValue(op[0], result);
                break;
            }

            case 'test': {
                let a = getValue(op[0]);
                let b = getValue(op[1]);
                let result = a & b;
                let size = getOperandSize(op[0]);
                if (size === 8) updateFlagsResult8(result);
                else updateFlagsResult16(result);
                break;
            }

            case 'rol': {
                let val = getValue(op[0]);
                let cnt = op[1] ? getValue(op[1]) : 1;
                let size = getOperandSize(op[0]);
                for (let i = 0; i < cnt; i++) {
                    if (size === 8) {
                        let msb = (val >> 7) & 1;
                        val = ((val << 1) | msb) & 0xFF;
                        flags.cf = msb;
                    } else {
                        let msb = (val >> 15) & 1;
                        val = ((val << 1) | msb) & 0xFFFF;
                        flags.cf = msb;
                    }
                }
                setValue(op[0], val);
                break;
            }

            case 'ror': {
                let val = getValue(op[0]);
                let cnt = op[1] ? getValue(op[1]) : 1;
                let size = getOperandSize(op[0]);
                for (let i = 0; i < cnt; i++) {
                    let lsb = val & 1;
                    if (size === 8) {
                        val = ((val >> 1) | (lsb << 7)) & 0xFF;
                    } else {
                        val = ((val >> 1) | (lsb << 15)) & 0xFFFF;
                    }
                    flags.cf = lsb;
                }
                setValue(op[0], val);
                break;
            }

            case 'shl': {
                let val = getValue(op[0]);
                let cnt = op[1] ? getValue(op[1]) : 1;
                let size = getOperandSize(op[0]);
                for (let i = 0; i < cnt; i++) {
                    flags.cf = (size === 8) ? ((val >> 7) & 1) : ((val >> 15) & 1);
                    val = (size === 8) ? (val << 1) & 0xFF : (val << 1) & 0xFFFF;
                }
                if (size === 8) updateFlagsResult8(val);
                else updateFlagsResult16(val);
                setValue(op[0], val);
                break;
            }

            case 'shr': {
                let val = getValue(op[0]);
                let cnt = op[1] ? getValue(op[1]) : 1;
                for (let i = 0; i < cnt; i++) {
                    flags.cf = val & 1;
                    val = val >> 1;
                }
                let size = getOperandSize(op[0]);
                if (size === 8) updateFlagsResult8(val);
                else updateFlagsResult16(val);
                setValue(op[0], val);
                break;
            }

            case 'jmp': {
                let target = op[0];
                if (target.type === 'label') {
                    regs.ip = target.address;
                } else {
                    regs.ip = getValue(target);
                }
                jumped = true;
                break;
            }

            case 'jz': case 'je': {
                if (flags.zf === 1) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jnz': case 'jne': {
                if (flags.zf === 0) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jc': case 'jb': {
                if (flags.cf === 1) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jnc': case 'jae': {
                if (flags.cf === 0) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'js': {
                if (flags.sf === 1) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jns': {
                if (flags.sf === 0) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jo': {
                if (flags.of === 1) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jno': {
                if (flags.of === 0) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jg': case 'jnle': {
                if (flags.zf === 0 && flags.sf === flags.of) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jge': case 'jnl': {
                if (flags.sf === flags.of) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jl': case 'jnge': {
                if (flags.sf !== flags.of) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jle': case 'jng': {
                if (flags.zf === 1 || flags.sf !== flags.of) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'ja': case 'jnbe': {
                if (flags.cf === 0 && flags.zf === 0) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'jbe': case 'jna': {
                if (flags.cf === 1 || flags.zf === 1) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'call': {
                let target = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                pushStack(regs.ip + 1);
                regs.ip = target;
                jumped = true;
                break;
            }

            case 'ret': {
                regs.ip = popStack();
                jumped = true;
                break;
            }

            case 'int': {
                let intNum = getValue(op[0]);
                if (intNum === 0x21) {
                    let ah = getReg8('ah');
                    if (ah === 0x4C) {
                        halted = true;
                        if (onHalt) onHalt('Program terminated (INT 21h, AH=4Ch)');
                        return { halted: true, line: instr.sourceLine };
                    }
                }
                break;
            }

            case 'iret': {
                regs.ip = popStack();
                let flagsWord = popStack();
                flags.cf = flagsWord & 1;
                flags.pf = (flagsWord >> 2) & 1;
                flags.af = (flagsWord >> 4) & 1;
                flags.zf = (flagsWord >> 6) & 1;
                flags.sf = (flagsWord >> 7) & 1;
                flags.of = (flagsWord >> 11) & 1;
                jumped = true;
                break;
            }

            case 'push': {
                let val = getValue(op[0]);
                if (getOperandSize(op[0]) === 8) val = val & 0xFF;
                pushStack(val);
                break;
            }

            case 'pop': {
                let val = popStack();
                setValue(op[0], val);
                break;
            }

            case 'in': {
                let port;
                if (op[1].type === 'register') {
                    port = getValue(op[1]);
                } else {
                    port = getValue(op[1]);
                }
                let val = portRead(port);
                setValue(op[0], val);
                break;
            }

            case 'out': {
                let port;
                if (op[0].type === 'register') {
                    port = getValue(op[0]);
                } else {
                    port = getValue(op[0]);
                }
                let val = getValue(op[1]);
                portWrite(port, val);
                break;
            }

            case 'xchg': {
                let a = getValue(op[0]);
                let b = getValue(op[1]);
                setValue(op[0], b);
                setValue(op[1], a);
                break;
            }

            case 'mul': {
                let val = getValue(op[0]);
                let al = getReg8('al');
                let result = al * val;
                regs.ax = result & 0xFFFF;
                flags.cf = flags.of = (result > 0xFF) ? 1 : 0;
                break;
            }

            case 'div': {
                let val = getValue(op[0]);
                if (val === 0) {
                    halted = true;
                    if (onHalt) onHalt('Division by zero!');
                    return { halted: true, line: instr.sourceLine };
                }
                let ax = regs.ax;
                let quotient = Math.floor(ax / val) & 0xFF;
                let remainder = (ax % val) & 0xFF;
                setReg8('al', quotient);
                setReg8('ah', remainder);
                break;
            }

            case 'cbw': {
                let al = getReg8('al');
                regs.ax = (al & 0x80) ? (0xFF00 | al) : al;
                break;
            }

            case 'cwd': {
                regs.dx = (regs.ax & 0x8000) ? 0xFFFF : 0;
                break;
            }

            case 'lea': {
                if (op[1]) {
                    let addr = op[1].address || 0;
                    if (op[1].type === 'memory_reg') addr = getReg16(op[1].reg);
                    if (op[1].type === 'memory_reg_disp') addr = getReg16(op[1].reg) + (op[1].disp || 0);
                    setValue(op[0], addr & 0xFFFF);
                }
                break;
            }

            case 'stc': flags.cf = 1; break;
            case 'clc': flags.cf = 0; break;
            case 'cmc': flags.cf = flags.cf ? 0 : 1; break;
            case 'std': directionFlag = 1; break;
            case 'cld': directionFlag = 0; break;
            case 'cli': break;
            case 'sti': break;

            case 'loop': {
                regs.cx = (regs.cx - 1) & 0xFFFF;
                if (regs.cx !== 0) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'loope': case 'loopz': {
                regs.cx = (regs.cx - 1) & 0xFFFF;
                if (regs.cx !== 0 && flags.zf === 1) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'loopne': case 'loopnz': {
                regs.cx = (regs.cx - 1) & 0xFFFF;
                if (regs.cx !== 0 && flags.zf === 0) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            case 'movsb': {
                let srcAddr = (regs.ds + regs.si) & 0xFFFF;
                let dstAddr = (regs.es + regs.di) & 0xFFFF;
                memory[dstAddr] = memory[srcAddr];
                let delta = directionFlag ? -1 : 1;
                regs.si = (regs.si + delta) & 0xFFFF;
                regs.di = (regs.di + delta) & 0xFFFF;
                break;
            }

            case 'lodsb': {
                let srcAddr = (regs.ds + regs.si) & 0xFFFF;
                setReg8('al', memory[srcAddr]);
                regs.si = (regs.si + (directionFlag ? -1 : 1)) & 0xFFFF;
                break;
            }

            case 'stosb': {
                let dstAddr = (regs.es + regs.di) & 0xFFFF;
                memory[dstAddr] = getReg8('al');
                regs.di = (regs.di + (directionFlag ? -1 : 1)) & 0xFFFF;
                break;
            }

            case 'cmpsb': {
                let a = memory[(regs.ds + regs.si) & 0xFFFF];
                let b = memory[(regs.es + regs.di) & 0xFFFF];
                updateFlags8(a - b, a, b, true);
                let delta = directionFlag ? -1 : 1;
                regs.si = (regs.si + delta) & 0xFFFF;
                regs.di = (regs.di + delta) & 0xFFFF;
                break;
            }

            case 'scasb': {
                let al = getReg8('al');
                let b = memory[(regs.es + regs.di) & 0xFFFF];
                updateFlags8(al - b, al, b, true);
                regs.di = (regs.di + (directionFlag ? -1 : 1)) & 0xFFFF;
                break;
            }

            case 'rep': case 'repe': case 'repz': case 'repne': case 'repnz': {
                let nextIp = regs.ip + 1;
                if (nextIp < program.instructions.length) {
                    let nextInstr = program.instructions[nextIp];
                    let isRepNe = (instr.mnemonic === 'repne' || instr.mnemonic === 'repnz');
                    while (regs.cx > 0) {
                        regs.cx = (regs.cx - 1) & 0xFFFF;
                        let savedIp = regs.ip;
                        regs.ip = nextIp;
                        let tmpOp = nextInstr.operands;
                        switch (nextInstr.mnemonic) {
                            case 'movsb': {
                                let s = (regs.ds + regs.si) & 0xFFFF;
                                let d = (regs.es + regs.di) & 0xFFFF;
                                memory[d] = memory[s];
                                let delta = directionFlag ? -1 : 1;
                                regs.si = (regs.si + delta) & 0xFFFF;
                                regs.di = (regs.di + delta) & 0xFFFF;
                                break;
                            }
                            case 'stosb': {
                                let d = (regs.es + regs.di) & 0xFFFF;
                                memory[d] = getReg8('al');
                                regs.di = (regs.di + (directionFlag ? -1 : 1)) & 0xFFFF;
                                break;
                            }
                            case 'lodsb': {
                                let s = (regs.ds + regs.si) & 0xFFFF;
                                setReg8('al', memory[s]);
                                regs.si = (regs.si + (directionFlag ? -1 : 1)) & 0xFFFF;
                                break;
                            }
                            case 'cmpsb': {
                                let a = memory[(regs.ds + regs.si) & 0xFFFF];
                                let b2 = memory[(regs.es + regs.di) & 0xFFFF];
                                updateFlags8(a - b2, a, b2, true);
                                let dl = directionFlag ? -1 : 1;
                                regs.si = (regs.si + dl) & 0xFFFF;
                                regs.di = (regs.di + dl) & 0xFFFF;
                                if (isRepNe && flags.zf === 1) { regs.cx = 0; }
                                if (!isRepNe && flags.zf === 0) { regs.cx = 0; }
                                break;
                            }
                            case 'scasb': {
                                let al = getReg8('al');
                                let b2 = memory[(regs.es + regs.di) & 0xFFFF];
                                updateFlags8(al - b2, al, b2, true);
                                regs.di = (regs.di + (directionFlag ? -1 : 1)) & 0xFFFF;
                                if (isRepNe && flags.zf === 1) { regs.cx = 0; }
                                if (!isRepNe && flags.zf === 0) { regs.cx = 0; }
                                break;
                            }
                        }
                    }
                    regs.ip = nextIp;
                    jumped = true;
                }
                break;
            }

            case 'xlatb': {
                let addr = (regs.ds + regs.bx + getReg8('al')) & 0xFFFF;
                setReg8('al', memory[addr]);
                break;
            }

            case 'lahf': {
                let val = 0;
                val |= flags.cf;
                val |= (1 << 1);
                val |= (flags.pf << 2);
                val |= (flags.af << 4);
                val |= (flags.zf << 6);
                val |= (flags.sf << 7);
                setReg8('ah', val);
                break;
            }

            case 'sahf': {
                let val = getReg8('ah');
                flags.cf = val & 1;
                flags.pf = (val >> 2) & 1;
                flags.af = (val >> 4) & 1;
                flags.zf = (val >> 6) & 1;
                flags.sf = (val >> 7) & 1;
                break;
            }

            case 'jnle': {
                if (flags.zf === 0 && flags.sf === flags.of) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }
            case 'jnl': {
                if (flags.sf === flags.of) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }
            case 'jnge': {
                if (flags.sf !== flags.of) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }
            case 'jng': {
                if (flags.zf === 1 || flags.sf !== flags.of) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }
            case 'jnbe': {
                if (flags.cf === 0 && flags.zf === 0) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }
            case 'jna': {
                if (flags.cf === 1 || flags.zf === 1) {
                    regs.ip = (op[0].type === 'label') ? op[0].address : getValue(op[0]);
                    jumped = true;
                }
                break;
            }

            default:
                break;
        }

        if (!jumped) {
            regs.ip++;
        }

        return {
            halted: halted,
            line: instr.sourceLine,
            mnemonic: instr.mnemonic
        };
    }

    function getState() {
        return {
            regs: { ...regs },
            flags: { ...flags },
            halted,
            stepCount
        };
    }

    function getMemory() { return memory; }
    function getIOPorts() { return { ...ioPorts }; }
    function isHalted() { return halted; }
    function getProgram() { return program; }

    function setInputPort(port, val) {
        ioPorts[port] = val & 0xFF;
    }

    function setOnPortWrite(cb) { onPortWrite = cb; }
    function setOnPortRead(cb) { onPortRead = cb; }
    function setOnHalt(cb) { onHalt = cb; }
    function setMaxSteps(n) { maxSteps = n; }

    function createSnapshot() {
        if (!memory) return null;
        return {
            regs: { ...regs },
            flags: { ...flags },
            mem: new Uint8Array(memory),
            ioPorts: { ...ioPorts },
            halted: halted,
            stepCount: stepCount,
            directionFlag: directionFlag
        };
    }

    function restoreSnapshot(snap) {
        if (!snap) return;
        Object.assign(regs, snap.regs);
        Object.assign(flags, snap.flags);
        memory.set(snap.mem);
        Object.assign(ioPorts, snap.ioPorts);
        halted = snap.halted;
        stepCount = snap.stepCount;
        directionFlag = snap.directionFlag || 0;
    }

    function getStackEntries(count) {
        let entries = [];
        let initSP = 0x0100;
        let sp = regs.sp;
        let ssBase = regs.ss;
        for (let addr = sp; addr < initSP && entries.length < count; addr += 2) {
            let physAddr = (ssBase + addr) & 0xFFFF;
            let val = memory[physAddr] | (memory[(physAddr + 1) & 0xFFFF] << 8);
            entries.push({ address: addr, value: val, isSP: addr === sp });
        }
        return entries;
    }

    init();

    return {
        init, loadProgram, reset, step,
        getState, getMemory, getIOPorts, isHalted, getProgram,
        setInputPort, setOnPortWrite, setOnPortRead, setOnHalt, setMaxSteps,
        getStackEntries, getReg8, getReg16, setReg8, setReg16,
        pushStack, popStack, portRead, portWrite,
        createSnapshot, restoreSnapshot
    };
})();
