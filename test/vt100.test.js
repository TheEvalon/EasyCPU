"use strict";

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

function loadScript(relPath, sandbox) {
    const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
    vm.runInContext(code + '\nthis.__last = (typeof VT100 !== "undefined" ? VT100 : undefined);', sandbox);
}

const sandbox = vm.createContext({ console, Uint8Array, module: { exports: {} }, exports: {} });
loadScript('js/vt100.js', sandbox);
const VT100 = sandbox.VT100 || sandbox.module.exports;
assert.ok(VT100 && typeof VT100.create === 'function', 'VT100.create should exist');

let failed = 0;
function assertCursor(t, expected) {
    const cur = t.getCursor();
    assert.strictEqual(cur.row, expected.row, 'cursor row');
    assert.strictEqual(cur.col, expected.col, 'cursor col');
}

function test(name, fn) {
    try {
        fn();
        console.log('  ok  ' + name);
    } catch (err) {
        failed++;
        console.log('  FAIL  ' + name);
        console.log('    ' + (err && err.stack ? err.stack.split('\n').slice(0, 4).join('\n    ') : err));
    }
}

test('prints ASCII and advances cursor', () => {
    const t = VT100.create({ cols: 80, rows: 24 });
    t.write('Hi');
    assert.strictEqual(t.getLine(0, true), 'Hi');
    assertCursor(t, { row: 0, col: 2 });
});

test('CR returns to column 0 without changing row', () => {
    const t = VT100.create();
    t.write('ABC\rX');
    assert.strictEqual(t.getLine(0, true), 'XBC');
    assertCursor(t, { row: 0, col: 1 });
});

test('LF moves down and keeps column', () => {
    const t = VT100.create();
    t.write('AB\nC');
    assert.strictEqual(t.getLine(0, true), 'AB');
    assert.strictEqual(t.getLine(1, true), '  C');
    assertCursor(t, { row: 1, col: 3 });
});

test('CRLF starts a new line at column 0', () => {
    const t = VT100.create();
    t.write('AB\r\nC');
    assert.strictEqual(t.getText(), 'AB\nC');
    assertCursor(t, { row: 1, col: 1 });
});

test('backspace moves left and clears the character', () => {
    const t = VT100.create();
    t.write('AB\b');
    assert.strictEqual(t.getLine(0, true), 'A');
    assert.strictEqual(t.getCell(0, 1).ch, ' ');
    assertCursor(t, { row: 0, col: 1 });
});

test('backspace then a new character replaces the erased cell', () => {
    const t = VT100.create();
    t.write('AB\bX');
    assert.strictEqual(t.getLine(0, true), 'AX');
    assertCursor(t, { row: 0, col: 2 });
});

test('backspace at column 0 is a no-op', () => {
    const t = VT100.create();
    t.write('A\b\b');
    assert.strictEqual(t.getLine(0, true), '');
    assert.strictEqual(t.getCell(0, 0).ch, ' ');
    assertCursor(t, { row: 0, col: 0 });
});

test('backspace after filling the last column erases that last character', () => {
    const t = VT100.create({ cols: 4, rows: 2 });
    t.write('abcd\b');
    assert.strictEqual(t.getLine(0, true), 'abc');
    assert.strictEqual(t.getLine(1, true), '');
    assertCursor(t, { row: 0, col: 3 });
});

test('TAB advances to the next 8-column stop', () => {
    const t = VT100.create();
    t.write('A\tB');
    assert.strictEqual(t.getLine(0, true), 'A       B');
    assertCursor(t, { row: 0, col: 9 });
});

test('wraps at the right margin', () => {
    const t = VT100.create({ cols: 4, rows: 2 });
    t.write('abcde');
    assert.strictEqual(t.getLine(0, true), 'abcd');
    assert.strictEqual(t.getLine(1, true), 'e');
    assertCursor(t, { row: 1, col: 1 });
});

test('scrolls up when leaving the last row', () => {
    const t = VT100.create({ cols: 4, rows: 2 });
    t.write('abcdefghi');
    assert.strictEqual(t.getLine(0, true), 'efgh');
    assert.strictEqual(t.getLine(1, true), 'i');
});

test('CUP moves the cursor (1-based)', () => {
    const t = VT100.create();
    t.write('\x1b[12;40H*');
    assertCursor(t, { row: 11, col: 40 });
    assert.strictEqual(t.getCell(11, 39).ch, '*');
});

test('CSI A/B/C/D move the cursor', () => {
    const t = VT100.create();
    t.write('\x1b[10;10H');
    t.write('\x1b[3A');
    assertCursor(t, { row: 6, col: 9 });
    t.write('\x1b[2B\x1b[4C\x1b[1D');
    assertCursor(t, { row: 8, col: 12 });
});

test('ED 2 clears the screen and keeps the cursor', () => {
    const t = VT100.create();
    t.write('HELLO\x1b[2;2H\x1b[2J');
    assert.strictEqual(t.getText(), '');
    assertCursor(t, { row: 1, col: 1 });
});

test('EL 0 clears from cursor to end of line', () => {
    const t = VT100.create();
    t.write('ABCDEF\x1b[1;3H\x1b[K');
    assert.strictEqual(t.getLine(0, true), 'AB');
});

test('SGR stores color and bold on subsequent cells', () => {
    const t = VT100.create();
    t.write('\x1b[1;31mR\x1b[0m.');
    const red = t.getCell(0, 0);
    const reset = t.getCell(0, 1);
    assert.strictEqual(red.ch, 'R');
    assert.strictEqual(red.fg, 1);
    assert.strictEqual(red.bold, true);
    assert.strictEqual(reset.ch, '.');
    assert.strictEqual(reset.fg, -1);
    assert.strictEqual(reset.bold, false);
});

test('ESC 7 / ESC 8 save and restore cursor', () => {
    const t = VT100.create();
    t.write('\x1b[5;6H\x1b7\x1b[1;1HZ\x1b8');
    assert.strictEqual(t.getCell(0, 0).ch, 'Z');
    assertCursor(t, { row: 4, col: 5 });
});

test('ESC c resets the terminal', () => {
    const t = VT100.create();
    t.write('\x1b[31mXYZ\x1bcA');
    assert.strictEqual(t.getText(), 'A');
    assert.strictEqual(t.getCell(0, 0).fg, -1);
    assertCursor(t, { row: 0, col: 1 });
});

test('BEL increments the bell counter', () => {
    const t = VT100.create();
    t.write('x\x07\x07');
    assert.strictEqual(t.consumeBell(), 2);
    assert.strictEqual(t.consumeBell(), 0);
});

test('unknown CSI is ignored without eating following text', () => {
    const t = VT100.create();
    t.write('\x1b[99nOK');
    assert.strictEqual(t.getText(), 'OK');
});

if (failed) {
    console.log('\n' + failed + ' test(s) failed');
    process.exit(1);
}
console.log('\nAll VT100 emulator tests passed');
