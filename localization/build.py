"""Build complete static editions from validated catalogs, with stable public URLs.

python3 web/localization/build.py [--locale CODE] [--partial]
English is at the root; locale folders never depend on JavaScript or cookies.
"""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from collections import Counter
from xml.sax.saxutils import escape
from bs4 import BeautifulSoup, NavigableString
import argparse, json, re
from enhance import enhance, guide_soup, GUIDES

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parent
ORIGIN = 'https://dialsanta.app'
PAGES = ['index','parents','support','privacy','terms','purchase','thanks']
GUIDE_SLUGS = {item['slug'] for item in GUIDES}
VERSION = '20261011-phone-language'


def shipping_languages():
    native = SITE.parent/'DialSanta/Resources/LanguageCatalog.json'
    if native.exists():
        records = json.loads(native.read_text())['languages']
        records = [{key:item[key] for key in ('code','name','nativeName','direction','callCode')}
                   for item in records if item['callReady'] and item['status'] == 'ready']
    else:
        # The production Pages repository is standalone. This reviewed snapshot is
        # committed with the site and can be rebuilt without an iOS checkout.
        records = json.loads((ROOT/'languages.json').read_text())
    assert records and len({item['code'] for item in records}) == len(records), 'Invalid language registry'
    return sorted(records, key=lambda item:(item['code'] != 'en', item['name']))

LANGUAGES = shipping_languages()
NAMES = {item['code']:item['nativeName'] for item in LANGUAGES}
DIRECTIONS = {item['code']:item['direction'] for item in LANGUAGES}


def markup(value):
    soup = BeautifulSoup(value, 'html.parser')
    return Counter((tag.name, tuple(sorted((key, str(value)) for key,value in tag.attrs.items()))) for tag in soup.find_all(True))


def route(lang, page):
    path = '/' if page == 'index' else '/' + page + ('/' if page in GUIDE_SLUGS else '.html')
    return ('' if lang == 'en' else '/' + lang) + path


def local_url(value, lang):
    parts = urlsplit(value)
    if (parts.scheme or parts.netloc) and parts.netloc != 'dialsanta.app': return value
    if not parts.path: return value
    path = parts.path.lstrip('/')
    first, _, rest = path.partition('/')
    if first in NAMES and first != 'en': path = rest
    page = path.rstrip('/').removesuffix('.html') or 'index'
    path = route(lang,page) if page in PAGES or page in GUIDE_SLUGS else '/' + path
    # Asset URLs stay shared; same-site editorial URLs follow the selected edition.
    return urlunsplit((parts.scheme,parts.netloc,path,parts.query,parts.fragment))


def add_language_chrome(soup, lang, page, catalog, english):
    messages = {value:catalog[key] for key,value in english.items()}
    label_text = messages['Language']
    picker = soup.new_tag('label', attrs={'class':'language-picker'})
    label = soup.new_tag('span',attrs={'class':'language-label'});label.string=label_text;picker.append(label)
    select = soup.new_tag('select',attrs={'data-language-select':'','aria-label':label_text,'title':NAMES[lang]})
    for code,name in NAMES.items():
        option=soup.new_tag('option',value=code,lang=code,dir=DIRECTIONS[code]);option.string=name
        if code == lang: option['selected']=''
        select.append(option)
    picker.append(select)
    nav=soup.select_one('.nav, .top, .guide-nav')
    if nav: nav.append(picker)
    else:
        top=soup.new_tag('div',attrs={'class':'page-language'});top.append(picker);soup.body.insert(0,top)
    # Native <details> keeps all editions reachable and compact without JavaScript.
    details=soup.new_tag('details',attrs={'class':'language-editions','id':'website-languages'})
    summary=soup.new_tag('summary');summary.string=catalog['language.available'];details.append(summary)
    search=soup.new_tag('input',attrs={'type':'search','data-language-search':'','aria-label':catalog['language.search'],'placeholder':catalog['language.search'],'autocomplete':'off','hidden':''})
    details.append(search)
    links=soup.new_tag('nav',attrs={'class':'language-links','aria-label':catalog['language.available']})
    for code,name in NAMES.items():
        link=soup.new_tag('a',href=route(code,page),lang=code,hreflang=code,dir=DIRECTIONS[code]);link.string=name
        if code == lang: link['aria-current']='page'
        links.append(link)
    details.append(links)
    (soup.select_one('footer, .footer, .foot') or soup.body).append(details)
    suggestion=soup.new_tag('aside',attrs={'class':'language-suggestion','data-language-suggestion':'','hidden':'','aria-label':label_text})
    text=soup.new_tag('span',attrs={'data-language-suggestion-text':'','data-template':catalog['language.suggest']});suggestion.append(text)
    link=soup.new_tag('a');link.string=catalog['language.switch'];suggestion.append(link)
    button=soup.new_tag('button',type='button');button.string=catalog['language.dismiss'];suggestion.append(button)
    soup.body.append(suggestion)


