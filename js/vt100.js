"use strict";

const VT100 = (() => {
    const COLS = 80;
    const ROWS = 24;

    const S_GROUND = 0;
    const S_ESC = 1;
    const S_CSI = 2;

    function create(options) {
        const cols = (options && options.cols) || COLS;
        const rows = (options && options.rows) || ROWS;

        let cells;
        let row;
        let col;
        let savedRow = 0;
        let savedCol = 0;
        let fg;
        let bg;
        let bold;
        let reverse;
        let cursorVisible;
        let wrapPending;
        let state;
        let csiParams;
        let csiCur;
        let csiPrivate;
        let bellCount;
        let dirty;

        function blankCell() {
            return { ch: ' ', fg: -1, bg: -1, bold: false, reverse: false };
        }

        function alloc() {
            cells = new Array(rows);
            for (let r = 0; r < rows; r++) {
                let line = new Array(cols);
                for (let c = 0; c < cols; c++) line[c] = blankCell();
                cells[r] = line;
            }
        }

        function clampCursor() {
            if (row < 0) row = 0;
            if (col < 0) col = 0;
            if (row >= rows) row = rows - 1;
            if (col >= cols) col = cols - 1;
        }

        function currentAttr() {
            return { fg: fg, bg: bg, bold: bold, reverse: reverse };
        }

        function putChar(ch) {
            if (wrapPending) {
                wrapPending = false;
                col = 0;
                index();
            }
            let cell = cells[row][col];
            cell.ch = ch;
            cell.fg = fg;
            cell.bg = bg;
            cell.bold = bold;
            cell.reverse = reverse;
            dirty = true;
            if (col >= cols - 1) {
                wrapPending = true;
            } else {
                col++;
            }
        }

        function scrollUp() {
            cells.shift();
            let line = new Array(cols);
            for (let c = 0; c < cols; c++) line[c] = blankCell();
            cells.push(line);
            dirty = true;
        }

        function scrollDown() {
            cells.pop();
            let line = new Array(cols);
            for (let c = 0; c < cols; c++) line[c] = blankCell();
            cells.unshift(line);
            dirty = true;
        }

        function index() {
            wrapPending = false;
            if (row >= rows - 1) {
                scrollUp();
            } else {
                row++;
            }
        }

        function reverseIndex() {
            wrapPending = false;
            if (row <= 0) {
                scrollDown();
            } else {
                row--;
            }
        }

        function carriageReturn() {
            wrapPending = false;
            col = 0;
        }

        function eraseCellAtCursor() {
            cells[row][col] = blankCell();
            dirty = true;
        }

        // BS (08h): move left one column and clear that character.
        // After writing into the last column, wrap is pending — erase that
        // last cell without wrapping onto the next line.
        function backspace() {
            if (wrapPending) {
                wrapPending = false;
                eraseCellAtCursor();
                return;
            }
            if (col > 0) {
                col--;
                eraseCellAtCursor();
            }
        }

        function tab() {
            wrapPending = false;
            col = col + (8 - (col % 8));
            if (col >= cols) col = cols - 1;
        }

        function eraseRange(r0, c0, r1, c1) {
            for (let r = r0; r <= r1; r++) {
                let startC = (r === r0) ? c0 : 0;
                let endC = (r === r1) ? c1 : cols - 1;
                for (let c = startC; c <= endC; c++) {
                    cells[r][c] = blankCell();
                }
            }
            dirty = true;
        }

        function param(i, fallback) {
            if (i >= csiParams.length) return fallback;
            let v = csiParams[i];
            if (v === undefined || v === null || v === '') return fallback;
            return v;
        }

        function sgr() {
            if (csiParams.length === 0) csiParams = [0];
            for (let i = 0; i < csiParams.length; i++) {
                let p = param(i, 0);
                if (p === 0) {
                    fg = -1; bg = -1; bold = false; reverse = false;
                } else if (p === 1) {
                    bold = true;
                } else if (p === 7) {
                    reverse = true;
                } else if (p === 22) {
                    bold = false;
                } else if (p === 27) {
                    reverse = false;
                } else if (p === 39) {
                    fg = -1;
                } else if (p === 49) {
                    bg = -1;
                } else if (p >= 30 && p <= 37) {
                    fg = p - 30;
                } else if (p >= 40 && p <= 47) {
                    bg = p - 40;
                } else if (p >= 90 && p <= 97) {
                    fg = (p - 90) + 8;
                } else if (p >= 100 && p <= 107) {
                    bg = (p - 100) + 8;
                }
            }
        }

        function cup() {
            let r = param(0, 1);
            let c = param(1, 1);
            wrapPending = false;
            row = Math.max(0, Math.min(rows - 1, r - 1));
            col = Math.max(0, Math.min(cols - 1, c - 1));
        }

        function csiDispatch(finalByte) {
            let n = param(0, 1);
            switch (finalByte) {
                case 'A':
                    wrapPending = false;
                    row = Math.max(0, row - n);
                    break;
                case 'B':
                    wrapPending = false;
                    row = Math.min(rows - 1, row + n);
                    break;
                case 'C':
                    wrapPending = false;
                    col = Math.min(cols - 1, col + n);
                    break;
                case 'D':
                    wrapPending = false;
                    col = Math.max(0, col - n);
                    break;
                case 'H':
                case 'f':
                    cup();
                    break;
                case 'J': {
                    let mode = param(0, 0);
                    if (mode === 0) eraseRange(row, col, rows - 1, cols - 1);
                    else if (mode === 1) eraseRange(0, 0, row, col);
                    else eraseRange(0, 0, rows - 1, cols - 1);
                    break;
                }
                case 'K': {
                    let mode = param(0, 0);
                    if (mode === 0) eraseRange(row, col, row, cols - 1);
                    else if (mode === 1) eraseRange(row, 0, row, col);
                    else eraseRange(row, 0, row, cols - 1);
                    break;
                }
                case 'm':
                    sgr();
                    break;
                case 's':
                    savedRow = row;
                    savedCol = col;
                    break;
                case 'u':
                    wrapPending = false;
                    row = savedRow;
                    col = savedCol;
                    clampCursor();
                    break;
                case 'h':
                    if (csiPrivate && param(0, 0) === 25) cursorVisible = true;
                    break;
                case 'l':
                    if (csiPrivate && param(0, 0) === 25) cursorVisible = false;
                    break;
                default:
                    break;
            }
        }

        function startCsi() {
            state = S_CSI;
            csiParams = [];
            csiCur = '';
            csiPrivate = false;
        }

        function resetParser() {
            state = S_GROUND;
            csiParams = [];
            csiCur = '';
            csiPrivate = false;
        }

        function writeByte(b) {
            b = b & 0xFF;

            if (b === 0x18 || b === 0x1A) {
                resetParser();
                return;
            }

            if (state === S_ESC) {
                if (b === 0x5B) { // [
                    startCsi();
                    return;
                }
                state = S_GROUND;
                switch (String.fromCharCode(b)) {
                    case '7': savedRow = row; savedCol = col; break;
                    case '8':
                        wrapPending = false;
                        row = savedRow;
                        col = savedCol;
                        clampCursor();
                        break;
                    case 'D': index(); break;
                    case 'E': carriageReturn(); index(); break;
                    case 'M': reverseIndex(); break;
                    case 'c': reset(); break;
                    default: break;
                }
                return;
            }

            if (state === S_CSI) {
                if (b === 0x1B) {
                    state = S_ESC;
                    return;
                }
                if (b >= 0x30 && b <= 0x39) {
                    csiCur += String.fromCharCode(b);
                    return;
                }
                if (b === 0x3B) {
                    csiParams.push(csiCur === '' ? undefined : parseInt(csiCur, 10));
                    csiCur = '';
                    return;
                }
                if (b === 0x3F) {
                    csiPrivate = true;
                    return;
                }
                if (b >= 0x20 && b <= 0x2F) {
                    return;
                }
                if (b >= 0x40 && b <= 0x7E) {
                    csiParams.push(csiCur === '' ? undefined : parseInt(csiCur, 10));
                    csiCur = '';
                    csiDispatch(String.fromCharCode(b));
                    state = S_GROUND;
                    return;
                }
                return;
            }

            if (b === 0x1B) {
                state = S_ESC;
                return;
            }
            if (b === 0x00) return;
            if (b === 0x07) { bellCount++; return; }
            if (b === 0x08) { backspace(); return; }
            if (b === 0x09) { tab(); return; }
            if (b === 0x0A || b === 0x0B || b === 0x0C) { index(); return; }
            if (b === 0x0D) { carriageReturn(); return; }
            if (b === 0x7F) return;
            if (b < 32) return;

            putChar(String.fromCharCode(b));
        }

        function write(data) {
            if (typeof data === 'number') {
                writeByte(data);
                return;
            }
            if (typeof data === 'string') {
                for (let i = 0; i < data.length; i++) writeByte(data.charCodeAt(i));
                return;
            }
            if (data && data.length != null) {
                for (let i = 0; i < data.length; i++) writeByte(data[i]);
            }
        }

        function reset() {
            alloc();
            row = 0;
            col = 0;
            savedRow = 0;
            savedCol = 0;
            fg = -1;
            bg = -1;
            bold = false;
            reverse = false;
            cursorVisible = true;
            wrapPending = false;
            bellCount = 0;
            dirty = true;
            resetParser();
        }

        function getCell(r, c) {
            if (r < 0 || r >= rows || c < 0 || c >= cols) return blankCell();
            let cell = cells[r][c];
            return {
                ch: cell.ch,
                fg: cell.fg,
                bg: cell.bg,
                bold: cell.bold,
                reverse: cell.reverse
            };
        }

        function getLine(r, trim) {
            if (r < 0 || r >= rows) return '';
            let s = '';
            for (let c = 0; c < cols; c++) s += cells[r][c].ch;
            if (trim) s = s.replace(/\s+$/, '');
            return s;
        }

        function getText() {
            let lines = [];
            for (let r = 0; r < rows; r++) lines.push(getLine(r, true));
            while (lines.length && lines[lines.length - 1] === '') lines.pop();
            return lines.join('\n');
        }

        function consumeBell() {
            let n = bellCount;
            bellCount = 0;
            return n;
        }

        function isDirty() {
            return dirty;
        }

        function clearDirty() {
            dirty = false;
        }

        reset();

        return {
            cols, rows,
            write, writeByte, reset,
            getCell, getLine, getText,
            getCursor: () => ({ row, col }),
            isCursorVisible: () => cursorVisible,
            consumeBell, isDirty, clearDirty,
            currentAttr
        };
    }

    return { create, COLS, ROWS };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VT100;
}
