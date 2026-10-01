const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root,'acquisition.js'),'utf8');
function environment(options={}) {
  const sent=[], handlers={}, nodes={};
  for (const selector of ['[data-analytics-allow]','[data-analytics-deny]','[data-analytics-state]']) {
    nodes[selector]={dataset:{on:'On',off:'Off'},addEventListener:(event,fn)=>{handlers[selector]=fn},setAttribute:()=>{}};
  }
  const values=new Map(options.allowed? [['dialsanta.website.analytics','allow']] : []);
  const ctx={URL,Set,console,crypto:{randomUUID:()=> 'synthetic-page-test'},navigator:{...options.navigator},window:{addEventListener:()=>{}},
    location:{hostname:options.host||'dialsanta.app',protocol:'https:',pathname:options.page||'/facetime-santa/'},
    document:{documentElement:{lang:'en'},referrer:'https://www.google.com/search?q=private-test-value',querySelectorAll:s=>[nodes[s]],addEventListener:(event,fn)=>handlers[event]=fn},
    localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},fetch:(url,request)=>{sent.push({url,request,body:JSON.parse(request.body)});return Promise.resolve({ok:true})}};
  vm.runInNewContext(code,ctx);
  const click=()=>handlers.click({target:{closest:()=>({href:'https://apps.apple.com/app/apple-store/id6808069158?pt=128424654&ct=website&mt=8',dataset:{download:'guide-top'}})}});
  return {sent,handlers,nodes,click};
}
let e=environment();assert.equal(e.sent.length,0);e.click();assert.equal(e.sent.length,0);
e.handlers['[data-analytics-allow]']();assert.equal(e.sent.length,1);e.click();e.click();assert.equal(e.sent.length,2);
assert.equal(e.sent[0].body.event,'website_page_view');assert.equal(e.sent[1].body.event,'app_store_click');
assert.equal(e.sent[1].body.properties.source,'google');assert.equal(e.sent[1].body.properties.$process_person_profile,false);
assert.equal(e.sent[1].body.properties.$geoip_disable,true);assert.equal(e.sent[1].body.properties.$ip,null);
assert.equal(e.sent[1].request.credentials,'omit');assert.equal(e.sent[1].request.referrerPolicy,'no-referrer');
assert(!JSON.stringify(e.sent).includes('private-test-value'));assert.equal(e.sent[0].body.distinct_id,e.sent[1].body.distinct_id);
e.handlers['[data-analytics-deny]']();e.click();assert.equal(e.sent.length,2);
for (const navigator of [{globalPrivacyControl:true},{doNotTrack:'1'}]) { e=environment({allowed:true,navigator});e.handlers['[data-analytics-allow]']();e.click();assert.equal(e.sent.length,0); }
for (const opts of [{host:'127.0.0.1'},{page:'/purchase.html'},{page:'/thanks.html'},{page:'/unknown-private-page'}]) {e=environment({...opts,allowed:true});e.click();assert.equal(e.sent.length,0);}
e=environment({allowed:true});assert.equal(e.sent.length,1);
const languageCode=fs.readFileSync(path.join(root,'language.js'),'utf8');
function language(url, saved) {
  const redirects=[], handlers={};
  const location=new URL(url);location.replace=u=>redirects.push(u);location.assign=u=>redirects.push(u);
  const context={URL,location,navigator:{languages:['fr-FR'],language:'fr-FR'},localStorage:{getItem:()=>saved,setItem:()=>{}},window:{},document:{addEventListener:(event,fn)=>handlers[event]=fn,querySelectorAll:()=>[]}};
  vm.runInNewContext(languageCode,context);return {redirects,context};
}
assert.equal(language('https://dialsanta.app/', 'fr').redirects.length,0);
assert.equal(language('https://dialsanta.app/es/parents.html','fr').context.window.SiteI18n.language,'es');
assert.equal(language('https://dialsanta.app/?lang=fr').redirects[0],'https://dialsanta.app/fr/?lang=fr');
console.log('PASS: consent default-off, opt-in/revocation, DNT/GPC, no localhost/checkout capture, payload minimization, click deduplication, stable locale URLs.');
