# Website languages

English, Spanish, French, German, Italian, Portuguese (Brazilian wording), and Russian.
Each language has complete static editions of the home, parents, support, privacy,
terms, purchase, and thanks pages. The original English film has translated WebVTT
captions; its audio is unchanged.

## Editing and building

Edit the annotated English HTML in `templates/`, not the generated root/locale pages.
Edit translations in `catalogs/{language}.json`. Each stable message key must exist in
every catalog. Inline markup, link destinations, IDs, and interpolation placeholders
must be preserved. Translations are editorial drafts reviewed during implementation;
they have not had independent native-speaker or legal review.

Install `beautifulsoup4` in your Python environment, then run from the repository root:

```sh
python3 localization/build.py
```

The build checks catalog completeness, HTML attributes, and placeholders; generates
49 pages, seven runtime dictionaries, captions, canonical/hreflang links, and a sitemap.
Checkout and confirmation pages remain noindex. Do not enable purchases or change
the app's launch status as part of a language edit.

## Language selection

1. An explicit supported `?lang=` parameter takes precedence.
2. An explicit `/es/`, `/fr/`, `/de/`, `/it/`, `/pt/`, or `/ru/` URL is respected.
3. On English/root URLs, use a saved manual selection, then the first supported
   `navigator.languages` preference, then English.

Regional variants map to their base language. There is no country lookup or location
permission. Only manual choices are saved to `dialsanta.website.language`. The URL
also carries manual choices, including English, so navigation works when storage is
blocked. Switching preserves the page, query parameters, and anchor. JavaScript is
needed for automatic selection; static native content and language links remain
readable without it.

## Release verification (2026-09-23)

Checked all 49 pages at 320, 390, and 1440 CSS pixels, assets and links, native HTML
without JavaScript, nine regional browser preferences, preference ordering, manual
switching and persistence, storage denial, preserved queries/anchors, every language's
waitlist success/rate-limit messages, and mocked French checkout email verification.
No real signup emails or purchases were created by these tests. Browser execution and
local resources were error-free. Evidence is kept in the parent CallSanta workspace
under `docs/website-localization-2026-09-23/`.
