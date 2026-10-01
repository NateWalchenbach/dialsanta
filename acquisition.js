/* Optional, anonymous website measurement. No SDK, cookies, replay or app identity. */
(() => {
  'use strict';
  const token = 'phc_CVCnDgFKwLpfCsyjyg8vA7d8URTnNW7jJwTpDarYyeVs'; // Public, write-only Dial Santa project 639766.
  const key = 'dialsanta.website.analytics';
  const languages = ['en','es','fr','de','it','pt','ru'];
  const pages = ['home','parents','support','privacy','terms','facetime-santa','how-to-call-santa','questions-to-ask-santa','press'];
  // Fixed public campaign labels only; never store arbitrary query values or visitor IDs.
  const campaigns = new Set(['ig','yt'].flatMap(channel => ['profile','adultugc','livecall','santaskit','experiment'].map(format => `ds-${channel}-${format}`)));
  const requestedCampaign = new URLSearchParams(location.search).get('ds');
  const campaign = campaigns.has(requestedCampaign) ? requestedCampaign : 'website';
  const placements = ['navigation','hero','footer','sticky','pack-5','pack-12','pack-30','character-santa','character-mrsclaus','character-comet','character-pip','character-crumble','character-flurry','guide-top','guide-bottom','guide-step','parents','other'];
  const lang = languages.includes(document.documentElement.lang) ? document.documentElement.lang : 'en';
  const route = location.pathname.replace(/^\/(es|fr|de|it|pt|ru)\//, '/').replace(/\.html$/, '').replace(/^\/|\/$/g, '');
  const page = route === '' || route === 'index' ? 'home' : pages.includes(route) ? route : null;
  const blocked = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  const live = location.protocol === 'https:' && location.hostname === 'dialsanta.app';
  let allowed = false;
  try { allowed = localStorage.getItem(key) === 'allow'; } catch { /* Opt-in stays off. */ }
  let pageId;
  let viewed = false;
  const clicked = new Set();
  const source = (() => {
    if (campaign.startsWith('ds-ig-')) return 'instagram';
    if (campaign.startsWith('ds-yt-')) return 'youtube';
    try {
      const host = new URL(document.referrer).hostname;
      if (host === location.hostname) return 'internal';
      if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'google';
      if (/(^|\.)(instagram\.com|l\.instagram\.com)$/.test(host)) return 'instagram';
      if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'youtube';
      if (/(^|\.)bing\.com$/.test(host)) return 'bing';
      return 'other';
    } catch { return 'direct-or-unknown'; }
  })();
  function capture(event, placement) {
    if (!live || !page || !allowed || blocked() || !crypto.randomUUID) return;
    pageId ||= crypto.randomUUID(); // Memory only: discarded on navigation. Never an app/user ID.
    const properties = {page, language:lang, source, campaign, $process_person_profile:false, $geoip_disable:true, $ip:null};
    if (placement) properties.placement = placements.includes(placement) ? placement : 'other';
    const payload = {api_key:token, distinct_id:pageId, event, properties};
    fetch('https://us.i.posthog.com/i/v0/e/', {method:'POST', mode:'cors', credentials:'omit', referrerPolicy:'no-referrer', keepalive:true, headers:{'Content-Type':'text/plain'}, body:JSON.stringify(payload)}).catch(() => {});
  }
  function view() { if (!viewed && allowed && !blocked()) { capture('website_page_view'); viewed = true; } }
  function renderChoice() {
    const enabled = allowed && !blocked();
    document.querySelectorAll('[data-analytics-allow]').forEach(button => { button.disabled = enabled || blocked(); button.setAttribute('aria-pressed', String(enabled)); });
    document.querySelectorAll('[data-analytics-deny]').forEach(button => { button.setAttribute('aria-pressed', String(!enabled)); });
    document.querySelectorAll('[data-analytics-state]').forEach(status => { status.textContent = status.dataset[enabled ? 'on' : 'off']; });
  }
  function choose(value) {
    allowed = value === 'allow' && !blocked();
    try { localStorage.setItem(key, allowed ? 'allow' : 'deny'); } catch { /* This page only. */ }
    if (!allowed) { pageId = undefined; viewed = false; clicked.clear(); }
    renderChoice(); view();
  }
  document.querySelectorAll('[data-analytics-allow]').forEach(button => button.addEventListener('click', () => choose('allow')));
  document.querySelectorAll('[data-analytics-deny]').forEach(button => button.addEventListener('click', () => choose('deny')));
  window.addEventListener('storage', event => { if (event.key === key) { allowed = event.newValue === 'allow'; renderChoice(); view(); } });
  function attribute(link) {
    if (!live || !page || campaign === 'website') return;
    try {
      const url = new URL(link.href, location.href);
      if (url.hostname === 'apps.apple.com' && /\/id6808069158$/.test(url.pathname)) {
        url.searchParams.set('pt', '128424654'); url.searchParams.set('ct', campaign); url.searchParams.set('mt', '8');
        link.href = url.href;
      } else if (url.origin === location.origin && !url.hash) {
        const next = url.pathname.replace(/^\/(es|fr|de|it|pt|ru)\//, '/').replace(/\.html$/, '').replace(/^\/|\/$/g, '');
        if (next === '' || next === 'index' || pages.includes(next)) {
          url.searchParams.set('ds', campaign); link.href = url.href;
        }
      }
    } catch { /* Ignore non-URL links. */ }
  }
  document.querySelectorAll('a[href]').forEach(attribute);
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    attribute(link); // Capture phase also handles dynamically created download buttons.
    if (!allowed || blocked()) return;
    let url; try { url = new URL(link.href); } catch { return; }
    if (url.hostname !== 'apps.apple.com' || !url.pathname.includes('id6808069158')) return;
    const placement = placements.includes(link.dataset.download) ? link.dataset.download : 'other';
    if (clicked.has(placement)) return;
    clicked.add(placement); capture('app_store_click', placement);
  }, true);
  renderChoice(); view();
})();
