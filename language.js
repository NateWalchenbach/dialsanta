/* Stable static editions; no geolocation, country lookup, or automatic browser redirect. */
(() => {
  const registry = window.SiteLanguageRegistry || [];
  const languages = new Map(registry.map(item => [item.code, item]));
  const aliases = { iw: 'he', in: 'id', tl: 'fil', no: 'nb' };
  const scripts = { sr: 'Cyrl', pa: 'Guru', sd: 'Arab', uz: 'Latn', az: 'Latn', mn: 'Cyrl' };
  function normalizeLanguage(value) {
    const parts = String(value || '').trim().replace(/_/g, '-').split('-');
    let base = parts[0].toLowerCase();
    base = aliases[base] || base;
    const script = parts.find(p => /^[a-z]{4}$/i.test(p));
    if (base === 'zh') {
      if (script && !/^(hans|hant)$/i.test(script)) return null;
      return script ? (/^hant$/i.test(script) ? 'zh-Hant' : 'zh-Hans')
        : (parts.some(p => /^(TW|HK|MO)$/i.test(p)) ? 'zh-Hant' : 'zh-Hans');
    }
    if (script && scripts[base] && script.toLowerCase() !== scripts[base].toLowerCase()) return null;
    return languages.has(base) ? base : null;
  }
  function stripLocale(path) {
    const first = path.split('/')[1];
    return languages.has(first) && first !== 'en' ? (path.slice(first.length + 1) || '/') : path;
  }
  const url = new URL(location.href);
  const prefix = url.pathname.split('/')[1];
  const routeLanguage = languages.has(prefix) && prefix !== 'en' ? prefix : 'en';
  const explicit = normalizeLanguage(url.searchParams.get('lang'));
  const storageKey = 'dialsanta.website.language';
  function destination(language) {
    const next = new URL(location.href);
    next.pathname = (language === 'en' ? '' : '/' + language) + stripLocale(url.pathname);
    next.searchParams.set('lang', language);
    return next;
  }
  function remember(language) { try { localStorage.setItem(storageKey, language); } catch { /* Optional preference. */ } }
  if (explicit) remember(explicit);
  if (explicit && explicit !== routeLanguage) location.replace(destination(explicit).href);
  const pageRoute = path => /^\/(?:(?:index|parents|support|privacy|terms|purchase|thanks)\.html)?$/.test(path)
    || /^\/(?:facetime-santa|how-to-call-santa|questions-to-ask-santa|press)\/$/.test(path);
  window.SiteI18n = {
    language: routeLanguage,
    callLanguage: languages.get(routeLanguage)?.callCode || routeLanguage,
    locale: routeLanguage === 'pt' ? 'pt-BR' : routeLanguage,
    normalizeLanguage, stripLocale,
    t(message, values = {}) {
      const translated = window.SiteMessages?.[message] ?? message;
      return translated.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
    },
    path(path) {
      const next = new URL(path, location.origin + '/');
      if (next.origin !== location.origin) return next.href;
      const route = stripLocale(next.pathname);
      if (!pageRoute(route)) return next.pathname + next.search + next.hash;
      next.pathname = (routeLanguage === 'en' ? '' : '/' + routeLanguage) + route;
      next.searchParams.set('lang', routeLanguage);
      return next.pathname + next.search + next.hash;
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-language-select]').forEach(select => {
      select.value = routeLanguage;
      select.title = languages.get(routeLanguage).nativeName;
      select.addEventListener('change', () => {
        if (!languages.has(select.value)) return;
        remember(select.value);
        location.assign(destination(select.value).href);
      });
    });
    document.querySelectorAll('.language-links a[hreflang]').forEach(link => {
      link.href = destination(link.hreflang).href;
      link.addEventListener('click', () => remember(link.hreflang));
    });
    document.querySelectorAll('[data-language-search]').forEach(input => {
      input.hidden = false;
      input.addEventListener('input', () => {
        const query = input.value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();
        document.querySelectorAll('.language-links a[hreflang]').forEach(link => {
          const item = languages.get(link.hreflang);
          const text = `${item.nativeName} ${item.name} ${item.code}`.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
          link.hidden = !text.includes(query);
        });
      });
    });
    // A suggestion is dismissible and never changes the requested page or canonical URL.
    let saved;
    try { saved = normalizeLanguage(localStorage.getItem(storageKey)); } catch { /* Optional preference. */ }
    const preferred = saved || (navigator.languages || [navigator.language]).map(normalizeLanguage).find(Boolean);
    const suggestion = document.querySelector('[data-language-suggestion]');
    if (!explicit && preferred && preferred !== routeLanguage && suggestion) {
      const label = suggestion.querySelector('[data-language-suggestion-text]');
      label.textContent = label.dataset.template.replace('{language}', languages.get(preferred).nativeName);
      const link = suggestion.querySelector('a');
      link.href = destination(preferred).href;
      link.addEventListener('click', () => remember(preferred));
      suggestion.querySelector('button').addEventListener('click', () => { remember(routeLanguage); suggestion.hidden = true; });
      suggestion.hidden = false;
    }
    if (explicit) document.querySelectorAll('a[href]').forEach(link => {
      if (link.hasAttribute('hreflang')) return;
      const next = new URL(link.href);
      if (next.origin !== location.origin || !pageRoute(stripLocale(next.pathname))) return;
      next.searchParams.set('lang', routeLanguage);
      link.href = next.href;
    });
  });
})();
