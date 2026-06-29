# Contributing to JS Player

Thanks for your interest in improving JS Player! This guide covers the basics —
see [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the full local setup.

## Getting started

```bash
git clone https://github.com/Sohal2001/js-player.git
cd js-player
npm ci
npm run dev        # http://localhost:5177
```

## Branching

- Branch from `main`.
- Use `feature/<short-name>` for features and `fix/<short-name>` for fixes —
  these branch prefixes trigger CI.

## Making changes

1. Keep changes focused and small where possible.
2. **Add or update tests** for any behaviour change. Choose the right layer:
   - **Unit** — a single class/function in isolation
   - **Integration** — two real modules wired together
   - **Functional** — the public `createPlayer()` / exported API
   - **E2E** — the running demo in a real browser

   See [`docs/TESTING.md`](docs/TESTING.md).
3. Run the local gate before pushing:

   ```bash
   npm run lint && npm run format:check && npm run test:coverage
   ```

   Use `npm run lint:fix` and `npm run format` to autofix.

## Coding standards

- Formatting is enforced by Prettier (`.prettierrc.json`); linting by ESLint
  (`.eslintrc.json`). CI fails on lint errors or formatting drift.
- Match the surrounding code's naming and structure.
- Preserve **YouTube ToS compliance**: only the official IFrame API and video
  IDs may be used — never stream extraction or direct media access.

## Pull requests

- Fill in the PR template.
- Ensure all CI jobs pass: tests (Node 18/20/22), coverage, lint + format,
  build, and E2E.
- Reference any related issue.

## Reporting issues

Use the issue templates under `.github/ISSUE_TEMPLATE/` where available, and
include reproduction steps, expected vs. actual behaviour, and environment
details.

## License

By contributing, you agree that your contributions are licensed under the
project's **Apache-2.0** license.
