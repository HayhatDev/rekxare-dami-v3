import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const CSP_PLACEHOLDER = '__CONNECT_SRC__';

function buildConnectSrc(env: Record<string, string>): string {
  const allowed = new Set<string>(["'self'", 'http://localhost:*', 'http://127.0.0.1:*']);

  const supabaseUrl = env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      const host = new URL(supabaseUrl).host;
      allowed.add(`https://${host}`);
      allowed.add(`wss://${host}`);
    } catch {
      /* ignore malformed URL; fall through to permissive default */
    }
  }

  const apiUrl = env.VITE_API_URL;
  if (apiUrl) {
    try {
      const u = new URL(apiUrl);
      const proto = u.protocol === 'https:' ? 'https:' : 'http:';
      allowed.add(`${proto}//${u.host}`);
    } catch {
      /* ignore malformed URL */
    }
  }

  // If no remote hosts were configured, fall back to a permissive policy so
  // the app still works against an (as-yet unknown) Supabase/API origin.
  const hasRemote = [...allowed.values()].some((v) => v !== "'self'" && !v.startsWith('http://localhost') && !v.startsWith('http://127.0.0.1'));
  if (!hasRemote) {
    return "'self' https: wss: http://localhost:* http://127.0.0.1:*";
  }
  return [...allowed].join(' ');
}

function cspInjectionPlugin(env: Record<string, string>): Plugin {
  const connectSrc = buildConnectSrc(env);
  return {
    name: 'rd-csp-injection',
    transformIndexHtml(html) {
      if (!html.includes(CSP_PLACEHOLDER)) return html;
      return html.replaceAll(CSP_PLACEHOLDER, connectSrc);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      cspInjectionPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: 'Rekxare Dami',
          short_name: 'Rekxare',
          description:
            'A calm study timer and weekly schedule planner with streak tracking and multi-language support.',
          lang: 'en',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#7C6CB0',
          background_color: '#7C6CB0',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,woff2}'],
          globIgnores: ['**/tessdata/**', '**/*.wasm*'],
        },
      }),
    ],
    test: {
      setupFiles: ['./src/setupTests.ts'],
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-XSS-Protection': '1; mode=block',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['framer-motion', '@radix-ui/react-dialog'],
          },
        },
      },
    },
  };
});
