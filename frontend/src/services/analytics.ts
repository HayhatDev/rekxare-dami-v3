/**
 * Script-less, cookie-free page analytics.
 *
 * The app ships a strict CSP (`script-src 'self'`), so a third-party analytics
 * <script> would be blocked anyway. Instead this posts Plausible-compatible
 * beacons directly from the client: the only CSP change required is adding the
 * analytics origin to `connect-src` (see `buildConnectSrc` in vite.config.ts).
 *
 * Everything is a silent no-op until VITE_ANALYTICS_HOST and
 * VITE_ANALYTICS_DOMAIN are configured, so local dev, tests and CI never
 * send traffic anywhere.
 */

export interface AnalyticsConfig {
  /** Collector origin, e.g. https://plausible.io */
  host?: string;
  /** Site id the hits are attributed to, e.g. rekxare-dami.pages.dev */
  domain?: string;
}

export interface Analytics {
  /** Track a SPA route change. */
  pageview(path: string): void;
  /** Track a named interaction, e.g. `landing_signup_cta`. */
  event(name: string, props?: Record<string, string>): void;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<unknown>;

const NOOP: Analytics = { pageview: () => {}, event: () => {} };

export function createAnalytics(config: AnalyticsConfig, fetcher?: FetchLike): Analytics {
  const host = config.host?.trim().replace(/\/+$/, '');
  const domain = config.domain?.trim();
  if (!host || !domain) return NOOP;

  const send: FetchLike =
    fetcher ?? ((input, init) => fetch(input, init));

  function post(body: Record<string, unknown>) {
    try {
      void Promise.resolve(
        send(`${host}/api/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // `keepalive` lets the beacon survive a navigation, which is exactly
          // when SPA pageviews are fired.
          keepalive: true,
          body: JSON.stringify({
            d: domain,
            u: window.location.href,
            r: document.referrer || undefined,
            w: window.innerWidth,
            ...body,
          }),
        })
      ).catch(() => {
        /* analytics must never surface as a console/network error */
      });
    } catch {
      /* ignore */
    }
  }

  return {
    pageview: (path) => post({ n: 'pageview', u: window.location.origin + path }),
    event: (name, props) => post({ n: 'event', e: name, p: props }),
  };
}

export const analytics = createAnalytics({
  host: import.meta.env.VITE_ANALYTICS_HOST,
  domain: import.meta.env.VITE_ANALYTICS_DOMAIN,
});
