// Only count host landings. Invitation URLs and referrers stay in the browser.
export function countHostLanding(url: Pick<Location, 'origin' | 'pathname'>) {
  if (url.origin !== 'https://shot.etys.no' || url.pathname !== '/' || navigator.webdriver) return;
  try {
    if (localStorage.getItem('plausible_ignore') !== 'true') {
      void fetch('https://analytics.etys.no/api/event', {
        method: 'POST',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        keepalive: true,
        body: JSON.stringify({ n: 'pageview', u: 'https://shot.etys.no/', d: 'shot.etys.no' }),
      }).catch(() => {});
    }
  } catch {
    // Storage can be disabled by browser privacy settings.
  }
}
