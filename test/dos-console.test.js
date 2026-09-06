"use strict";

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

function loadProject() {
    const sandbox = vm.createContext({
        console,
        Uint8Array,
        Array,
        Object,
        Math,
        parseInt,
        String,
        Number,
        module: { exports: {} },
        exports: {},
        window: {}
    });
    function load(rel) {
        const code = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
        vm.runInContext(
            code +
            '\nglobalThis.SAMPLES = (typeof SAMPLES !== "undefined") ? SAMPLES : globalThis.SAMPLES;' +
            '\nglobalThis.CPU = (typeof CPU !== "undefined") ? CPU : globalThis.CPU;' +
            '\nglobalThis.Assembler = (typeof Assembler !== "undefined") ? Assembler : globalThis.Assembler;' +
            '\nglobalThis.VT100 = (typeof VT100 !== "undefined") ? VT100 : (module.exports && module.exports.create ? module.exports : globalThis.VT100);',
            sandbox
        );
    }
    load('js/samples.js');
    load('js/vt100.js');
    load('js/assembler.js');
    load('js/cpu.js');
    return sandbox;
}

const ctx = loadProject();
const { CPU, Assembler, VT100, SAMPLES } = ctx;
assert.ok(CPU && Assembler && VT100, 'CPU, Assembler, and VT100 should load');

let failed = 0;
function test(name, fn) {
    try {
        fn();
        console.log('  ok  ' + name);
    } catch (err) {
        failed++;
        console.log('  FAIL  ' + name);
        console.log('    ' + (err && err.stack ? err.stack.split('\n').slice(0, 6).join('\n    ') : err));
    }
}

function runProgram(source, options) {
    options = options || {};
    const term = VT100.create();
    const input = (options.input || []).slice();
    CPU.init();
    CPU.setOnPortWrite((port, val) => {
        if ((port & 0xFFFF) === 8) term.write(val);
    });
    CPU.setOnConsole({
        write: (b) => term.write(b),
        read: () => (input.length ? input.shift() : 0) & 0xFF,
        ready: () => input.length > 0
    });
    const assembled = Assembler.assemble(source);
    if (assembled.errors.length) {
        throw new Error('assemble failed: ' + assembled.errors.map(e => e.line + ': ' + e.message).join('; '));
    }
    CPU.loadProgram(assembled);
    CPU.setMaxSteps(options.maxSteps || 5000);
    let steps = 0;
    const limit = options.maxSteps || 5000;
    while (!CPU.isHalted() && steps < limit) {
        CPU.step();
        steps++;
        if (options.onStep) options.onStep(term, input, steps);
    }
    return { term, assembled, halted: CPU.isHalted(), steps, al: CPU.getReg8('al') };
}

const HELLO_SRC = [
    '.model small',
    '.stack 100h',
    '.data',
    "msg db 'Hello$'",
    '.code',
    'mov ax, @data',
    'mov ds, ax',
    'mov dx, offset msg',
    'mov ah, 9',
    'int 21h',
    'mov ah, 4ch',
    'int 21h',
    'end'
].join('\n');

test('INT 21h AH=09 prints a $-terminated string', () => {
    const { term, halted } = runProgram(HELLO_SRC);
    assert.strictEqual(halted, true);
    assert.strictEqual(term.getText(), 'Hello');
});

test('INT 21h AH=02 writes DL and expands LF to CRLF', () => {
    const src = [
        '.model small',
        '.stack 100h',
        '.data',
        '.code',
        'mov ax, @data',
        'mov ds, ax',
        "mov dl, 'A'",
        'mov ah, 2',
        'int 21h',
        'mov dl, 10',
        'int 21h',
        "mov dl, 'B'",
        'int 21h',
        'mov ah, 4ch',
        'int 21h',
        'end'
    ].join('\n');
    const { term } = runProgram(src);
    assert.strictEqual(term.getText(), 'A\nB');
});

test('INT 21h AH=01 waits until a key is available, then echoes', () => {
    const src = [
        '.model small',
        '.stack 100h',
        '.data',
        '.code',
        'mov ax, @data',
        'mov ds, ax',
        'mov ah, 1',
        'int 21h',
        'mov ah, 4ch',
        'int 21h',
        'end'
    ].join('\n');
    const input = [];
    const term = VT100.create();
    CPU.init();
    CPU.setOnConsole({
        write: (b) => term.write(b),
        read: () => (input.length ? input.shift() : 0) & 0xFF,
        ready: () => input.length > 0
    });
    const assembled = Assembler.assemble(src);
    assert.strictEqual(assembled.errors.length, 0, assembled.errors.map(e => e.message).join('; '));
    CPU.loadProgram(assembled);
    CPU.setMaxSteps(1000);
    for (let i = 0; i < 20; i++) CPU.step();
    assert.strictEqual(CPU.isHalted(), false, 'should still be waiting for a key');
    input.push('Q'.charCodeAt(0));
    let guard = 0;
    while (!CPU.isHalted() && guard++ < 100) CPU.step();
    assert.strictEqual(CPU.isHalted(), true);
    assert.strictEqual(CPU.getReg8('al'), 'Q'.charCodeAt(0));
    assert.strictEqual(term.getText(), 'Q');
});

