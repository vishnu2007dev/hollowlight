# Contributing to Hollowlight

Thanks for wanting to help! Bug reports, balance feedback and pull requests are all welcome.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Before opening a PR, make sure everything passes:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

CI runs the same checks on every pull request.

## Where things live

- **Game rules** go in `src/core/`. Keep this folder free of Phaser imports so it stays unit-testable, and add a test in `tests/core/` for any new rule.
- **Balance numbers** (weapon levels, enemy stats) live in `src/data/`. Tweaking a number there is the easiest first contribution.
- **Rendering and wiring** live in `src/scenes/`, `src/systems/` and `src/entities/`.

## Ideas that would make great PRs

- A new weapon or passive (add it to `src/data/`, then handle it in `WeaponSystem`)
- A new enemy type with its own behaviour
- Gamepad support
- Accessibility: colour-blind palette, reduced-motion mode
- Localisation

## Style

- TypeScript strict mode, Prettier formatting (`npm run format`).
- Keep pull requests focused: one feature or fix each.
- No external art or audio assets. Everything is generated in code, which keeps licensing simple.
