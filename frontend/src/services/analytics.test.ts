import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAnalytics } from './analytics';

interface Call {
  url: string;
  init?: RequestInit;
}

function makeFetcher() {
  const calls: Call[] = [];
  const fetcher = vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve({});
  });
  return { calls, fetcher };
}

function parseBody(call: Call) {
  return JSON.parse(String(call.init?.body)) as Record<string, unknown>;
}

describe('createAnalytics', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { href: 'https://rekxare-dami.pages.dev/?x=1', origin: 'https://rekxare-dami.pages.dev' });
    vi.stubGlobal('document', { referrer: 'https://google.com/' });
    vi.stubGlobal('window', { location: { href: 'https://rekxare-dami.pages.dev/?x=1', origin: 'https://rekxare-dami.pages.dev' }, innerWidth: 1280 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a no-op when host or domain is missing', () => {
    const { calls, fetcher } = makeFetcher();

    for (const config of [
      {},
      { host: 'https://plausible.io' },
      { domain: 'example.com' },
      { host: '   ', domain: 'example.com' },
    ]) {
      const a = createAnalytics(config, fetcher);
      a.pageview('/quiz');
      a.event('signup');
    }

    expect(calls).toHaveLength(0);
  });

  it('posts a pageview with canonicalised url and site domain', () => {
    const { calls, fetcher } = makeFetcher();
    const a = createAnalytics({ host: 'https://plausible.io/', domain: 'app.example.com' }, fetcher);

    a.pageview('/quiz');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://plausible.io/api/event');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.keepalive).toBe(true);

    const body = parseBody(calls[0]);
    expect(body).toMatchObject({
      n: 'pageview',
      d: 'app.example.com',
      u: 'https://rekxare-dami.pages.dev/quiz',
      r: 'https://google.com/',
      w: 1280,
    });
    expect((calls[0].init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('posts named events with props', () => {
    const { calls, fetcher } = makeFetcher();
    const a = createAnalytics({ host: 'https://plausible.io', domain: 'app.example.com' }, fetcher);

    a.event('landing_signup_cta', { variant: 'hero' });

    const body = parseBody(calls[0]);
    expect(body).toMatchObject({ n: 'event', e: 'landing_signup_cta', p: { variant: 'hero' } });
  });

  it('never throws when the request fails', async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('network down')));
    const a = createAnalytics({ host: 'https://plausible.io', domain: 'app.example.com' }, fetcher as never);

    expect(() => a.pageview('/')).not.toThrow();
    expect(() => a.event('x')).not.toThrow();
    // let the swallowed rejections settle before the test ends
    await new Promise((r) => setTimeout(r, 0));
  });

  it('never throws when fetch itself throws synchronously', () => {
    const fetcher = vi.fn(() => {
      throw new Error('blocked by CSP');
    });
    const a = createAnalytics({ host: 'https://plausible.io', domain: 'app.example.com' }, fetcher as never);

    expect(() => a.pageview('/')).not.toThrow();
  });
});
