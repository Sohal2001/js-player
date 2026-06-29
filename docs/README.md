# JS Player — Documentation

Complete documentation for the **Juhi Sohal Player (JS Player)** — a lightweight,
zero-dependency JavaScript video player for local files and YouTube, packaged as
a library, a PWA, and native Android/iOS apps.

## Index

| Doc | Read it for |
|-----|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How the app works — modules, event flow, and how one codebase ships as a library, PWA, and native apps |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Local setup, everyday commands, code style, and the contribution workflow |
| [INTEGRATION.md](./INTEGRATION.md) | Embedding JS Player in your app — install, API reference, events, styling, framework examples |
| [TESTING.md](./TESTING.md) | The four test layers (unit, integration, functional, E2E), how to run them, coverage, and how to write new tests |
| [PIPELINE.md](./PIPELINE.md) | CI/CD — the GitHub Actions workflows, required secrets, versioning, and release flow |

Also at the repo root: [README.md](../README.md), [PUBLISHING.md](../PUBLISHING.md),
[CONTRIBUTING.md](../CONTRIBUTING.md), and [CHANGELOG.md](../CHANGELOG.md).

## Quick links

- **Run it:** `npm ci && npm run dev` → http://localhost:5177
- **Test it:** `npm run test:coverage` (jsdom) + `npm run test:e2e` (Chromium)
- **Build it:** `npm run build:lib` (library) / `npm run build` (app)
- **Ship it:** push a `vX.Y.Z` tag → Play Store + App Store (see PIPELINE.md)
