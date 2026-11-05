# Page System: Guess That Flavor Text

> The daily puzzle at `/guess-that-flavor-text`. Adds to `design/hutton-design-system.md` and wins on this page.

**Version 0.1 · November 4, 2026 · Size: small · Scope: `.dot-gradient-bg`**

## Feel

- {{How this page should feel: to be written by Alex}}

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

Not defined for this project.

The page has motion but no shared tokens yet: the lifeline reveal, the result card spotlight and pop, the result fade-ups and the guess shake, in `globals.css`. All of them respect reduced motion.

## Components

### Background

- A dot grid over a white-to-`ghost` gradient, on the body so it fills the screen. See `body:has(.dot-gradient-bg)`.

## Changelog

- **November 4, 2026 · v0.1:** Initial draft, recorded from the page as it is.
