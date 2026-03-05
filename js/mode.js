"use strict";

const Mode = (() => {
    const STORAGE_KEY = 'easycpu_mode';
    let advanced = false;

    function init() {
        advanced = localStorage.getItem(STORAGE_KEY) === 'advanced';
        applyMode();
        const sw = document.getElementById('mode-switch');
        if (sw) {
            sw.checked = advanced;
            sw.addEventListener('change', () => {
                advanced = sw.checked;
                localStorage.setItem(STORAGE_KEY, advanced ? 'advanced' : 'beginner');
                applyMode();
            });
        }
    }

    function applyMode() {
        document.body.classList.toggle('advanced-mode', advanced);
        if (typeof Highlight !== 'undefined') Highlight.render();
    }

    function isAdvanced() {
        return advanced;
    }

    document.addEventListener('DOMContentLoaded', init);

    return { isAdvanced, init };
})();