test('ANSI CUP via INT 21h AH=09 places text', () => {
    const src = [
        '.model small',
        '.stack 100h',
        '.data',
        'seq db 1Bh, "[2;5HX$"',
        '.code',
        'mov ax, @data',
        'mov ds, ax',
        'mov dx, offset seq',
        'mov ah, 9',
        'int 21h',
        'mov ah, 4ch',
        'int 21h',
        'end'
    ].join('\n');
    const { term, assembled } = runProgram(src);
    assert.strictEqual(assembled.errors.length, 0);
    assert.strictEqual(term.getCell(1, 4).ch, 'X');
});

test('OUT 8, AL with ASCII 8 backs up and clears the character', () => {
    const src = [
        '.model small',
        '.stack 100h',
        '.data',
        '.code',
        'mov ax, @data',
        'mov ds, ax',
        "mov al, 'A'",
        'out 8, al',
        "mov al, 'B'",
        'out 8, al',
        'mov al, 8',
        'out 8, al',
        'hlt',
        'end'
    ].join('\n');
    const { term, assembled } = runProgram(src);
    assert.strictEqual(assembled.errors.length, 0, assembled.errors.map(e => e.message).join('; '));
    assert.strictEqual(term.getLine(0, true), 'A');
    assert.strictEqual(term.getCell(0, 1).ch, ' ');
    const cur = term.getCursor();
    assert.strictEqual(cur.row, 0);
    assert.strictEqual(cur.col, 1);
});

test('OUT DX, AL with DX=8 matches OUT 8, AL for backspace', () => {
    const src = [
        '.model small',
        '.stack 100h',
        '.data',
        '.code',
        'mov ax, @data',
        'mov ds, ax',
        "mov al, 'A'",
        'out 8, al',
        "mov al, 'B'",
        'out 8, al',
        'mov dx, 8',
        'mov al, 8',
        'out dx, al',
        'hlt',
        'end'
    ].join('\n');
    const { term, assembled } = runProgram(src);
    assert.strictEqual(assembled.errors.length, 0, assembled.errors.map(e => e.message).join('; '));
    assert.strictEqual(term.getLine(0, true), 'A');
    assert.strictEqual(term.getCell(0, 1).ch, ' ');
    const cur = term.getCursor();
    assert.strictEqual(cur.row, 0);
    assert.strictEqual(cur.col, 1);
});

test('INT 21h AH=02 with DL=8 also erases the previous character', () => {
    const src = [
        '.model small',
        '.stack 100h',
        '.data',
        '.code',
        'mov ax, @data',
        'mov ds, ax',
        "mov dl, 'A'",
        'mov ah, 2',
        'int 21h',
        "mov dl, 'B'",
        'int 21h',
        'mov dl, 8',
        'int 21h',
        'mov ah, 4ch',
        'int 21h',
        'end'
    ].join('\n');
    const { term } = runProgram(src);
    assert.strictEqual(term.getLine(0, true), 'A');
});

test('OUT to port 8 writes raw bytes through the port-write callback', () => {
    const term = VT100.create();
    CPU.init();
    CPU.setOnPortWrite((port, val) => {
        if (port === 8) term.write(val);
    });
    CPU.portWrite(8, 'Z'.charCodeAt(0));
    CPU.portWrite(8, 0x0D);
    CPU.portWrite(8, 0x0A);
    CPU.portWrite(8, 'Q'.charCodeAt(0));
    assert.strictEqual(term.getLine(0, true), 'Z');
    assert.strictEqual(term.getLine(1, true), 'Q');
});

test('sample programs for the terminal assemble and print', () => {
    assert.ok(SAMPLES, 'SAMPLES should load');
    ['Beginner: Hello Terminal', 'Advanced: VT100 Color'].forEach((name) => {
        const { term, halted, assembled } = runProgram(SAMPLES[name]);
        assert.strictEqual(assembled.errors.length, 0, name);
        assert.strictEqual(halted, true, name + ' should halt');
        assert.ok(term.getText().length > 0, name + ' should print something, got ' + JSON.stringify(term.getText()));
    });
    const echoAsm = Assembler.assemble(SAMPLES['Advanced: Terminal Echo']);
    assert.strictEqual(echoAsm.errors.length, 0, echoAsm.errors.map(e => e.message).join('; '));
});

if (failed) {
    console.log('\n' + failed + ' test(s) failed');
    process.exit(1);
}
console.log('\nAll DOS console / INT 21h tests passed');
