/* Meta Pixel for ad measurement: PageView plus App Store clicks. Off on checkout pages, with GPC/DNT, after "Turn off", and in the EU/UK/Switzerland until allowed. */
(() => {
  'use strict';
  const PIXEL_ID = '1399957468427149'; // Events Manager dataset "Dial Santa Website".
  if (!PIXEL_ID) return;
  const key = 'dialsanta.website.ads';
  const live = location.protocol === 'https:' && location.hostname === 'dialsanta.app';
  const route = location.pathname.replace(/^\/(es|fr|de|it|pt|ru)\//, '/').replace(/\.html$/, '').replace(/^\/|\/$/g, '');
  const excluded = ['purchase', 'thanks'].includes(route);
  const blocked = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  // Prior consent is required in the EEA, UK and Switzerland. The browser's time zone is the only
  // signal available on a static site; unknown zones ask too.
  const consentZones = ['Atlantic/Reykjavik','Atlantic/Faroe','Atlantic/Jan_Mayen','Atlantic/Canary','Atlantic/Madeira','Atlantic/Azores','Africa/Ceuta','Arctic/Longyearbyen','Asia/Nicosia','Asia/Famagusta','America/Miquelon','America/Cayenne','America/Martinique','America/Guadeloupe','America/Marigot','America/St_Barthelemy','Indian/Reunion','Indian/Mayotte'];
  const consentRegion = (() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return !zone || zone.startsWith('Europe/') || consentZones.includes(zone);
    } catch { return true; }
  })();
  let choice = null;
  try { choice = localStorage.getItem(key); } catch { /* Treated as no choice yet. */ }
  let loaded = false;
  let active = false;
  const clicked = new Set();
  const permitted = () => live && !excluded && !blocked() && (choice === 'allow' || (choice !== 'deny' && !consentRegion));
  function start() {
    if (!permitted()) return;
    if (loaded) {
      if (!active) { window.fbq('consent', 'grant'); active = true; }
      return;
    }
    loaded = true; active = true;
    const w = window;
    const n = w.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!w._fbq) w._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const script = document.createElement('script');
    script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
    // No automatic button/metadata collection or remote configuration; Limited Data Use where it applies.
    n('set', 'autoConfig', false, PIXEL_ID);
    n('dataProcessingOptions', ['LDU'], 0, 0);
    n('init', PIXEL_ID);
    n('track', 'PageView');
  }
  function stop() {
    if (loaded && active) window.fbq('consent', 'revoke');
    active = false; clicked.clear();
  }
  function render() {
    const on = active;
    document.querySelectorAll('[data-ads-state]').forEach(status => { status.textContent = status.dataset[on ? 'on' : 'off']; });
    document.querySelectorAll('[data-ads-allow]').forEach(button => { button.disabled = on || blocked(); button.setAttribute('aria-pressed', String(on)); });
    document.querySelectorAll('[data-ads-deny]').forEach(button => button.setAttribute('aria-pressed', String(!on)));
  }
  const banner = document.querySelector('[data-ads-banner]');
  function hideBanner() {
    if (!banner) return;
    banner.hidden = true; document.body.classList.remove('has-ads-banner');
  }
  function choose(value) {
    choice = value;
    try { localStorage.setItem(key, value); } catch { /* This page only. */ }
    hideBanner();
    if (value === 'allow') start(); else stop();
    render();
  }
  document.querySelectorAll('[data-ads-allow]').forEach(button => button.addEventListener('click', () => choose('allow')));
  document.querySelectorAll('[data-ads-deny]').forEach(button => button.addEventListener('click', () => choose('deny')));
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    choice = event.newValue; hideBanner();
    if (permitted()) start(); else stop();
    render();
  });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || !active) return;
    let url; try { url = new URL(link.href); } catch { return; }
    if (url.hostname !== 'apps.apple.com' || !url.pathname.includes('id6808069158')) return;
    const placement = link.dataset.download || 'other';
    if (clicked.has(placement)) return;
    clicked.add(placement);
    window.fbq('trackCustom', 'AppStoreClick', {placement, language: document.documentElement.lang, page: route || 'home'});
  }, true);
  if (banner && live && !excluded && !blocked() && consentRegion && choice === null) {
    banner.hidden = false; document.body.classList.add('has-ads-banner');
  }
  start(); render();
})();
