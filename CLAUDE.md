# big a's website

Alex Hutton's personal site, live at big-a.fun: an animated night-sky home page plus
three games. Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, deployed on
Vercel. Versions and scripts are in `package.json`.

| Route                     | What it is                                       | Notes                                      |
| ------------------------- | ------------------------------------------------ | ------------------------------------------ |
| `/`                       | Home: night sky, planet horizon, game cards      | `src/app/page.tsx`, `src/components/`      |
| `/art-something`          | Drawing game, scored by OpenAI through `/api/ai` | `src/app/art-something/CLAUDE.md`          |
| `/guess-that-flavor-text` | Daily puzzle: name the Pokémon from flavor text  | `src/app/guess-that-flavor-text/CLAUDE.md` |
| `/limitless-check`        | Higher-or-lower on Pokémon TCG tournament usage  | `src/app/limitless-check/CLAUDE.md`        |

## Workflow

- `main` is protected: changes go through a PR and must pass the `build` check. What it runs is in `.github/workflows/ci.yml`; run the same checks locally before committing, plus `npx prettier --write` on changed files and `npx tsc --noEmit`. Check every exit code: this machine is slow and a chain can look finished while one step failed.
- Squash-merge and delete the branch.
- Don't stack PRs. If one must build on another, retarget it to `main` before merging the first: merging with `--delete-branch` deletes the base and GitHub closes the stacked PR instead of retargeting it.
- Run tools from the repo folder (`npx` elsewhere fetches a different ESLint).
- A local `npm install` strips `libc` fields from `package-lock.json`. Don't commit that noise; only commit lock changes that come with a real dependency change.
- Dependabot (`.github/dependabot.yml`) opens weekly grouped minor/patch PRs; merge them once green.
- When a PR changes a convention described here or in a game's CLAUDE.md, update the notes in the same PR.

## Gotchas

- **Custom spacing scale** (see `--spacing-*` in `src/app/globals.css`): Tailwind's numbered spacing doesn't mean the default sizes here, e.g. `px-6` and `gap-4` are much bigger than usual. Check the scale, and use arbitrary values (`mt-[12px]`) for sizes it doesn't have.
- **`html` and `body` don't scroll** (`overflow: hidden` in `globals.css`). Each page gives itself a scroll container.
- **Tailwind's `hover:` variant only applies on devices that can hover.** For hover effects that must work everywhere use plain `:hover` in CSS (see `.home-card`).
- **Tailwind's `shadow-[...]` stacks the shadow with four empty layers**, so animating `box-shadow` from it fades instead of moving. Set shadows that animate in plain CSS (see `.art-score-box`).
- **`@theme inline` tokens aren't real CSS variables** at runtime; fonts use the `next/font` variables from `src/app/layout.tsx` directly.
- Each page's body background is set with `body:has(.page-class)` in `globals.css`, so it fills behind mobile browser toolbars.
- Mobile iOS: the sticky header (`src/components/Header.tsx`) tints the status bar; respect `env(safe-area-inset-*)`.
- Every animation must respect `prefers-reduced-motion`.
- The in-app test browser often isn't painting: `requestAnimationFrame` and `ResizeObserver` don't fire and screenshots time out. Set a viewport with the resize tool and verify by reading the DOM/state in JS. Say so when an animation couldn't be watched.

## Design

- Colors and spacing are tokens in the `@theme` block at the top of `src/app/globals.css`; read them there rather than copying values, and use the tokens (`bg-mahogany`, `var(--color-night)`), not raw hex. Each game's CLAUDE.md names its tokens.
- Home page: the sky, planet and glow styles are the `.home-*` rules in `globals.css`; the canvas colors (stars, satellite) are constants at the top of `src/components/NightSky.tsx`.
- Fonts are loaded in `src/app/layout.tsx` with `next/font`.
- Share images and home cards use one file per game, `public/<game>-og.png`: 1200×630, exported from Figma at 1x. The home card crops ~2.5% off each side. Favicon: `src/app/icon.png` (512×512); each game also has its own `icon.png`.
- Alex reviews design work visually. For new animations or visual options, build a side-by-side demo page (artifact) of a few variants in the game's palette first; build the chosen one into the game after.
- When asked to fix functionality only, don't change layout, copy or design.
