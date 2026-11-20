# Page System: Guess That Flavor Text

> The daily puzzle at `/guess-that-flavor-text`. Adds to `design/hutton-design-system.md` and wins on this page.

**Version 1.0 · November 4, 2026 · Size: small · Scope: `.dot-gradient-bg`**

## Feel

- Clean and daily: a light, bright ritual to come back to.
- A big reveal: it builds to a theatrical moment.
- Friendly and shareable.

## Color

| Name   | Hex       | Semantic roles | Used for                                                              |
| ------ | --------- | -------------- | --------------------------------------------------------------------- |
| Tide   | `#2561EB` |                | Primary buttons and headings                                          |
| Wave   | `#2876EC` |                | Button hover, selected autocomplete result, scrollbar and result text |
| Splash | `#7AA6FF` |                | Header and the flavor text box border                                 |
| Stone  | `#8496B1` |                | Placeholder text, quiet text and the streak box border                |
| Slate  | `#47679C` |                | Body text, lifeline borders and the toast background                  |
| Ghost  | `#F7F7FA` |                | Page gradient and the streak box                                      |
| Drop   | `#E4F0FF` |                | Page dots, used lifelines and autocomplete hover                      |
| Mist   | `#F3F6FB` |                | Unused lifelines                                                      |
| Abyss  | `#1C2A44` |                | Result card cover                                                     |

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

- Unknown Q "says" the flavor text: while the words type in, the logo chatters with a soft squash and stretch (about 4.5%, a 400ms loop, anchored at its bottom). It rests during each sentence pause and eases back once the text is done. The motion is in `chatter.ts`.
- Redemption: after a wrong guess and the lifelines opening, the guess box gives the error shake (the same `.shake` as the empty-guess nudge) and a pill with the wrong guess crossed out (after a small grayscale sprite) fades up above it, aligned left, as the guess fades out of the box. Unknown Q does a short chatter and spits each hint out of its round middle: a squash, a lurch, and the hint arcs out to land beside it (the first on the left, the second on the right), with a quick chatter before the second. The hints look like answered lifelines. The motion is in `chatter.ts`.
- Lifeline answers fade up over `duration-reveal`, the second one `duration-stagger` later. Reveals after a guess are spaced by `REVEAL_GAP_MS` (1000ms) in `GuessThatFlavorText.tsx`.
- The result is the big moment, and a different reveal plays each day: a spotlight, a smoke burst, ink bleeding in, or a zig-zag split. Each one finishes by `duration-heading-delay`, then the heading, stars and details fade up in turn.
- Once the card shows, a finale plays, also changing daily: a big pop, a shake, a jelly wobble or a ta-da. A right guess adds a burst of score stars (tide, wave, splash and slate) flying out from the card.
- The spotlight roams the covered card over `duration-spotlight` and the cover clears over `duration-clear`. The other reveals', the finales' and the star burst's timings are in `globals.css`. `duration-pop` is unused for now: the finales replaced the spotlight's pop.
- The card is never shown before its cover is drawn: the image hides itself until the reveal starts.
- The guess shake is a nudge over `duration-shake`.
- Reduced motion: all of these are off, and the result shows straight away.

## Components

### Background

- A dot grid over a white-to-`ghost` gradient, on the body so it fills the screen. See `body:has(.dot-gradient-bg)`.

## Changelog

- **November 19, 2026:** Unknown Q chatters while it says the flavor text, and after a wrong guess spits out two redemption hints for a half-point try.
- **November 19, 2026:** The result reveal and its finale change daily (four of each), a right guess bursts stars from the card, and the card no longer flashes before its cover on mobile.

- **November 4, 2026 · v1.0:** Feel and motion added by Alex; motion recorded from the page as it is.
- **November 4, 2026 · v0.1:** Initial draft, recorded from the page as it is.
