"use strict";

const Challenges = (() => {
    const CHALLENGES = [
        {
            id: 'set-ax-42',
            title: 'Set AX to 42',
            description: 'Write a program that sets the AX register to the decimal value 42 (2Ah). The program should end normally with INT 21h.',
            initialCode: '.model small\n.stack 100h\n.data\n.code\nmov ax, @data\nmov ds, ax\n\n; Your code here: set AX to 42\n\nmov ah, 4ch\nint 21h\nend',
            checks: [
                { type: 'register', target: 'ax', mask: 0xFFFF, expected: 42, message: 'AX should be 42 (002Ah)' }
            ]
        },
        {
            id: 'leds-0-7',
            title: 'Light LEDs 0 and 7',
            description: 'Write a program that turns on ONLY LED 0 and LED 7. That means port 2 should have the value 10000001 in binary (81h).',
            initialCode: '.model small\n.stack 100h\n.data\n.code\nmov ax, @data\nmov ds, ax\n\n; Your code here: light up LED 0 and LED 7\n\nmov ah, 4ch\nint 21h\nend',
            checks: [
                { type: 'port', target: 2, expected: 0x81, message: 'Port 2 should be 81h (LED 0 and LED 7 on)' }
            ]
        },
        {
            id: 'sort-bytes',
            title: 'Sort 4 Bytes',
            description: 'Memory at DS:0000 contains 4 bytes. Sort them in ascending order. The initial values are: 09, 03, 07, 01. After sorting: 01, 03, 07, 09.',
            initialCode: '.model small\n.stack 100h\n.data\ndb 9, 3, 7, 1\n.code\nmov ax, @data\nmov ds, ax\n\n; Your code here: sort the 4 bytes at [0]..[3] in ascending order\n\nmov ah, 4ch\nint 21h\nend',
            checks: [
                { type: 'memory_seq', target: 'ds:0', length: 4, expected: [1, 3, 7, 9], message: 'Bytes at DS:0000-0003 should be 01, 03, 07, 09' }
            ]
        },
        {
            id: 'multiply-no-mul',
            title: 'Multiply 6 x 7 (no MUL)',
            description: 'Calculate 6 times 7 using only ADD, and store the result in AX. Do NOT use the MUL instruction. The answer should be 42.',
            initialCode: '.model small\n.stack 100h\n.data\n.code\nmov ax, @data\nmov ds, ax\n\n; Your code here: compute 6 * 7 = 42, store in AX, without using MUL\n\nmov ah, 4ch\nint 21h\nend',
            checks: [
                { type: 'register', target: 'ax', mask: 0xFFFF, expected: 42, message: 'AX should contain 42 (6 x 7)' }
            ]
        },
        {
            id: 'loop-to-20',
            title: 'Count to 20 with LOOP',
            description: 'Use the LOOP instruction to count from 1 to 20. When done, AL should contain 20 and it should be displayed on the LEDs (port 2).',
            initialCode: '.model small\n.stack 100h\n.data\n.code\nmov ax, @data\nmov ds, ax\n\n; Your code here: use LOOP to count to 20, display on LEDs\n\nmov ah, 4ch\nint 21h\nend',
            checks: [
                { type: 'port', target: 2, expected: 20, message: 'Port 2 should show 20 (14h)' }
            ]
        }
    ];

    let currentChallenge = null;

    function init() {
        const panel = document.getElementById('challenge-list');
        if (!panel) return;
        renderList();
    }

    function renderList() {
        const panel = document.getElementById('challenge-list');
        if (!panel) return;
        let html = '';
        CHALLENGES.forEach(ch => {
            html += '<div class="challenge-card" data-id="' + ch.id + '">';
            html += '<div class="challenge-title">' + ch.title + '</div>';
            html += '<div class="challenge-desc">' + ch.description.substring(0, 80) + '...</div>';
            html += '</div>';
        });
        panel.innerHTML = html;
        panel.querySelectorAll('.challenge-card').forEach(card => {
            card.addEventListener('click', () => {
                loadChallenge(card.dataset.id);
            });
        });
    }

    function loadChallenge(id) {
        const ch = CHALLENGES.find(c => c.id === id);
        if (!ch) return;
        currentChallenge = ch;
        const editor = document.getElementById('code-editor');
        if (editor) {
            editor.value = ch.initialCode;
            editor.dispatchEvent(new Event('input'));
        }
        const detail = document.getElementById('challenge-detail');
        if (detail) {
            detail.innerHTML = '<h4>' + ch.title + '</h4><p>' + ch.description + '</p>';
            detail.style.display = 'block';
        }
        const checkBtn = document.getElementById('btn-check-challenge');
        if (checkBtn) checkBtn.style.display = 'inline-block';
        const resultEl = document.getElementById('challenge-result');
        if (resultEl) resultEl.innerHTML = '';
        if (typeof UI !== 'undefined') UI.logConsole('Challenge loaded: ' + ch.title, 'info');
    }

    function checkChallenge() {
        if (!currentChallenge) return;
        const state = CPU.getState();
        const mem = CPU.getMemory();
        const ports = CPU.getIOPorts();
        const resultEl = document.getElementById('challenge-result');
        if (!resultEl) return;

        let allPassed = true;
        let html = '';

        currentChallenge.checks.forEach(check => {
            let actual, passed = false;
            if (check.type === 'register') {
                const regName = check.target.toLowerCase();
                const is8 = ['al','ah','bl','bh','cl','ch','dl','dh'].includes(regName);
                actual = is8 ? CPU.getReg8(regName) : CPU.getReg16(regName);
                if (check.mask) actual = actual & check.mask;
                passed = (actual === check.expected);
            } else if (check.type === 'port') {
                actual = ports[check.target] !== undefined ? ports[check.target] : 0;
                passed = (actual === check.expected);
            } else if (check.type === 'memory_seq') {
                const parts = check.target.split(':');
                let base = 0;
                if (parts[0] === 'ds') base = state.regs.ds;
                const offset = parseInt(parts[1]) || 0;
                const bytes = [];
                for (let i = 0; i < check.length; i++) {
                    bytes.push(mem[(base + offset + i) & 0xFFFF]);
                }
                actual = bytes;
                passed = JSON.stringify(bytes) === JSON.stringify(check.expected);
            }

            const icon = passed ? '<span class="check-pass">PASS</span>' : '<span class="check-fail">FAIL</span>';
            const actualStr = Array.isArray(actual) ? actual.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ') :
                (typeof actual === 'number' ? actual.toString(16).toUpperCase().padStart(4, '0') : actual);
            html += '<div class="check-row">' + icon + ' ' + check.message + ' (got: ' + actualStr + ')</div>';
            if (!passed) allPassed = false;
        });

        if (allPassed) {
            html = '<div class="challenge-success">All checks passed!</div>' + html;
        } else {
            html = '<div class="challenge-fail">Some checks failed. Try again!</div>' + html;
        }
        resultEl.innerHTML = html;
    }

    document.addEventListener('DOMContentLoaded', () => {
        init();
        const checkBtn = document.getElementById('btn-check-challenge');
        if (checkBtn) checkBtn.addEventListener('click', checkChallenge);
    });

    return { loadChallenge, checkChallenge, currentChallenge: () => currentChallenge };
})();
