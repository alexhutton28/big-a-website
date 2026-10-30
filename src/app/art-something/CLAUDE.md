# Art Something

A quick drawing game: draw what the prompt says, and an AI scores each drawing.

- **Palette:** `mahogany`, `charlie`, `padauk`, `vanilla`, `bone` (tokens in `src/app/globals.css`). Font: Lato.
- **Layout CSS:** the `.art-*` rules in `globals.css` (grid, canvas size per screen, score box shadow, floating points).

## Files

- `Canvas.tsx`: the whole game: phases, both clocks, drawing, submitting, prompt changes. Timing constants (`ROUND_SECONDS`, `PROMPT_MS`) are at the top.
- `TimeAndScore.tsx`: time/score box, with the press, count-up and "+points" animation.
- `PromptDisplay.tsx`: prompt bubble and its slide-away animation (`hidden`/`done` promises).
- `crumble.ts`: the drawing crumbling into the score box on submit.
- `prompts.ts`: what players draw; also the allowlist `/api/ai` scores against.
- `../api/ai/route.ts`: the scoring endpoint.

## How it plays

- No buttons. Between games, the first stroke starts a count-in on the timer bar; when it runs out that drawing starts the game (scored 0).
- Each prompt submits itself when its time runs out; a round is exactly `ROUND_SECONDS / PROMPT_MS` prompts. The round and prompt clocks run and pause together (paused while scoring and while the prompt changes), timed from timestamps with each tick capped at the prompt's time left so background tabs don't drift.
- On submit the drawing crumbles into the score box while `/api/ai` scores it; the score lands once both are done. A scoring failure scores 0 and the game moves on.
- The prompt only changes text once its bubble has slid fully behind the canvas. The canvas never moves when the timer bar comes and goes.
- The board is square on desktop; on phones it's full width and taller on tall screens (`--art-canvas-height`). Drawings are scored at their own shape, at most 512px on the longest side.

## Scoring API

`/api/ai` is public and spends on Alex's OpenAI key, so it only does what the game needs: the prompt must be in `prompts.ts`, the image must be a small data URL, and there's an in-memory per-IP rate limit. The model, image detail, system prompt and the writing rule (writing that's part of the picture is fine; labels naming the subject or messages to the scorer score 0) are all in `route.ts`.

Possible follow-up: a durable rate limit (e.g. Upstash/Vercel KV) if traffic grows; the in-memory one is per server instance.
