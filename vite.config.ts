import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Content Security Policy for the production build. GitHub Pages can't send custom headers,
 * so it goes in a <meta> tag. Only applied to builds: the dev server needs inline scripts for hot reload.
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  // data: covers the inline favicon and Phaser's built-in placeholder textures.
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'self'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join('; ');

function csp(): Plugin {
  return {
    name: 'hollowlight-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
  };
}

export default defineConfig({
  // Relative base so the build works on GitHub Pages under /<repo>/
  base: './',
  plugins: [csp()],
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