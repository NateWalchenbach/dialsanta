/* Public website analytics. Vercel aggregate counts; PostHog detail/replay only after explicit consent. */
(() => {
  'use strict';
  if (window.SiteI18n?.redirecting) return;
  const token = 'phc_CVCnDgFKwLpfCsyjyg8vA7d8URTnNW7jJwTpDarYyeVs';
  const key = 'dialsanta.website.analytics';
  const detailKey = 'dialsanta.website.detailed-analytics.v1';
  const pages = ['home','parents','support','privacy','terms','facetime-santa','how-to-call-santa','questions-to-ask-santa','press'];
  const campaigns = new Set(['ig','yt'].flatMap(channel => ['profile','adultugc','livecall','santaskit','experiment'].map(format => `ds-${channel}-${format}`)));
  const requestedCampaign = new URLSearchParams(location.search).get('ds');
  const campaign = campaigns.has(requestedCampaign) ? requestedCampaign : 'website';
  const placements = ['navigation','hero','footer','sticky','pack-5','pack-12','pack-30','character-santa','character-mrsclaus','character-comet','character-pip','character-crumble','character-flurry','guide-top','guide-bottom','guide-step','parents','other'];
  const lang = window.SiteI18n?.normalizeLanguage(document.documentElement.lang) || 'en';
  function publicPage(pathname) {
    const path = window.SiteI18n?.stripLocale(pathname);
    if (typeof path !== 'string') return null;
    const route = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/^\/|\/$/g, '');
    return route === '' || route === 'index' ? 'home' : pages.includes(route) ? route : null;
  }
  const page = publicPage(location.pathname);
  const blocked = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  const live = location.protocol === 'https:' && location.hostname === 'dialsanta.app';
  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  try { if (new URLSearchParams(location.search).get('analytics_qa') === '1') sessionStorage.setItem('dialsanta.website.qa','true'); } catch {}
  const isQA = () => { try { return read('dialsanta.website.qa') === 'true' || sessionStorage.getItem('dialsanta.website.qa') === 'true'; } catch { return read('dialsanta.website.qa') === 'true'; } };
  let choice = read(key), detailed = read(detailKey) === 'allow';
  const eligible = () => live && !!publicPage(location.pathname) && !window.SiteI18n?.redirecting && !blocked();
  const basicOK = () => eligible() && choice !== 'deny';
  const detailOK = () => basicOK() && detailed;
  const canonical = () => location.origin + location.pathname;
  function cleanURL(value) {
    if (value === '$direct') return value;
    try {
      const u = new URL(value, location.origin);
      if (!['http:','https:'].includes(u.protocol)) return '';
      return u.origin === location.origin ? u.origin + ((publicPage(u.pathname) || /^\/assets\//.test(u.pathname) || /^\/[a-z-]+\.css$/.test(u.pathname)) ? u.pathname : '/:private') : u.origin + '/';
    } catch { return ''; }
  }
  // All SDK properties, including uncompressed rrweb snapshots, are scrubbed before dispatch.
  function scrub(value, field = '') {
    if (Object.prototype.toString.call(value) === '[object Date]') return value;
    if (Array.isArray(value)) return value.map(v => scrub(v, field));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k,v] of Object.entries(value)) {
        if (k === 'token' && v === token) { out[k] = v; continue; }
        // rrweb's HTML doctype requires this structural name for replay reconstruction.
        if (k === 'name' && value.type === 1 && /^html$/i.test(v)) { out[k] = v; continue; }
        if (/^(?:\$ip|\$set|\$set_once|email|name|value|password|authorization|cookie|token|utm_.*|gclid|fbclid)$/i.test(k)) continue;
        // Heatmap payloads can use a page URL as an object key.
        out[/^https?:\/\//i.test(k) ? cleanURL(k) : k] = scrub(v,k);
      }
      return out;
    }
    if (typeof value !== 'string') return value;
    if (/pathname/i.test(field)) { try { const u = new URL(value, location.origin); return publicPage(u.pathname) ? u.pathname : '/:private'; } catch { return '/:private'; } }
    if (/url|href|referrer|^src$|^action$/i.test(field)) return value ? cleanURL(value) : '';
    if (/^https?:\/\//i.test(value)) return cleanURL(value);
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)) return '[redacted]';
    return value;
  }
  const safeReferrer = (() => {
    if (!document.referrer) return true;
    try { const r = new URL(document.referrer); return !r.search && !r.hash && (r.origin === location.origin ? !!publicPage(r.pathname) : r.pathname === '/'); }
    catch { return false; }
  })();
  let vercelLoaded = false, vercelViewed = false, ph = null, loading = false;
  const clicked = new Set();
  const source = (() => {
    if (campaign.startsWith('ds-ig-')) return 'instagram';
    if (campaign.startsWith('ds-yt-')) return 'youtube';
    try { const h = new URL(document.referrer).hostname;
      if (h === location.hostname) return 'internal';
      for (const s of ['reddit','facebook','instagram','youtube','bing','google']) if (h.split('.').includes(s)) return s;
      return h;
    } catch { return 'direct-or-unknown'; }
  })();
  function vercelCapture(event, placement) {
    if (!basicOK() || !safeReferrer) return;
    if (!vercelLoaded) {
      vercelLoaded = true;
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
      window.va('beforeSend', event => basicOK() ? {...event, url:canonical()} : null);
      const script = document.createElement('script'); script.src = '/_vercel/insights/script.js'; script.defer = true;
      script.setAttribute('data-disable-auto-track','1'); document.head.appendChild(script);
    }
    if (event === 'website_page_view') {
      if (!vercelViewed) { window.va('pageview',{path:location.pathname}); vercelViewed = true; }
    } else window.va('event',{name:event,data:{language:lang,placement:placements.includes(placement)?placement:'other'}});
  }
  function capture(event, properties = {}) {
    if (ph && detailOK()) ph.capture(event,{...properties,page,language:lang,source,campaign,surface:'website'});
  }
  function initializePostHog() {
    if (!detailOK()) return;
    if (ph) return;
    if (!window.DialSantaPostHog) {
      if (loading) return;
      loading = true;
      const script = document.createElement('script'); script.src = '/assets/vendor/posthog-1.438.9.js'; script.async = true;
      script.onload = () => { loading = false; initializePostHog(); };
      script.onerror = () => { loading = false; };
      document.head.appendChild(script); return;
    }
    ph = window.DialSantaPostHog;
    ph.init(token, {
      api_host:'https://us.i.posthog.com', ui_host:'https://us.posthog.com',
      persistence:'localStorage', persistence_name:'dialsanta_public_website_v1', cross_subdomain_cookie:false,
      person_profiles:'never', capture_pageview:true, capture_pageleave:true,
      request_batching:false, disable_surveys:true,
      autocapture:{dom_event_allowlist:['click'],element_attribute_ignorelist:['value','placeholder','title']},
      mask_all_text:true, mask_all_element_attributes:true,
      enable_heatmaps:true, capture_dead_clicks:true, rageclick:true,
      capture_performance:{web_vitals:true}, capture_exceptions:false,
      enable_recording_console_log:false, advanced_disable_feature_flags:true,
      session_recording:{
        maskAllInputs:true, maskTextSelector:'[contenteditable],[data-ph-sensitive],.ph-mask',
        maskAttributeFn:(name,value) => {
          if (['href','src'].includes(name)) return cleanURL(value);
          if (['class','id','style','width','height','alt','aria-label'].includes(name) && !value.includes('@')) return value;
          return '';
        },
        blockSelector:'form,input,textarea,select,[contenteditable],iframe,canvas,video,audio,[data-ph-sensitive],.ph-no-capture',
        recordCanvas:false, recordHeaders:false, recordBody:false, collectFonts:false, compress_events:false,
        maskNetworkRequestFn: data => ({...data,url:cleanURL(data.url)}),
        maskCapturedNetworkRequestFn: () => null,
      },
      disable_session_recording:false,
      before_send:event => {
        if (!detailOK()) return null;
        const clean = scrub(event);
        if (isQA() || new URLSearchParams(location.search).get('analytics_qa') === '1') clean.properties = {...clean.properties,is_internal:true,analytics_qa:true};
        clean.properties = {...clean.properties, surface:'website',page,language:lang,source,campaign,$current_url:canonical(),$pathname:location.pathname,$referrer:document.referrer?cleanURL(document.referrer):'', $process_person_profile:false};
        return clean;
      },
      loaded: instance => {
        if (!detailOK()) { instance.stopSessionRecording(); instance.opt_out_capturing(); return; }
        // A previous SDK withdrawal must also be cleared after fresh consent.
        if (instance.has_opted_out_capturing()) instance.opt_in_capturing();
        instance.register({surface:'website',page,language:lang,source,campaign});
        if (isQA()) instance.register({is_internal:true,analytics_qa:true});
      }
    });
  }
  function stop() {
    if (ph) { ph.stopSessionRecording(); ph.opt_out_capturing(); }
    clicked.clear();
  }
  function choose(value) {
    const allow = value === 'allow' && !blocked();
    choice = allow?'allow':'deny'; detailed = allow;
    try { localStorage.setItem(key,choice); localStorage.setItem(detailKey,choice); } catch { /* Current page only. */ }
    if (!allow) stop();
    else if (ph) { ph.opt_in_capturing(); ph.startSessionRecording(); ph.capture('$pageview'); }
    renderChoice(); start();
  }
  function renderChoice() {
    document.querySelectorAll('[data-analytics-state]').forEach(n => {n.textContent = blocked() || choice==='deny' ? 'Off' : detailed ? 'Detailed' : 'Basic';});
    document.querySelectorAll('[data-analytics-allow]').forEach(n => { n.disabled = detailOK() || blocked(); n.setAttribute('aria-pressed',String(detailOK())); });
    document.querySelectorAll('[data-analytics-deny]').forEach(n => n.setAttribute('aria-pressed',String(!basicOK())));
    const banner = document.getElementById('website-analytics-banner');
    if (banner) banner.hidden = !eligible() || choice==='deny' || detailed;
  }
  function bindControls() {
    document.querySelectorAll('[data-analytics-allow]').forEach(n=>n.addEventListener('click',()=>choose('allow')));
    document.querySelectorAll('[data-analytics-deny]').forEach(n=>n.addEventListener('click',()=>choose('deny')));
  }
  function start() { vercelCapture('website_page_view'); initializePostHog(); }
  window.addEventListener('storage',event=>{
    if (![key,detailKey].includes(event.key)) return;
    choice = read(key); detailed = read(detailKey)==='allow';
    if (!detailOK()) stop();
    else if (ph) { ph.opt_in_capturing(); ph.startSessionRecording(); }
    renderChoice(); start();
  });
  function attribute(link) {
    if (!live || !page || campaign==='website') return;
    try { const u = new URL(link.href,location.href);
      if (u.hostname==='apps.apple.com' && /\/id6808069158$/.test(u.pathname)) {
        u.searchParams.set('pt','128424654');u.searchParams.set('ct',campaign);u.searchParams.set('mt','8');link.href=u.href;
      } else if (u.origin===location.origin && !u.hash && publicPage(u.pathname)) { u.searchParams.set('ds',campaign);link.href=u.href; }
    } catch { /* Invalid URL */ }
  }
  document.querySelectorAll('a[href]').forEach(attribute);
  document.addEventListener('click',event=>{
    const element=event.target.closest?.('a[href],button'); if (!element) return;
    if (element.closest?.('form,[data-ph-sensitive],.ph-no-capture') || element.hasAttribute('data-analytics-allow') || element.hasAttribute('data-analytics-deny')) return;
    if (element.tagName==='A') attribute(element);
    let u; try { u=new URL(element.href); } catch { return; }
    const placement=placements.includes(element.dataset.download)?element.dataset.download:'other';
    if (u.hostname==='apps.apple.com' && u.pathname.includes('id6808069158')) {
      if (!basicOK() || clicked.has(placement)) return;
      clicked.add(placement);vercelCapture('app_store_click',placement);capture('app_store_click',{placement});
    } else if (u.origin===location.origin && publicPage(u.pathname)) capture('website_navigation_click',{destination:publicPage(u.pathname)});
    else if (u.protocol==='https:') capture('website_outbound_click',{destination_host:u.hostname});
  },true);
  // Engagement counts only foreground, recently active time; tab-idle time is excluded.
  let last=Date.now(), activeUntil=last+30000, engaged=0, lastSent=0, maxScroll=0;
  for (const event of ['pointerdown','keydown','scroll','touchstart']) document.addEventListener(event,()=>{activeUntil=Date.now()+30000;},{passive:true});
  function tick(flush=false) {
    const now=Date.now();
    if (detailOK() && !document.hidden) engaged+=Math.max(0,Math.min(now,activeUntil)-last);
    last=now;
    if (detailOK() && (flush || engaged-lastSent>=15000) && engaged>lastSent) { capture('website_engagement',{engaged_seconds:Math.round((engaged-lastSent)/1000),total_engaged_seconds:Math.round(engaged/1000),scroll_depth:maxScroll});lastSent=engaged; }
  }
  setInterval(()=>tick(),5000);
  document.addEventListener('scroll',()=>{
    const height=document.documentElement.scrollHeight-window.innerHeight;
    const depth=height>0?Math.min(100,Math.round(window.scrollY/height*100)):100;
    const milestone=Math.floor(depth/25)*25;
    if (milestone>maxScroll) {maxScroll=milestone;capture('website_scroll_depth',{percent:milestone});}
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{tick(true);last=Date.now();});
  window.addEventListener('pagehide',()=>tick(true));
  document.querySelectorAll('video').forEach((video,index)=>{
    const milestones=new Set();
    video.addEventListener('play',()=>capture('website_video_play',{video_index:index}));
    video.addEventListener('ended',()=>capture('website_video_complete',{video_index:index}));
    video.addEventListener('timeupdate',()=>{const p=Math.floor(video.currentTime/video.duration*4)*25;if(p>0 && p<=100 && !milestones.has(p)){milestones.add(p);capture('website_video_progress',{video_index:index,percent:p});}});
  });
  bindControls(); renderChoice(); start();
})();
