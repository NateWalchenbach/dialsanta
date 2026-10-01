"""Release checks: links, indexability, consent boundary, localization and policy preservation."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json, re, subprocess, sys, xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
S=Path(__file__).resolve().parent.parent
urls=[n.text for n in ET.parse(S/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert len(urls)==len(set(urls))==39
def local(path):
    p=S/unquote(path).lstrip('/')
    return p/'index.html' if path.endswith('/') or not path else p
for url in urls:
    p=local(urlsplit(url).path);soup=BeautifulSoup(p.read_text(),'html.parser')
    assert soup.title and len(soup.select('h1'))==1,p
    assert soup.select_one('meta[name=description]')['content'],p
    assert soup.select_one('link[rel=canonical]')['href']==url,(p,'canonical')
    assert not any('noindex' in m.get('content','') for m in soup.select('meta[name=robots]')),p
    for script in soup.select('script[type="application/ld+json"]'):json.loads(script.string)
    for element in soup.select('[src], a[href], link[href], video[poster]'):
        for attr in ['src','href','poster']:
            value=element.get(attr)
            if not value:continue
            parts=urlsplit(value)
            if parts.scheme or parts.netloc or not parts.path:continue
            target=local(parts.path) if parts.path.startswith('/') else p.parent/parts.path
            assert target.exists(),(p,value)
    assert soup.select_one('[data-analytics-allow]') and soup.select_one('[data-analytics-deny]'),p
    for link in soup.select('a[href*="apps.apple.com"]'):
        assert 'id6808069158?pt=128424654&ct=website&mt=8' in link['href'],(p,'campaign')
    assert soup.select_one('nav.language-links'),p
for lang in ['en','es','fr','de','it','pt','ru']:
    folder=S if lang=='en' else S/lang
    for page in ['index','parents','support','privacy','terms','purchase','thanks']:
        soup=BeautifulSoup((folder/f'{page}.html').read_text(),'html.parser')
        assert soup.html['lang']==lang
        assert len(soup.select('link[hreflang]'))==8
        assert all(s.has_attr('defer') for s in soup.select('script[src*="language.js"],script[src*="i18n/"]'))
        assert bool(soup.select_one('script[src*="acquisition.js"]'))==(page not in ('purchase','thanks'))
    if '--policy-base' in sys.argv:
        revision=sys.argv[sys.argv.index('--policy-base')+1]
        before=json.loads(subprocess.check_output(['git','show',f'{revision}:localization/catalogs/{lang}.json'],cwd=S))
        after=json.loads((S/f'localization/catalogs/{lang}.json').read_text())
        changed={k for k in before if after[k]!=before[k]}
        assert changed=={'mccb7ce6ddb','mf3441e5ee5'},(lang,changed)
    assert (S/f'i18n/{lang}.js').stat().st_size < 12000
print('PASS: 39 sitemap pages, assets and internal links; 49 localized editions; attribution and deferred scripts. Optional policy-base check passed when requested.')
