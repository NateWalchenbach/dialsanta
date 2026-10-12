"""Shared SEO build additions. Static content stays usable without JavaScript."""
from pathlib import Path
from urllib.parse import urlsplit
from bs4 import BeautifulSoup
import json

SITE = Path(__file__).resolve().parent.parent
GUIDES = json.loads((SITE/'localization/guides.json').read_text())
STORE = 'https://apps.apple.com/app/apple-store/id6808069158?pt=128424654&ct=website&mt=8'


def fragment(soup, value):
    return BeautifulSoup(value, 'html.parser')

def enhance(soup, lang, page, catalog):
    for link in soup.select('a[href]'):
        if 'apps.apple.com/' in link['href'] and 'id6808069158' in link['href']:
            link['href'] = STORE
            if page == 'parents': link['data-download'] = 'parents'
    for meta in soup.select('meta[name=apple-itunes-app]'):
        meta['content'] = 'app-id=6808069158, affiliate-data=pt=128424654&ct=website&mt=8'
    for img in soup.select('img[src="/assets/launch/north-pole.jpg"]'):
        img['src'] = '/assets/launch/north-pole-960.webp'
        img['srcset'] = '/assets/launch/north-pole-640.webp 640w, /assets/launch/north-pole-960.webp 960w, /assets/launch/north-pole-1440.webp 1440w'
        img['sizes'] = '(max-width: 700px) 100vw, 960px'
    for img in soup.select('.cast-friend img'):
        base = img['src'].removesuffix('.webp')
        img['srcset'] = f'{base}-192.webp 192w, {base}.webp 384w'
        img['sizes'] = '(max-width: 600px) 26vw, 150px'
    if page == 'index':
        for script in soup.select('script[type="application/ld+json"]'):
            data = json.loads(script.string)
            if data.get('@type') == 'MobileApplication':
                data.pop('inLanguage', None)
                data.update(offers={'@type':'Offer','price':'0','priceCurrency':'USD','description':'Free download. Live calls require paid in-app minute purchases.'}, image='https://dialsanta.app/assets/apple-touch-icon.png', publisher={'@type':'Organization','name':'Natura AI LLC'})
                script.string = json.dumps(data, ensure_ascii=False, separators=(',',':'))
        faq = soup.select_one('.faq-list')
        faq.append(fragment(soup, f'<details><summary><span>{catalog["seo.facetime.question"]}</span><span aria-hidden="true">+</span></summary><p>{catalog["seo.facetime.answer"]}</p></details>'))
    if page in ('index','parents'):
        section = soup.new_tag('section', attrs={'class':'seo-guides section','aria-labelledby':'guides-title'})
        section.append(fragment(soup, f'<h2 id="guides-title">{catalog["seo.guides.title"]}</h2><p>{catalog["seo.guides.intro"]}</p><div class="seo-guide-links"><a href="/facetime-santa/">{catalog["seo.guide.facetime"]}</a><a href="/how-to-call-santa/">{catalog["seo.guide.how"]}</a><a href="/questions-to-ask-santa/">{catalog["seo.guide.questions"]}</a></div>'))
        anchor = soup.select_one('.faq-section') if page == 'index' else soup.select_one('.parents-download')
        anchor.insert_before(section)
    if page in ('index','parents','support','privacy','terms') or page in [g['slug'] for g in GUIDES]:
        soup.head.append(soup.new_tag('script', src='/acquisition.js?v=20261011', defer=''))
        soup.head.append(soup.new_tag('script', src='/meta-pixel.js?v=20261011', defer=''))
        foot = soup.select_one('footer, .footer, .foot') or soup.body
        if page == 'index':
            link = soup.new_tag('a',href='/press/');link.string=catalog['seo.press'];foot.append(link)
        controls = soup.new_tag('details',attrs={'class':'analytics-choice'})
        controls.append(fragment(soup, f'<summary>{catalog["seo.analytics.title"]} · <span data-analytics-state data-on="{catalog["seo.analytics.on"]}" data-off="{catalog["seo.analytics.off"]}">{catalog["seo.analytics.off"]}</span></summary><p>{catalog["seo.analytics.body"]}</p><div><button type="button" data-analytics-allow aria-pressed="false">{catalog["seo.analytics.allow"]}</button><button type="button" data-analytics-deny aria-pressed="true">{catalog["seo.analytics.deny"]}</button></div>'))
        foot.append(controls)
        # Meta Pixel choice: a footer control everywhere, plus a consent banner that meta-pixel.js
        # shows only where prior consent is required. Every edition links to its policy.
        policy = ('' if lang == 'en' else '/' + lang) + '/privacy.html#website-ads'
        ads = soup.new_tag('details',attrs={'class':'analytics-choice ads-choice'})
        ads.append(fragment(soup, f'<summary>{catalog["ads.choice.title"]} · <span data-ads-state data-on="{catalog["seo.analytics.on"]}" data-off="{catalog["seo.analytics.off"]}">{catalog["seo.analytics.off"]}</span></summary><p>{catalog["ads.choice.body"]} <a href="{policy}">{catalog["ads.banner.more"]}</a></p><div><button type="button" data-ads-allow aria-pressed="false">{catalog["ads.choice.allow"]}</button><button type="button" data-ads-deny aria-pressed="true">{catalog["ads.choice.deny"]}</button></div>'))
        foot.append(ads)
        soup.body.append(fragment(soup, f'<div class="ads-consent" data-ads-banner hidden role="region" aria-label="{catalog["ads.choice.title"]}"><p>{catalog["ads.banner.body"]} <a href="{policy}">{catalog["ads.banner.more"]}</a></p><div><button type="button" data-ads-allow>{catalog["ads.banner.allow"]}</button><button type="button" data-ads-deny>{catalog["ads.banner.deny"]}</button></div></div>'))

