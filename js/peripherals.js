"use strict";

const Peripherals = (() => {
    // ---- 7-Segment Display (Port 3) ----
    const SEVEN_SEG_MAP = {
        0x0: [1,1,1,1,1,1,0], 0x1: [0,1,1,0,0,0,0], 0x2: [1,1,0,1,1,0,1],
        0x3: [1,1,1,1,0,0,1], 0x4: [0,1,1,0,0,1,1], 0x5: [1,0,1,1,0,1,1],
        0x6: [1,0,1,1,1,1,1], 0x7: [1,1,1,0,0,0,0], 0x8: [1,1,1,1,1,1,1],
        0x9: [1,1,1,1,0,1,1], 0xA: [1,1,1,0,1,1,1], 0xB: [0,0,1,1,1,1,1],
        0xC: [1,0,0,1,1,1,0], 0xD: [0,1,1,1,1,0,1], 0xE: [1,0,0,1,1,1,1],
        0xF: [1,0,0,0,1,1,1]
    };

    function updateSevenSeg(val) {
        const nibble = val & 0x0F;
        const segments = SEVEN_SEG_MAP[nibble] || [0,0,0,0,0,0,0];
        const ids = ['seg-a','seg-b','seg-c','seg-d','seg-e','seg-f','seg-g'];
        ids.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('seg-on', segments[i] === 1);
        });
        const hexEl = document.getElementById('sevenseg-hex');
        if (hexEl) hexEl.textContent = nibble.toString(16).toUpperCase();
    }

    // ---- Pixel Display (Port 4 + memory-mapped E000h) ----
    const PIXEL_COLORS = ['#0f0f23','#22c55e','#7aa2f7','#f7768e','#e0af68','#bb9af7','#7dcfff','#c0caf5'];
    let pixelGrid = null;

    function initPixelDisplay() {
        pixelGrid = document.getElementById('pixel-grid');
        if (!pixelGrid) return;
        pixelGrid.innerHTML = '';
        for (let i = 0; i < 1024; i++) {
            const px = document.createElement('div');
            px.className = 'pixel';
            pixelGrid.appendChild(px);
        }
    }

    function refreshPixelDisplay() {
        if (!pixelGrid) return;
        const mem = CPU.getMemory();
        if (!mem) return;
        const pixels = pixelGrid.children;
        for (let i = 0; i < 1024; i++) {
            const colorIdx = mem[0xE000 + i] & 0x07;
            if (pixels[i]) pixels[i].style.background = PIXEL_COLORS[colorIdx];
        }
    }

    // ---- Keyboard Buffer (Port 5 read = char, Port 6 read = length) ----
    const keyBuffer = [];

    function initKeyboard() {
        const input = document.getElementById('keyboard-input');
        if (!input) return;
        input.addEventListener('keydown', (e) => {
            if (e.key.length === 1) {
                keyBuffer.push(e.key.charCodeAt(0) & 0xFF);
                updateKeyboardDisplay();
            } else if (e.key === 'Enter') {
                keyBuffer.push(0x0D);
                updateKeyboardDisplay();
            }
        });
    }

    function readKeyBuffer() {
        if (keyBuffer.length === 0) return 0;
        const ch = keyBuffer.shift();
        updateKeyboardDisplay();
        return ch;
    }

    function getKeyBufferLength() {
        return Math.min(keyBuffer.length, 255);
    }

    function clearKeyBuffer() {
        keyBuffer.length = 0;
        updateKeyboardDisplay();
    }

    function updateKeyboardDisplay() {
        const el = document.getElementById('keybuf-display');
        if (!el) return;
        if (keyBuffer.length === 0) {
            el.textContent = '(empty)';
        } else {
            el.textContent = keyBuffer.map(c => {
                if (c >= 32 && c <= 126) return String.fromCharCode(c);
                return '[' + c.toString(16).toUpperCase().padStart(2, '0') + ']';
            }).join('');
        }
    }

    // ---- Timer Interrupt (Port 7) ----
    let timerInterval = 0;
    let timerCounter = 0;

    function setTimerInterval(n) {
        timerInterval = n & 0xFF;
        timerCounter = 0;
    }

    function tickTimer() {
        if (timerInterval === 0) return false;
        timerCounter++;
        if (timerCounter >= timerInterval) {
            timerCounter = 0;
            return true;
        }
        return false;
    }

    function fireTimerInterrupt() {
        const mem = CPU.getMemory();
        if (!mem) return;
        const vectorAddr = 0x0080;
        const handler = mem[vectorAddr] | (mem[vectorAddr + 1] << 8);
        if (handler === 0) return;
        const state = CPU.getState();
        let flagsWord = 0;
        flagsWord |= state.flags.cf;
        flagsWord |= (state.flags.pf << 2);
        flagsWord |= (state.flags.af << 4);
        flagsWord |= (state.flags.zf << 6);
        flagsWord |= (state.flags.sf << 7);
        flagsWord |= (state.flags.of << 11);
        CPU.pushStack(flagsWord);
        CPU.pushStack(state.regs.ip);
        CPU.setReg16('ip', handler);
    }

    function resetTimer() {
        timerInterval = 0;
        timerCounter = 0;
    }

    // ---- Port Handler ----

    function handlePortWrite(port, val) {
        if (port === 3) updateSevenSeg(val);
        if (port === 4) refreshPixelDisplay();
        if (port === 7) setTimerInterval(val);
    }

    function handlePortRead(port) {
        if (port === 5) return readKeyBuffer();
        if (port === 6) return getKeyBufferLength();
        return null;
    }

    // ---- Init ----

    function init() {
        initPixelDisplay();
        initKeyboard();
    }

    function resetAll() {
        clearKeyBuffer();
        resetTimer();
        updateSevenSeg(0);
        if (pixelGrid) {
            Array.from(pixelGrid.children).forEach(px => { px.style.background = PIXEL_COLORS[0]; });
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        handlePortWrite, handlePortRead,
        refreshPixelDisplay, tickTimer, fireTimerInterrupt,
        resetAll
    };
})();
