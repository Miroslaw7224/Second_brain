# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

**Second Brain (Freelancer Edition)** — AI-powered knowledge management web app built with Next.js 14 (App Router), React 19, Firebase (Auth + Firestore), and Google Gemini API. Single Next.js application (not a monorepo).

### Key commands

See `README.md` and `package.json` scripts for the full list. Summary:

| Action | Command |
|--------|---------|
| Dev server | `npm run dev` (port 3100) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Unit tests | `npm run test:run` |
| Integration tests | `npm run test:integration:docker` (requires Docker) |
| E2E tests | `npm run test:e2e` (requires dev server + Playwright browsers) |

### Non-obvious caveats

- **`--legacy-peer-deps` is required** when running `npm install` due to peer dependency conflicts between React 19 and some packages.
- **ESLint 8** is needed — Next.js 14's `next lint` is not compatible with ESLint 9+. The `.eslintrc.json` config uses `next/core-web-vitals`.
- **Dev server runs on port 3100** (not the default 3000). This is configured in the `dev` script and referenced in `playwright.config.ts`.
- **Firebase credentials are required** for the app to fully function (login, data persistence, AI features). Without them, the UI renders but auth/data operations fail with API key errors. Required env vars are documented in `.env.example`.
- **`.env` file** must exist (copy from `.env.example`). It is gitignored.
- The Vitest config excludes `tests/e2e/**` but the Playwright e2e spec (`tests/e2e/home.spec.ts`) may still be picked up if not excluded correctly — this is a known pre-existing issue.
- One unit test in `ragService.test.ts` has a pre-existing mock failure (`getResourcesFromFirestore` not defined in the mock).
- Integration tests require Docker and the Firestore emulator (`docker compose -f docker-compose-test.yml up -d`).
