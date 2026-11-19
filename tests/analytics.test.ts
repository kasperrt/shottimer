import { expect, it, vi } from 'vitest';
import { countHostLanding } from '../src/lib/analytics';

it('keeps invite paths, query strings, fragments and referrers out of analytics', () => {
  vi.stubGlobal('localStorage', { getItem: () => null });
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
  try {
    countHostLanding(new URL('https://shot.etys.no/private-invite'));
    expect(fetch).not.toHaveBeenCalled();
    countHostLanding(new URL('https://shot.etys.no/?private#fragment'));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ n: 'pageview', u: 'https://shot.etys.no/', d: 'shot.etys.no' }),
    });
  } finally {
    fetch.mockRestore();
    vi.unstubAllGlobals();
  }
});
