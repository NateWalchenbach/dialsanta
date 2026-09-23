/* Shared by every static language edition. No location request or country lookup. */
(() => {
  const names = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português', ru: 'Русский' };
  const storageKey = 'dialsanta.website.language';
  const base = value => String(value || '').toLowerCase().replace('_', '-').split('-')[0];
  const supported = value => Object.hasOwn(names, value);
  const url = new URL(location.href);
  const prefix = url.pathname.split('/')[1];
  const routeLanguage = prefix !== 'en' && supported(prefix) ? prefix : 'en';
  const explicit = base(url.searchParams.get('lang'));
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch { /* private browsing */ }
  const preferred = (navigator.languages || [navigator.language]).map(base).find(supported);
  const language = supported(explicit) ? explicit : routeLanguage !== 'en' ? routeLanguage : supported(saved) ? saved : preferred || 'en';
  const route = routeLanguage === 'en' ? url.pathname : url.pathname.slice(prefix.length + 1);
  function destination(lang, manual = true) {
    const next = new URL(location.href);
    next.pathname = (lang === 'en' ? '' : '/' + lang) + (route || '/');
    // English needs an explicit marker even when local storage is unavailable.
    if (manual) next.searchParams.set('lang', lang);
    return next;
  }
  if (supported(explicit)) {
    try { localStorage.setItem(storageKey, explicit); } catch { /* optional preference */ }
  }
  if (language !== routeLanguage) location.replace(destination(language, supported(explicit)).href);
  window.SiteI18n = {
    language: routeLanguage,
    locale: routeLanguage === 'pt' ? 'pt-BR' : routeLanguage,
    t(message, values = {}) {
      const translated = window.SiteMessages?.[message] ?? message;
      return translated.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
    },
    path(path) {
      const next = new URL(path, location.origin + '/');
      next.pathname = (routeLanguage === 'en' ? '' : '/' + routeLanguage) + next.pathname;
      next.searchParams.set('lang', routeLanguage);
      return next.pathname + next.search + next.hash;
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-language-select]').forEach(select => {
      select.value = routeLanguage;
      select.addEventListener('change', () => {
        if (!supported(select.value)) return;
        try { localStorage.setItem(storageKey, select.value); } catch { /* URL is sufficient */ }
        location.assign(destination(select.value).href);
      });
    });
    // Carry a manual English choice through links when storage is blocked.
    if (supported(explicit)) document.querySelectorAll('a[href]').forEach(link => {
      const next = new URL(link.href);
      if (next.origin !== location.origin || !/\/(?:index|parents|support|privacy|terms|purchase|thanks)?(?:\.html)?$/.test(next.pathname)) return;
      next.searchParams.set('lang', routeLanguage);
      link.href = next.href;
    });
  });
})();
