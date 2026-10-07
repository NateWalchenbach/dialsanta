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
python3 web/localization/build.py
```

The build checks catalog completeness, HTML attributes, and placeholders; generates
49 translated pages, four English guides, small runtime dictionaries, captions,
canonical/hreflang links, and a 39-URL sitemap.
Checkout and confirmation pages remain noindex. Do not enable purchases or change
the app's launch status as part of a language edit.

The September 30 launch homepage also has a source assembler at
`docs/website-redesign-2026-09-30/build-home.py` in the parent CallSanta workspace.
It regenerates the homepage template and its English `launch_*` messages. Keep its
copy in sync when editing that template, then run the localization build above.
The SEO additions live in `enhance.py` and `guides.json`, so the original homepage
assembler does not overwrite them. The enhancement adds guide links, the FaceTime
FAQ, responsive image sources, Apple campaign attribution and analytics choices.
The launch preview uses separate 20-second captions in `assets/launch/`; the original
trailer and its caption tracks are preserved in `assets/trailer/`.

## Language selection

1. An explicit supported `?lang=` parameter takes precedence.
2. An explicit `/es/`, `/fr/`, `/de/`, `/it/`, `/pt/`, or `/ru/` URL is respected.
3. English/root URLs remain English. Browser preferences and saved choices never
   redirect a requested page. Every translated page has visible edition links.

Regional variants map to their base language. There is no country lookup or location
permission. Only manual choices are saved to `dialsanta.website.language`. The URL
also carries manual choices, including English, so navigation works when storage is
blocked. Switching preserves the page, query parameters, and anchor. JavaScript is
needed for the select menu; static native content and edition links work without it.
English-only guides link to the localized homepages instead of nonexistent translations.

## Website measurement (October 1, 2026)

App Store links use Apple's verified `pt=128424654`, `ct=website`, `mt=8` campaign.
The account belongs to the legal seller Natura AI LLC; the app ID is Dial Santa
6808069158. Campaign totals require Apple's minimum reporting thresholds.

`acquisition.js` sends only explicitly opted-in page/count events to the dedicated
PostHog Dial Santa project 639766. It does not load the PostHog SDK. No capture on
localhost, checkout or confirmation pages. There is no replay, autocapture, cookies,
cross-page identity, form data, query strings or full referrer collection. DNT/GPC
override opt-in. A page-local random ID links a page view to a button click only.
IP capture is disabled in project settings, and the payload disables GeoIP.
This measures consenting page activity, not total visitors, installs or purchases.
Apple's campaign reports supply downstream acquisition data separately.

## Meta Pixel (October 7, 2026)

`meta-pixel.js` loads Meta Pixel `1399957468427149` (Events Manager dataset "Dial Santa
Website", Dial Santa business portfolio) on the public pages and the four guides, never on
checkout or confirmation pages, never with GPC/DNT, and never after the footer's Turn off
(`localStorage` key `dialsanta.website.ads`). Visitors whose browser time zone is European
(any `Europe/*` zone plus EEA islands and territories, Cyprus and French overseas zones)
see the consent banner that `enhance.py` adds to every public page, and the Pixel stays off
until Allow; elsewhere it runs by default with the footer control to turn it off. It sends
`PageView` and a custom `AppStoreClick` event (placement, language, page); `autoConfig`
is off, Limited Data Use is on, and the dataset's automatic advanced matching, automatic
events and detailed page info are off in Events Manager. The disclosure is the privacy
policy section `#website-ads`. `build.py` excludes `meta-pixel.js` from the runtime-string
scan, so its comments never leak into `i18n/*.js`.

## Release verification (2026-09-23)

Checked all 49 pages at 320, 390, and 1440 CSS pixels, assets and links, native HTML
without JavaScript, nine regional browser preferences, preference ordering, manual
switching and persistence, storage denial, preserved queries/anchors, every language's
waitlist success/rate-limit messages, and mocked French checkout email verification.
No real signup emails or purchases were created by these tests. Browser execution and
local resources were error-free. Evidence is kept in the parent CallSanta workspace
under `docs/website-localization-2026-09-23/`.
