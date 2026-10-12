// Routing tests execute production runtime with a minimal browser boundary, without network or storage.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const site=path.resolve(__dirname,'..');
const registry=fs.readFileSync(path.join(site,'language-registry.js'),'utf8');
const runtime=fs.readFileSync(path.join(site,'language.js'),'utf8');
let assertions=0;
function env(href,saved=null,browser=['en'],options={}) {
  const redirects=[],events={},writes=[];
  const location=new URL(href);location.replace=u=>redirects.push(u);location.assign=u=>redirects.push(u);
  const context={URL,console,location,window:{},navigator:{languages:browser,language:options.language??browser?.[0]},localStorage:{getItem:()=>{if(options.storageBlocked)throw Error('blocked');return saved},setItem:(k,v)=>{if(options.storageBlocked)throw Error('blocked');writes.push([k,v])}},document:{addEventListener:(e,f)=>events[e]=f,querySelectorAll:()=>[],querySelector:()=>null}};
  vm.runInNewContext(registry,context);vm.runInNewContext(runtime,context);
  events.DOMContentLoaded?.();return {api:context.window.SiteI18n,redirects,writes};
}
const eq=(a,b)=>{assert.deepEqual(a,b);assertions++};
const basic=env('https://dialsanta.app/');
eq(basic.redirects,[]);eq(basic.api.language,'en');
for(const [input,expected] of Object.entries({'zh-TW':'zh-Hant','zh-HK':'zh-Hant','zh-MO':'zh-Hant','zh-Hans-TW':'zh-Hans','ZH_hANT':'zh-Hant','zh-CN':'zh-Hans','no-NO':'nb','nb-NO':'nb','pt-BR':'pt','pt-PT':'pt','iw-IL':'he','in-ID':'id','tl-PH':'fil','sr-Cyrl-RS':'sr','pa-Guru':'pa','sd-Arab':'sd'}))eq(basic.api.normalizeLanguage(input),expected);
for(const unsupported of ['ceb','ny','ln','unknown','sr-Latn','pa-Arab','sd-Deva','az-Cyrl','uz-Cyrl','mn-Mong','zh-Latn'])eq(basic.api.normalizeLanguage(unsupported),null);
const languages=JSON.parse(fs.readFileSync(path.join(site,'localization/languages.json')));
eq(languages.length,83);
for(const item of languages) {
  const prefix=item.code==='en'?'':'/'+item.code;
  const e=env('https://dialsanta.app'+prefix+'/questions-to-ask-santa/?ds=ds-ig-profile#ideas');
  eq(e.redirects,[]);eq(e.api.language,item.code);eq(e.api.callLanguage,item.callCode);
  eq(e.api.path('/parents.html?ds=ds-ig-profile#profile'),prefix+'/parents.html?ds=ds-ig-profile&lang='+item.code+'#profile');
  eq(e.api.path('/ar/press/#media'),prefix+'/press/?lang='+item.code+'#media');
  eq(e.api.path('/assets/launch/captions-en.vtt'),'/assets/launch/captions-en.vtt');
  eq(e.api.path('https://apps.apple.com/app/id6808069158'),'https://apps.apple.com/app/id6808069158');
}
eq(env('https://dialsanta.app/ar/press/?lang=zh-TW&ds=ds-ig-profile#media').redirects,['https://dialsanta.app/zh-Hant/press/?lang=zh-Hant&ds=ds-ig-profile#media']);
eq(env('https://dialsanta.app/zh-Hant/parents.html?lang=en#privacy').redirects,['https://dialsanta.app/parents.html?lang=en#privacy']);
eq(env('https://dialsanta.app/parents.html?lang=ceb').redirects,[]);
eq(env('https://dialsanta.app/?lang=no').redirects,['https://dialsanta.app/nb/?lang=nb']);
eq(env('https://dialsanta.app/fr/').api.path('/fr/purchase.html'),'/fr/purchase.html?lang=fr');
/* Additional preference behavior checks. */

for(const {code} of languages){
  const e=env('https://dialsanta.app/',null,[code]);
  eq(e.redirects,code==='en'?[]:['https://dialsanta.app/'+code+'/']);
  eq(e.writes,[]);eq(e.api.redirecting,code!=='en');
  if(e.redirects.length)eq(env(e.redirects[0],null,[code]).redirects,[]);
}
for(const [browser,expected] of [
  [['es-MX'],'es'],[['fr-CA'],'fr'],[['ar-EG'],'ar'],[['zh-TW'],'zh-Hant'],[['zh-CN'],'zh-Hans'],
  [['no-NO'],'nb'],[['unknown','sr-Latn','ja-JP'],'ja'],[['en-US','fr-FR'],'en'],[['unknown'],'en'],[[],'en']
])eq(env('https://dialsanta.app/',null,browser).redirects,expected==='en'?[]:['https://dialsanta.app/'+expected+'/']);
eq(env('https://dialsanta.app/','en',['fr-FR']).redirects,[]);
eq(env('https://dialsanta.app/','ja',['fr-FR']).redirects,['https://dialsanta.app/ja/']);
eq(env('https://dialsanta.app/','unknown',['fr-FR']).redirects,['https://dialsanta.app/fr/']);
eq(env('https://dialsanta.app/fr/','ja',['es-MX']).redirects,[]);
eq(env('https://dialsanta.app/?lang=en','ja',['fr-FR']).redirects,[]);
eq(env('https://dialsanta.app/?lang=en',null,['fr']).writes,[['dialsanta.website.language','en']]);
eq(env('https://dialsanta.app/?lang=ar','ja',['fr-FR']).redirects,['https://dialsanta.app/ar/?lang=ar']);
eq(env('https://dialsanta.app/?lang=unknown',null,['fr']).redirects,['https://dialsanta.app/fr/']);
eq(env('https://dialsanta.app/',null,[],{language:'fr-CA'}).redirects,['https://dialsanta.app/fr/']);
eq(env('https://dialsanta.app/',null,null,{language:'ja-JP'}).redirects,['https://dialsanta.app/ja/']);
for(const route of ['','index.html','parents.html','support.html','privacy.html','terms.html','purchase.html','thanks.html','facetime-santa/','how-to-call-santa/','questions-to-ask-santa/','press/','press/index.html']){
 const suffix='?ds=ds-ig-profile&pack=minutes12&session_id=synthetic-private#details';
 eq(env('https://dialsanta.app/'+route+suffix,null,['fr']).redirects,['https://dialsanta.app/fr/'+route+suffix]);
}
for(const route of ['assets/launch/captions-en.vtt','publisher/','missing.html','private-account/'])
 eq(env('https://dialsanta.app/'+route+'?lang=fr',null,['fr']).redirects,[]);
eq(env('https://dialsanta.app/',null,['fr'],{storageBlocked:true}).redirects,['https://dialsanta.app/fr/']);
eq(env('https://dialsanta.app/?lang=en',null,['fr'],{storageBlocked:true}).redirects,[]);
eq(env('https://dialsanta.app/',null,['fr']).writes,[]);
console.log(JSON.stringify({passed:true,assertions,languages:83,scope:'83 automatic preferences; manual and explicit-link priority; ordered/unsupported/script fallback; blocked storage; preserved page/query/hash; canonical call codes; no redirect loops'},null,2));
