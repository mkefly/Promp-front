# Agent LLM — Retro Pro (Pro Upgrades)

What you get:
- Dual auth (**API Key** or **Azure SSO / MSAL**)
- Demo/Live modes
- **SSE + chunked parsing** (auto-detect SSE vs NDJSON/plain)
- **Zod validation** for `BACKENDS`
- **rehype-sanitize** in Markdown renderer
- **Virtualized log** behind `VITE_FEATURE_VIRTUAL_LOG`
- **Vitest + Playwright** scaffolding
- **GitLab CI** to deploy static build as **Pages**

## Quickstart
```bash
npm install
cp .env.example .env
npm run dev
```

## Tests
```bash
npm run test
npm run e2e
```

## GitLab Pages
Push to GitLab with `.gitlab-ci.yml` committed. The `pages` job publishes `dist/`.
