"""Verify all generated language editions without submitting forms or contacting services."""
from pathlib import Path
from urllib.parse import urlsplit,unquote
import importlib.util,json,sys,tempfile,xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
S=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(S/'localization'))
spec=importlib.util.spec_from_file_location('site_build',S/'localization/build.py');build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)
langs=list(build.NAMES);pages=list(build.PAGES);guides=list(build.GUIDE_SLUGS)
errors=[];checked=0;assetchecks=0
urls=[n.text for n in ET.parse(S/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
expected={f'https://dialsanta.app{build.route(lang,page)}' for lang in langs for page in [p for p in pages if p not in ('purchase','thanks')]+guides}
if len(urls)!=len(set(urls)) or set(urls)!=expected:errors.append('Sitemap must contain each of83×9public editions exactly once and no checkout pages.')
def local(path):
 p=S/unquote(path).lstrip('/')
 return p/'index.html' if path.endswith('/') or not path else p
for lang in langs:
 for page in pages+guides:
  route=build.route(lang,page);p=local(route)
  if not p.exists():errors.append(f'{lang}/{page}: missing file');continue
  soup=BeautifulSoup(p.read_text(),'html.parser');checked+=1;private=page in ('purchase','thanks')
  def check(condition,reason):
   if not condition:errors.append(f'{lang}/{page}: {reason}')
  check(soup.html.get('lang')==lang,'wronglang');check(soup.html.get('dir','ltr')==build.DIRECTIONS[lang],'wrongdirection');check(bool(soup.title and soup.title.text.strip()) and len(soup.select('h1'))==1,'title/heading')
  canonical=soup.select_one('link[rel=canonical]');check(canonical and canonical.get('href')=='https://dialsanta.app'+route,'canonical')
  alternates=soup.select('link[hreflang]');check(len(alternates)==len(langs)+1 and {a['hreflang'] for a in alternates}==set(langs)|{'x-default'},'completealternates')
  check(any('noindex' in x.get('content','') for x in soup.select('meta[name=robots]'))==private,'indexability')
  scripts=[x.get('src','').split('?')[0] for x in soup.select('script[src]')]
  check(('/acquisition.js' in scripts)==(not private),'acquisitionboundary');check(('/meta-pixel.js' in scripts)==(not private),'adboundary')
  for script in ['/language-registry.js','/language.js',f'/i18n/{lang}.js']:
   check(script in scripts,'missing '+script)
  if all(x in scripts for x in ['/language-registry.js','/language.js',f'/i18n/{lang}.js']):check(scripts.index('/language-registry.js')<scripts.index('/language.js')<scripts.index(f'/i18n/{lang}.js'),'runtimeorder')
  if not private:
   check(bool(soup.select_one('[data-analytics-allow]') and soup.select_one('[data-analytics-deny]')),'analyticschoices')
   check(bool(soup.select_one('[data-ads-allow]') and soup.select_one('[data-ads-deny]')),'adchoices')
  picker=soup.select_one('[data-language-select]');check(bool(picker and {x.get('value') for x in picker.select('option')}==set(langs)),'languagepicker')
  if page=='privacy':check(bool(soup.select_one('#app-analytics') and soup.select_one('#website-ads')),'policydisclosures')
  for script in soup.select('script[type="application/ld+json"]'):
   try:json.loads(script.string)
   except Exception:errors.append(f'{lang}/{page}: invalidstructureddata')
  for element in soup.select('[src],a[href],link[href],video[poster]'):
   for attr in ['src','href','poster']:
    value=element.get(attr)
    if not value:continue
    parts=urlsplit(value)
    if parts.scheme or parts.netloc or not parts.path:continue
    target=local(parts.path) if parts.path.startswith('/') else p.parent/parts.path
    if parts.path.endswith('/') and not parts.path.startswith('/'):target=target/'index.html'
    assetchecks+=1;check(target.exists(),'broken '+value)
report={'localeCount':len(langs),'corePages':len(pages),'guides':len(guides),'checkedEditions':checked,'expectedEditions':len(langs)*(len(pages)+len(guides)),'publicSitemapEditions':len(urls),'localLinkChecks':assetchecks,'errors':errors,'passed':not errors}
evidence=S.parent/'docs/website-language-expansion-2026-10-11'
if not evidence.is_dir():evidence=Path(tempfile.gettempdir())/'dial-santa-localization-checks'
evidence.mkdir(parents=True,exist_ok=True)
out=evidence/'static-verification.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='errors'}));print('\n'.join(errors[:20]));raise SystemExit(bool(errors))
