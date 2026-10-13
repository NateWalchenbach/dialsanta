/* One notice for website cookies and browser storage; measurement stays in its own modules. */
(() => {
  'use strict';
  if (window.SiteI18n?.redirecting) return;
  const banner = document.getElementById('website-analytics-banner');
  if (!banner) return;
  const noticeKey = 'dialsanta.website.cookie-notice.v1';
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const blocked = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  const panel = banner.querySelector('[data-cookie-settings]');
  const analytics = banner.querySelector('[data-cookie-analytics]');
  const ads = banner.querySelector('[data-cookie-ads]');
  const manage = banner.querySelector('[data-cookie-manage]');
  let opener = null;
  function sync() {
    analytics.checked = !blocked() && read('dialsanta.website.analytics') !== 'deny' && read('dialsanta.website.detailed-analytics.v1') === 'allow';
    ads.checked = !blocked() && read('dialsanta.website.ads') === 'allow';
    analytics.disabled = ads.disabled = blocked();
    banner.querySelector('[data-cookie-accept]').disabled = blocked();
    banner.querySelector('[data-cookie-signal]').hidden = !blocked();
  }
  function show(settings = false) {
    sync(); banner.hidden = false; panel.hidden = !settings;
    manage.setAttribute('aria-expanded', String(settings));
  }
  function save(allowAnalytics, allowAds) {
    const detail = {analytics:allowAnalytics && !blocked() ? 'allow':'deny',ads:allowAds && !blocked() ? 'allow':'deny'};
    window.dispatchEvent(new CustomEvent('dialsanta:privacy-choice', {detail}));
    try { localStorage.setItem(noticeKey, 'saved'); } catch { /* Applies on this page if storage is unavailable. */ }
    banner.hidden = true;
    if (opener?.isConnected) opener.focus();
  }
  banner.querySelector('[data-cookie-accept]').addEventListener('click', () => save(true,true));
  banner.querySelector('[data-cookie-reject]').addEventListener('click', () => save(false,false));
  banner.querySelector('[data-cookie-save]').addEventListener('click', () => save(analytics.checked,ads.checked));
  manage.addEventListener('click', () => { show(panel.hidden); if (!panel.hidden) analytics.focus(); });
  document.querySelectorAll('[data-cookie-open]').forEach(button => button.addEventListener('click', () => {
    opener = button; show(true); (blocked() ? banner.querySelector('[data-cookie-save]') : analytics).focus();
  }));
  window.addEventListener('storage', event => {
    if (event.key === noticeKey && event.newValue === 'saved') banner.hidden = true;
    else if (!banner.hidden) sync();
  });
  if (read(noticeKey) !== 'saved') show();
})();
