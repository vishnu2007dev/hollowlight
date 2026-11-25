import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Cloudflare Web Analytics: cookie-free visitor counts. The token is public by design.
 * Only added to production builds, so local testing never shows up in the stats.
 */
const ANALYTICS_TOKEN = '1c309e9089054b6c8c4cb9f0c63e9bad';
const ANALYTICS_SNIPPET = `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${ANALYTICS_TOKEN}"}'></script>`;

/**
 * Content Security Policy for the production build, as a <meta> tag (public/_headers sends the same
 * policy as a real header on Cloudflare). Only applied to builds: the dev server needs inline scripts for hot reload.
 * Keep it in sync with public/_headers.
 */
const CSP = [
  "default-src 'none'",
  // The only third-party script: Cloudflare's analytics beacon.
  "script-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self'",
  // data: covers Phaser's built-in placeholder textures.
  "img-src 'self' data: blob:",
  // The beacon reports page views here.
  "connect-src 'self' https://cloudflareinsights.com",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'self'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join('; ');

/** `--mode itch` builds for itch.io: same game, no analytics (itch.io has its own stats). */
function productionHtml(): Plugin {
  let analytics = true;
  return {
    name: 'hollowlight-production-html',
    apply: 'build',
    configResolved(config) {
      analytics = config.mode !== 'itch';
    },
    transformIndexHtml: {
      order: 'post',
      handler: (html) => {
        // Without analytics, nothing outside the game's own origin is allowed at all.
        const policy = analytics ? CSP : CSP.replace(/ https:\/\/(static\.)?cloudflareinsights\.com/g, '');
        const withCsp = html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        );
        return analytics ? withCsp.replace('</body>', `  ${ANALYTICS_SNIPPET}\n  </body>`) : withCsp;
      },
    },
  };
}

export default defineConfig({
  // Relative base so the build works from any folder or host.
  base: './',
  plugins: [productionHtml()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Keep Phaser in its own chunk so game-code changes don't bust its cache.
        manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
