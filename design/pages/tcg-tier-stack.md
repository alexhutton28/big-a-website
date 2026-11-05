# Page System: tcgTierStack

> The hidden graphics tool at `/tcg-tier-stack`. Adds to `design/hutton-design-system.md` and wins on this page. Styling is deliberately minimal for now.

**Version 0.1 · November 4, 2026 · Size: small · Scope: `.tier-stack-page`**

## Feel

- {{How this page should feel: to be written by Alex}}
- Planned look, from Alex's mood board: dark (petrel and storm), Figtree as a stand-in for Google Sans Rounded, everything a bit rounded, the four default tier colors as accents, and smooth motion throughout. Not built yet. New visuals start as a side-by-side demo.

## Color

Colors for the planned dark theme: `petrel` grays for surfaces, borders and text, and a `storm` accent. Nothing uses them yet.

| Name       | Hex       | Semantic roles |
| ---------- | --------- | -------------- |
| Petrel 50  | `#F2F5F6` |                |
| Petrel 100 | `#E3E8EB` |                |
| Petrel 200 | `#CCD4D8` |                |
| Petrel 300 | `#B3BEC4` |                |
| Petrel 400 | `#94A2AA` |                |
| Petrel 500 | `#6C7D88` |                |
| Petrel 600 | `#546470` |                |
| Petrel 700 | `#3E4B53` |                |
| Petrel 800 | `#2D373D` |                |
| Petrel 850 | `#232B30` |                |
| Petrel 900 | `#1B2125` |                |
| Petrel 950 | `#12171A` |                |
| Storm 100  | `#DCEAF1` |                |
| Storm 200  | `#BFD7E4` |                |
| Storm 300  | `#9CC0D4` |                |
| Storm 400  | `#78A5BD` |                |
| Storm 600  | `#466E85` |                |
| Storm 800  | `#2A4352` |                |

Board colors (tier colors, backgrounds, borders) are canvas colors that users can change. See Exceptions in the HuttonDesign System.

## Typography

Canvas text uses Inter Black (900), loaded in this route's `layout.tsx` as `--font-inter`. The controls use Lato, the site default.

## Motion

| Token           | Value                                                                                                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ease-spring`   | linear(0, 0.032, 0.109, 0.212, 0.326, 0.439, 0.545, 0.641, 0.725, 0.795, 0.853, 0.899, 0.935, 0.962, 0.982, 0.996, 1.005, 1.011, 1.014, 1.015, 1.015, 1.014, 1.012, 1.011, 1.009, 1.007, 1.006, 1.005, 1.003, 1.002, 1) |
| `duration-move` | 450ms                                                                                                                                                                                                                   |
| `duration-fade` | 120ms                                                                                                                                                                                                                   |

- A spring that goes 1.5% past (3% looked like too much live). 450ms for things that move, with plain `ease-out` fades of about 120ms alongside. Use it for new tcgTierStack animations.
- Popups share `.tier-stack-menu`: stretch open, fold closed. The card menu goes left to right, dropdowns top to bottom.
- Reduced motion: fades only.

## Changelog

- **November 4, 2026 · v0.1:** Initial draft, recorded from the page as it is.
