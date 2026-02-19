# Repository Guidelines

## Project Structure & Module Organization

- Main runtime entry is `src/main.ts`; DI wiring lives in `src/app.module.ts`.
- Core automation logic is organized by library under `src/libraries/`:
  - `bens-flat/` for home automations and service modules.
  - `auto-deploy/` for deployment/webhook/monitoring helpers.
  - `test-utils/` for shared test helpers.
- Generated Home Assistant types are in `src/hass/*.mts` (regenerate with `type-writer`; avoid manual edits unless necessary).
- Tests and harness files are in `src/tests/` and `src/test-helpers/`.
- Operational scripts live in `scripts/` (`deploy.sh`, `rollback.sh`, `update_deps.sh`, etc.).

## Session Start

- At the start of each session, run `WATCH_MODE=true bun run type-writer` in the backgound to ensure that all Home Assistant types are up to date if they ae changed in hass

## Build, Test, and Development Commands

- This repository uses **Bun** as the primary package manager/runtime. Prefer `bun run <script>` over `yarn <script>`.
- `bun run dev`: run the app (`src/main.ts`).
- `bun run watch`: run with `nodemon` + `tsx` for auto-reload.
- `bun run build`: run deployment build script (`./scripts/deploy.sh`).
- `bun run lint`: lint `src/` with Oxlint.
- `bun run format`: format `src/` with Oxfmt.
- `bun run typecheck`: run TypeScript checks via `tsgo --noEmit`.
- `bun test`: execute test suite.
- `bun run type-writer`: regenerate `src/hass` types from Home Assistant.

## Coding Style & Naming Conventions

- TypeScript ESM project (`"type": "module"`), 2-space indentation, LF line endings, ~100-char line width.
- Prettier config: double quotes, trailing commas, `arrowParens: avoid`.
- File naming pattern in services: kebab-case with `-service.ts` suffix (example: `sleep-mode-service.ts`).
- Keep modules small and domain-focused; export via local `index.ts` barrels when appropriate.

## Testing Guidelines

- Framework: bun test with test config in `bunfig.toml`
- Test files use `*.test.ts` naming (example: `src/tests/lights.test.ts`).
- Add or update tests for behavior changes in automation services and edge-case state transitions.

## Quality Checks

- Run `bun run test`, `bun run typecheck` and `bun run lint` after each change and fix any issues

## Commit guidelines

- Follow existing commit style: short, imperative, lowercase summaries (example: `fix presence bug`, `add calendar integration`).
- Keep commits scoped to one logical change.
- This repo does not use PRs. Changes are validated using commit hooks and then deployed on push

## Security & Configuration Tips

- Keep secrets in `.env`; never commit credentials or tokens.
