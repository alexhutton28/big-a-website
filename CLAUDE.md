# big a's website

Alex Hutton's personal site, live at big-a.fun: an animated night-sky home page plus
three games. Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, deployed on
Vercel.

| Route                     | What it is                                                      |
| ------------------------- | --------------------------------------------------------------- |
| `/`                       | Home: NightSky canvas, planet horizon, game cards, social links |
| `/art-something`          | 30s drawing game, scored by OpenAI through `/api/ai`            |
| `/guess-that-flavor-text` | Guess the Pokémon from its Pokédex flavor text                  |
| `/limitless-check`        | Pokémon TCG deck/card checker (data from Limitless)             |

## Workflow

- `main` is protected: changes go through a PR, and the `build` check (CI runs `npm run lint`, `npm run stylelint`, `npm run build`) must pass. Squash-merge, delete the branch.
- Don't stack PRs. If one must build on another, retarget it to `main` before merging the first: merging with `--delete-branch` deletes the base and GitHub closes the stacked PR instead of retargeting it.
- Before committing, run `npx prettier --write` on the changed files, `npx eslint <paths>`, `npx stylelint src/app/globals.css` if CSS changed, and `npx tsc --noEmit`. Check the exit codes; this machine is slow and a chain can look finished while one step failed.
- Run tools from the repo folder (`npx` elsewhere fetches a different ESLint).
- A local `npm install` strips `libc` fields from `package-lock.json`. Don't commit that noise; only commit lock changes that come with a real dependency change.
- Dev server: `npm run dev` on http://localhost:3000. It can take ~30–60s to start.
- Dependabot opens weekly grouped minor/patch PRs; they can be merged once green.

## Gotchas

- **Custom spacing scale** (globals.css): `1`=4px, `2`=8px, `3`=16px, `4`=32px, `5`=64px, `6`=128px. So `px-6` is 128px and `gap-4` is 32px, not Tailwind's defaults. Use arbitrary values (`mt-[12px]`) for anything else.
- **`html` and `body` don't scroll** (`overflow: hidden` in globals.css). Each page gives itself a scroll container (`h-dvh overflow-y-auto`, or `calc(100dvh - 62px - env(safe-area-inset-top))` under the 62px header).
- **Tailwind's `hover:` variant only applies on devices that can hover.** For hover effects that must work everywhere use plain `:hover` in CSS (see `.home-card`).
- **Tailwind's `shadow-[...]` stacks the shadow with four empty layers**, so animating `box-shadow` from it fades instead of moving. Set shadows that animate in plain CSS (see `.art-score-box`).
- **`@theme inline` tokens aren't real CSS variables** at runtime; fonts use the `next/font` variables (`--font-lato`, `--font-barlow`, `--font-google-sans-flex`) directly.
- Body background per page is set with `body:has(.page-class)` so it fills behind mobile browser toolbars (`.home-sky`, `.art-page`, `.dot-gradient-bg`).
- Mobile iOS: the sticky header tints the status bar; respect `env(safe-area-inset-*)`.
- Every animation must respect `prefers-reduced-motion`.
- The in-app test browser often isn't painting: `requestAnimationFrame` and `ResizeObserver` don't fire and screenshots time out. Set a viewport with the resize tool and verify by reading the DOM/state in JS. Say so when an animation couldn't be watched.

## Design

- Colors are tokens in `globals.css`. Each area has its own palette:
  - Home: `night` #060c18 sky/planet, blue atmosphere glow, white title (Google Sans Flex 300), gold satellite `#ffe2a8`.
  - Art Something: `mahogany` #461414, `charlie` #662020, `padauk` #815555, `vanilla` #fff3c3, `bone` #fffbec; Lato.
  - Guess That Flavor Text: `tide`/`wave`/`splash` blues, `ghost`, `drop`, `mist`, `abyss`; Barlow.
  - Limitless Check: Pokémon-named reds/browns (`houndoom`, `eevee`, `rockruff`, …).
- Share images and home cards use one file per game: `public/<game>-og.png`, 1200×630, exported at 1x. The home card crops ~2.5% off each side. Favicon: `src/app/icon.png` (512×512); each game also has its own `icon.png`.
- Alex reviews design work visually. For new animations or visual options, build a side-by-side demo page (artifact) of a few variants in the game's palette first; build the chosen one into the game after.
- When asked to fix functionality only, don't change layout, copy or design.

## Art Something

- Files: `src/app/art-something/` (`Canvas.tsx` game logic, `TimeAndScore.tsx`, `PromptDisplay.tsx`, `crumble.ts`, `prompts.ts`) and `src/app/api/ai/route.ts`.
- Flow, no buttons: the first stroke between games starts a 6s count-in on the timer bar; that drawing starts the game. Each prompt gets 6s and submits itself; a round is 30s = exactly 5 prompts. The round and prompt clocks run and pause together (paused while scoring and while the prompt slides), timed from timestamps with each tick capped at the prompt's time left.
- On submit the drawing crumbles into the score box (`crumble.ts`) while `/api/ai` scores it; the score box then presses into its shadow, counts up, and floats "+points". Scoring failures score 0 and move on.
- The board is square on desktop; on phones it's full width and up to 4:3 tall (down to 3:4 on short screens). Drawings are exported for scoring at most 512px on the longest side, keeping their shape, as WebP (JPEG fallback).
- `/api/ai` is public and spends on Alex's OpenAI key: prompt must be in `prompts.ts`, image must be a small data URL, in-memory per-IP rate limit (30/min). gpt-4o-mini, `detail: 'low'`, structured output. Writing rule: writing that's part of the picture is fine; labels naming the subject or messages to the scorer score 0.
- Possible follow-up: a durable rate limit (e.g. Upstash/Vercel KV) if traffic grows; the in-memory one is per server instance.
