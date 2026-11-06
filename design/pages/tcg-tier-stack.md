# Page System: tcgTierStack

> The hidden graphics tool at `/tcg-tier-stack`. Adds to `design/hutton-design-system.md` and wins on this page.

**Version 1.1 · November 5, 2026 · Size: small · Scope: `.tier-stack-page`**

## Feel

- Professional but fun and friendly, with smooth transitions and rounded borders.
- A real design tool that feels smooth and satisfying to use.
- The look, from Alex's mood board: dark (petrel and storm), Figtree as a stand-in for Google Sans Rounded, and smooth motion throughout.
- Soft Panels: Lighter petrel, crisp corners and no borders, with panels floating on soft shadows. Controls and popups use `radius-small`, and panels use `radius-medium`. Storm blue marks main actions; the tier colors stay on the board.

## Color

The interface's palette. The look is set as `--ts-*` roles on `body:has(.tier-stack-page)` in `globals.css`.

| Name        | Hex       | Semantic roles | Used for                       |
| ----------- | --------- | -------------- | ------------------------------ |
| Petrel 50   | `#F2F5F6` |                | Surfaces, borders and text     |
| Petrel 100  | `#E3E8EB` |                | Surfaces, borders and text     |
| Petrel 200  | `#CCD4D8` |                | Surfaces, borders and text     |
| Petrel 300  | `#B3BEC4` |                | Surfaces, borders and text     |
| Petrel 400  | `#94A2AA` |                | Surfaces, borders and text     |
| Petrel 500  | `#6C7D88` |                | Surfaces, borders and text     |
| Petrel 600  | `#546470` |                | Surfaces, borders and text     |
| Petrel 700  | `#3E4B53` |                | Surfaces, borders and text     |
| Petrel 800  | `#2D373D` |                | Surfaces, borders and text     |
| Petrel 850  | `#232B30` |                | Surfaces, borders and text     |
| Petrel 900  | `#1B2125` |                | Surfaces, borders and text     |
| Petrel 950  | `#12171A` |                | Surfaces, borders and text     |
| Storm 100   | `#DCEAF1` |                | Accent                         |
| Storm 200   | `#BFD7E4` |                | Accent                         |
| Storm 300   | `#9CC0D4` |                | Accent                         |
| Storm 400   | `#78A5BD` |                | Accent                         |
| Storm 600   | `#466E85` |                | Accent                         |
| Storm 800   | `#2A4352` |                | Accent                         |
| Tier Goated | `#D9532B` |                | Default tier color. Board only |
| Tier Solid  | `#F0912F` |                | Default tier color. Board only |
| Tier Mid    | `#F5C95B` |                | Default tier color. Board only |
| Tier Fraud  | `#7CC05A` |                | Default tier color. Board only |

Board colors (tier colors, backgrounds, borders) are canvas colors that users can change. See Exceptions in the HuttonDesign System.

## Typography

Canvas text uses Inter Black (900), loaded in this route's `layout.tsx` as `--font-inter`. The controls use Figtree, loaded in the same `layout.tsx` as `--font-figtree`.

## Motion

| Token                | Value                                                                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ease-spring`        | linear(0, 0.032, 0.109, 0.212, 0.326, 0.439, 0.545, 0.641, 0.725, 0.795, 0.853, 0.899, 0.935, 0.962, 0.982, 0.996, 1.005, 1.011, 1.014, 1.015, 1.015, 1.014, 1.012, 1.011, 1.009, 1.007, 1.006, 1.005, 1.003, 1.002, 1) |
| `duration-move`      | 450ms                                                                                                                                                                                                                   |
| `duration-fade`      | 120ms                                                                                                                                                                                                                   |
| `duration-fold`      | 180ms                                                                                                                                                                                                                   |
| `duration-fold-fade` | 110ms                                                                                                                                                                                                                   |
| `ease-fold`          | cubic-bezier(0.4, 0, 1, 1)                                                                                                                                                                                              |

- A spring that goes 1.5% past (3% looked like too much live). 450ms for things that move, with plain `ease-out` fades of about 120ms alongside. Use it for new tcgTierStack animations.
- Popups share `.tier-stack-menu`: stretch open, fold closed. The card menu goes left to right, dropdowns top to bottom.
- Closing folds back over `duration-fold` on `ease-fold`, speeding up as it goes. The timers in `Editor.tsx` and `ui/Dropdown.tsx` wait for it.
- Reduced motion: fades only, closing over `duration-fold-fade`.

## Changelog

- **November 5, 2026 · v1.1:** Soft Panels look built: dark interface, Figtree, and the four default tier colors added to the palette ([#37](https://github.com/alexhutton28/big-a-website/issues/37)).
- **November 4, 2026 · v1.0:** Feel added by Alex; full popup motion recorded.
- **November 4, 2026 · v0.1:** Initial draft, recorded from the page as it is.
