"use strict";

const Highlight = (() => {
    const MNEMONICS = new Set([
        'mov','add','sub','inc','dec','cmp','and','or','not','xor',
        'rol','ror','shl','shr','jmp','jz','jnz','jc','jnc','je','jne',
        'js','jns','jg','jge','jl','jle','ja','jae','jb','jbe','jo','jno',
        'call','ret','iret','int','in','out','push','pop','nop',
        'mul','div','neg','test','xchg','lea','cbw','cwd',
        'stc','clc','cmc','std','cld','cli','sti','hlt',
        'loop','loope','loopne','loopz','loopnz',
        'movsb','cmpsb','lodsb','stosb','scasb',
        'rep','repe','repne','repz','repnz','xlatb',
        'jnle','jnl','jnge','jng','jnbe','jna'
    ]);
    const REGISTERS = new Set([
        'al','ah','bl','bh','cl','ch','dl','dh',
        'ax','bx','cx','dx','sp','bp','si','di','ds','ss','cs','es','ip'
    ]);
    const DIRECTIVES = new Set(['.model','.stack','.data','.code','equ','db','dw','dd','end','org']);
    const ALL_COMPLETIONS = [...MNEMONICS, ...REGISTERS].sort();

    let overlay = null;
    let editor = null;
    let acDropdown = null;
    let acVisible = false;
    let acItems = [];
    let acIndex = -1;

    function init() {
        editor = document.getElementById('code-editor');
        overlay = document.getElementById('highlight-overlay');
        if (!editor || !overlay) return;

        editor.addEventListener('input', () => { if (Mode.isAdvanced()) render(); });
        editor.addEventListener('scroll', syncScroll);
        editor.addEventListener('keydown', handleAutocompleteKey);
        editor.addEventListener('keyup', handleAutocompleteShow);
        editor.addEventListener('blur', () => setTimeout(hideAutocomplete, 150));

        acDropdown = document.getElementById('autocomplete-dropdown');
        render();
    }

    function syncScroll() {
        if (!overlay) return;
        overlay.scrollTop = editor.scrollTop;
        overlay.scrollLeft = editor.scrollLeft;
    }

    function render() {
        if (!overlay || !Mode.isAdvanced()) {
            if (overlay) overlay.innerHTML = '';
            return;
        }
        const code = editor.value;
        overlay.innerHTML = highlightCode(code);
        syncScroll();
    }

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function highlightCode(code) {
        const lines = code.split('\n');
        return lines.map(line => highlightLine(line)).join('\n');
    }

    function highlightLine(line) {
        const commentIdx = line.indexOf(';');
        let code = line;
        let comment = '';
        if (commentIdx !== -1) {
            code = line.substring(0, commentIdx);
            comment = line.substring(commentIdx);
        }

        let result = tokenizeLine(code);
        if (comment) {
            result += '<span class="hl-comment">' + escapeHtml(comment) + '</span>';
        }
        return result;
    }

    function tokenizeLine(line) {
        if (!line) return '';
        let result = '';
        const regex = /(\s+)|([a-zA-Z_@][\w.]*:?)|(\[.*?\])|(0x[0-9a-fA-F]+|[0-9][0-9a-fA-F]*[hH]|[01]+[bB]|[0-9]+[dD]?)|([,\+\-])|(.)/g;
        let m;
        while ((m = regex.exec(line)) !== null) {
            if (m[1]) {
                result += escapeHtml(m[1]);
            } else if (m[2]) {
                const word = m[2];
                const lower = word.toLowerCase().replace(/:$/, '');
                const hasColon = word.endsWith(':');
                if (hasColon) {
                    result += '<span class="hl-label">' + escapeHtml(word) + '</span>';
                } else if (MNEMONICS.has(lower)) {
                    result += '<span class="hl-mnemonic">' + escapeHtml(word) + '</span>';
                } else if (REGISTERS.has(lower)) {
                    result += '<span class="hl-register">' + escapeHtml(word) + '</span>';
                } else if (DIRECTIVES.has(lower) || lower === '@data') {
                    result += '<span class="hl-directive">' + escapeHtml(word) + '</span>';
                } else {
                    result += '<span class="hl-symbol">' + escapeHtml(word) + '</span>';
                }
            } else if (m[3]) {
                result += '<span class="hl-memory">' + escapeHtml(m[3]) + '</span>';
            } else if (m[4]) {
                result += '<span class="hl-number">' + escapeHtml(m[4]) + '</span>';
            } else if (m[5]) {
                result += escapeHtml(m[5]);
            } else if (m[6]) {
                result += escapeHtml(m[6]);
            }
        }
        return result;
    }

    // ---- Autocomplete ----

    function getWordAtCursor() {
        const pos = editor.selectionStart;
        const text = editor.value.substring(0, pos);
        const match = text.match(/[a-zA-Z_.][\w.]*$/);
        return match ? { word: match[0], start: pos - match[0].length, end: pos } : null;
    }

    function handleAutocompleteShow(e) {
        if (!Mode.isAdvanced() || !acDropdown) return;
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'Tab') return;
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') return;

        const w = getWordAtCursor();
        if (!w || w.word.length < 1) { hideAutocomplete(); return; }

        const prefix = w.word.toLowerCase();
        acItems = ALL_COMPLETIONS.filter(c => c.startsWith(prefix) && c !== prefix);
        if (acItems.length === 0) { hideAutocomplete(); return; }
        if (acItems.length > 8) acItems = acItems.slice(0, 8);

        acIndex = 0;
        renderAutocomplete(w);
        acVisible = true;
    }

    function handleAutocompleteKey(e) {
        if (!acVisible || !acDropdown) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            acIndex = (acIndex + 1) % acItems.length;
            renderAutocompleteHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            acIndex = (acIndex - 1 + acItems.length) % acItems.length;
            renderAutocompleteHighlight();
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            if (acItems.length > 0 && acIndex >= 0) {
                e.preventDefault();
                applyCompletion(acItems[acIndex]);
            }
        } else if (e.key === 'Escape') {
            hideAutocomplete();
        }
    }

    function applyCompletion(word) {
        const w = getWordAtCursor();
        if (!w) return;
        const before = editor.value.substring(0, w.start);
        const after = editor.value.substring(w.end);
        editor.value = before + word + after;
        editor.selectionStart = editor.selectionEnd = w.start + word.length;
        hideAutocomplete();
        editor.dispatchEvent(new Event('input'));
    }

    function renderAutocomplete(w) {
        if (!acDropdown) return;
        const coords = getCaretCoords(editor, w.start);
        acDropdown.style.left = coords.left + 'px';
        acDropdown.style.top = coords.top + 'px';
        acDropdown.style.display = 'block';
        renderAutocompleteHighlight();
    }

    function renderAutocompleteHighlight() {
        if (!acDropdown) return;
        acDropdown.innerHTML = acItems.map((item, i) => {
            const cls = i === acIndex ? 'ac-item active' : 'ac-item';
            const isMn = MNEMONICS.has(item);
            const tag = isMn ? '<span class="ac-tag mn">instr</span>' : '<span class="ac-tag rg">reg</span>';
            return '<div class="' + cls + '" data-idx="' + i + '">' + tag + ' ' + item + '</div>';
        }).join('');
        acDropdown.querySelectorAll('.ac-item').forEach(div => {
            div.addEventListener('mousedown', (e) => {
                e.preventDefault();
                applyCompletion(acItems[parseInt(div.dataset.idx)]);
            });
        });
    }

    function hideAutocomplete() {
        acVisible = false;
        if (acDropdown) acDropdown.style.display = 'none';
    }

    function getCaretCoords(textarea, pos) {
        const container = document.getElementById('editor-container');
        if (!container) return { left: 0, top: 0 };
        const text = textarea.value.substring(0, pos);
        const lines = text.split('\n');
        const lineNum = lines.length;
        const colNum = lines[lines.length - 1].length;
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20.8;
        const charWidth = 7.8;
        const rect = textarea.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        return {
            left: (rect.left - contRect.left) + (colNum * charWidth) + 12 - textarea.scrollLeft,
            top: ((lineNum) * lineHeight) + 10 - textarea.scrollTop
        };
    }

    // ---- Inline Errors ----

    function markErrors(errors) {
        clearErrors();
        if (!Mode.isAdvanced() || !errors || errors.length === 0) return;
        const gutter = document.getElementById('line-numbers');
        if (!gutter) return;
        errors.forEach(err => {
            const div = gutter.children[err.line - 1];
            if (div) {
                div.classList.add('line-error');
                div.title = err.message;
            }
        });
    }

    function clearErrors() {
        document.querySelectorAll('#line-numbers div.line-error').forEach(d => {
            d.classList.remove('line-error');
            d.title = '';
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    return { render, markErrors, clearErrors, hideAutocomplete };
})();
