# Between-round checks

Run after every round, before the next one starts (owner instruction, 2026-11-15). If any check fails,
stop and fix it before continuing.

```bash
npm run check
```

```bash
npm run test:e2e
```

```bash
npm audit --audit-level=moderate
```

```bash
npm audit signatures
```

Then confirm the GitHub Actions run for the pushed commit passed.

| Area | What is checked | Where |
| --- | --- | --- |
| Performance | Core within 50 KB of JavaScript and 150 KB in total, each mode within 30 KB of code and 150 KB of art | `npm run check:size` |
| | No animation loops or polling intervals; timers only through the one scheduler | `tooling/plan-audit.test.ts` |
| | Animations and transitions only on transform, opacity and filter (CSS and script) | `tooling/plan-audit.test.ts` |
| | The engine wakes only for visible changes (exact wake counts) | `packages/core/src/engine/*.test.ts` |
| | Controls respond within 100 ms; no unexpected layout shift; no main-thread task of 50 ms or more | `packages/web/e2e/quality.spec.ts` |
| Security | Dependency advisories and registry signatures | `npm audit`, `npm audit signatures` |
| | Exact CSP and headers; Trusted Types and inline styles blocked; no CSP violations; no third-party requests | `packages/web/e2e/idle.spec.ts` |
| | No markup from strings; storage only through adapters; nothing loaded from another origin | lint, `tooling/plan-audit.test.ts` |
| | Only the stored data `docs/data-inventory.md` lists | `packages/web/e2e/quality.spec.ts` |
| Design | Every built screen against its canvas frame, pixel by pixel | `packages/web/e2e/frames.spec.ts`, `idle.spec.ts` |
| | Preset contrast; lowercase copy; copy only in the brand module; numbers only in the config module | `npm run check:contrast`, `tooling/plan-audit.test.ts`, brand tests |
