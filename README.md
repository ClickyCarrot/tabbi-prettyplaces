# Tabbi

**Tabbi** is a desktop and browser-based virtual pet game where players adopt one of six cats, care for them by managing stats, and play minigames to earn resources for supplies. The game makes use of pixel-art styling, intuitive UI, and persistent gameplay with browser storage.

---

## Project Overview

Tabbi allows players to:

- Adopt and care for one of six unique cats.
- Monitor and maintain stats like happiness, energy, hunger, and cleanliness.
- Play minigames to earn in-game currency for pet supplies.
- Interact with overlays and a responsive UI.

The game is built with modular code that runs off of desktop execution.

---

## Tech Stack & Implementation Process

**Languages & Standards:**

- **JavaScript (ES6 Modules):** Modular code using `import`/`export` for maintainability and readability.
- **HTML5 & CSS3:** Structure, styling, and responsive interface.
- **Canvas API:** Pixel-art-friendly rendering for pets and minigames.
- **Electron:** Wraps the game as a desktop executable.

**Implementation Highlights:**

1. **Pixel-Art Canvas Rendering:**
   - `gameCanvas` and `petCanvas` use `image-rendering: pixelated` to preserve crisp pixel visuals.
   - Canvas scales dynamically with window size while maintaining aspect ratio.

2. **State Persistence & Autosave:**
   - Game progress saved in `localStorage` under `TabbiSave`.
   - Settings stored under `TabbiSettings`.
   - Autosave, stat decay, and rewards persist across sessions.

3. **Desktop Packaging:**
   - Electron wraps the browser version into a native desktop app.

---

## Running the Game

**Desktop:**  
Open `Tabbi.exe` which is located in the root folder. This then opens up a desktop app containing **Tabbi**.

---

## Credits

- **Author:** Elijah Hensley — Full game design, coding, UI, and integration.

- **Sprites:**
  - _Pet Cats Pixel Art Pack_ by Luiz Melo  
    [Asset Store Link](https://assetstore.unity.com/packages/2d/characters/pet-cats-pixel-art-pack-248340)

- **Fonts:**
  - **Poppins** (Google Fonts)
  - **Gluten** (Google Fonts)

- **Libraries / Tools:**
  - **Electron** — Desktop wrapper for the web game
  - **HTML5 Canvas & Vanilla JavaScript** — Rendering and game logic
