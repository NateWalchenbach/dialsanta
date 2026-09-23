"""Generate seven static website editions. Run: python3 localization/build.py.

Requires beautifulsoup4. Catalog keys are stable; generated HTML is not edited by hand.
"""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from collections import Counter
from bs4 import BeautifulSoup, NavigableString
import json, re, sys

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent
NAMES = {'en':'English','es':'Español','fr':'Français','de':'Deutsch','it':'Italiano','pt':'Português','ru':'Русский'}
PAGES = ['index','parents','support','privacy','terms','purchase','thanks']
english = json.loads((ROOT/'catalogs/en.json').read_text())
keys = list(english)
source_by_text = {text:key for key,text in english.items()}

def markup(value):
    soup = BeautifulSoup(value, 'html.parser')
    return Counter((tag.name, tuple(sorted((key, str(value)) for key,value in tag.attrs.items()))) for tag in soup.find_all(True))

def route(lang, page):
    return ('' if lang == 'en' else '/' + lang) + ('/' if page == 'index' else '/' + page + '.html')

def local_url(value, lang):
    parts = urlsplit(value)
    if parts.scheme or parts.netloc or not parts.path: return value
    path = parts.path.lstrip('/')
    page = path.removesuffix('.html') or 'index'
    path = route(lang, page) if page in PAGES else '/' + path
    return urlunsplit(('', '', path, parts.query, parts.fragment))

for lang, native_name in NAMES.items():
    catalog_path = ROOT/f'catalogs/{lang}.json'
    if '--partial' in sys.argv and not catalog_path.exists(): continue
    catalog = json.loads(catalog_path.read_text())
    assert catalog.keys() == english.keys(), f'{lang}: missing or extra keys'
    for key, original in english.items():
        value = catalog[key]
        assert value.strip(), (lang, key, 'empty')
        assert re.findall(r'\{\w+\}', value) == re.findall(r'\{\w+\}', original), (lang,key,'placeholders')
        assert markup(value) == markup(original), (lang,key,'markup')
    messages = {english[key]:text for key,text in catalog.items()}
    asset_dir = SITE/'i18n'; asset_dir.mkdir(exist_ok=True)
    (asset_dir/f'{lang}.js').write_text('window.SiteMessages = ' + json.dumps(messages, ensure_ascii=False, separators=(',',':')) + ';\n')
    captions = (SITE/'assets/trailer/captions-en.vtt').read_text()
    for key in keys[320:327]: captions = captions.replace(english[key], catalog[key])
    (SITE/f'assets/trailer/captions-{lang}.vtt').write_text(captions)
    for page in PAGES:
        soup = BeautifulSoup((ROOT/f'templates/{page}.html').read_text(), 'html.parser')
        soup.html['lang'] = lang
        for element in list(soup.select('[data-i18n]')):
            value = catalog[element['data-i18n']]
            element.clear()
            for node in list(BeautifulSoup(value,'html.parser').contents): element.append(node)
            del element['data-i18n']
        for element in soup.select('[data-i18n-attrs]'):
            for attribute,key in json.loads(element['data-i18n-attrs']).items(): element[attribute] = catalog[key]
            del element['data-i18n-attrs']
        # Text fragments in the existing privacy summary must retain word separation.
        if page == 'privacy':
            for span in soup.select('.tldr span, .tldr b'):
                if span.get_text().startswith('.'): continue
                span.insert_before(NavigableString(' '))
        for element in soup.find_all(True):
            for attr in ['href','src','poster']:
                if element.get(attr): element[attr] = local_url(element[attr],lang)
        for script in soup.select('script[src]'):
            source = urlsplit(script['src']).path
            if source in ['/site.js','/waitlist.js','/purchase-entry.js','/purchase.js']:
                script['src'] = source + '?v=20260923-languages'
        for old in soup.select('link[rel=canonical], link[hreflang]'): old.decompose()
        canonical = soup.new_tag('link', rel='canonical', href='https://dialsanta.app'+route(lang,page))
        soup.head.append(canonical)
        for other in NAMES:
            soup.head.append(soup.new_tag('link', rel='alternate', hreflang=other, href='https://dialsanta.app'+route(other,page)))
        soup.head.append(soup.new_tag('link', rel='alternate', hreflang='x-default', href='https://dialsanta.app'+route('en',page)))
        for meta in soup.select('meta[property="og:url"]'): meta['content'] = 'https://dialsanta.app'+route(lang,page)
        for meta in soup.select('meta[property="og:locale"]'): meta.decompose()
        soup.head.append(soup.new_tag('meta', property='og:locale', content={'en':'en_US','es':'es_ES','fr':'fr_FR','de':'de_DE','it':'it_IT','pt':'pt_BR','ru':'ru_RU'}[lang]))
        # Detection runs before body rendering; static native content still works without JS.
        bootstrap = soup.new_tag('script', src='/language.js?v=20260923')
        charset = soup.head.find('meta', charset=True)
        charset.insert_after(bootstrap)
        bootstrap.insert_after(soup.new_tag('script',src=f'/i18n/{lang}.js?v=20260923'))
        soup.head.append(soup.new_tag('link', rel='stylesheet', href='/localization.css?v=20260923'))
        picker = soup.new_tag('label', attrs={'class':'language-picker'})
        label = soup.new_tag('span',attrs={'class':'language-label'});label.string=messages['Language'];picker.append(label)
        select = soup.new_tag('select',attrs={'data-language-select':'','aria-label':messages['Language']})
        for code, name in NAMES.items():
            option = soup.new_tag('option',value=code, lang=code);option.string=name
            if code == lang: option['selected']=''
            select.append(option)
        picker.append(select)
        nav = soup.select_one('.nav, .top')
        if nav: nav.append(picker)
        else:
            top=soup.new_tag('div',attrs={'class':'page-language'});top.append(picker)
            soup.body.insert(0,top)
        fallback=soup.new_tag('noscript'); links=soup.new_tag('div',attrs={'class':'language-noscript'})
        for code,name in NAMES.items():
            link=soup.new_tag('a',href=route(code,page),lang=code,hreflang=code);link.string=name;links.append(link)
        fallback.append(links)
        (soup.select_one('footer, .footer, .foot') or soup.body).append(fallback)
        video=soup.select_one('#heroVideo')
        if video:
            for track in video.select('track'):track.decompose()
            for code,name in NAMES.items():
                track=soup.new_tag('track',kind='captions',label=name,src=f'/assets/trailer/captions-{code}.vtt',srclang=code)
                if code == lang and lang != 'en':track['default']=''
                video.append(track)
        destination=SITE/(('' if lang=='en' else lang+'/')+page+'.html')
        destination.parent.mkdir(exist_ok=True)
        destination.write_text(str(soup).rstrip()+'\n')
    print(f'{lang}: {len(catalog)} strings, {len(PAGES)} pages, captions')

# Only index public informational pages, not checkout confirmation pages.
urls = ['https://dialsanta.app'+route(lang,page) for lang in NAMES for page in PAGES[:5]]
(SITE/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('<url><loc>'+url+'</loc></url>\n' for url in urls)+'</urlset>\n')
