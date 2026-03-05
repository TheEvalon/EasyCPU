"use strict";

const Debugger = (() => {
    const breakpoints = new Set();
    const history = [];
    const traceLog = [];
    const MAX_HISTORY = 1000;
    const MAX_TRACE = 5000;

    // ---- Breakpoints ----

    function initBreakpoints() {
        const gutter = document.getElementById('line-numbers');
        if (!gutter) return;
        gutter.addEventListener('click', (e) => {
            if (!Mode.isAdvanced()) return;
            const div = e.target.closest('#line-numbers div');
            if (!div) return;
            const idx = Array.from(gutter.children).indexOf(div);
            const lineNum = idx + 1;
            toggleBreakpoint(lineNum, div);
        });
    }

    function toggleBreakpoint(lineNum, el) {
        if (breakpoints.has(lineNum)) {
            breakpoints.delete(lineNum);
            if (el) el.classList.remove('breakpoint');
        } else {
            breakpoints.add(lineNum);
            if (el) el.classList.add('breakpoint');
        }
    }

    function isBreakpoint(lineNum) {
        return breakpoints.has(lineNum);
    }

    function clearBreakpoints() {
        breakpoints.clear();
        document.querySelectorAll('#line-numbers div.breakpoint').forEach(d => d.classList.remove('breakpoint'));
    }

    function refreshBreakpointDisplay() {
        const gutter = document.getElementById('line-numbers');
        if (!gutter) return;
        Array.from(gutter.children).forEach((div, idx) => {
            div.classList.toggle('breakpoint', breakpoints.has(idx + 1));
        });
    }

    // ---- Step Backward ----

    function pushSnapshot() {
        if (!Mode.isAdvanced()) return;
        const snap = CPU.createSnapshot();
        if (snap) {
            history.push(snap);
            if (history.length > MAX_HISTORY) history.shift();
        }
    }

    function stepBack() {
        if (history.length === 0) return false;
        const snap = history.pop();
        CPU.restoreSnapshot(snap);
        return true;
    }

    function clearHistory() {
        history.length = 0;
    }

    function hasHistory() {
        return history.length > 0;
    }

    // ---- Trace Log ----

    function recordTrace(result) {
        if (!Mode.isAdvanced()) return;
        const state = CPU.getState();
        const entry = {
            step: state.stepCount,
            ip: state.regs.ip,
            mnemonic: result.mnemonic || '?',
            line: result.line || 0,
            ax: state.regs.ax,
            bx: state.regs.bx,
            cx: state.regs.cx,
            dx: state.regs.dx,
            flags: flagsString(state.flags)
        };
        traceLog.push(entry);
        if (traceLog.length > MAX_TRACE) traceLog.shift();
        appendTraceRow(entry);
    }

    function flagsString(f) {
        let s = '';
        if (f.cf) s += 'C';
        if (f.zf) s += 'Z';
        if (f.sf) s += 'S';
        if (f.of) s += 'O';
        if (f.pf) s += 'P';
        if (f.af) s += 'A';
        return s || '-';
    }

    function appendTraceRow(entry) {
        const tbody = document.getElementById('trace-tbody');
        if (!tbody) return;
        const hex4 = v => (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        const tr = document.createElement('tr');
        tr.dataset.line = entry.line;
        tr.innerHTML =
            '<td>' + entry.step + '</td>' +
            '<td>' + hex4(entry.ip) + '</td>' +
            '<td>' + entry.mnemonic + '</td>' +
            '<td>' + hex4(entry.ax) + '</td>' +
            '<td>' + hex4(entry.bx) + '</td>' +
            '<td>' + hex4(entry.cx) + '</td>' +
            '<td>' + hex4(entry.dx) + '</td>' +
            '<td>' + entry.flags + '</td>';
        tbody.appendChild(tr);
        const container = document.getElementById('trace-body');
        if (container) container.scrollTop = container.scrollHeight;
    }

    function clearTrace() {
        traceLog.length = 0;
        const tbody = document.getElementById('trace-tbody');
        if (tbody) tbody.innerHTML = '';
    }

    function initTrace() {
        const tbody = document.getElementById('trace-tbody');
        if (!tbody) return;
        tbody.addEventListener('click', (e) => {
            const tr = e.target.closest('tr');
            if (!tr || !tr.dataset.line) return;
            const lineNum = parseInt(tr.dataset.line);
            document.querySelectorAll('#line-numbers div').forEach((div, idx) => {
                div.classList.toggle('current-line', idx + 1 === lineNum);
            });
        });
    }

    // ---- Live Register Editing ----

    function initLiveRegEdit() {
        const regBody = document.getElementById('registers-body');
        if (!regBody) return;
        regBody.addEventListener('dblclick', (e) => {
            if (!Mode.isAdvanced()) return;
            const span = e.target.closest('.reg-val');
            if (!span || span.querySelector('input')) return;
            const id = span.id;
            if (!id || !id.startsWith('reg-')) return;
            const regName = id.replace('reg-', '');
            const oldVal = span.textContent.trim();
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'hex-input reg-edit-input';
            input.value = oldVal;
            input.maxLength = regName.length <= 2 && (regName.endsWith('h') || regName.endsWith('l')) ? 2 : 4;
            span.textContent = '';
            span.appendChild(input);
            input.focus();
            input.select();

            const commit = () => {
                const val = parseInt(input.value, 16);
                if (!isNaN(val)) {
                    const is8 = ['al','ah','bl','bh','cl','ch','dl','dh'].includes(regName);
                    if (is8) CPU.setReg8(regName, val);
                    else CPU.setReg16(regName, val);
                }
                span.removeChild(input);
                if (typeof UI !== 'undefined' && UI.refreshAll) UI.refreshAll();
            };
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') commit();
                if (ev.key === 'Escape') { span.removeChild(input); span.textContent = oldVal; }
            });
            input.addEventListener('blur', commit);
        });
    }

    // ---- Live Memory Editing ----

    function initLiveMemEdit() {
        const memDump = document.getElementById('memory-dump');
        if (!memDump) return;
        memDump.addEventListener('dblclick', (e) => {
            if (!Mode.isAdvanced()) return;
            const span = e.target.closest('.mem-val, .mem-val-nonzero');
            if (!span || span.querySelector('input')) return;
            const allSpans = memDump.querySelectorAll('.mem-val, .mem-val-nonzero');
            let spanIdx = Array.from(allSpans).indexOf(span);
            if (spanIdx < 0) return;

            const segSelect = document.getElementById('mem-segment');
            const addrInput = document.getElementById('mem-addr');
            const state = CPU.getState();
            let segBase = 0;
            switch (segSelect.value) {
                case 'ds': segBase = state.regs.ds; break;
                case 'ss': segBase = state.regs.ss; break;
                case 'cs': segBase = state.regs.cs; break;
            }
            const startAddr = (parseInt(addrInput.value, 16) || 0) & 0xFFF0;
            const row = Math.floor(spanIdx / 16);
            const col = spanIdx % 16;
            const addr = (segBase + startAddr + row * 16 + col) & 0xFFFF;

            const oldVal = span.textContent.trim();
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'hex-input mem-edit-input';
            input.value = oldVal;
            input.maxLength = 2;
            span.textContent = '';
            span.appendChild(input);
            input.focus();
            input.select();

            const commit = () => {
                const val = parseInt(input.value, 16);
                if (!isNaN(val)) {
                    CPU.getMemory()[addr] = val & 0xFF;
                }
                if (typeof UI !== 'undefined' && UI.refreshAll) UI.refreshAll();
            };
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') commit();
                if (ev.key === 'Escape') { span.textContent = oldVal; }
            });
            input.addEventListener('blur', commit);
        });
    }

    // ---- Data Flow Highlighting ----

    function highlightDataFlow(result) {
        if (!Mode.isAdvanced() || !result || !result.mnemonic) return;
        document.querySelectorAll('.data-read, .data-write').forEach(el => {
            el.classList.remove('data-read', 'data-write');
        });
    }

    // ---- Flag Explanations ----

    function updateFlagExplanation(result) {
        const el = document.getElementById('flag-explanation');
        if (!el || !Mode.isAdvanced()) return;
        if (!result || !result.mnemonic) { el.textContent = ''; return; }
        const state = CPU.getState();
        const f = state.flags;
        let parts = [];
        if (f.zf) parts.push('ZF=1 (result is zero)');
        if (f.cf) parts.push('CF=1 (carry/borrow)');
        if (f.sf) parts.push('SF=1 (negative)');
        if (f.of) parts.push('OF=1 (overflow)');
        el.textContent = parts.length ? result.mnemonic.toUpperCase() + ': ' + parts.join(', ') : '';
    }

    // ---- Cycle Counter ----

    const CYCLE_TABLE = {
        'mov': 2, 'add': 3, 'sub': 3, 'inc': 2, 'dec': 2, 'cmp': 3,
        'and': 3, 'or': 3, 'xor': 3, 'not': 3, 'neg': 3, 'test': 3,
        'shl': 2, 'shr': 2, 'rol': 2, 'ror': 2,
        'jmp': 15, 'jz': 16, 'je': 16, 'jnz': 16, 'jne': 16,
        'jc': 16, 'jb': 16, 'jnc': 16, 'jae': 16,
        'js': 16, 'jns': 16, 'jo': 16, 'jno': 16,
        'jg': 16, 'jge': 16, 'jl': 16, 'jle': 16,
        'ja': 16, 'jbe': 16,
        'call': 19, 'ret': 16, 'int': 51, 'iret': 32,
        'push': 11, 'pop': 8, 'nop': 3, 'hlt': 2,
        'mul': 70, 'div': 80, 'in': 8, 'out': 8,
        'xchg': 4, 'lea': 2, 'cbw': 2, 'cwd': 5,
        'loop': 17, 'lodsb': 12, 'stosb': 11, 'movsb': 18, 'cmpsb': 22, 'scasb': 15,
        'xlatb': 11
    };
    let totalCycles = 0;

    function addCycles(mnemonic) {
        totalCycles += CYCLE_TABLE[mnemonic] || 4;
    }

    function getCycles() { return totalCycles; }

    function resetCycles() { totalCycles = 0; }

    // ---- Init ----

    function init() {
        initBreakpoints();
        initTrace();
        initLiveRegEdit();
        initLiveMemEdit();
        const btnClearTrace = document.getElementById('btn-clear-trace');
        if (btnClearTrace) btnClearTrace.addEventListener('click', clearTrace);
    }

    function resetAll() {
        clearHistory();
        clearTrace();
        resetCycles();
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        isBreakpoint, clearBreakpoints, refreshBreakpointDisplay,
        pushSnapshot, stepBack, clearHistory, hasHistory,
        recordTrace, clearTrace,
        highlightDataFlow, updateFlagExplanation,
        addCycles, getCycles, resetCycles,
        resetAll
    };
})();
