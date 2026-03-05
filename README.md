# EasyCPU

**A free, browser-based Intel 8086 assembly language simulator and debugger.** Write, assemble, and run 8086 programs with a visual interface — no installation required.

[![Live Demo]](https://easycpu.ioblako.com)

---

## Features

- **Code Editor** — Syntax highlighting, line numbers, autocomplete (Advanced mode)
- **Step-by-step Debugger** — Breakpoints, step back, execution trace log
- **Visual CPU** — Registers (AX–DX, SP, BP, SI, DI, IP, DS, SS, CS), flags (CF, ZF, SF, OF, PF, AF)
- **Memory Viewer** — Hex dump with Data, Stack, and Code segment views
- **Stack Viewer** — Real-time stack contents with SP pointer
- **I/O Peripherals** — LEDs (Port 2), 7-segment display (Port 3), 32×32 pixel screen (Port 4)
- **Keyboard Input** — Type characters; program reads via Port 5/6
- **Sample Programs** — Beginner and Advanced examples with comments
- **Coding Challenges** — Auto-graded exercises (Set AX to 42, Light LEDs, Sort bytes, etc.)
- **Number Converter** — Hex, decimal, binary conversion
- **Save / Load / Download** — Store programs in browser or export as `.asm` files

---

## Quick Start

1. Open the [live demo](https://easycpu.ioblako.com) or run locally (see below).
2. Select **"Beginner: Hello LEDs"** from the Samples dropdown.
3. Click **Assemble** (or press `Ctrl+Enter`).
4. Click **Step** to execute one instruction at a time, or **Run** to execute the whole program.
5. Watch the registers, flags, and LEDs update in real time.

---

## Sample Programs

| Sample | Description |
|--------|-------------|
| Beginner: Hello LEDs | Turn LEDs on and off with `out 2, al` |
| Beginner: Add Two Numbers | Add 5 + 3 and display on LEDs |
| Beginner: Countdown | Loop from 10 down to 0 |
| Beginner: Compare and Branch | Use `cmp` and `jnz` for conditional jumps |
| Beginner: Simple Subroutine | Call and return with `call` / `ret` |
| Advanced: LOOP Countdown | Use the `loop` instruction |
| Advanced: String Copy | Copy bytes with `movsb` |
| Advanced: Pixel Drawing | Draw on the 32×32 pixel display |
| Advanced: Keyboard Echo | Read input from the keyboard buffer |
| Advanced: Timer Interrupt | Use `int 1ch` for timing |

---

## I/O Ports

| Port | Function |
|------|----------|
| 1 | Input (set value in I/O panel) |
| 2 | LED output (8 LEDs, one per bit) |
| 3 | 7-segment display |
| 4 | Pixel display refresh (32×32 at E000h–E3FFh) |
| 5 | Keyboard input (read character) |
| 6 | Keyboard buffer length |

---

## Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/EasyCPU.git
   cd EasyCPU
   ```

2. Serve the files with any static server. For example:
   - **Python:** `python -m http.server 8000`
   - **Node:** `npx serve .`
   - **XAMPP / Apache:** Place the folder in `htdocs` and open `http://localhost/EasyCPU/`

3. Open `index.html` in your browser.

---

## Project Structure

```
EasyCPU/
├── index.html          # Main app
├── 404.html            # Custom error page
├── css/style.css       # Styles
├── js/
│   ├── samples.js      # Sample programs
│   ├── assembler.js    # Assembly parser
│   ├── cpu.js          # CPU emulator
│   ├── mode.js         # Beginner/Advanced toggle
│   ├── debugger.js     # Breakpoints, trace
│   ├── highlight.js    # Syntax highlighting
│   ├── peripherals.js  # LEDs, 7-seg, keyboard, pixel display
│   ├── storage.js      # Save/Load/Download
│   ├── challenges.js   # Coding challenges
│   ├── help.js         # Help system
│   └── ui.js           # UI wiring
├── favicon.svg
├── manifest.json
├── robots.txt
├── sitemap.xml
└── README.md
```

---

## Tech Stack

- **HTML5, CSS3, JavaScript** — No frameworks, no build step
- **Vanilla JS** — Plain modules loaded with `<script defer>`
- **Dark theme** — Tokyo Night–inspired palette

---

## Browser Support

Modern browsers with JavaScript enabled. Tested on Chrome, Firefox, Edge, Safari.

---

## License

[Add your license here — e.g., MIT, GPL, etc.]

---

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.
