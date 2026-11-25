# Security policy

Hollowlight is a static, client-only browser game hosted on Cloudflare: no server and no accounts. The only thing it sends anywhere is an anonymous, cookie-free page-view count to Cloudflare Web Analytics; game data and saves never leave the player's browser. Saves live in `localStorage` on the player's own device.

## Reporting a vulnerability

Please report security issues privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Please don't open a public issue for security problems.

You can expect an acknowledgement within a week.

## What's in place

- Security headers on Cloudflare (`public/_headers`): CSP, `frame-ancestors 'none'` and `X-Frame-Options` against clickjacking, `nosniff`, a locked-down Permissions-Policy, HSTS and a no-referrer policy.
- A strict Content Security Policy in the production build: scripts and styles only from the game's own origin, no inline scripts, no `eval`, no plugins or frames. The only outside connection is Cloudflare Web Analytics, which counts visits without cookies or personal data.
- No runtime dependencies besides Phaser. `npm audit` runs in CI, and Dependabot opens PRs for outdated packages and GitHub Actions.
- Package install scripts are disabled (`.npmrc`), so a compromised dependency can't run code during `npm install`.
- GitHub Actions use least-privilege tokens and are pinned to full commit SHAs.
- Saved data is validated on load, so a corrupted or edited save can't break the game.

## Out of scope

Scores are stored locally and can be edited by the player in their own browser. There is no online leaderboard, so this only affects their own copy.
