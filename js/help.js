"use strict";

const HelpSystem = (() => {

    // ========================================================
    //  HELP TOPICS
    // ========================================================

    const TOPICS = [
        {
            id: 'getting-started',
            title: 'Getting Started',
            content: `
<h3>Getting Started</h3>
<p>Welcome to <strong>EasyCPU</strong> &mdash; a beginner-friendly simulator for the Intel 8086 processor.
You can write assembly language programs right in your browser, assemble them, and watch the CPU execute
each instruction step by step.</p>

<h4>What is Assembly Language?</h4>
<p>Assembly is the lowest-level human-readable programming language. Instead of writing
<code>x = 5 + 3</code> like in Python, you tell the CPU exactly what to do:</p>
<pre><span class="kw">mov</span> <span class="reg">al</span>, <span class="num">5</span>       <span class="cmt">; put the number 5 into register AL</span>
<span class="kw">add</span> <span class="reg">al</span>, <span class="num">3</span>       <span class="cmt">; add 3 to whatever is in AL  (AL is now 8)</span>
<span class="kw">out</span> <span class="num">2</span>, <span class="reg">al</span>       <span class="cmt">; send the value to the LED display</span></pre>

<h4>Quick Start (5 steps)</h4>
<ol>
<li>Select <strong>"Beginner: Hello LEDs"</strong> from the <strong>Samples</strong> dropdown (top-right).</li>
<li>Click <strong>Assemble</strong> &mdash; the console will say "Assembly successful".</li>
<li>Click <strong>Step</strong> repeatedly to execute one instruction at a time. Watch the registers change!</li>
<li>Or click <strong>Run</strong> to execute the whole program automatically.</li>
<li>Click <strong>Reset</strong> to clear everything and start over.</li>
</ol>

<div class="tip-box"><strong>Tip:</strong> Start with the "Beginner:" samples. They have comments explaining every single line.</div>
`
        },
        {
            id: 'interface',
            title: 'Using the Interface',
            content: `
<h3>Using the Interface</h3>

<h4>Toolbar Buttons</h4>
<table class="help-table">
<tr><th>Button</th><th>What it Does</th></tr>
<tr><td><strong>Assemble</strong></td><td>Translates your code into machine instructions. You must assemble before you can run. Shortcut: <code>Ctrl+Enter</code>.</td></tr>
<tr><td><strong>Run</strong></td><td>Executes the assembled program continuously. Use the Speed slider to control how fast.</td></tr>
<tr><td><strong>Step</strong></td><td>Executes exactly <em>one</em> instruction, then pauses. Great for learning &mdash; you can see what each line does.</td></tr>
<tr><td><strong>Stop</strong></td><td>Pauses a running program. You can then Step through the rest or click Run to continue.</td></tr>
<tr><td><strong>Reset</strong></td><td>Clears all registers, flags, memory, and LEDs. Your code stays in the editor.</td></tr>
</table>

<h4>Panels</h4>
<ul>
<li><strong>Code Editor</strong> (left) &mdash; Type your assembly code here. Line numbers appear on the left. The currently executing line is highlighted.</li>
<li><strong>Registers</strong> (right) &mdash; Shows the current value of every CPU register in hexadecimal. Values flash green when they change.</li>
<li><strong>Flags</strong> (right) &mdash; Six status flags that change after arithmetic operations. A lit-up flag means its value is 1.</li>
<li><strong>LED Output</strong> (right) &mdash; Eight virtual LEDs controlled by writing to port 2. Each LED represents one bit.</li>
<li><strong>I/O Ports</strong> (right) &mdash; Set the input port value here. Your program reads it with <code>in al, 1</code>.</li>
<li><strong>Stack</strong> (right) &mdash; Shows values on the stack. The arrow <code>&lt;-- SP</code> marks the current stack pointer position.</li>
<li><strong>Memory Viewer</strong> (bottom) &mdash; A hex dump of memory. Switch between Data, Stack, and Code segments.</li>
<li><strong>Output Console</strong> (bottom) &mdash; Assembly results, errors, and execution messages appear here.</li>
</ul>

<div class="tip-box"><strong>Tip:</strong> Hover over any panel header to see a quick description of what it shows.</div>
`
        },
        {
            id: 'registers',
            title: 'Registers Explained',
            content: `
<h3>Registers Explained</h3>
<p>Registers are tiny, super-fast storage locations inside the CPU. Think of them as <strong>named variables</strong>
that the processor can use directly.</p>

<h4>General-Purpose Registers (16-bit)</h4>
<table class="help-table">
<tr><th>Register</th><th>Name</th><th>Typical Use</th><th>High / Low Bytes</th></tr>
<tr><td><code>AX</code></td><td>Accumulator</td><td>Arithmetic, I/O, return values</td><td><code>AH</code> / <code>AL</code></td></tr>
<tr><td><code>BX</code></td><td>Base</td><td>Memory addressing <code>[BX]</code></td><td><code>BH</code> / <code>BL</code></td></tr>
<tr><td><code>CX</code></td><td>Counter</td><td>Loop counters, shift counts</td><td><code>CH</code> / <code>CL</code></td></tr>
<tr><td><code>DX</code></td><td>Data</td><td>I/O port addresses, multiplication overflow</td><td><code>DH</code> / <code>DL</code></td></tr>
</table>

<p>Each 16-bit register can be split into two 8-bit halves. For example, <code>AX = AH:AL</code>.
If <code>AX</code> is <code>1A2Bh</code>, then <code>AH</code> is <code>1Ah</code> and <code>AL</code> is <code>2Bh</code>.</p>

<h4>Pointer and Index Registers</h4>
<table class="help-table">
<tr><th>Register</th><th>Name</th><th>Purpose</th></tr>
<tr><td><code>SP</code></td><td>Stack Pointer</td><td>Points to the top of the stack. Changes with PUSH/POP.</td></tr>
<tr><td><code>BP</code></td><td>Base Pointer</td><td>Used to access function parameters on the stack.</td></tr>
<tr><td><code>SI</code></td><td>Source Index</td><td>Points to source data in string/memory operations.</td></tr>
<tr><td><code>DI</code></td><td>Destination Index</td><td>Points to destination in string/memory operations.</td></tr>
</table>

<h4>Special Registers</h4>
<table class="help-table">
<tr><th>Register</th><th>Purpose</th></tr>
<tr><td><code>IP</code></td><td><strong>Instruction Pointer</strong> &mdash; address of the next instruction to execute. You cannot set this directly; jumps and calls change it.</td></tr>
<tr><td><code>DS</code></td><td><strong>Data Segment</strong> &mdash; base address for data access.</td></tr>
<tr><td><code>SS</code></td><td><strong>Stack Segment</strong> &mdash; base address for the stack.</td></tr>
<tr><td><code>CS</code></td><td><strong>Code Segment</strong> &mdash; base address for your program instructions.</td></tr>
</table>

<h4>Quick Example</h4>
<pre><span class="kw">mov</span> <span class="reg">ax</span>, <span class="num">100</span>     <span class="cmt">; AX = 100 (also: AH = 0, AL = 100)</span>
<span class="kw">mov</span> <span class="reg">bx</span>, <span class="num">200</span>     <span class="cmt">; BX = 200</span>
<span class="kw">add</span> <span class="reg">ax</span>, <span class="reg">bx</span>      <span class="cmt">; AX = AX + BX = 300</span></pre>
`
        },
        {
            id: 'flags',
            title: 'Flags Explained',
            content: `
<h3>Flags Explained</h3>
<p>Flags are single-bit indicators that the CPU sets <em>automatically</em> after most arithmetic and logic
instructions. You don't set them yourself &mdash; the CPU updates them for you.</p>

<table class="help-table">
<tr><th>Flag</th><th>Name</th><th>Set to 1 When...</th><th>Example</th></tr>
<tr><td><code>ZF</code></td><td>Zero Flag</td><td>The result is exactly <strong>zero</strong></td>
    <td><code>sub al, al</code> &rarr; result is 0, so ZF = 1</td></tr>
<tr><td><code>CF</code></td><td>Carry Flag</td><td>An <strong>unsigned</strong> overflow/borrow occurs</td>
    <td><code>add al, 1</code> when AL is FFh &rarr; wraps to 0, CF = 1</td></tr>
<tr><td><code>SF</code></td><td>Sign Flag</td><td>The result is <strong>negative</strong> (highest bit = 1)</td>
    <td><code>mov al, 80h</code> &rarr; bit 7 is 1, so SF = 1 after operations</td></tr>
<tr><td><code>OF</code></td><td>Overflow Flag</td><td>A <strong>signed</strong> overflow occurs</td>
    <td><code>add al, 1</code> when AL is 7Fh &rarr; goes to 80h, OF = 1</td></tr>
<tr><td><code>PF</code></td><td>Parity Flag</td><td>The result has an <strong>even number</strong> of 1-bits in the low byte</td>
    <td><code>mov al, 3</code> (binary 11) &rarr; two 1-bits, PF = 1</td></tr>
<tr><td><code>AF</code></td><td>Auxiliary Flag</td><td>A carry from bit 3 to bit 4 (used in BCD arithmetic)</td>
    <td>Rarely needed for beginners</td></tr>
</table>

<h4>How Jumps Use Flags</h4>
<p>After a <code>CMP</code> or arithmetic instruction, you can jump based on flags:</p>
<pre><span class="kw">cmp</span> <span class="reg">al</span>, <span class="num">10</span>      <span class="cmt">; compare AL with 10 (sets flags)</span>
<span class="kw">je</span>  <span class="lbl">equal</span>       <span class="cmt">; jump if ZF=1  (AL == 10)</span>
<span class="kw">jg</span>  <span class="lbl">greater</span>     <span class="cmt">; jump if AL > 10  (signed)</span>
<span class="kw">jb</span>  <span class="lbl">below</span>       <span class="cmt">; jump if AL < 10  (unsigned)</span></pre>

<div class="tip-box"><strong>Tip:</strong> <code>CMP a, b</code> works like <code>SUB a, b</code> but throws away the result &mdash;
it only changes the flags. Use it right before a conditional jump.</div>
`
        },
        {
            id: 'first-program',
            title: 'Your First Program',
            content: `
<h3>Your First Program</h3>
<p>Let's build a program from scratch that adds two numbers and shows the result on the LEDs.</p>

<h4>Step 1: The Template</h4>
<p>Every program starts with this skeleton:</p>
<pre><span class="kw">.model small</span>       <span class="cmt">; memory model (always use "small")</span>
<span class="kw">.stack</span> <span class="num">100h</span>        <span class="cmt">; reserve 256 bytes for the stack</span>
<span class="kw">.data</span>               <span class="cmt">; data section (variables go here)</span>
<span class="kw">.code</span>               <span class="cmt">; code section (instructions go here)</span>
<span class="kw">mov</span> <span class="reg">ax</span>, <span class="lbl">@data</span>     <span class="cmt">; load the data segment address</span>
<span class="kw">mov</span> <span class="reg">ds</span>, <span class="reg">ax</span>        <span class="cmt">; set DS so we can access our variables</span>

<span class="cmt">; --- your code goes here ---</span>

<span class="kw">mov</span> <span class="reg">ah</span>, <span class="num">4ch</span>       <span class="cmt">; DOS exit function number</span>
<span class="kw">int</span> <span class="num">21h</span>           <span class="cmt">; call DOS to end the program</span>
<span class="kw">end</span>                <span class="cmt">; end of source file</span></pre>

<h4>Step 2: Add Two Numbers</h4>
<p>Between the setup lines and the exit lines, add:</p>
<pre><span class="kw">mov</span> <span class="reg">al</span>, <span class="num">5</span>        <span class="cmt">; AL = 5</span>
<span class="kw">add</span> <span class="reg">al</span>, <span class="num">3</span>        <span class="cmt">; AL = 5 + 3 = 8</span>
<span class="kw">out</span> <span class="num">2</span>, <span class="reg">al</span>        <span class="cmt">; send 8 to the LEDs</span></pre>

<h4>Step 3: Try It!</h4>
<ol>
<li>Paste the complete program into the editor.</li>
<li>Click <strong>Assemble</strong>. The console says "Assembly successful: 5 instructions".</li>
<li>Click <strong>Step</strong> five times. After the <code>out</code> instruction, LEDs 0 and 3 light up (binary 00001000 = 8).</li>
</ol>

<h4>The Complete Program</h4>
<pre><span class="kw">.model small</span>
<span class="kw">.stack</span> <span class="num">100h</span>
<span class="kw">.data</span>
<span class="kw">.code</span>
<span class="kw">mov</span> <span class="reg">ax</span>, <span class="lbl">@data</span>
<span class="kw">mov</span> <span class="reg">ds</span>, <span class="reg">ax</span>

<span class="kw">mov</span> <span class="reg">al</span>, <span class="num">5</span>        <span class="cmt">; first number</span>
<span class="kw">add</span> <span class="reg">al</span>, <span class="num">3</span>        <span class="cmt">; add second number</span>
<span class="kw">out</span> <span class="num">2</span>, <span class="reg">al</span>        <span class="cmt">; show on LEDs (8 = 00001000 in binary)</span>

<span class="kw">mov</span> <span class="reg">ah</span>, <span class="num">4ch</span>
<span class="kw">int</span> <span class="num">21h</span>
<span class="kw">end</span></pre>

<div class="tip-box"><strong>Challenge:</strong> Change the numbers! Try <code>mov al, 0FFh</code> and click Run &mdash; all 8 LEDs light up (FF hex = 11111111 binary).</div>
`
        },
        {
            id: 'instructions',
            title: 'Instruction Reference',
            content: `
<h3>Instruction Reference</h3>

<h4>Data Movement</h4>
<table class="help-table">
<tr><th>Instruction</th><th>Example</th><th>What it Does</th></tr>
<tr><td><code>MOV</code></td><td><code>mov al, 5</code></td><td>Copy a value: <code>destination = source</code></td></tr>
<tr><td><code>XCHG</code></td><td><code>xchg al, bl</code></td><td>Swap two values</td></tr>
<tr><td><code>LEA</code></td><td><code>lea bx, [si+4]</code></td><td>Load the address (not the value) into a register</td></tr>
<tr><td><code>PUSH</code></td><td><code>push ax</code></td><td>Put a value on the stack (SP decreases by 2)</td></tr>
<tr><td><code>POP</code></td><td><code>pop ax</code></td><td>Take the top value off the stack (SP increases by 2)</td></tr>
</table>

<h4>Arithmetic</h4>
<table class="help-table">
<tr><th>Instruction</th><th>Example</th><th>What it Does</th></tr>
<tr><td><code>ADD</code></td><td><code>add al, bl</code></td><td>Add: <code>AL = AL + BL</code></td></tr>
<tr><td><code>SUB</code></td><td><code>sub al, 3</code></td><td>Subtract: <code>AL = AL - 3</code></td></tr>
<tr><td><code>INC</code></td><td><code>inc cx</code></td><td>Add 1: <code>CX = CX + 1</code></td></tr>
<tr><td><code>DEC</code></td><td><code>dec cx</code></td><td>Subtract 1: <code>CX = CX - 1</code></td></tr>
<tr><td><code>CMP</code></td><td><code>cmp al, 10</code></td><td>Compare (like SUB but doesn't store the result, only sets flags)</td></tr>
<tr><td><code>MUL</code></td><td><code>mul bl</code></td><td>Unsigned multiply: <code>AX = AL * BL</code></td></tr>
<tr><td><code>DIV</code></td><td><code>div bl</code></td><td>Unsigned divide: <code>AL = AX / BL</code>, remainder in <code>AH</code></td></tr>
<tr><td><code>NEG</code></td><td><code>neg al</code></td><td>Negate (two's complement): <code>AL = -AL</code></td></tr>
</table>

<h4>Logic</h4>
<table class="help-table">
<tr><th>Instruction</th><th>Example</th><th>What it Does</th></tr>
<tr><td><code>AND</code></td><td><code>and al, 0Fh</code></td><td>Bitwise AND (keeps only the bits that are 1 in both)</td></tr>
<tr><td><code>OR</code></td><td><code>or al, 80h</code></td><td>Bitwise OR (sets bits that are 1 in either)</td></tr>
<tr><td><code>XOR</code></td><td><code>xor al, al</code></td><td>Bitwise XOR (a quick way to set a register to 0)</td></tr>
<tr><td><code>NOT</code></td><td><code>not al</code></td><td>Bitwise NOT (flip every bit)</td></tr>
<tr><td><code>TEST</code></td><td><code>test al, 1</code></td><td>Like AND but doesn't store the result (only sets flags)</td></tr>
</table>

<h4>Shifts and Rotates</h4>
<table class="help-table">
<tr><th>Instruction</th><th>Example</th><th>What it Does</th></tr>
<tr><td><code>SHL</code></td><td><code>shl al, 1</code></td><td>Shift bits left (multiply by 2)</td></tr>
<tr><td><code>SHR</code></td><td><code>shr al, 1</code></td><td>Shift bits right (divide by 2)</td></tr>
<tr><td><code>ROL</code></td><td><code>rol al, 1</code></td><td>Rotate bits left (bit 7 goes to bit 0)</td></tr>
<tr><td><code>ROR</code></td><td><code>ror al, 1</code></td><td>Rotate bits right (bit 0 goes to bit 7)</td></tr>
</table>

<h4>Jumps (Control Flow)</h4>
<table class="help-table">
<tr><th>Instruction</th><th>Condition</th><th>When to Use</th></tr>
<tr><td><code>JMP label</code></td><td>Always</td><td>Unconditional jump (like "goto")</td></tr>
<tr><td><code>JZ / JE</code></td><td>ZF = 1</td><td>Jump if zero / equal</td></tr>
<tr><td><code>JNZ / JNE</code></td><td>ZF = 0</td><td>Jump if not zero / not equal</td></tr>
<tr><td><code>JC / JB</code></td><td>CF = 1</td><td>Jump if carry / below (unsigned &lt;)</td></tr>
<tr><td><code>JNC / JAE</code></td><td>CF = 0</td><td>Jump if no carry / above-or-equal</td></tr>
<tr><td><code>JS</code></td><td>SF = 1</td><td>Jump if sign (negative result)</td></tr>
<tr><td><code>JG / JNLE</code></td><td>Signed &gt;</td><td>Jump if greater (signed comparison)</td></tr>
<tr><td><code>JL / JNGE</code></td><td>Signed &lt;</td><td>Jump if less (signed comparison)</td></tr>
</table>

<h4>Subroutines</h4>
<table class="help-table">
<tr><th>Instruction</th><th>What it Does</th></tr>
<tr><td><code>CALL label</code></td><td>Push return address onto stack, jump to label</td></tr>
<tr><td><code>RET</code></td><td>Pop return address from stack, jump back to caller</td></tr>
</table>

<h4>I/O</h4>
<table class="help-table">
<tr><th>Instruction</th><th>Example</th><th>What it Does</th></tr>
<tr><td><code>OUT</code></td><td><code>out 2, al</code></td><td>Send AL to port 2 (LEDs in this simulator)</td></tr>
<tr><td><code>IN</code></td><td><code>in al, 1</code></td><td>Read port 1 (Input Port) into AL</td></tr>
</table>

<h4>System</h4>
<table class="help-table">
<tr><th>Instruction</th><th>What it Does</th></tr>
<tr><td><code>NOP</code></td><td>Does nothing (no operation). Sometimes useful as a placeholder.</td></tr>
<tr><td><code>HLT</code></td><td>Halts the CPU.</td></tr>
<tr><td><code>INT 21h</code></td><td>Call a DOS interrupt. <code>AH=4Ch</code> exits the program.</td></tr>
</table>
`
        },
        {
            id: 'numbers',
            title: 'Number Formats',
            content: `
<h3>Number Formats</h3>
<p>In assembly, you can write numbers in different bases. Here's how:</p>

<table class="help-table">
<tr><th>Format</th><th>Example</th><th>Decimal Value</th><th>How to Recognize</th></tr>
<tr><td>Decimal</td><td><code>42</code></td><td>42</td><td>Just a plain number</td></tr>
<tr><td>Hexadecimal</td><td><code>2Ah</code> or <code>0x2A</code></td><td>42</td><td>Ends with <code>h</code>, or starts with <code>0x</code></td></tr>
<tr><td>Binary</td><td><code>101010b</code></td><td>42</td><td>Ends with <code>b</code></td></tr>
</table>

<h4>Hexadecimal (Base 16)</h4>
<p>Hex is the most common format in assembly. Each hex digit represents 4 bits:</p>
<pre><span class="num">0</span>=0000  <span class="num">1</span>=0001  <span class="num">2</span>=0010  <span class="num">3</span>=0011
<span class="num">4</span>=0100  <span class="num">5</span>=0101  <span class="num">6</span>=0110  <span class="num">7</span>=0111
<span class="num">8</span>=1000  <span class="num">9</span>=1001  <span class="num">A</span>=1010  <span class="num">B</span>=1011
<span class="num">C</span>=1100  <span class="num">D</span>=1101  <span class="num">E</span>=1110  <span class="num">F</span>=1111</pre>

<div class="warn-box"><strong>Important:</strong> If a hex number starts with a letter (A-F), you must put a <code>0</code> in front.
Write <code>0FFh</code>, not <code>FFh</code> &mdash; otherwise the assembler thinks it's a label name.</div>

<h4>Common Values to Know</h4>
<table class="help-table">
<tr><th>Hex</th><th>Decimal</th><th>Binary</th><th>Meaning</th></tr>
<tr><td><code>00h</code></td><td>0</td><td>00000000</td><td>All LEDs off</td></tr>
<tr><td><code>0Fh</code></td><td>15</td><td>00001111</td><td>Lower 4 LEDs on</td></tr>
<tr><td><code>0F0h</code></td><td>240</td><td>11110000</td><td>Upper 4 LEDs on</td></tr>
<tr><td><code>0FFh</code></td><td>255</td><td>11111111</td><td>All LEDs on (max 8-bit value)</td></tr>
<tr><td><code>100h</code></td><td>256</td><td>N/A</td><td>Stack size (in .stack directive)</td></tr>
</table>
`
        },
        {
            id: 'memory',
            title: 'Memory and the Stack',
            content: `
<h3>Memory and the Stack</h3>

<h4>Memory Basics</h4>
<p>The 8086 has <strong>64 KB</strong> of memory &mdash; 65,536 individual bytes, each with an address from
<code>0000h</code> to <code>FFFFh</code>. You can read and write memory using square brackets:</p>
<pre><span class="kw">mov</span> <span class="reg">al</span>, [<span class="reg">bx</span>]       <span class="cmt">; read the byte at address BX into AL</span>
<span class="kw">mov</span> [<span class="reg">bx</span>], <span class="reg">al</span>       <span class="cmt">; write AL into the byte at address BX</span>
<span class="kw">mov</span> <span class="reg">al</span>, [<span class="reg">bx</span>+<span class="num">5</span>]     <span class="cmt">; read the byte at address BX+5</span></pre>

<h4>Data Section</h4>
<p>You can define variables in the <code>.data</code> section:</p>
<pre><span class="kw">.data</span>
<span class="lbl">count</span> <span class="kw">db</span> <span class="num">10</span>         <span class="cmt">; define a byte variable "count" = 10</span>
<span class="lbl">total</span> <span class="kw">dw</span> <span class="num">0</span>          <span class="cmt">; define a word (16-bit) variable "total" = 0</span>
<span class="kw">.code</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="lbl">count</span>      <span class="cmt">; load the value of "count" into AL</span></pre>

<h4>The Stack</h4>
<p>The stack is a <strong>Last-In, First-Out (LIFO)</strong> area of memory. Think of it like a stack of plates &mdash;
you can only add or remove from the top.</p>

<table class="help-table">
<tr><th>Instruction</th><th>What Happens</th></tr>
<tr><td><code>push ax</code></td><td>SP decreases by 2, then AX is stored at SS:SP</td></tr>
<tr><td><code>pop ax</code></td><td>The value at SS:SP is loaded into AX, then SP increases by 2</td></tr>
<tr><td><code>call label</code></td><td>Like PUSH IP (saves where to return), then jumps to label</td></tr>
<tr><td><code>ret</code></td><td>Like POP IP (jumps back to the saved return address)</td></tr>
</table>

<h4>Example: Using the Stack to Swap Values</h4>
<pre><span class="kw">mov</span> <span class="reg">al</span>, <span class="num">5</span>         <span class="cmt">; AL = 5</span>
<span class="kw">mov</span> <span class="reg">bl</span>, <span class="num">9</span>         <span class="cmt">; BL = 9</span>
<span class="kw">push</span> <span class="reg">ax</span>           <span class="cmt">; save AX (which has 5 in AL) on the stack</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="reg">bl</span>        <span class="cmt">; AL = 9</span>
<span class="kw">pop</span> <span class="reg">bx</span>            <span class="cmt">; BX gets the old AX value, so BL = 5</span>
<span class="cmt">; now AL=9, BL=5 (swapped!)</span></pre>
`
        },
        {
            id: 'mistakes',
            title: 'Common Mistakes',
            content: `
<h3>Common Mistakes</h3>
<p>Here are pitfalls that catch almost every beginner. Save yourself hours of debugging!</p>

<h4>1. Forgetting to set up DS</h4>
<div class="warn-box">
<strong>Wrong:</strong>
<pre><span class="kw">.code</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="lbl">myVar</span>    <span class="cmt">; DS is 0, so this reads from the wrong place!</span></pre>
<strong>Right:</strong>
<pre><span class="kw">.code</span>
<span class="kw">mov</span> <span class="reg">ax</span>, <span class="lbl">@data</span>
<span class="kw">mov</span> <span class="reg">ds</span>, <span class="reg">ax</span>        <span class="cmt">; now DS points to our .data section</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="lbl">myVar</span>    <span class="cmt">; correct!</span></pre>
</div>

<h4>2. Missing the program exit</h4>
<div class="warn-box">
<p>Without <code>mov ah, 4ch</code> / <code>int 21h</code> at the end, the CPU will keep executing random memory
as instructions, causing unpredictable behavior.</p>
</div>

<h4>3. Mixing 8-bit and 16-bit registers</h4>
<div class="warn-box">
<strong>Wrong:</strong> <code>mov al, bx</code> &mdash; AL is 8-bit, BX is 16-bit. Sizes must match!<br>
<strong>Right:</strong> <code>mov al, bl</code> (both 8-bit) or <code>mov ax, bx</code> (both 16-bit).
</div>

<h4>4. Hex numbers starting with a letter</h4>
<div class="warn-box">
<strong>Wrong:</strong> <code>mov al, FFh</code> &mdash; assembler sees "FFh" as a label name.<br>
<strong>Right:</strong> <code>mov al, 0FFh</code> &mdash; the leading <code>0</code> tells the assembler it's a number.
</div>

<h4>5. Infinite loops without an exit</h4>
<div class="warn-box">
<p>If your loop never changes the flag that the jump checks, it loops forever. For example:</p>
<pre><span class="lbl">loop:</span> <span class="kw">jmp</span> <span class="lbl">loop</span>   <span class="cmt">; this runs forever! (the simulator stops after 100,000 steps)</span></pre>
<p>Always make sure the loop condition will eventually become false (e.g., decrement a counter).</p>
</div>

<h4>6. Forgetting that CMP doesn't store the result</h4>
<div class="warn-box">
<p><code>CMP AL, 5</code> does NOT change AL. It only sets flags. If you need the subtracted value,
use <code>SUB AL, 5</code> instead.</p>
</div>
`
        },

        // ================================================================
        //  ADVANCED TOPICS
        // ================================================================

        {
            id: 'advanced-overview',
            title: 'Advanced Mode',
            content: `
<h3>Advanced Mode</h3>
<p>Toggle the <strong>Beginner / Advanced</strong> switch in the top-right corner to unlock powerful
extra features designed for deeper exploration of 8086 assembly.</p>

<h4>What Changes in Advanced Mode?</h4>
<table class="help-table">
<tr><th>Feature</th><th>Beginner</th><th>Advanced</th></tr>
<tr><td>Syntax Highlighting</td><td>Off</td><td><strong>On</strong> &mdash; mnemonics, registers, numbers, labels, and comments are color-coded in the editor</td></tr>
<tr><td>Autocomplete</td><td>Off</td><td><strong>On</strong> &mdash; start typing an instruction or register name and a dropdown appears</td></tr>
<tr><td>Breakpoints</td><td>Off</td><td><strong>On</strong> &mdash; click a line number in the gutter to set/remove a breakpoint</td></tr>
<tr><td>Step Backward</td><td>Off</td><td><strong>On</strong> &mdash; undo the last instruction and rewind the CPU state</td></tr>
<tr><td>Execution Trace</td><td>Hidden</td><td><strong>Visible</strong> &mdash; every executed instruction is logged with register snapshots</td></tr>
<tr><td>Live Register Editing</td><td>Off</td><td><strong>On</strong> &mdash; double-click any register value to change it in hex</td></tr>
<tr><td>Live Memory Editing</td><td>Off</td><td><strong>On</strong> &mdash; double-click any byte in the Memory Viewer to modify it</td></tr>
<tr><td>Flag Explanations</td><td>Hidden</td><td><strong>Visible</strong> &mdash; after each step, a line explains which flags changed and why</td></tr>
<tr><td>Cycle Counter</td><td>Hidden</td><td><strong>Visible</strong> &mdash; approximate clock cycle count for the executed instructions</td></tr>
<tr><td>Inline Errors</td><td>Console only</td><td><strong>Gutter marks</strong> &mdash; lines with assembly errors are highlighted red in the gutter</td></tr>
<tr><td>7-Segment Display</td><td>Hidden</td><td><strong>Visible</strong> &mdash; port 3 output shown as a hex digit</td></tr>
<tr><td>Pixel Display</td><td>Hidden</td><td><strong>Visible</strong> &mdash; 32&times;32 memory-mapped display</td></tr>
<tr><td>Keyboard Input</td><td>Hidden</td><td><strong>Visible</strong> &mdash; type characters and read them via ports 5/6</td></tr>
<tr><td>Challenges</td><td>Hidden</td><td><strong>Visible</strong> &mdash; guided coding tasks with auto-grading</td></tr>
<tr><td>Save / Load / Download</td><td>Hidden</td><td><strong>Visible</strong> &mdash; save programs to browser storage or download as <code>.asm</code></td></tr>
</table>

<div class="tip-box"><strong>Tip:</strong> Your mode choice is saved in your browser. Switch back to Beginner any time &mdash; your code stays in the editor.</div>
`
        },
        {
            id: 'debugger',
            title: 'Debugger Tools',
            content: `
<h3>Debugger Tools</h3>
<p>Advanced mode unlocks a full debugging toolkit. These features only activate when the
<strong>Advanced</strong> switch is on.</p>

<h4>Breakpoints</h4>
<p>Click any <strong>line number</strong> in the gutter (left of the code editor) to toggle a breakpoint.
A red dot appears. When you click <strong>Run</strong>, execution will pause just before that line executes.</p>
<ul>
<li>Set as many breakpoints as you like.</li>
<li>Click the line number again to remove a breakpoint.</li>
<li>Breakpoints are cleared when you click <strong>Reset</strong>.</li>
</ul>

<h4>Step Backward (Undo)</h4>
<p>After stepping forward, click <strong>Step Back</strong> (or use the keyboard shortcut) to rewind the
CPU by one instruction. The entire CPU state &mdash; registers, flags, memory, and I/O ports &mdash;
is restored to exactly what it was before that instruction executed.</p>
<ul>
<li>Up to <strong>1,000</strong> steps of history are kept.</li>
<li>History is cleared on Reset or when a new program is assembled.</li>
</ul>

<h4>Execution Trace</h4>
<p>The <strong>Trace</strong> panel (below the editor in Advanced mode) logs every instruction as it executes.
Each row shows:</p>
<table class="help-table">
<tr><th>Column</th><th>Meaning</th></tr>
<tr><td>Step</td><td>Instruction number (1, 2, 3, ...)</td></tr>
<tr><td>IP</td><td>Instruction Pointer value (hex) when the instruction ran</td></tr>
<tr><td>Mnemonic</td><td>The instruction that executed (MOV, ADD, JMP, etc.)</td></tr>
<tr><td>AX, BX, CX, DX</td><td>Register values <em>after</em> the instruction completed</td></tr>
<tr><td>Flags</td><td>Active flags (C=Carry, Z=Zero, S=Sign, O=Overflow, P=Parity, A=Aux)</td></tr>
</table>
<p>Click any trace row to highlight the corresponding source line in the editor.</p>
<p>Click <strong>Clear Trace</strong> to empty the log. Up to 5,000 entries are kept.</p>

<h4>Live Register Editing</h4>
<p><strong>Double-click</strong> any register value in the Registers panel to edit it.
Type a new hex value and press <strong>Enter</strong> to apply, or <strong>Escape</strong> to cancel.
This works for all 8-bit and 16-bit registers.</p>

<h4>Live Memory Editing</h4>
<p><strong>Double-click</strong> any byte in the <strong>Memory Viewer</strong> to change it.
Enter a 2-digit hex value (00&ndash;FF) and press <strong>Enter</strong>.
This is great for patching data or testing how your program handles different inputs.</p>

<h4>Flag Explanations</h4>
<p>After each step, a text line below the Flags panel explains the current flag state in plain English.
For example: <em>ADD: ZF=1 (result is zero), CF=1 (carry/borrow)</em>.</p>

<h4>Cycle Counter</h4>
<p>The cycle counter shows an approximate total of CPU clock cycles consumed. Each instruction
has an estimated cycle cost based on the 8086 datasheet. Useful for comparing algorithm efficiency.</p>

<div class="tip-box"><strong>Tip:</strong> Combine breakpoints with step-back for powerful debugging.
Run to a breakpoint, then step backward to see what happened just before the bug.</div>
`
        },
        {
            id: 'peripherals',
            title: 'Peripherals',
            content: `
<h3>Peripherals</h3>
<p>Beyond the basic LED output (port 2) and input port (port 1), the simulator provides several
peripheral devices that appear in Advanced mode.</p>

<h4>7-Segment Display (Port 3)</h4>
<p>Write a value to <strong>port 3</strong> and the low nibble (bits 0&ndash;3) is displayed as a hex digit
on a classic 7-segment display. The display shows digits <code>0</code>&ndash;<code>F</code>.</p>
<pre><span class="kw">mov</span> <span class="reg">al</span>, <span class="num">5</span>
<span class="kw">out</span> <span class="num">3</span>, <span class="reg">al</span>       <span class="cmt">; 7-segment shows "5"</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="num">0Ah</span>
<span class="kw">out</span> <span class="num">3</span>, <span class="reg">al</span>       <span class="cmt">; 7-segment shows "A"</span></pre>

<h4>Pixel Display (Port 4 + Memory E000h&ndash;E3FFh)</h4>
<p>A <strong>32&times;32 pixel grid</strong> (1,024 pixels) is memory-mapped at addresses
<code>E000h</code> through <code>E3FFh</code>. Each byte controls one pixel's color:</p>
<table class="help-table">
<tr><th>Value (bits 0&ndash;2)</th><th>Color</th></tr>
<tr><td>0</td><td>Black (background)</td></tr>
<tr><td>1</td><td>Green</td></tr>
<tr><td>2</td><td>Blue</td></tr>
<tr><td>3</td><td>Red/Pink</td></tr>
<tr><td>4</td><td>Yellow/Amber</td></tr>
<tr><td>5</td><td>Purple</td></tr>
<tr><td>6</td><td>Cyan</td></tr>
<tr><td>7</td><td>White</td></tr>
</table>
<p>After writing pixel data to memory, write <em>any</em> value to <strong>port 4</strong> to refresh the display:</p>
<pre><span class="kw">mov</span> <span class="reg">bx</span>, <span class="num">0E000h</span>   <span class="cmt">; first pixel address</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="num">1</span>         <span class="cmt">; color 1 = green</span>
<span class="kw">mov</span> [<span class="reg">bx</span>], <span class="reg">al</span>      <span class="cmt">; set pixel (0,0) to green</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="num">1</span>
<span class="kw">out</span> <span class="num">4</span>, <span class="reg">al</span>         <span class="cmt">; refresh the pixel display</span></pre>
<p>Pixel layout: address <code>E000h + row*32 + col</code>, where row and col are 0&ndash;31.</p>

<h4>Keyboard Input (Ports 5 &amp; 6)</h4>
<p>Type characters into the <strong>Keyboard</strong> panel. They go into a buffer that your program can read:</p>
<table class="help-table">
<tr><th>Port</th><th>Direction</th><th>What it Does</th></tr>
<tr><td><code>6</code></td><td>Read (<code>IN</code>)</td><td>Returns the number of characters waiting in the buffer (0 = empty)</td></tr>
<tr><td><code>5</code></td><td>Read (<code>IN</code>)</td><td>Reads and <em>removes</em> the next character from the buffer (ASCII code)</td></tr>
</table>
<pre><span class="kw">in</span> <span class="reg">al</span>, <span class="num">6</span>         <span class="cmt">; AL = number of keys in buffer</span>
<span class="kw">cmp</span> <span class="reg">al</span>, <span class="num">0</span>
<span class="kw">je</span> <span class="lbl">no_key</span>        <span class="cmt">; skip if nothing typed</span>
<span class="kw">in</span> <span class="reg">al</span>, <span class="num">5</span>         <span class="cmt">; AL = ASCII code of next character</span>
<span class="kw">out</span> <span class="num">2</span>, <span class="reg">al</span>        <span class="cmt">; display it on LEDs</span></pre>

<h4>Timer Interrupt (Port 7)</h4>
<p>Write a non-zero value to <strong>port 7</strong> to start a timer. Every N instructions (where N is
the value you wrote), a hardware interrupt fires. The interrupt handler address is read from
the interrupt vector at memory address <code>0080h</code>&ndash;<code>0081h</code> (16-bit, little-endian).</p>
<pre><span class="cmt">; Set up interrupt handler</span>
<span class="kw">mov</span> <span class="reg">bx</span>, <span class="num">0080h</span>    <span class="cmt">; interrupt vector address</span>
<span class="kw">lea</span> <span class="reg">ax</span>, [<span class="lbl">my_isr</span>] <span class="cmt">; address of our handler</span>
<span class="kw">mov</span> [<span class="reg">bx</span>], <span class="reg">al</span>      <span class="cmt">; store low byte</span>
<span class="kw">inc</span> <span class="reg">bx</span>
<span class="kw">mov</span> [<span class="reg">bx</span>], <span class="reg">ah</span>      <span class="cmt">; store high byte</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="num">50</span>        <span class="cmt">; fire every 50 instructions</span>
<span class="kw">out</span> <span class="num">7</span>, <span class="reg">al</span>         <span class="cmt">; start timer</span></pre>
<p>Write <code>0</code> to port 7 to disable the timer. Use <code>IRET</code> (not <code>RET</code>) to return from the handler.</p>

<h4>Speaker (Port 61h)</h4>
<p>Write a value with <strong>bit 0 set</strong> to port <code>61h</code> to produce a short beep sound.
Clear bit 0 to stop. This mimics the classic PC speaker port.</p>
<pre><span class="kw">mov</span> <span class="reg">al</span>, <span class="num">1</span>         <span class="cmt">; bit 0 = on</span>
<span class="kw">out</span> <span class="num">61h</span>, <span class="reg">al</span>       <span class="cmt">; beep!</span>
<span class="kw">and</span> <span class="reg">al</span>, <span class="num">0FEh</span>      <span class="cmt">; clear bit 0</span>
<span class="kw">out</span> <span class="num">61h</span>, <span class="reg">al</span>       <span class="cmt">; silence</span></pre>

<div class="tip-box"><strong>Tip:</strong> Load the "Advanced: Pixel Drawing" or "Advanced: Keyboard Echo" samples to see these peripherals in action.</div>
`
        },
        {
            id: 'port-map',
            title: 'I/O Port Map',
            content: `
<h3>I/O Port Map</h3>
<p>The simulator provides the following I/O ports, accessed with <code>IN</code> and <code>OUT</code> instructions.</p>

<table class="help-table">
<tr><th>Port</th><th>Direction</th><th>Device</th><th>Description</th></tr>
<tr><td><code>1</code></td><td>Read</td><td>Input Port</td><td>Returns the value set in the I/O Ports panel. Change it before running your program.</td></tr>
<tr><td><code>2</code></td><td>Write</td><td>LED Display</td><td>8 LEDs. Each bit controls one LED (bit 0 = LED 0, bit 7 = LED 7).</td></tr>
<tr><td><code>3</code></td><td>Write</td><td>7-Segment Display</td><td>Low nibble (bits 0&ndash;3) shown as a hex digit 0&ndash;F. <em>(Advanced only)</em></td></tr>
<tr><td><code>4</code></td><td>Write</td><td>Pixel Display Refresh</td><td>Writing any value refreshes the 32&times;32 pixel grid from memory E000h. <em>(Advanced only)</em></td></tr>
<tr><td><code>5</code></td><td>Read</td><td>Keyboard Character</td><td>Reads and removes the next ASCII character from the keyboard buffer. Returns 0 if empty. <em>(Advanced only)</em></td></tr>
<tr><td><code>6</code></td><td>Read</td><td>Keyboard Buffer Length</td><td>Returns the number of characters waiting in the keyboard buffer (0&ndash;255). <em>(Advanced only)</em></td></tr>
<tr><td><code>7</code></td><td>Write</td><td>Timer Interval</td><td>Sets the timer interrupt interval (in steps). 0 = disabled. Non-zero = fire interrupt every N steps. <em>(Advanced only)</em></td></tr>
<tr><td><code>61h</code></td><td>Write</td><td>PC Speaker</td><td>Bit 0 = 1 produces a short beep. Classic PC speaker emulation.</td></tr>
</table>

<h4>Reading a Port</h4>
<pre><span class="kw">in</span> <span class="reg">al</span>, <span class="num">1</span>         <span class="cmt">; read input port into AL</span>
<span class="kw">in</span> <span class="reg">al</span>, <span class="num">5</span>         <span class="cmt">; read keyboard character into AL</span></pre>

<h4>Writing to a Port</h4>
<pre><span class="kw">out</span> <span class="num">2</span>, <span class="reg">al</span>        <span class="cmt">; write AL to LED port</span>
<span class="kw">out</span> <span class="num">3</span>, <span class="reg">al</span>        <span class="cmt">; write AL to 7-segment</span></pre>

<h4>Using DX for Port Address</h4>
<p>For ports with numbers larger than 255, or when you want to use a variable port number,
load the port number into DX:</p>
<pre><span class="kw">mov</span> <span class="reg">dx</span>, <span class="num">61h</span>      <span class="cmt">; speaker port number</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="num">1</span>
<span class="kw">out</span> <span class="reg">dx</span>, <span class="reg">al</span>       <span class="cmt">; write to port in DX</span></pre>

<div class="tip-box"><strong>Tip:</strong> Ports 1 and 2 work in both Beginner and Advanced mode. All other ports require Advanced mode to see their associated displays.</div>
`
        },
        {
            id: 'string-ops',
            title: 'String Operations',
            content: `
<h3>String Operations</h3>
<p>The 8086 has special single-byte instructions for processing arrays and strings efficiently.
They all use <code>SI</code> (source index) and/or <code>DI</code> (destination index) as pointers,
and the <strong>direction flag</strong> controls whether pointers move forward or backward.</p>

<h4>Direction Flag</h4>
<table class="help-table">
<tr><th>Instruction</th><th>Effect</th></tr>
<tr><td><code>CLD</code></td><td>Clear direction flag &rarr; SI/DI <strong>increment</strong> (move forward). <em>This is the normal/default.</em></td></tr>
<tr><td><code>STD</code></td><td>Set direction flag &rarr; SI/DI <strong>decrement</strong> (move backward).</td></tr>
</table>

<h4>String Instructions</h4>
<table class="help-table">
<tr><th>Instruction</th><th>What it Does</th><th>Registers Used</th></tr>
<tr><td><code>MOVSB</code></td><td>Copy byte from <code>DS:SI</code> to <code>ES:DI</code>, then advance SI and DI</td><td>SI, DI</td></tr>
<tr><td><code>LODSB</code></td><td>Load byte from <code>DS:SI</code> into <code>AL</code>, then advance SI</td><td>SI, AL</td></tr>
<tr><td><code>STOSB</code></td><td>Store <code>AL</code> into <code>ES:DI</code>, then advance DI</td><td>DI, AL</td></tr>
<tr><td><code>CMPSB</code></td><td>Compare byte at <code>DS:SI</code> with byte at <code>ES:DI</code>, set flags, advance both</td><td>SI, DI</td></tr>
<tr><td><code>SCASB</code></td><td>Compare <code>AL</code> with byte at <code>ES:DI</code>, set flags, advance DI</td><td>DI, AL</td></tr>
</table>

<h4>REP Prefixes</h4>
<p>Prefix a string instruction with <code>REP</code> to repeat it <code>CX</code> times automatically:</p>
<table class="help-table">
<tr><th>Prefix</th><th>Repeats While...</th><th>Best With</th></tr>
<tr><td><code>REP</code></td><td>CX &ne; 0 (decrements CX each iteration)</td><td>MOVSB, STOSB, LODSB</td></tr>
<tr><td><code>REPE</code> / <code>REPZ</code></td><td>CX &ne; 0 AND ZF = 1</td><td>CMPSB, SCASB</td></tr>
<tr><td><code>REPNE</code> / <code>REPNZ</code></td><td>CX &ne; 0 AND ZF = 0</td><td>CMPSB, SCASB</td></tr>
</table>

<h4>Example: Copy 5 Bytes</h4>
<pre><span class="kw">mov</span> <span class="reg">ax</span>, <span class="lbl">@data</span>
<span class="kw">mov</span> <span class="reg">ds</span>, <span class="reg">ax</span>
<span class="kw">mov</span> <span class="reg">es</span>, <span class="reg">ax</span>        <span class="cmt">; ES must equal DS for same-segment copy</span>
<span class="kw">mov</span> <span class="reg">si</span>, <span class="num">0</span>         <span class="cmt">; source offset</span>
<span class="kw">mov</span> <span class="reg">di</span>, <span class="num">100</span>       <span class="cmt">; destination offset</span>
<span class="kw">mov</span> <span class="reg">cx</span>, <span class="num">5</span>         <span class="cmt">; number of bytes</span>
<span class="kw">cld</span>                <span class="cmt">; direction = forward</span>
<span class="kw">rep</span> <span class="kw">movsb</span>         <span class="cmt">; copy CX bytes from DS:SI to ES:DI</span></pre>

<h4>Example: Fill 10 Bytes with Zero</h4>
<pre><span class="kw">mov</span> <span class="reg">ax</span>, <span class="lbl">@data</span>
<span class="kw">mov</span> <span class="reg">es</span>, <span class="reg">ax</span>
<span class="kw">mov</span> <span class="reg">di</span>, <span class="num">0</span>         <span class="cmt">; destination offset</span>
<span class="kw">xor</span> <span class="reg">al</span>, <span class="reg">al</span>        <span class="cmt">; AL = 0</span>
<span class="kw">mov</span> <span class="reg">cx</span>, <span class="num">10</span>        <span class="cmt">; 10 bytes</span>
<span class="kw">cld</span>
<span class="kw">rep</span> <span class="kw">stosb</span>         <span class="cmt">; store AL into ES:DI, CX times</span></pre>

<h4>XLATB</h4>
<p><code>XLATB</code> (translate byte) uses <code>BX</code> as a base address and <code>AL</code> as an index.
It loads <code>AL</code> with the byte at <code>DS:[BX + AL]</code>. Perfect for lookup tables:</p>
<pre><span class="cmt">; Suppose [BX+0]=10, [BX+1]=20, [BX+2]=30, ...</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="num">2</span>         <span class="cmt">; index = 2</span>
<span class="kw">xlatb</span>              <span class="cmt">; AL = [BX+2] = 30</span></pre>

<div class="tip-box"><strong>Important:</strong> For <code>MOVSB</code>, <code>STOSB</code>, <code>CMPSB</code>, and <code>SCASB</code>,
the destination segment is always <strong>ES</strong>, not DS. Make sure to set <code>ES</code> before using these instructions:
<code>mov ax, @data</code> / <code>mov es, ax</code>.</div>
`
        },
        {
            id: 'advanced-instructions',
            title: 'Advanced Instructions',
            content: `
<h3>Advanced Instructions</h3>
<p>These instructions go beyond the basics covered earlier.</p>

<h4>LOOP Variants</h4>
<table class="help-table">
<tr><th>Instruction</th><th>Action</th><th>Jumps Back If...</th></tr>
<tr><td><code>LOOP label</code></td><td>CX = CX &minus; 1</td><td>CX &ne; 0</td></tr>
<tr><td><code>LOOPE label</code> / <code>LOOPZ</code></td><td>CX = CX &minus; 1</td><td>CX &ne; 0 <strong>and</strong> ZF = 1</td></tr>
<tr><td><code>LOOPNE label</code> / <code>LOOPNZ</code></td><td>CX = CX &minus; 1</td><td>CX &ne; 0 <strong>and</strong> ZF = 0</td></tr>
</table>
<pre><span class="kw">mov</span> <span class="reg">cx</span>, <span class="num">10</span>        <span class="cmt">; loop 10 times</span>
<span class="lbl">again:</span>
    <span class="kw">inc</span> <span class="reg">al</span>
    <span class="kw">loop</span> <span class="lbl">again</span>      <span class="cmt">; CX--, jump if CX != 0</span></pre>

<h4>Data Conversion</h4>
<table class="help-table">
<tr><th>Instruction</th><th>What it Does</th><th>Example</th></tr>
<tr><td><code>CBW</code></td><td>Sign-extend AL into AX. If bit 7 of AL is 1, AH becomes FFh; otherwise AH becomes 00h.</td>
    <td>AL = 80h &rarr; AX = FF80h<br>AL = 05h &rarr; AX = 0005h</td></tr>
<tr><td><code>CWD</code></td><td>Sign-extend AX into DX:AX. If bit 15 of AX is 1, DX becomes FFFFh; otherwise DX becomes 0000h.</td>
    <td>AX = 8000h &rarr; DX = FFFFh<br>AX = 0100h &rarr; DX = 0000h</td></tr>
</table>

<h4>Flag Manipulation</h4>
<table class="help-table">
<tr><th>Instruction</th><th>Effect</th></tr>
<tr><td><code>STC</code></td><td>Set Carry Flag (CF = 1)</td></tr>
<tr><td><code>CLC</code></td><td>Clear Carry Flag (CF = 0)</td></tr>
<tr><td><code>CMC</code></td><td>Complement (toggle) Carry Flag</td></tr>
<tr><td><code>STD</code></td><td>Set Direction Flag (string ops go backward)</td></tr>
<tr><td><code>CLD</code></td><td>Clear Direction Flag (string ops go forward)</td></tr>
<tr><td><code>CLI</code></td><td>Clear Interrupt Flag (disable interrupts)</td></tr>
<tr><td><code>STI</code></td><td>Set Interrupt Flag (enable interrupts)</td></tr>
<tr><td><code>LAHF</code></td><td>Load flags (SF, ZF, AF, PF, CF) into AH</td></tr>
<tr><td><code>SAHF</code></td><td>Store AH into flags (SF, ZF, AF, PF, CF)</td></tr>
</table>

<h4>Interrupts</h4>
<table class="help-table">
<tr><th>Instruction</th><th>What it Does</th></tr>
<tr><td><code>INT n</code></td><td>Software interrupt. Pushes flags and return address, jumps to handler. <code>INT 21h</code> with <code>AH=4Ch</code> exits the program.</td></tr>
<tr><td><code>IRET</code></td><td>Return from interrupt. Pops IP and flags from the stack. Use this (not RET) inside interrupt handlers.</td></tr>
</table>
<pre><span class="cmt">; Exit program</span>
<span class="kw">mov</span> <span class="reg">ah</span>, <span class="num">4ch</span>       <span class="cmt">; function 4Ch = exit</span>
<span class="kw">int</span> <span class="num">21h</span>           <span class="cmt">; call DOS interrupt</span></pre>

<h4>Additional Instructions</h4>
<table class="help-table">
<tr><th>Instruction</th><th>What it Does</th></tr>
<tr><td><code>XCHG a, b</code></td><td>Swap the values of a and b</td></tr>
<tr><td><code>LEA reg, [addr]</code></td><td>Load Effective Address &mdash; puts the <em>address</em> (not the value) into the register</td></tr>
<tr><td><code>XLATB</code></td><td>AL = DS:[BX + AL] (table lookup)</td></tr>
</table>

<div class="tip-box"><strong>Tip:</strong> <code>CBW</code> is essential before signed division. If you have a signed byte in AL
and want to divide it, use <code>CBW</code> first to sign-extend it to AX, then <code>DIV</code> or <code>IDIV</code>.</div>
`
        },
        {
            id: 'memory-map',
            title: 'Memory Map',
            content: `
<h3>Memory Map</h3>
<p>The simulator provides 64 KB (65,536 bytes) of memory, addressed from <code>0000h</code> to <code>FFFFh</code>.
Here is how it is organized:</p>

<table class="help-table">
<tr><th>Address Range</th><th>Segment</th><th>Purpose</th></tr>
<tr><td><code>0000h&ndash;007Fh</code></td><td>&mdash;</td><td>Available memory (low addresses)</td></tr>
<tr><td><code>0080h&ndash;0081h</code></td><td>&mdash;</td><td>Timer interrupt vector (16-bit handler address, little-endian)</td></tr>
<tr><td><code>0082h&ndash;0FFFh</code></td><td>&mdash;</td><td>Available memory</td></tr>
<tr><td><code>1000h + offset</code></td><td><code>DS</code></td><td><strong>Data Segment</strong> &mdash; your <code>.data</code> variables live here</td></tr>
<tr><td><code>2000h + offset</code></td><td><code>SS</code></td><td><strong>Stack Segment</strong> &mdash; the stack (grows downward from SP = 0100h)</td></tr>
<tr><td><code>E000h&ndash;E3FFh</code></td><td>&mdash;</td><td><strong>Pixel Display</strong> &mdash; 1,024 bytes, one per pixel (32&times;32 grid)</td></tr>
</table>

<h4>Segment:Offset Addressing</h4>
<p>The 8086 uses segment registers to form a full address. In this simulator, the physical address
is simply <code>segment + offset</code> (simplified from the real 8086&rsquo;s <code>segment &times; 16 + offset</code>).</p>
<ul>
<li><code>DS:0000</code> = physical address <code>1000h</code> (the first byte of your data section)</li>
<li><code>SS:00FE</code> = physical address <code>20FEh</code> (top of the stack)</li>
</ul>

<h4>Data Section Variables</h4>
<p>Variables declared with <code>DB</code> (define byte) or <code>DW</code> (define word) in the <code>.data</code>
section are placed at consecutive offsets starting from 0:</p>
<pre><span class="kw">.data</span>
<span class="lbl">first</span>  <span class="kw">db</span> <span class="num">10</span>      <span class="cmt">; offset 0 in DS</span>
<span class="lbl">second</span> <span class="kw">db</span> <span class="num">20</span>      <span class="cmt">; offset 1 in DS</span>
<span class="lbl">total</span>  <span class="kw">dw</span> <span class="num">0</span>       <span class="cmt">; offset 2 in DS (2 bytes)</span></pre>
<p>Access them by name: <code>mov al, first</code> reads the byte at DS:0000.</p>

<h4>Stack Layout</h4>
<p>The stack starts at <code>SS:0100h</code> and grows <strong>downward</strong>. When you <code>PUSH AX</code>,
SP decreases by 2 and the value is stored at SS:SP. The Memory Viewer's "Stack" segment
lets you see the stack contents directly.</p>

<h4>EQU Constants</h4>
<p>Use <code>EQU</code> to define named constants that don't use memory:</p>
<pre><span class="lbl">LED_PORT</span> <span class="kw">equ</span> <span class="num">2</span>
<span class="lbl">ON</span>       <span class="kw">equ</span> <span class="num">0FFh</span>
<span class="kw">mov</span> <span class="reg">al</span>, <span class="lbl">ON</span>
<span class="kw">out</span> <span class="lbl">LED_PORT</span>, <span class="reg">al</span></pre>

<div class="tip-box"><strong>Tip:</strong> Use the Memory Viewer (bottom panel) to inspect any segment. Switch between
Data, Stack, and Code segments using the dropdown, and type an address in the hex input to jump there.</div>
`
        },
        {
            id: 'save-load',
            title: 'Save, Load & Challenges',
            content: `
<h3>Save, Load &amp; Challenges</h3>
<p>Advanced mode adds tools to manage your programs and test your skills.</p>

<h4>Saving Programs</h4>
<ol>
<li>Click the <strong>Save</strong> button in the toolbar.</li>
<li>Enter a name for your program (e.g., "my_sort").</li>
<li>The program is stored in your browser's <strong>localStorage</strong>. It persists even if you close the tab.</li>
</ol>

<h4>Loading Programs</h4>
<ol>
<li>Use the <strong>Load Saved</strong> dropdown in the toolbar.</li>
<li>Select a previously saved program. It replaces the current code in the editor.</li>
</ol>

<h4>Download as .ASM File</h4>
<p>Click <strong>Download</strong> to save the current code as a <code>program.asm</code> file on your computer.
You can open this file in any text editor or real assembler.</p>

<h4>Open a File</h4>
<p>Click <strong>Open</strong> to load a <code>.asm</code> file from your computer into the editor.</p>

<h4>Coding Challenges</h4>
<p>The <strong>Challenges</strong> panel (visible in Advanced mode) offers guided tasks with automatic checking:</p>
<table class="help-table">
<tr><th>Challenge</th><th>Goal</th></tr>
<tr><td>Set AX to 42</td><td>Write a program that ends with AX = 42 (002Ah)</td></tr>
<tr><td>Light LEDs 0 and 7</td><td>Port 2 should be 81h (only LEDs 0 and 7 on)</td></tr>
<tr><td>Sort 4 Bytes</td><td>Sort the bytes at DS:0000&ndash;0003 in ascending order</td></tr>
<tr><td>Multiply 6 &times; 7 (no MUL)</td><td>Calculate 42 using only ADD, store in AX</td></tr>
<tr><td>Count to 20 with LOOP</td><td>Use the LOOP instruction; display 20 on LEDs</td></tr>
</table>
<p>How to use:</p>
<ol>
<li>Click a challenge card to load its starter code.</li>
<li>Write your solution between the setup and exit lines.</li>
<li>Click <strong>Assemble</strong>, then <strong>Run</strong>.</li>
<li>Click <strong>Check</strong> to verify your solution. The checker inspects registers, ports, and memory.</li>
</ol>

<div class="tip-box"><strong>Tip:</strong> If a check fails, it tells you what value it expected and what it got.
Use the debugger (Step, Trace, Breakpoints) to find where your program goes wrong.</div>
`
        },
        {
            id: 'syntax-highlight',
            title: 'Editor Features',
            content: `
<h3>Editor Features</h3>
<p>In Advanced mode, the code editor gains powerful productivity features.</p>

<h4>Syntax Highlighting</h4>
<p>Your code is color-coded as you type:</p>
<table class="help-table">
<tr><th>Element</th><th>Color</th><th>Examples</th></tr>
<tr><td>Instructions (mnemonics)</td><td>Keyword color</td><td><code>mov</code>, <code>add</code>, <code>jmp</code>, <code>loop</code></td></tr>
<tr><td>Registers</td><td>Register color</td><td><code>al</code>, <code>ax</code>, <code>bx</code>, <code>si</code></td></tr>
<tr><td>Numbers</td><td>Number color</td><td><code>42</code>, <code>0FFh</code>, <code>101010b</code></td></tr>
<tr><td>Labels</td><td>Label color</td><td><code>start:</code>, <code>loop1:</code></td></tr>
<tr><td>Directives</td><td>Directive color</td><td><code>.data</code>, <code>.code</code>, <code>db</code>, <code>equ</code></td></tr>
<tr><td>Memory references</td><td>Memory color</td><td><code>[bx]</code>, <code>[si+4]</code></td></tr>
<tr><td>Comments</td><td>Comment color</td><td><code>; this is a comment</code></td></tr>
</table>

<h4>Autocomplete</h4>
<p>Start typing an instruction or register name and a <strong>dropdown</strong> appears with matching suggestions:</p>
<ul>
<li><strong>Tab</strong> or <strong>Enter</strong> &mdash; accept the highlighted suggestion</li>
<li><strong>&uarr; / &darr;</strong> &mdash; navigate the suggestion list</li>
<li><strong>Escape</strong> &mdash; dismiss the dropdown</li>
<li>Each suggestion shows a tag: <code>instr</code> for instructions, <code>reg</code> for registers</li>
</ul>

<h4>Inline Error Markers</h4>
<p>When assembly fails, lines with errors are marked with a <strong>red highlight</strong> in the gutter.
Hover over the red line number to see the error message. Errors also appear in the console.</p>

<h4>Keyboard Shortcuts</h4>
<table class="help-table">
<tr><th>Shortcut</th><th>Action</th></tr>
<tr><td><code>Ctrl + Enter</code></td><td>Assemble</td></tr>
<tr><td><code>F1</code></td><td>Open Help</td></tr>
<tr><td><code>Escape</code></td><td>Close Help / Dismiss autocomplete</td></tr>
</table>

<div class="tip-box"><strong>Tip:</strong> Autocomplete is especially useful for long instruction names like <code>loopne</code> or
register names you might misspell. Just type the first 2&ndash;3 letters and press Tab.</div>
`
        }
    ];

    // ========================================================
    //  QUIZZES
    // ========================================================

    const QUIZZES = [
        {
            id: 'quiz-registers',
            title: 'Quiz 1: Registers and Basics',
            description: '5 questions about registers, MOV, and program structure.',
            questions: [
                {
                    q: '1. Which register is commonly called the "Accumulator"?',
                    options: ['BX', 'AX', 'CX', 'DX'],
                    answer: 1,
                    explanation: 'AX is the Accumulator. It is the most common register for arithmetic and I/O operations.'
                },
                {
                    q: '2. What does <code>MOV AL, 5</code> do?',
                    options: [
                        'Adds 5 to AL',
                        'Compares AL with 5',
                        'Copies the value 5 into AL',
                        'Sends 5 to the LEDs'
                    ],
                    answer: 2,
                    explanation: 'MOV copies (moves) a value into the destination. AL becomes 5.'
                },
                {
                    q: '3. If AX = 1A2Bh, what is the value of AL?',
                    options: ['1Ah', '2Bh', '1A2Bh', '00h'],
                    answer: 1,
                    explanation: 'AL is the low byte of AX. In 1A2Bh, the low byte is 2Bh and the high byte (AH) is 1Ah.'
                },
                {
                    q: '4. What does the IP register hold?',
                    options: [
                        'The input port value',
                        'The address of the next instruction to execute',
                        'The result of the last calculation',
                        'The Internet Protocol address'
                    ],
                    answer: 1,
                    explanation: 'IP (Instruction Pointer) always points to the next instruction the CPU will execute.'
                },
                {
                    q: '5. What two lines must appear at the end of every program?',
                    options: [
                        '<code>hlt</code> and <code>end</code>',
                        '<code>mov ah, 4ch</code> and <code>int 21h</code> (before <code>end</code>)',
                        '<code>ret</code> and <code>end</code>',
                        '<code>pop ax</code> and <code>end</code>'
                    ],
                    answer: 1,
                    explanation: 'MOV AH, 4Ch sets up the DOS exit function, and INT 21h calls it. The "end" directive tells the assembler the source file is finished.'
                }
            ]
        },
        {
            id: 'quiz-arithmetic',
            title: 'Quiz 2: Arithmetic and Flags',
            description: '5 questions about ADD, SUB, CMP, and CPU flags.',
            questions: [
                {
                    q: '1. After <code>MOV AL, 3</code> then <code>ADD AL, 5</code>, what is AL?',
                    options: ['3', '5', '8', '15'],
                    answer: 2,
                    explanation: 'ADD adds the source to the destination: 3 + 5 = 8.'
                },
                {
                    q: '2. Which flag is set to 1 when the result of an operation is zero?',
                    options: ['CF (Carry)', 'ZF (Zero)', 'SF (Sign)', 'OF (Overflow)'],
                    answer: 1,
                    explanation: 'ZF (Zero Flag) is set to 1 when the result is exactly 0.'
                },
                {
                    q: '3. What does <code>CMP AL, BL</code> do?',
                    options: [
                        'Copies BL into AL',
                        'Subtracts BL from AL and stores the result in AL',
                        'Subtracts BL from AL but only changes the flags (AL stays the same)',
                        'Checks if AL and BL are the same register'
                    ],
                    answer: 2,
                    explanation: 'CMP performs a subtraction but throws away the result. It only sets the flags, which you can then test with conditional jumps.'
                },
                {
                    q: '4. If AL = FFh (255) and you do <code>ADD AL, 1</code>, what happens?',
                    options: [
                        'AL becomes 256',
                        'An error occurs',
                        'AL wraps to 00h and CF (Carry Flag) is set to 1',
                        'AL stays at FFh'
                    ],
                    answer: 2,
                    explanation: 'AL is 8 bits, so it can only hold 0-255. Adding 1 to 255 wraps around to 0, and CF is set because a carry occurred.'
                },
                {
                    q: '5. What does <code>INC CX</code> do?',
                    options: [
                        'Sets CX to 1',
                        'Adds 1 to CX',
                        'Reads from input port CX',
                        'Clears CX to zero'
                    ],
                    answer: 1,
                    explanation: 'INC (increment) adds 1 to the operand. CX becomes CX + 1.'
                }
            ]
        },
        {
            id: 'quiz-jumps',
            title: 'Quiz 3: Loops and Jumps',
            description: '5 questions about JMP, conditional jumps, CALL, and loops.',
            questions: [
                {
                    q: '1. What does <code>JMP start</code> do?',
                    options: [
                        'Jumps to the label "start" only if ZF = 1',
                        'Always jumps to the label "start"',
                        'Starts the program over from the beginning',
                        'Saves the address and calls a subroutine "start"'
                    ],
                    answer: 1,
                    explanation: 'JMP is an unconditional jump. It always goes to the target label, no matter what the flags say.'
                },
                {
                    q: '2. When does <code>JNZ label</code> (Jump if Not Zero) actually jump?',
                    options: [
                        'When the last result was zero (ZF = 1)',
                        'When the last result was NOT zero (ZF = 0)',
                        'When there was a carry (CF = 1)',
                        'Always'
                    ],
                    answer: 1,
                    explanation: 'JNZ jumps when ZF = 0, meaning the previous operation produced a non-zero result.'
                },
                {
                    q: '3. How do you make a loop that runs 10 times?',
                    options: [
                        '<code>mov cl, 10</code> / loop body / <code>dec cl</code> / <code>jnz loop_start</code>',
                        '<code>mov cl, 10</code> / <code>jmp loop_start</code>',
                        '<code>loop 10</code>',
                        '<code>for cl = 1 to 10</code>'
                    ],
                    answer: 0,
                    explanation: 'Set a counter (CL = 10), do the loop body, decrement the counter, and jump back if it is not zero yet.'
                },
                {
                    q: '4. What is the difference between <code>CALL</code> and <code>JMP</code>?',
                    options: [
                        'There is no difference',
                        'CALL saves the return address on the stack so RET can come back; JMP does not',
                        'JMP is faster than CALL',
                        'CALL only works with registers'
                    ],
                    answer: 1,
                    explanation: 'CALL pushes the return address onto the stack before jumping. RET pops it to return. JMP just jumps with no way to come back.'
                },
                {
                    q: '5. What does <code>RET</code> do?',
                    options: [
                        'Resets all registers',
                        'Returns a value in AX',
                        'Pops the return address from the stack and jumps there',
                        'Ends the program'
                    ],
                    answer: 2,
                    explanation: 'RET pops the top of the stack (which CALL put there) into IP, so execution continues right after the original CALL.'
                }
            ]
        },

        // ================================================================
        //  ADVANCED QUIZZES
        // ================================================================

        {
            id: 'quiz-peripherals',
            title: 'Quiz 4: Peripherals & I/O',
            description: '5 questions about ports, LEDs, 7-segment display, keyboard, and pixel display.',
            questions: [
                {
                    q: '1. Which port number controls the LED display?',
                    options: ['Port 1', 'Port 2', 'Port 3', 'Port 4'],
                    answer: 1,
                    explanation: 'Port 2 is the LED output port. Writing a byte to port 2 controls the 8 LEDs (each bit = one LED).'
                },
                {
                    q: '2. What does <code>OUT 3, AL</code> do when AL = 0Ah?',
                    options: [
                        'Turns on LED 3',
                        'Displays the letter "A" on the 7-segment display',
                        'Reads from port 3 into AL',
                        'Sends data to the pixel display'
                    ],
                    answer: 1,
                    explanation: 'Port 3 drives the 7-segment display. The low nibble (bits 0-3) is shown as a hex digit. 0Ah = "A".'
                },
                {
                    q: '3. How do you check if there are characters waiting in the keyboard buffer?',
                    options: [
                        '<code>in al, 5</code>',
                        '<code>in al, 6</code>',
                        '<code>out 5, al</code>',
                        '<code>in al, 1</code>'
                    ],
                    answer: 1,
                    explanation: 'Port 6 returns the number of characters in the keyboard buffer. Port 5 reads and removes the next character.'
                },
                {
                    q: '4. Where in memory is the 32×32 pixel display mapped?',
                    options: [
                        '0000h-03FFh',
                        '1000h-13FFh',
                        '2000h-23FFh',
                        'E000h-E3FFh'
                    ],
                    answer: 3,
                    explanation: 'The pixel display is memory-mapped at E000h through E3FFh. Each byte controls one pixel (1,024 pixels total).'
                },
                {
                    q: '5. What must you do after writing pixel data to memory to see the changes?',
                    options: [
                        'Call INT 21h',
                        'Write any value to port 4',
                        'Write 1 to port 2',
                        'Nothing, it updates automatically'
                    ],
                    answer: 1,
                    explanation: 'Writing any value to port 4 triggers a refresh of the pixel display from the memory-mapped region at E000h.'
                }
            ]
        },
        {
            id: 'quiz-string-ops',
            title: 'Quiz 5: String Operations',
            description: '5 questions about MOVSB, STOSB, REP, direction flag, and XLATB.',
            questions: [
                {
                    q: '1. What does the <code>CLD</code> instruction do?',
                    options: [
                        'Clears the data segment',
                        'Clears the direction flag (string ops move forward)',
                        'Clears the carry flag',
                        'Closes the debugger'
                    ],
                    answer: 1,
                    explanation: 'CLD clears the direction flag. With DF=0, string instructions like MOVSB increment SI and DI (move forward through memory).'
                },
                {
                    q: '2. Which registers does <code>MOVSB</code> use?',
                    options: [
                        'AL and BL',
                        'AX and BX',
                        'SI (source) and DI (destination)',
                        'CX and DX'
                    ],
                    answer: 2,
                    explanation: 'MOVSB copies a byte from DS:SI to ES:DI, then advances both SI and DI by 1 (or -1 if direction flag is set).'
                },
                {
                    q: '3. What does <code>REP STOSB</code> do?',
                    options: [
                        'Repeats storing AL into ES:DI, CX times, decrementing CX each time',
                        'Repeats loading a byte from DS:SI into AL',
                        'Compares strings and repeats while equal',
                        'Pushes CX bytes onto the stack'
                    ],
                    answer: 0,
                    explanation: 'REP STOSB stores AL into ES:DI repeatedly, advancing DI and decrementing CX until CX reaches 0. Great for filling memory.'
                },
                {
                    q: '4. Before using <code>MOVSB</code> or <code>STOSB</code>, which segment register must be set for the destination?',
                    options: [
                        'DS',
                        'SS',
                        'CS',
                        'ES'
                    ],
                    answer: 3,
                    explanation: 'String destination operations use ES:DI. You must set ES to your data segment: mov ax, @data / mov es, ax.'
                },
                {
                    q: '5. What does <code>XLATB</code> do?',
                    options: [
                        'Translates AX to BX',
                        'Loads AL with the byte at DS:[BX + AL]',
                        'Exchanges AL and BL',
                        'Extends AL to AX (sign extension)'
                    ],
                    answer: 1,
                    explanation: 'XLATB uses BX as a table base address and AL as an index. It replaces AL with the byte at DS:[BX + AL]. Perfect for lookup tables.'
                }
            ]
        },
        {
            id: 'quiz-debugging',
            title: 'Quiz 6: Debugging & Advanced',
            description: '5 questions about breakpoints, trace, memory map, interrupts, and the debugger.',
            questions: [
                {
                    q: '1. How do you set a breakpoint in Advanced mode?',
                    options: [
                        'Type "break" in the code',
                        'Click a line number in the gutter',
                        'Press F5',
                        'Right-click on the Run button'
                    ],
                    answer: 1,
                    explanation: 'In Advanced mode, clicking a line number in the gutter toggles a breakpoint (red dot). Execution pauses before that line.'
                },
                {
                    q: '2. What does the Step Backward feature do?',
                    options: [
                        'Moves the cursor up one line in the editor',
                        'Reverses the last instruction, restoring the full CPU state',
                        'Jumps to the previous label',
                        'Undoes the last edit to your code'
                    ],
                    answer: 1,
                    explanation: 'Step Backward undoes the last executed instruction. It restores all registers, flags, memory, and I/O ports to their previous state.'
                },
                {
                    q: '3. What is the Data Segment (DS) default base address in this simulator?',
                    options: [
                        '0000h',
                        '0100h',
                        '1000h',
                        '2000h'
                    ],
                    answer: 2,
                    explanation: 'The data segment starts at 1000h. Variables in .data are placed at DS:offset, so physical address = 1000h + offset.'
                },
                {
                    q: '4. Which instruction should you use to return from an interrupt handler?',
                    options: [
                        '<code>RET</code>',
                        '<code>IRET</code>',
                        '<code>JMP</code>',
                        '<code>HLT</code>'
                    ],
                    answer: 1,
                    explanation: 'IRET (Interrupt Return) pops both the return address and the flags from the stack. RET only pops the return address and would leave the flags on the stack.'
                },
                {
                    q: '5. What does <code>CBW</code> do when AL = 80h?',
                    options: [
                        'AX becomes 0080h',
                        'AX becomes FF80h',
                        'AX becomes 8000h',
                        'AX becomes 0000h'
                    ],
                    answer: 1,
                    explanation: 'CBW sign-extends AL into AX. Since bit 7 of AL (80h) is 1, the number is negative, so AH becomes FFh. AX = FF80h.'
                }
            ]
        }
    ];

    // ========================================================
    //  MODAL LOGIC
    // ========================================================

    let currentTopic = null;

    function open() {
        const overlay = document.getElementById('help-modal');
        overlay.style.display = 'flex';
        buildSidebar();
        if (!currentTopic) {
            showTopic(TOPICS[0].id);
        }
    }

    function close() {
        document.getElementById('help-modal').style.display = 'none';
    }

    const ADVANCED_IDS = new Set([
        'advanced-overview', 'debugger', 'peripherals', 'port-map',
        'string-ops', 'advanced-instructions', 'memory-map',
        'save-load', 'syntax-highlight'
    ]);

    function buildSidebar() {
        const sidebar = document.getElementById('help-sidebar');
        let html = '';
        let advDividerAdded = false;
        for (const t of TOPICS) {
            if (!advDividerAdded && ADVANCED_IDS.has(t.id)) {
                html += '<div class="help-sidebar-divider"></div>';
                html += '<div class="help-sidebar-label">ADVANCED</div>';
                advDividerAdded = true;
            }
            const active = currentTopic === t.id ? ' active' : '';
            html += '<button class="help-sidebar-item' + active + '" data-topic="' + t.id + '">' + t.title + '</button>';
        }
        html += '<div class="help-sidebar-divider"></div>';
        html += '<button class="help-sidebar-item' + (currentTopic === 'quizzes' ? ' active' : '') + '" data-topic="quizzes">Test Yourself</button>';
        sidebar.innerHTML = html;

        sidebar.querySelectorAll('.help-sidebar-item').forEach(btn => {
            btn.addEventListener('click', () => {
                showTopic(btn.dataset.topic);
            });
        });
    }

    function showTopic(id) {
        currentTopic = id;
        buildSidebar();

        const body = document.getElementById('help-body');
        if (id === 'quizzes') {
            renderQuizList(body);
            return;
        }
        const topic = TOPICS.find(t => t.id === id);
        if (topic) {
            body.innerHTML = topic.content;
            body.scrollTop = 0;
        }
    }

    // ========================================================
    //  QUIZ ENGINE
    // ========================================================

    function renderQuizList(container) {
        let html = '<h3>Test Yourself</h3>';
        html += '<p>Pick a quiz below. Each has 5 multiple-choice questions with instant feedback.</p>';
        html += '<div class="quiz-container">';
        for (const quiz of QUIZZES) {
            html += '<div class="quiz-card" data-quiz="' + quiz.id + '">';
            html += '<h4>' + quiz.title + '</h4>';
            html += '<p>' + quiz.description + '</p>';
            html += '</div>';
        }
        html += '</div>';
        container.innerHTML = html;
        container.scrollTop = 0;

        container.querySelectorAll('.quiz-card').forEach(card => {
            card.addEventListener('click', () => {
                const quiz = QUIZZES.find(q => q.id === card.dataset.quiz);
                if (quiz) renderQuiz(container, quiz);
            });
        });
    }

    function renderQuiz(container, quiz) {
        let html = '<button class="quiz-back-btn" id="quiz-back">&larr; Back to quiz list</button>';
        html += '<h3>' + quiz.title + '</h3>';

        quiz.questions.forEach((q, qi) => {
            html += '<div class="quiz-question" data-qi="' + qi + '">';
            html += '<p>' + q.q + '</p>';
            q.options.forEach((opt, oi) => {
                const name = 'q' + qi;
                html += '<label class="quiz-option">';
                html += '<input type="radio" name="' + name + '" value="' + oi + '"> ' + opt;
                html += '</label>';
            });
            html += '<div class="quiz-feedback" id="fb-' + qi + '"></div>';
            html += '</div>';
        });

        html += '<button class="quiz-btn" id="quiz-submit">Check Answers</button>';
        html += '<div id="quiz-score"></div>';

        container.innerHTML = html;
        container.scrollTop = 0;

        document.getElementById('quiz-back').addEventListener('click', () => {
            renderQuizList(container);
        });

        document.getElementById('quiz-submit').addEventListener('click', () => {
            let score = 0;
            quiz.questions.forEach((q, qi) => {
                const selected = container.querySelector('input[name="q' + qi + '"]:checked');
                const fb = document.getElementById('fb-' + qi);
                if (!selected) {
                    fb.className = 'quiz-feedback wrong';
                    fb.style.display = 'block';
                    fb.textContent = 'Please select an answer.';
                    return;
                }
                const val = parseInt(selected.value);
                if (val === q.answer) {
                    score++;
                    fb.className = 'quiz-feedback correct';
                    fb.innerHTML = 'Correct! ' + q.explanation;
                } else {
                    fb.className = 'quiz-feedback wrong';
                    fb.innerHTML = 'Not quite. ' + q.explanation;
                }
                fb.style.display = 'block';
            });

            const scoreEl = document.getElementById('quiz-score');
            const total = quiz.questions.length;
            let cls = 'needs-work';
            if (score === total) cls = 'perfect';
            else if (score >= total * 0.6) cls = 'good';
            scoreEl.className = 'quiz-score ' + cls;
            scoreEl.textContent = 'Score: ' + score + ' / ' + total +
                (score === total ? ' — Perfect!' : score >= total * 0.6 ? ' — Good job!' : ' — Keep practicing!');
        });
    }

    // ========================================================
    //  INIT
    // ========================================================

    function init() {
        const btnOpen = document.getElementById('btn-help');
        const btnClose = document.getElementById('btn-help-close');
        const overlay = document.getElementById('help-modal');

        if (btnOpen) btnOpen.addEventListener('click', open);
        if (btnClose) btnClose.addEventListener('click', close);
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'F1') {
                e.preventDefault();
                open();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    return { open, close };
})();