def decorate(soup, lang, page, catalog, english):
    soup.html['lang']=lang;soup.html['dir']=DIRECTIONS[lang]
    enhance(soup,lang,page,catalog)
    for element in soup.find_all(True):
        for attribute in ('href','src','poster'):
            if element.get(attribute): element[attribute]=local_url(element[attribute],lang)
    for old in soup.select('link[rel=canonical], link[hreflang]'): old.decompose()
    soup.head.append(soup.new_tag('link',rel='canonical',href=ORIGIN+route(lang,page)))
    for other in NAMES:
        soup.head.append(soup.new_tag('link',rel='alternate',hreflang=other,href=ORIGIN+route(other,page)))
    soup.head.append(soup.new_tag('link',rel='alternate',hreflang='x-default',href=ORIGIN+route('en',page)))
    for meta in soup.select('meta[property="og:url"]'): meta['content']=ORIGIN+route(lang,page)
    for meta in soup.select('meta[property="og:locale"]'): meta.decompose()
    # Open Graph accepts language/territory tags; scripts remain explicit in HTML/hreflang.
    og={'en':'en_US','pt':'pt_BR','zh-Hans':'zh_CN','zh-Hant':'zh_TW'}.get(lang,lang)
    soup.head.append(soup.new_tag('meta',property='og:locale',content=og))
    charset=soup.head.find('meta',charset=True)
    anchor=charset
    for asset in ('language-registry.js','language.js',f'i18n/{lang}.js'):
        script=soup.new_tag('script',src=f'/{asset}?v={VERSION}',defer='');anchor.insert_after(script);anchor=script
    for script in soup.select('script[src]'):
        asset=script['src'].split('?')[0]
        if asset in ('/acquisition.js','/meta-pixel.js','/purchase.js'):
            script['src']=f'{asset}?v={VERSION}'
    soup.head.append(soup.new_tag('link',rel='stylesheet',href=f'/localization.css?v={VERSION}'))
    add_language_chrome(soup,lang,page,catalog,english)
    if page in GUIDE_SLUGS:
        data={'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[
            {'@type':'ListItem','position':1,'name':'Dial Santa','item':ORIGIN+route(lang,'index')},
            {'@type':'ListItem','position':2,'name':soup.h1.get_text(),'item':ORIGIN+route(lang,page)}]}
        script=soup.new_tag('script',type='application/ld+json');script.string=json.dumps(data,ensure_ascii=False);soup.head.append(script)
    video=soup.select_one('#heroVideo')
    if video:
        for track in video.select('track'): track.decompose()
        for code,name in NAMES.items():
            track=soup.new_tag('track',kind='captions',label=name,src=f"{video.get('data-caption-root','/assets/trailer')}/captions-{code}.vtt",srclang=code)
            if code == lang: track['default']=''
            video.append(track)
    return soup


