"use strict";

const UI = (() => {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    let runTimer = null;
    let assembled = null;
    let prevRegs = {};

    const EDITOR_ZOOM_MIN = 10;
    const EDITOR_ZOOM_MAX = 24;
    const EDITOR_ZOOM_DEFAULT = 13;
    const EDITOR_ZOOM_STORAGE = 'easycpu_editor_zoom';
    let editorZoom = EDITOR_ZOOM_DEFAULT;

    const editor = () => $('#code-editor');
    const lineNums = () => $('#line-numbers');

    function init() {
        bindEvents();
        initEditorZoom();
        updateLineNumbers();
        updateRegisters();
        updateFlags();
        updateLEDs(0);
        updateMemory();
        updateStack();
        loadSampleList();
        initConverter();
        logConsole('EasyCPU 8086 Simulator ready.', 'info');

        CPU.setOnPortWrite((port, val) => {
            if (port === 2) updateLEDs(val);
            if (typeof Peripherals !== 'undefined') Peripherals.handlePortWrite(port, val);
        });
        CPU.setOnPortRead((port) => {
            if (typeof Peripherals !== 'undefined') return Peripherals.handlePortRead(port);
            return null;
        });
        if (typeof CPU.setOnConsole === 'function') {
            CPU.setOnConsole({
                write: (b) => {
                    if (typeof Peripherals !== 'undefined') Peripherals.terminalWrite(b);
                },
                read: () => {
                    if (typeof Peripherals !== 'undefined') return Peripherals.terminalRead();
                    return 0;
                },
                ready: () => {
                    if (typeof Peripherals !== 'undefined') return Peripherals.terminalCanRead();
                    return false;
                }
            });
        }
        CPU.setOnHalt((msg) => {
            stopExecution();
            logConsole(msg, 'success');
        });
    }

    function bindEvents() {
        $('#btn-assemble').addEventListener('click', doAssemble);
        $('#btn-run').addEventListener('click', doRun);
        $('#btn-step').addEventListener('click', doStep);
        $('#btn-stop').addEventListener('click', doStop);
        $('#btn-reset').addEventListener('click', doReset);
        $('#btn-clear-console').addEventListener('click', () => {
            $('#console-output').innerHTML = '';
        });
        $('#btn-mem-go').addEventListener('click', () => updateMemory());
        $('#mem-addr').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') updateMemory();
        });
        $('#mem-segment').addEventListener('change', () => updateMemory());

        const btnStepBack = $('#btn-step-back');
        if (btnStepBack) btnStepBack.addEventListener('click', doStepBack);

        const btnRunBP = $('#btn-run-bp');
        if (btnRunBP) btnRunBP.addEventListener('click', doRunToBreakpoint);

        editor().addEventListener('input', () => {
            updateLineNumbers();
            if (typeof Debugger !== 'undefined') Debugger.refreshBreakpointDisplay();
        });
        editor().addEventListener('scroll', syncScroll);
        editor().addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                let start = editor().selectionStart;
                let end = editor().selectionEnd;
                let val = editor().value;
                editor().value = val.substring(0, start) + '\t' + val.substring(end);
                editor().selectionStart = editor().selectionEnd = start + 1;
                updateLineNumbers();
                triggerHighlight();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                doAssemble();
                return;
            }
            if (handleEditorZoomKey(e)) return;
        });

        const editorContainer = $('#editor-container');
        if (editorContainer) {
            editorContainer.addEventListener('wheel', (e) => {
                if (!(e.ctrlKey || e.metaKey)) return;
                e.preventDefault();
                nudgeEditorZoom(e.deltaY < 0 ? 1 : -1);
            }, { passive: false });
        }

        $('#sample-select').addEventListener('change', (e) => {
            let name = e.target.value;
            if (name && typeof SAMPLES !== 'undefined' && SAMPLES[name]) {
                editor().value = SAMPLES[name];
                updateLineNumbers();
                triggerHighlight();
                doReset();
                logConsole('Loaded sample: ' + name, 'info');
            }
        });

        $('#input-port').addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 16);
            if (!isNaN(val)) {
                CPU.setInputPort(1, val & 0xFF);
                e.target.value = (val & 0xFF).toString(16).toUpperCase().padStart(2, '0');
            }
        });

        const zoomOut = $('#btn-editor-zoom-out');
        const zoomIn = $('#btn-editor-zoom-in');
        if (zoomOut) zoomOut.addEventListener('click', () => nudgeEditorZoom(-1));
        if (zoomIn) zoomIn.addEventListener('click', () => nudgeEditorZoom(1));
    }

    function clampEditorZoom(px) {
        if (px < EDITOR_ZOOM_MIN) return EDITOR_ZOOM_MIN;
        if (px > EDITOR_ZOOM_MAX) return EDITOR_ZOOM_MAX;
        return px;
    }

    function readSavedEditorZoom() {
        try {
            const raw = localStorage.getItem(EDITOR_ZOOM_STORAGE);
            if (raw == null) return null;
            const n = parseInt(raw, 10);
            if (isNaN(n)) return null;
            return clampEditorZoom(n);
        } catch (err) {
            return null;
        }
    }

    function computedEditorFontSize() {
        const el = editor();
        if (!el) return EDITOR_ZOOM_DEFAULT;
        const n = parseFloat(getComputedStyle(el).fontSize);
        return isNaN(n) ? EDITOR_ZOOM_DEFAULT : Math.round(n);
    }

    function applyEditorZoom(px) {
        editorZoom = clampEditorZoom(px);
        const container = $('#editor-container');
        if (container) {
            container.style.setProperty('--editor-font-size', editorZoom + 'px');
            container.style.setProperty('--editor-gutter-width', Math.max(32, Math.round(editorZoom * 3.4)) + 'px');
        }
        const label = $('#editor-zoom-label');
        if (label) label.textContent = Math.round((editorZoom / EDITOR_ZOOM_DEFAULT) * 100) + '%';
        const zoomOut = $('#btn-editor-zoom-out');
        const zoomIn = $('#btn-editor-zoom-in');
        if (zoomOut) zoomOut.disabled = editorZoom <= EDITOR_ZOOM_MIN;
        if (zoomIn) zoomIn.disabled = editorZoom >= EDITOR_ZOOM_MAX;
        try {
            localStorage.setItem(EDITOR_ZOOM_STORAGE, String(editorZoom));
        } catch (err) { /* ignore quota / private mode */ }
        triggerHighlight();
        syncScroll();
    }

    function nudgeEditorZoom(delta) {
        applyEditorZoom(editorZoom + delta);
    }

    function handleEditorZoomKey(e) {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
        if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.key === '=' || e.key === '+') {
            e.preventDefault();
            nudgeEditorZoom(1);
            return true;
        }
        if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.key === '-' || e.key === '_') {
            e.preventDefault();
            nudgeEditorZoom(-1);
            return true;
        }
        if (e.code === 'Digit0' || e.code === 'Numpad0' || e.key === '0') {
            e.preventDefault();
            applyEditorZoom(EDITOR_ZOOM_DEFAULT);
            return true;
        }
        return false;
    }

    function initEditorZoom() {
        const saved = readSavedEditorZoom();
        if (saved != null) {
            applyEditorZoom(saved);
            return;
        }
        editorZoom = clampEditorZoom(computedEditorFontSize());
        const label = $('#editor-zoom-label');
        if (label) label.textContent = Math.round((editorZoom / EDITOR_ZOOM_DEFAULT) * 100) + '%';
        const zoomOut = $('#btn-editor-zoom-out');
        const zoomIn = $('#btn-editor-zoom-in');
        if (zoomOut) zoomOut.disabled = editorZoom <= EDITOR_ZOOM_MIN;
        if (zoomIn) zoomIn.disabled = editorZoom >= EDITOR_ZOOM_MAX;
    }

    function triggerHighlight() {
        if (typeof Highlight !== 'undefined') Highlight.render();
    }

    function updateLineNumbers() {
        let lines = editor().value.split('\n');
        let html = '';
        for (let i = 1; i <= lines.length; i++) {
            html += '<div>' + i + '</div>';
        }
        lineNums().innerHTML = html;
    }

    function syncScroll() {
        lineNums().scrollTop = editor().scrollTop;
        const overlay = $('#highlight-overlay');
        if (overlay) {
            overlay.scrollTop = editor().scrollTop;
            overlay.scrollLeft = editor().scrollLeft;
        }
    }

    function highlightCurrentLine(lineNum) {
        $$('#line-numbers div').forEach((div, idx) => {
            div.classList.toggle('current-line', idx + 1 === lineNum);
        });
    }

    function clearLineHighlight() {
        $$('#line-numbers div').forEach(div => div.classList.remove('current-line'));
    }

    function doAssemble() {
        let source = editor().value;
        if (!source.trim()) {
            logConsole('Error: No source code to assemble.', 'error');
            return;
        }

        CPU.init();
        assembled = Assembler.assemble(source);

        if (typeof Highlight !== 'undefined') Highlight.clearErrors();

        if (assembled.errors.length > 0) {
            for (let err of assembled.errors) {
                logConsole('Line ' + err.line + ': ' + err.message, 'error');
            }
            logConsole('Assembly failed with ' + assembled.errors.length + ' error(s).', 'error');
            if (typeof Highlight !== 'undefined') Highlight.markErrors(assembled.errors);
            return;
        }

        CPU.loadProgram(assembled);

        let portVal = parseInt($('#input-port').value, 16);
        if (!isNaN(portVal)) CPU.setInputPort(1, portVal & 0xFF);

        logConsole('Assembly successful: ' + assembled.instructions.length + ' instructions.', 'success');

        $('#btn-run').disabled = false;
        $('#btn-step').disabled = false;
        const btnBP = $('#btn-run-bp');
        if (btnBP) btnBP.disabled = false;

        if (typeof Debugger !== 'undefined') {
            Debugger.resetAll();
        }
        if (typeof Peripherals !== 'undefined') {
            Peripherals.resetAll();
        }

        updateAll();
        highlightCurrentLine(getNextLine());
    }

    function getNextLine() {
        if (!assembled) return -1;
        let ip = CPU.getState().regs.ip;
        if (ip < assembled.instructions.length) {
            return assembled.instructions[ip].sourceLine;
        }
        return -1;
    }

    function doStep() {
        if (!assembled || CPU.isHalted()) return;
        if (typeof CPU.isBlockedOnInput === 'function' && CPU.isBlockedOnInput()) {
            logConsole('Waiting for a key. Click the VT100 terminal, then type.', 'warn');
            return;
        }
        if (typeof Debugger !== 'undefined') Debugger.pushSnapshot();
        let result = CPU.step();
        if (typeof Debugger !== 'undefined') {
            Debugger.recordTrace(result);
            Debugger.addCycles(result.mnemonic);
            Debugger.updateFlagExplanation(result);
        }
        if (typeof Peripherals !== 'undefined' && Peripherals.tickTimer()) {
            Peripherals.fireTimerInterrupt();
        }
        updateAll();
        updateCycleCounter();
        if (!result.halted) {
            highlightCurrentLine(getNextLine());
            updateStepBackBtn();
        } else {
            clearLineHighlight();
            $('#btn-run').disabled = true;
            $('#btn-step').disabled = true;
        }
    }

    function doStepBack() {
        if (typeof Debugger === 'undefined' || !Debugger.hasHistory()) return;
        Debugger.stepBack();
        updateAll();
        updateCycleCounter();
        highlightCurrentLine(getNextLine());
        updateStepBackBtn();
        const btnRun = $('#btn-run');
        const btnStep = $('#btn-step');
        if (btnRun) btnRun.disabled = false;
        if (btnStep) btnStep.disabled = false;
    }

    function updateStepBackBtn() {
        const btn = $('#btn-step-back');
        if (btn && typeof Debugger !== 'undefined') {
            btn.disabled = !Debugger.hasHistory();
        }
    }

    function doRun() {
        if (!assembled || CPU.isHalted()) return;
        $('#btn-run').disabled = true;
        $('#btn-step').disabled = true;
        $('#btn-stop').disabled = false;
        const btnBP = $('#btn-run-bp');
        if (btnBP) btnBP.disabled = true;

        let speedVal = parseInt($('#speed-slider').value);
        let delay = Math.max(1, 110 - speedVal);

        function tick() {
            if (CPU.isHalted()) {
                stopExecution();
                return;
            }
            if (typeof CPU.isBlockedOnInput === 'function' && CPU.isBlockedOnInput()) {
                runTimer = setTimeout(tick, Math.min(delay, 20));
                return;
            }
            if (typeof Debugger !== 'undefined') Debugger.pushSnapshot();
            let result = CPU.step();
            if (typeof Debugger !== 'undefined') {
                Debugger.recordTrace(result);
                Debugger.addCycles(result.mnemonic);
            }
            if (typeof Peripherals !== 'undefined' && Peripherals.tickTimer()) {
                Peripherals.fireTimerInterrupt();
            }
            updateAll();
            if (!result.halted) {
                let nextLine = getNextLine();
                highlightCurrentLine(nextLine);
                if (typeof Debugger !== 'undefined' && Debugger.isBreakpoint(nextLine)) {
                    stopExecution();
                    logConsole('Breakpoint hit at line ' + nextLine, 'warn');
                    return;
                }
                runTimer = setTimeout(tick, delay);
            } else {
                stopExecution();
            }
        }
        tick();
    }

    function doRunToBreakpoint() {
        if (!assembled || CPU.isHalted()) return;
        $('#btn-run').disabled = true;
        $('#btn-step').disabled = true;
        $('#btn-stop').disabled = false;

        let steps = 0;
        while (!CPU.isHalted() && steps < 100000) {
            if (typeof CPU.isBlockedOnInput === 'function' && CPU.isBlockedOnInput()) {
                logConsole('Waiting for a key. Click the VT100 terminal, then type.', 'warn');
                break;
            }
            if (typeof Debugger !== 'undefined') Debugger.pushSnapshot();
            let result = CPU.step();
            if (typeof Debugger !== 'undefined') {
                Debugger.recordTrace(result);
                Debugger.addCycles(result.mnemonic);
            }
            if (typeof Peripherals !== 'undefined' && Peripherals.tickTimer()) {
                Peripherals.fireTimerInterrupt();
            }
            steps++;
            if (result.halted) break;
            let nextLine = getNextLine();
            if (typeof Debugger !== 'undefined' && Debugger.isBreakpoint(nextLine)) {
                logConsole('Breakpoint hit at line ' + nextLine + ' after ' + steps + ' steps', 'warn');
                break;
            }
        }
        updateAll();
        updateCycleCounter();
        highlightCurrentLine(getNextLine());
        stopExecution();
    }

    function doStop() {
        stopExecution();
        logConsole('Execution stopped by user.', 'warn');
        highlightCurrentLine(getNextLine());
    }

    function stopExecution() {
        if (runTimer) {
            clearTimeout(runTimer);
            runTimer = null;
        }
        let isHalted = CPU.isHalted();
        $('#btn-run').disabled = isHalted;
        $('#btn-step').disabled = isHalted;
        $('#btn-stop').disabled = true;
        const btnBP = $('#btn-run-bp');
        if (btnBP) btnBP.disabled = isHalted;
        updateStepBackBtn();
        updateCycleCounter();
    }

    function doReset() {
        stopExecution();
        CPU.init();
        assembled = null;
        clearLineHighlight();
        updateAll();
        updateLEDs(0);
        $('#btn-run').disabled = true;
        $('#btn-step').disabled = true;
        $('#btn-stop').disabled = true;
        const btnBP = $('#btn-run-bp');
        if (btnBP) btnBP.disabled = true;
        const btnSB = $('#btn-step-back');
        if (btnSB) btnSB.disabled = true;
        if (typeof Debugger !== 'undefined') Debugger.resetAll();
        if (typeof Peripherals !== 'undefined') Peripherals.resetAll();
        const cc = $('#cycle-counter');
        if (cc) cc.textContent = '';
        logConsole('CPU reset.', 'info');
    }

    function updateCycleCounter() {
        const cc = $('#cycle-counter');
        if (!cc || typeof Debugger === 'undefined') return;
        const state = CPU.getState();
        cc.textContent = 'Steps: ' + state.stepCount + ' | Cycles: ~' + Debugger.getCycles();
    }

    function updateAll() {
        updateRegisters();
        updateFlags();
        updateMemory();
        updateStack();
        let ports = CPU.getIOPorts();
        if (ports[2] !== undefined) updateLEDs(ports[2]);
        if (typeof Peripherals !== 'undefined' && Peripherals.refreshPixelDisplay) {
            Peripherals.refreshPixelDisplay();
        }
    }

    function refreshAll() {
        updateAll();
        highlightCurrentLine(getNextLine());
    }

    function updateRegisters() {
        let state = CPU.getState();
        let r = state.regs;

        function hexW(v) { return (v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'); }
        function hexB(v) { return (v & 0xFF).toString(16).toUpperCase().padStart(2, '0'); }

        function setRegEl(id, val, prev) {
            let el = $(id);
            if (el) {
                if (el.querySelector('input')) return;
                el.textContent = val;
                if (prev !== undefined && val !== prev) {
                    el.classList.add('changed');
                    setTimeout(() => el.classList.remove('changed'), 400);
                }
            }
        }

        setRegEl('#reg-ax', hexW(r.ax), prevRegs.ax);
        setRegEl('#reg-ah', hexB((r.ax >> 8) & 0xFF));
        setRegEl('#reg-al', hexB(r.ax & 0xFF));
        setRegEl('#reg-bx', hexW(r.bx), prevRegs.bx);
        setRegEl('#reg-bh', hexB((r.bx >> 8) & 0xFF));
        setRegEl('#reg-bl', hexB(r.bx & 0xFF));
        setRegEl('#reg-cx', hexW(r.cx), prevRegs.cx);
        setRegEl('#reg-ch', hexB((r.cx >> 8) & 0xFF));
        setRegEl('#reg-cl', hexB(r.cx & 0xFF));
        setRegEl('#reg-dx', hexW(r.dx), prevRegs.dx);
        setRegEl('#reg-dh', hexB((r.dx >> 8) & 0xFF));
        setRegEl('#reg-dl', hexB(r.dx & 0xFF));

        setRegEl('#reg-sp', hexW(r.sp), prevRegs.sp);
        setRegEl('#reg-bp', hexW(r.bp), prevRegs.bp);
        setRegEl('#reg-si', hexW(r.si), prevRegs.si);
        setRegEl('#reg-di', hexW(r.di), prevRegs.di);
        setRegEl('#reg-ip', hexW(r.ip), prevRegs.ip);
        setRegEl('#reg-ds', hexW(r.ds), prevRegs.ds);
        setRegEl('#reg-ss', hexW(r.ss), prevRegs.ss);
        setRegEl('#reg-cs', hexW(r.cs), prevRegs.cs);

        prevRegs = {
            ax: hexW(r.ax), bx: hexW(r.bx), cx: hexW(r.cx), dx: hexW(r.dx),
            sp: hexW(r.sp), bp: hexW(r.bp), si: hexW(r.si), di: hexW(r.di),
            ip: hexW(r.ip), ds: hexW(r.ds), ss: hexW(r.ss), cs: hexW(r.cs)
        };
    }

    function updateFlags() {
        let f = CPU.getState().flags;
        const flagIds = ['cf', 'zf', 'sf', 'of', 'pf', 'af'];
        for (let name of flagIds) {
            let el = $('#flag-' + name);
            if (el) {
                let val = f[name] || 0;
                el.querySelector('.flag-val').textContent = val;
                el.classList.toggle('active', val === 1);
            }
        }
    }

    function updateLEDs(val) {
        val = val & 0xFF;
        for (let i = 0; i < 8; i++) {
            let led = $('#led-' + i);
            if (led) {
                led.classList.toggle('on', ((val >> i) & 1) === 1);
            }
        }
        $('#led-hex').textContent = val.toString(16).toUpperCase().padStart(2, '0') + 'h';
        $('#led-dec').textContent = val;
    }

    function updateMemory() {
        let mem = CPU.getMemory();
        if (!mem) return;

        let segment = $('#mem-segment').value;
        let state = CPU.getState();
        let segBase = 0;
        switch (segment) {
            case 'ds': segBase = state.regs.ds; break;
            case 'ss': segBase = state.regs.ss; break;
            case 'cs': segBase = state.regs.cs; break;
        }

        let startAddr = parseInt($('#mem-addr').value, 16) || 0;
        startAddr = startAddr & 0xFFF0;
        let rows = 12;
        let html = '';

        let labelAtOffset = {};
        if (assembled && assembled.dataSizes) {
            let entries = Object.keys(assembled.dataSizes).map(name => ({
                name,
                offset: assembled.labels[name]
            })).filter(e => e.offset !== undefined).sort((a, b) => a.offset - b.offset);
            let dataLen = assembled.dataBytes ? assembled.dataBytes.length : 0;
            for (let i = 0; i < entries.length; i++) {
                let start = entries[i].offset;
                let end = (i + 1 < entries.length) ? entries[i + 1].offset : dataLen;
                if (end <= start) {
                    end = start + (assembled.dataSizes[entries[i].name] === 16 ? 2 : 1);
                }
                for (let off = start; off < end; off++) {
                    labelAtOffset[off] = entries[i].name;
                }
            }
        }

        for (let row = 0; row < rows; row++) {
            let addr = (segBase + startAddr + row * 16) & 0xFFFF;
            let addrStr = '<span class="mem-addr">' +
                addr.toString(16).toUpperCase().padStart(4, '0') + '</span>  ';

            let hexPart = '';
            let ascPart = '';
            for (let col = 0; col < 16; col++) {
                let byteAddr = (addr + col) & 0xFFFF;
                let b = mem[byteAddr] || 0;
                let cls = b !== 0 ? 'mem-val-nonzero' : 'mem-val';
                let dataOff = startAddr + row * 16 + col;
                let title = '';
                if (segment === 'ds' && labelAtOffset[dataOff]) {
                    title = ' title="' + labelAtOffset[dataOff] + '"';
                    cls += ' mem-val-label';
                }
                hexPart += '<span class="' + cls + '"' + title + '>' +
                    b.toString(16).toUpperCase().padStart(2, '0') + '</span> ';
                if (col === 7) hexPart += ' ';
                ascPart += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
            }

            html += addrStr + hexPart + ' <span class="mem-ascii">|' + ascPart + '|</span>\n';
        }

        $('#memory-dump').innerHTML = html;
        updateDataSymbols(mem, segment === 'ds' ? segBase : null);
    }

    function updateDataSymbols(mem, dsBase) {
        const el = $('#data-symbols');
        if (!el) return;
        if (dsBase == null || !assembled || !assembled.dataSizes) {
            el.innerHTML = '';
            return;
        }
        let names = Object.keys(assembled.dataSizes);
        if (names.length === 0) {
            el.innerHTML = '';
            return;
        }
        let entries = names.map(name => ({
            name,
            offset: assembled.labels[name],
            size: assembled.dataSizes[name]
        })).sort((a, b) => a.offset - b.offset);
        let dataLen = assembled.dataBytes ? assembled.dataBytes.length : 0;
        let html = '';
        for (let i = 0; i < entries.length; i++) {
            let e = entries[i];
            let nextOff = (i + 1 < entries.length) ? entries[i + 1].offset : dataLen;
            let len = Math.max(nextOff - e.offset, e.size === 16 ? 2 : 1);
            let value;
            if (e.size === 16) {
                let phys = (dsBase + e.offset) & 0xFFFF;
                let val = (mem[phys] | (mem[(phys + 1) & 0xFFFF] << 8)) & 0xFFFF;
                value = val.toString(16).toUpperCase().padStart(4, '0') + 'h';
            } else {
                let bytes = [];
                let printable = len > 1;
                for (let j = 0; j < len; j++) {
                    let b = mem[(dsBase + e.offset + j) & 0xFFFF] || 0;
                    bytes.push(b);
                    if (b < 32 || b > 126) printable = false;
                }
                if (printable) {
                    value = '"' + bytes.map(b => String.fromCharCode(b)).join('') + '"';
                } else {
                    value = bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') + 'h';
                }
            }
            html += '<span class="data-sym"><span class="data-sym-name">' + e.name +
                '</span>=' + String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') + '</span>';
        }
        el.innerHTML = html;
    }

    function updateStack() {
        let entries = CPU.getStackEntries(16);
        let container = $('#stack-content');
        if (entries.length === 0) {
            container.innerHTML = '<div class="stack-empty">Stack is empty</div>';
            return;
        }
        let html = '';
        for (let entry of entries) {
            let cls = entry.isSP ? 'stack-entry sp-pointer' : 'stack-entry';
            let pointer = entry.isSP ? ' <-- SP' : '';
            html += '<div class="' + cls + '">' +
                '<span class="stack-addr">' + entry.address.toString(16).toUpperCase().padStart(4, '0') + '</span>' +
                '<span class="stack-val">' + entry.value.toString(16).toUpperCase().padStart(4, '0') + '</span>' +
                pointer +
                '</div>';
        }
        container.innerHTML = html;
    }

    function logConsole(msg, type) {
        let el = $('#console-output');
        let cls = type ? 'console-' + type : '';
        let line = document.createElement('div');
        line.className = cls;
        let timestamp = new Date().toLocaleTimeString();
        line.textContent = '[' + timestamp + '] ' + msg;
        el.appendChild(line);
        $('#console-body').scrollTop = $('#console-body').scrollHeight;
    }

    function loadSampleList() {
        if (typeof SAMPLES === 'undefined') return;
        let select = $('#sample-select');
        for (let name of Object.keys(SAMPLES)) {
            let opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        }
    }

    function initConverter() {
        const hex = $('#conv-hex');
        const dec = $('#conv-dec');
        const bin = $('#conv-bin');
        if (!hex || !dec || !bin) return;

        hex.addEventListener('input', () => {
            const v = parseInt(hex.value, 16);
            if (!isNaN(v)) {
                dec.value = v;
                bin.value = v.toString(2);
            }
        });
        dec.addEventListener('input', () => {
            const v = parseInt(dec.value, 10);
            if (!isNaN(v)) {
                hex.value = v.toString(16).toUpperCase();
                bin.value = v.toString(2);
            }
        });
        bin.addEventListener('input', () => {
            const v = parseInt(bin.value, 2);
            if (!isNaN(v)) {
                hex.value = v.toString(16).toUpperCase();
                dec.value = v;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    return { logConsole, refreshAll };
})();