def guide_soup(item, catalog, mapping):
    """Render translated editorial content; common routing/chrome is added by build.py."""
    from html import escape
    slug = item['slug']
    fields = mapping['guides'][slug]
    title, description, heading, intro = [catalog[fields[k]] for k in ('title','description','heading','intro')]
    body = ''.join(catalog[key] for key in fields['body'])
    c = lambda key: catalog[mapping['chrome'][key]]
    cta = lambda place: f'<aside class="guide-cta"><div><strong>{c("ctaTitle")}</strong><p>{c("ctaPrice")}</p></div><a class="download-button" href="{STORE}" data-download="{place}">{c("download")}</a></aside>'
    html = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title><meta name="description" content="{escape(description, quote=True)}"><meta property="og:type" content="article"><meta property="og:title" content="{escape(heading, quote=True)}"><meta property="og:description" content="{escape(description, quote=True)}"><meta property="og:url" content=""><meta property="og:image" content="https://dialsanta.app/assets/og-santa-call-v2.png"><meta name="twitter:card" content="summary_large_image"><meta name="apple-itunes-app" content="app-id=6808069158"><link rel="icon" href="/assets/apple-touch-icon.png"><link rel="stylesheet" href="/guides.css?v=20261011"></head><body><a class="skip-link" href="#main">{c("skip")}</a><nav class="guide-nav" aria-label="{escape(c("nav"), quote=True)}"><a class="guide-brand" href="/"><img src="/assets/apple-touch-icon.png" width="42" height="42" alt="">Dial Santa</a><div><a href="/">{c("app")}</a><a href="/parents.html">{c("parents")}</a><a href="/support.html">{c("support")}</a></div></nav><main class="guide" id="main"><p class="eyebrow">DIAL SANTA · {c("press") if slug == "press" else c("family")}</p><h1>{heading}</h1><p class="lede">{intro}</p>{cta('guide-top') if slug != 'press' else ''}{body}{cta('guide-bottom')}<p class="fine-print">{c("checked")}</p></main><footer class="guide-footer"><span>© 2026 Natura AI LLC</span><a href="/privacy.html">{c("privacy")}</a><a href="/terms.html">{c("terms")}</a><a href="/press/">{c("press")}</a><a href="/">Dial Santa</a></footer></body></html>'''
    return BeautifulSoup(html, 'html.parser')
