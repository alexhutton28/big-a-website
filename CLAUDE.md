# big a's website

Alex Hutton's personal site, live at big-a.fun: an animated night-sky home page plus
three games, and a hidden tool for TCG graphics (tier lists and more). Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, deployed on
Vercel. Versions and scripts are in `package.json`.

| Route                     | What it is                                       | Notes                                      |
| ------------------------- | ------------------------------------------------ | ------------------------------------------ |
| `/`                       | Home: night sky, planet horizon, game cards      | `src/app/page.tsx`, `src/components/`      |
| `/art-something`          | Drawing game, scored by OpenAI through `/api/ai` | `src/app/art-something/CLAUDE.md`          |
| `/guess-that-flavor-text` | Daily puzzle: name the Pokémon from flavor text  | `src/app/guess-that-flavor-text/CLAUDE.md` |
| `/limitless-check`        | Higher-or-lower on Pokémon TCG tournament usage  | `src/app/limitless-check/CLAUDE.md`        |
| `/tcg-tier-stack`         | Hidden tool: make and export TCG graphics        | `src/app/tcg-tier-stack/CLAUDE.md`         |

## Workflow

- `main` is protected: changes go through a PR and must pass the `build` check. What it runs is in `.github/workflows/ci.yml`; run the same checks locally before committing, plus `npx prettier --write` on changed files and `npx tsc --noEmit`.
- Squash-merge and delete the branch.
- Don't stack PRs. If one must build on another, retarget it to `main` before merging the first: merging with `--delete-branch` deletes the base and GitHub closes the stacked PR instead of retargeting it.
- Run tools from the repo folder (`npx` elsewhere fetches a different ESLint).
- Dependabot (`.github/dependabot.yml`) opens weekly grouped minor/patch PRs; merge them once green.
- When a PR changes a convention described here or in a game's CLAUDE.md, update the notes in the same PR.
- After changing anything in `design/`, run `npm run design:tokens` and commit the generated `.css` files. It needs the `hutton-design` skill installed. Never edit those files by hand.

## Gotchas

- **Custom spacing scale** (Spacing in `design/hutton-design-system.md`): Tailwind's numbered spacing doesn't mean the default sizes here, e.g. `p-4` is 16px, the same as Tailwind's default, but `px-6` (64px) and `gap-5` (32px) are much bigger than usual. Check the scale, and use arbitrary values (`mt-[12px]`) for sizes it doesn't have, until #42 settles those.
- **`html` and `body` don't scroll** (`overflow: hidden` in `globals.css`). Each page gives itself a scroll container.
- **Tailwind's `hover:` variant only applies on devices that can hover.** For hover effects that must work everywhere use plain `:hover` in CSS (see `.home-card`).
- **Tailwind's `shadow-[...]` stacks the shadow with four empty layers**, so animating `box-shadow` from it fades instead of moving. Set shadows that animate in plain CSS (see `.art-score-box`).
- **`@theme inline` tokens aren't real CSS variables** at runtime. Generated tokens are, but the font tokens in `globals.css` are inline, so fonts use the `next/font` variables from `src/app/layout.tsx` directly.

## Design

Design system: follow `design/hutton-design-system.md` using the `hutton-design` skill. It holds what every page shares; each page's own look is in `design/pages/<page>.md`, which wins on that page.

- Colors, spacing and motion are generated from those files into `design/*.css`. Use the tokens (`bg-mahogany`, `var(--color-night)`), not raw hex.
- The system records the site as it is. Don't rewrite existing code to match it unless the task touches that code; known gaps are listed in the system.
- Fonts and the default page colors are not generated: fonts are loaded with `next/font`, and `--background` and `--foreground` are in `globals.css`.
