# Page System: Guess That Flavor Text

> The daily puzzle at `/guess-that-flavor-text`. Adds to `design/hutton-design-system.md` and wins on this page.

**Version 1.0 · November 4, 2026 · Size: small · Scope: `.dot-gradient-bg`**

## Feel

- Clean and daily: a light, bright ritual to come back to.
- A big reveal: it builds to a theatrical moment.
- Friendly and shareable.

## Color

| Name   | Hex       | Semantic roles |
| ------ | --------- | -------------- |
| Tide   | `#2561EB` |                |
| Wave   | `#2876EC` |                |
| Splash | `#7AA6FF` |                |
| Stone  | `#8496B1` |                |
| Slate  | `#47679C` |                |
| Ghost  | `#F7F7FA` |                |
| Drop   | `#E4F0FF` |                |
| Mist   | `#F3F6FB` |                |
| Abyss  | `#1C2A44` |                |

## Typography

Barlow, through the `barlow` class. Loaded in `src/app/layout.tsx`.

## Motion

| Token                    | Value |
| ------------------------ | ----- |
| `duration-reveal`        | 300ms |
| `duration-stagger`       | 120ms |
| `duration-spotlight`     | 2.6s  |
| `duration-clear`         | 400ms |
| `duration-pop`           | 450ms |
| `duration-fade-up`       | 400ms |
| `duration-heading-delay` | 3s    |
| `duration-stars-delay`   | 3.25s |
| `duration-details-delay` | 3.5s  |
| `duration-shake`         | 400ms |

- Lifeline answers fade up over `duration-reveal`, the second one `duration-stagger` later. Reveals after a guess are spaced by `REVEAL_GAP_MS` (1000ms) in `GuessThatFlavorText.tsx`.
- The result is the big moment: a spotlight roams the covered card over `duration-spotlight`, the cover clears over `duration-clear` as the card pops over `duration-pop`, and then the heading, stars and details fade up in turn.
- The guess shake is a nudge over `duration-shake`.
- Reduced motion: all of these are off, and the result shows straight away.

## Components

### Background

- A dot grid over a white-to-`ghost` gradient, on the body so it fills the screen. See `body:has(.dot-gradient-bg)`.

## Changelog

- **November 4, 2026 · v1.0:** Feel and motion added by Alex; motion recorded from the page as it is.
- **November 4, 2026 · v0.1:** Initial draft, recorded from the page as it is.
