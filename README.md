# Big A Website

A small collection of Pokémon TCG games, live at **[big-a.fun](https://big-a.fun)**.

## Games

| Game                       | Path                      | What it is                                                                                                                                                                                    |
| -------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guess That Flavor Text** | `/guess-that-flavor-text` | A daily puzzle: read a card's flavor text and guess the Pokémon. Lifelines (set, stage, attack name) give hints but cost a point each. One card per day, with streaks and a shareable result. |
| **Limitless Check**        | `/limitless-check`        | A higher-or-lower game: which card or deck has appeared in more recent tournament decklists on [Play Limitless](https://play.limitlesstcg.com)?                                               |
| **Art Something**          | `/art-something`          | Work in progress and not released yet. It's hidden from the home page, but the route still exists.                                                                                            |

## Getting started

Requires Node.js 20 or newer (developed on Node 24).

```bash
npm install
cp .env.example .env.local   # then fill in any keys you need
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pages reload automatically as you edit.

`OPENAI_API_KEY` is only needed for Art Something (`/api/ai`). Guess That Flavor Text and Limitless Check run without any keys.

## Scripts

| Command                      | What it does                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                | Start the dev server                                                                                                                                      |
| `npm run build`              | Production build (also type-checks)                                                                                                                       |
| `npm run lint`               | ESLint, including Prettier formatting                                                                                                                     |
| `npm run stylelint`          | Lint CSS                                                                                                                                                  |
| `npm run format`             | Format everything with Prettier                                                                                                                           |
| `npm run fetch-flavor-cards` | Refresh Guess That Flavor Text's card data from the [Pokémon TCG API](https://pokemontcg.io), written to `src/app/guess-that-flavor-text/flavor-cards.ts` |
| `npm run fetch-cards`        | Rebuild Limitless Check's card usage counts (last 30 days of Play Limitless tournaments), written to `src/app/limitless-check/cards-generated.ts`         |
| `npm run fetch-decks`        | Rebuild Limitless Check's deck usage counts, written to `src/app/limitless-check/decks.ts`                                                                |

The files those fetch scripts write are generated, so don't edit them by hand; re-run the script instead.

## Project layout

```
src/
  app/
    page.tsx                  Home page (links to each game)
    layout.tsx                Root layout, fonts (Lato default, Barlow for Guess That Flavor Text)
    globals.css               Tailwind setup, brand colors (@theme), shared animations
    guess-that-flavor-text/   One folder per game
    limitless-check/
    art-something/
    api/ai/                   OpenAI-backed route used by Art Something
  components/Header.tsx       Site header (themed per game)
scripts/                      Data fetch scripts (see above)
public/                       Images and icons
```

Built with [Next.js](https://nextjs.org) (App Router), React and [Tailwind CSS](https://tailwindcss.com) v4.

## Deploying

Pushing to `main` deploys to big-a.fun. Every push also runs the build check in `.github/workflows/ci.yml` (lint, type-check and production build).
