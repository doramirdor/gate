# Gate — interactive demo (Remotion)

A ~47s animated walkthrough of Gate: **how you create a profile** and **how an
agent uses it in real life**. Built with [Remotion](https://remotion.dev) (React
→ video). Standalone — it does not touch `apps/web` or the edge functions.

All copy is mirrored from the product's source of truth (`lib/brand.ts`,
`lib/profile.ts`) so the demo stays accurate: the section keys, the
`public / link / private` visibility model, the three MCP tools, and the footer.

## Storyboard

| # | Scene | Beat |
|---|-------|------|
| 1 | Intro | Gate mark draws in + tagline |
| 2 | The problem | An agent spends / sends / books *for you* — no approval |
| 3 | Claim your handle | Type `usegate.dev/amir`, availability, claim |
| 4 | Fill your profile | About / Scheduling / Dietary / Budget + visibility pills |
| 5 | Endpoint + tokens | MCP `POST` URL, bearer token, scopes |
| 6 | `get_context` | Agent reads **scoped** profile markdown |
| 7 | `request_approval` | €240 booking exceeds the ceiling → Telegram push → Approve |
| 8 | `check_approval` | Resolves `approved`, agent acts, everything is logged |
| 9 | Outro | Tagline + tool names + `claim yours at usegate.dev` |

## Commands

```sh
npm install
npm run dev          # Remotion Studio — scrub & tweak at localhost:3000
npm run render       # → out/gate-demo.mp4   (1920×1080, h264)
npm run render:gif   # → out/gate-demo.gif   (shareable, every 2nd frame)
```

## Editing

- **Brand tokens** — `src/theme.ts` (mirrors `apps/web/app/globals.css`).
- **Timing** — scene durations live in `src/GateDemo.tsx` (`SCENES`); the
  composition length is derived from their sum.
- **Per-scene content** — `src/scenes/*.tsx`. Shared bits (cursor, browser
  chrome, terminal, phone, typewriter) are in `src/components/`.

## Browser note

Remotion normally downloads its own Chrome Headless Shell on first render. If
that download is blocked (offline / restricted network), `remotion.config.ts`
automatically falls back to a system Chrome install. Override or remove that
block there if you prefer the bundled shell.
