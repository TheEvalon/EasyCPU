"use strict";

const Storage = (() => {
    const PREFIX = 'easycpu_prog_';

    function save(name, code) {
        if (!name) return false;
        localStorage.setItem(PREFIX + name, code);
        return true;
    }

    function load(name) {
        return localStorage.getItem(PREFIX + name);
    }

    function remove(name) {
        localStorage.removeItem(PREFIX + name);
    }

    function list() {
        const names = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(PREFIX)) {
                names.push(key.substring(PREFIX.length));
            }
        }
        return names.sort();
    }

    function download(filename, code) {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'program.asm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function upload(callback) {
        const input = document.getElementById('file-upload');
        if (!input) return;
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (callback) callback(ev.target.result, file.name);
            };
            reader.readAsText(file);
            input.value = '';
        };
        input.click();
    }

    // ---- UI ----

    function initUI() {
        const btnSave = document.getElementById('btn-save');
        const btnLoad = document.getElementById('btn-load');
        const btnDownload = document.getElementById('btn-download');
        const btnOpen = document.getElementById('btn-open');

        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const editor = document.getElementById('code-editor');
                if (!editor || !editor.value.trim()) return;
                const name = prompt('Save program as:', 'my_program');
                if (name) {
                    save(name, editor.value);
                    refreshLoadDropdown();
                    if (typeof UI !== 'undefined') UI.logConsole('Program saved: ' + name, 'success');
                }
            });
        }

        if (btnLoad) {
            btnLoad.addEventListener('change', (e) => {
                const name = e.target.value;
                if (!name) return;
                const code = load(name);
                if (code !== null) {
                    const editor = document.getElementById('code-editor');
                    if (editor) {
                        editor.value = code;
                        editor.dispatchEvent(new Event('input'));
                    }
                    if (typeof UI !== 'undefined') UI.logConsole('Loaded: ' + name, 'info');
                }
                btnLoad.value = '';
            });
            refreshLoadDropdown();
        }

        if (btnDownload) {
            btnDownload.addEventListener('click', () => {
                const editor = document.getElementById('code-editor');
                if (!editor || !editor.value.trim()) return;
                download('program.asm', editor.value);
            });
        }

        if (btnOpen) {
            btnOpen.addEventListener('click', () => {
                upload((code, filename) => {
                    const editor = document.getElementById('code-editor');
                    if (editor) {
                        editor.value = code;
                        editor.dispatchEvent(new Event('input'));
                    }
                    if (typeof UI !== 'undefined') UI.logConsole('Opened: ' + filename, 'info');
                });
            });
        }
    }

    function refreshLoadDropdown() {
        const sel = document.getElementById('btn-load');
        if (!sel) return;
        const names = list();
        sel.innerHTML = '<option value="">-- Load Saved --</option>';
        names.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            sel.appendChild(opt);
        });
    }

    document.addEventListener('DOMContentLoaded', initUI);

    return { save, load, remove, list, download, upload, refreshLoadDropdown };
})();
