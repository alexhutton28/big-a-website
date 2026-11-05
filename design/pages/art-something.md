# Page System: Art Something

> The drawing game at `/art-something`. Adds to `design/hutton-design-system.md` and wins on this page.

**Version 1.0 · November 4, 2026 · Size: small · Scope: `.art-page`**

## Feel

- Bold and tactile.

## Color

| Name     | Hex       | Semantic roles |
| -------- | --------- | -------------- |
| Mahogany | `#461414` |                |
| Charlie  | `#662020` |                |
| Padauk   | `#815555` |                |
| Vanilla  | `#FFF3C3` |                |
| Sand     | `#FFF8DD` |                |
| Bone     | `#FFFBEC` |                |
| Money    | `#FFB700` |                |

## Typography

Lato, the site default.

## Motion

| Token           | Value  |
| --------------- | ------ |
| `duration-rise` | 500ms  |
| `duration-gain` | 1100ms |

- The prompt rises over `duration-rise` when the count-in's timer bar appears. Earned points float up over `duration-gain`.
- Timing set in code stays in named constants, since it drives JavaScript animation: the crumble (`DURATION_MS`, 1400ms, in `crumble.ts`), the score count-up (`COUNT_MS`, 700ms) and the press's overshooting curve (`cubic-bezier(0.3, 0.7, 0.4, 1.4)`) in `TimeAndScore.tsx`, and the prompt slide (`SLIDE_MS`, 2000ms, in `PromptDisplay.tsx`).
- Reduced motion: the prompt rise is off, and `TimeAndScore.tsx` and `Canvas.tsx` check it in code. Floating points don't respect it yet ([#46](https://github.com/alexhutton28/big-a-website/issues/46)).

## Components

### Time and score box

- A hard offset shadow in `padauk`: 10px, or 6px on phones. Set in plain CSS (`.art-score-box`) so the press can animate it.

## Changelog

- **November 4, 2026 · v1.0:** Feel and motion added by Alex; motion recorded from the page as it is.
- **November 4, 2026 · v0.1:** Initial draft, recorded from the page as it is.