def write_captions(lang, catalog, english, mapping):
    for asset in mapping['captions'].values():
        source=SITE/asset['source']
        blocks=source.read_text().strip().split('\n\n')
        cues=[index for index,block in enumerate(blocks) if '-->' in block]
        assert len(cues)==len(asset['keys']), (source,'cue mapping')
        for index,key in zip(cues,asset['keys']):
            lines=blocks[index].splitlines();timing=next(i for i,line in enumerate(lines) if '-->' in line)
            # Replace cue text only, preserving IDs/timing/settings and the English source.
            blocks[index]='\n'.join(lines[:timing+1]+[catalog[key]])
        if lang != 'en':
            source.with_name(f'captions-{lang}.vtt').write_text('\n\n'.join(blocks)+'\n')


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--locale',choices=NAMES);parser.add_argument('--partial',action='store_true');args=parser.parse_args()
    english=json.loads((ROOT/'catalogs/en.json').read_text())
    mapping=json.loads((ROOT/'extra-sources.json').read_text())
    (ROOT/'languages.json').write_text(json.dumps(LANGUAGES,ensure_ascii=False,indent=2)+'\n')
    (SITE/'language-registry.js').write_text('/* Generated from the shipping app language catalog. */\nwindow.SiteLanguageRegistry = '+json.dumps(LANGUAGES,ensure_ascii=False,separators=(',',':'))+';\n')
    runtime_source='\n'.join(path.read_text() for path in SITE.glob('*.js') if path.name not in ('language.js','language-registry.js','acquisition.js','meta-pixel.js'))
    runtime_keys={key for key,text in english.items() if text in runtime_source or text.replace("'", "\\'") in runtime_source or text.replace('"','\\"') in runtime_source}
    built=[]
    for lang in NAMES:
        if args.locale and lang != args.locale: continue
        source=ROOT/f'catalogs/{lang}.json'
        if args.partial and not source.exists(): continue
        catalog=json.loads(source.read_text())
        if args.partial and catalog.keys()!=english.keys(): continue
        assert catalog.keys()==english.keys(),(lang,'missing or extra keys')
        for key,original in english.items():
            value=catalog[key]
            assert value.strip(),(lang,key,'empty')
            assert Counter(re.findall(r'\{\w+\}',value))==Counter(re.findall(r'\{\w+\}',original)),(lang,key,'placeholders')
            assert markup(value)==markup(original),(lang,key,'markup')
        asset_dir=SITE/'i18n';asset_dir.mkdir(exist_ok=True)
        messages={} if lang=='en' else {english[key]:catalog[key] for key in runtime_keys}
        (asset_dir/f'{lang}.js').write_text('window.SiteMessages = '+json.dumps(messages,ensure_ascii=False,separators=(',',':'))+';\n')
        write_captions(lang,catalog,english,mapping)
        for page in PAGES+list(item['slug'] for item in GUIDES):
            if page in GUIDE_SLUGS:
                soup=guide_soup(next(item for item in GUIDES if item['slug']==page),catalog,mapping)
            else:
                soup=BeautifulSoup((ROOT/f'templates/{page}.html').read_text(),'html.parser')
                for element in list(soup.select('[data-i18n]')):
                    value=catalog[element['data-i18n']];element.clear()
                    for node in list(BeautifulSoup(value,'html.parser').contents): element.append(node)
                    del element['data-i18n']
                for element in soup.select('[data-i18n-attrs]'):
                    for attribute,key in json.loads(element['data-i18n-attrs']).items(): element[attribute]=catalog[key]
                    del element['data-i18n-attrs']
                if page=='privacy':
                    for span in soup.select('.tldr span, .tldr b'):
                        if not span.get_text().startswith('.'): span.insert_before(NavigableString(' '))
            decorate(soup,lang,page,catalog,english)
            path=route(lang,page).lstrip('/')
            destination=SITE/(path+'index.html' if not path or path.endswith('/') else path)
            destination.parent.mkdir(parents=True,exist_ok=True)
            destination.write_text(str(soup).rstrip()+'\n')
        built.append(lang);print(f'{lang}: {len(catalog)} strings, 11 pages, both caption tracks',flush=True)
    # A partial developer build must not publish an incomplete replacement sitemap.
    if not args.locale and not args.partial:
        urls=[ORIGIN+route(lang,page) for lang in NAMES for page in PAGES[:5]+[item['slug'] for item in GUIDES]]
        (SITE/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('<url><loc>'+escape(url)+'</loc></url>\n' for url in urls)+'</urlset>\n')
    print(f'Built {len(built)} complete editions.',flush=True)

if __name__=='__main__': main()
