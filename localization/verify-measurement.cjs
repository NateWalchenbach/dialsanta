/* Execute measurement code only in a mocked VM: no network, cookies, emails or payments. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const web=path.resolve(__dirname,'..'),workspaceEvidence=path.resolve(web,'../docs/website-language-expansion-2026-10-11');
const docs=fs.existsSync(workspaceEvidence)?workspaceEvidence:path.join(require('node:os').tmpdir(),'dial-santa-localization-checks');
const source=Object.fromEntries(['language-registry.js','language.js','acquisition.js','meta-pixel.js','purchase.js'].map(x=>[x,fs.readFileSync(path.join(web,x),'utf8')]));
const registryContext={window:{}};vm.runInNewContext(source['language-registry.js'],registryContext);const registry=registryContext.window.SiteLanguageRegistry;
let assertions=0;function eq(a,b,n){assert.deepEqual(a,b,n);assertions++;}
function env(script,options={}){
 const sent=[],scripts=[],handlers={},nodes={},redirects=[];const location=new URL(options.url||'https://dialsanta.app/');location.assign=u=>redirects.push(u);location.replace=u=>redirects.push(u);
 const values=new Map(Object.entries(options.storage||{}));const listen=(target,event,fn)=>{(handlers[target+':'+event]??=[]).push(fn)};
 function node(key){return nodes[key]??={dataset:{on:'On',off:'Off',template:'Try {language}'},hidden:true,disabled:false,value:'',textContent:'',innerHTML:'',setAttribute(){},focus(){},addEventListener:(event,fn)=>listen(key,event,fn)};}
 const anchors=options.anchors||[];const ctx={URL,URLSearchParams,Set,Map,TypeError,console,crypto:{randomUUID:()=> 'synthetic-page-test'},navigator:{languages:['en'],language:'en',...options.navigator},location,
 Intl:{...Intl,DateTimeFormat:()=>({resolvedOptions:()=>({timeZone:options.zone===undefined?'America/Los_Angeles':options.zone})}),NumberFormat:Intl.NumberFormat},
 document:{documentElement:{lang:options.lang||'en'},referrer:options.referrer||'',querySelectorAll:s=>s==='a[href]'?anchors:(/^\[data-(analytics|ads)-/.test(s)?[node(s)]:[]),querySelector:s=>s==='[data-ads-banner]'?node(s):null,getElementById:node,createElement:()=>({}),head:{appendChild:x=>scripts.push(x)},body:{classList:{add(){},remove(){}}},addEventListener:(event,fn)=>listen('document',event,fn)},
 localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 fetch:(url,request={})=>{sent.push({url,request,body:request.body?JSON.parse(request.body):undefined});if(options.offline)return Promise.reject(new TypeError('Failed to fetch'));return Promise.resolve({ok:true,status:200,json:async()=>options.reply?options.reply(url,request):{}})},setTimeout:()=>0,clearTimeout(){}};
 ctx.window=ctx;ctx.addEventListener=(event,fn)=>listen('window',event,fn);vm.createContext(ctx);if(!options.noRuntime){vm.runInContext(source['language-registry.js'],ctx);vm.runInContext(source['language.js'],ctx);}if(options.messages)ctx.SiteMessages=options.messages;vm.runInContext(source[script],ctx);
 const fire=(target,event,value={})=>(handlers[target+':'+event]||[]).forEach(fn=>fn(value));
 return {ctx,sent,scripts,handlers,nodes,redirects,values,fire,click:(placement='hero')=>fire('document','click',{target:{closest:()=>({href:'https://apps.apple.com/app/id6808069158',dataset:{download:placement}})}})}
}
const allow={'dialsanta.website.analytics':'allow','dialsanta.website.ads':'allow'};
// A departing English document must not initialize telemetry or checkout twice.
for(const script of ['acquisition.js','meta-pixel.js','purchase.js']){
 const route=script==='purchase.js'?'purchase.html?pack=minutes12':'?ds=ds-ig-profile';
 for(const suffix of ['', '&lang=ar']){
  const e=env(script,{url:'https://dialsanta.app/'+route+suffix,navigator:{languages:['fr-FR']},storage:allow});
  e.fire('document','DOMContentLoaded');e.click();
  eq(e.redirects.length,1);eq(e.ctx.SiteI18n.redirecting,true);eq(e.sent.length+e.scripts.length,0);
 }
}
const publicRoutes=['','parents.html','support.html','privacy.html','terms.html','facetime-santa/','how-to-call-santa/','questions-to-ask-santa/','press/'];
for(const lang of registry.map(x=>x.code)){
 const prefix=lang==='en'?'':lang+'/';for(const route of publicRoutes){const url='https://dialsanta.app/'+prefix+route;
  let e=env('acquisition.js',{url,lang,storage:allow});eq(e.sent.length,1,url);eq(e.sent[0].body.properties.language,lang);e.click();eq(e.sent.length,2);
  e=env('meta-pixel.js',{url,lang,storage:allow});eq(e.scripts.length,1,url);e.click();eq(e.ctx.fbq.queue.at(-1)[2].language,lang);
 }
 for(const route of ['purchase.html','thanks.html','private-account/','purchase/index.html','thanks/'])for(const script of ['acquisition.js','meta-pixel.js']){const e=env(script,{url:'https://dialsanta.app/'+prefix+route+'?session_id=synthetic-private',lang,storage:allow});e.click();eq(e.sent.length+e.scripts.length,0,script+lang+route);}
}
// Approved campaign labels follow every public locale path but never checkout/private routes.
for(const {code:lang} of registry){
 const prefix=lang==='en'?'':lang+'/';
 const anchors=['parents.html','facetime-santa/','purchase.html','thanks.html','private-account/'].map(route=>({href:'https://dialsanta.app/'+prefix+route}));
 env('acquisition.js',{url:'https://dialsanta.app/'+prefix+'?ds=ds-ig-profile',lang,anchors});
 eq(new URL(anchors[0].href).searchParams.get('ds'),'ds-ig-profile');eq(new URL(anchors[1].href).searchParams.get('ds'),'ds-ig-profile');
 for(const link of anchors.slice(2))eq(new URL(link.href).searchParams.has('ds'),false);
}
for(const script of ['acquisition.js','meta-pixel.js']){
 for(const navigator of [{globalPrivacyControl:true},{doNotTrack:'1'}]){const e=env(script,{storage:allow,navigator});e.click();eq(e.sent.length+e.scripts.length,0);}
 for(const options of [{url:'http://127.0.0.1:8000/ar/',lang:'ar',storage:allow},{noRuntime:true,storage:allow}]){const e=env(script,options);eq(e.sent.length+e.scripts.length,0);}
}
let e=env('acquisition.js');eq(e.sent.length,0);e.fire('[data-analytics-allow]','click');eq(e.sent.length,1);e.click();e.click();eq(e.sent.length,2);e.fire('[data-analytics-deny]','click');e.click();eq(e.sent.length,2);
e=env('acquisition.js',{storage:allow,url:'https://dialsanta.app/ar/?ds=ds-ig-profile&email=private-marker@example.invalid',lang:'ar',referrer:'https://www.google.com/search?q=private-marker'});e.click('private-marker');eq(e.sent[0].body.properties.campaign,'ds-ig-profile');eq(e.sent[1].body.properties.placement,'other');eq(JSON.stringify(e.sent).includes('private-marker'),false);eq(e.sent[0].request.credentials,'omit');eq(e.sent[0].request.referrerPolicy,'no-referrer');eq(Object.keys(e.sent[0].body.properties).sort().join(),['page','language','source','campaign','$process_person_profile','$geoip_disable','$ip'].sort().join());
for(const zone of ['Europe/London','Europe/Berlin','',null]){e=env('meta-pixel.js',{zone});eq(e.scripts.length,0);e.fire('[data-ads-allow]','click');eq(e.scripts.length,1);e.click();e.click();eq(e.ctx.fbq.queue.filter(x=>x[0]==='trackCustom').length,1);e.fire('[data-ads-deny]','click');eq(e.ctx.fbq.queue.at(-1)[1],'revoke');}
e=env('meta-pixel.js');eq(e.scripts.length,1);e=env('meta-pixel.js',{storage:{'dialsanta.website.ads':'deny'}});eq(e.scripts.length,0);
for(const suffix of ['?email=private@example.invalid','?session_id=private','?token=private','?code=123456','?client_secret=private','#access_token=private','#email=private%40example.invalid']){e=env('meta-pixel.js',{url:'https://dialsanta.app/ar/'+suffix,lang:'ar',storage:allow});eq(e.scripts.length,0,suffix);e=env('meta-pixel.js',{referrer:'https://dialsanta.app/ar/'+suffix,storage:allow});eq(e.scripts.length,0,'referrer '+suffix);}
for(const referrer of ['https://dialsanta.app/ar/purchase.html','https://dialsanta.app/zh-Hant/thanks.html?session_id=private']){e=env('meta-pixel.js',{referrer,storage:allow});eq(e.scripts.length,0);}
e=env('meta-pixel.js',{url:'https://dialsanta.app/ar/?lang=ar&ds=ds-ig-profile&utm_source=instagram&utm_campaign=christmas&fbclid=synthetic-click',lang:'ar',storage:allow});eq(e.scripts.length,1);e.click('private@example.invalid');eq(e.ctx.fbq.queue.at(-1)[2].placement,'other');eq(Object.keys(e.ctx.fbq.queue.at(-1)[2]).sort().join(),'language,page,placement');
(async()=>{
 const offline=env('purchase.js',{url:'https://dialsanta.app/hi/purchase.html',lang:'hi',offline:true,messages:{'Could not check purchase availability.':'खरीदारी की उपलब्धता नहीं जाँची जा सकी।','Could not connect. Please try again.':'कनेक्ट नहीं हो सका। फिर कोशिश करें।'}});
 await new Promise(setImmediate);eq(offline.ctx.document.getElementById('purchase-status').textContent,'खरीदारी की उपलब्धता नहीं जाँची जा सकी।');eq(offline.ctx.document.getElementById('purchase-error').textContent,'कनेक्ट नहीं हो सका। फिर कोशिश करें।');eq(offline.ctx.document.getElementById('purchase-content').hidden,true);eq(offline.sent.length,1);eq(offline.sent[0].url.endsWith('/web/config'),true);
 for(const [lang,call] of [['nb','no'],['zh-Hans','zh'],['zh-Hant','zh']]){
  const messages={'Check your email for your verification code.':'translated-status-'+lang,'Sent to {email}. Your code expires in 10 minutes.':'translated-{email}','Step 2 of 2 · Your email is verified':'translated-verified-'+lang};
  const e=env('purchase.js',{url:'https://dialsanta.app/'+lang+'/purchase.html?pack=minutes12',lang,messages,reply:url=>url.endsWith('/web/config')?{purchasesEnabled:true,packs:[{id:'minutes12',minutes:12,amountCents:599}]}:url.endsWith('/auth/verify')?{token:'synthetic-test-token',email:'adult@example.invalid'}:url.endsWith('/web/account')?{email:'adult@example.invalid'}:{ok:true}});
  await new Promise(setImmediate);e.ctx.document.getElementById('email').value=' ADULT@EXAMPLE.INVALID ';e.fire('email-form','submit',{preventDefault(){},submitter:{disabled:false}});await new Promise(setImmediate);
  const request=e.sent.find(x=>x.url.endsWith('/auth/request-code'));eq(request.body.language,call);eq(request.body.uiLanguage,lang);eq(request.body.email,'adult@example.invalid');eq(Object.keys(request.body).sort().join(),'email,language,uiLanguage');eq(e.ctx.document.getElementById('purchase-status').textContent,'translated-status-'+lang);eq(e.ctx.document.getElementById('code-sent-to').textContent,'translated-adult@example.invalid');eq(e.sent.some(x=>x.url.endsWith('/web/checkout')),false);
  e.ctx.document.getElementById('code').value=' 123456 ';e.fire('code-form','submit',{preventDefault(){},submitter:{disabled:false}});await new Promise(setImmediate);
  const verify=e.sent.find(x=>x.url.endsWith('/auth/verify'));eq(verify.body.email,'adult@example.invalid');eq(verify.body.code,'123456');eq(Object.keys(verify.body).sort().join(),'code,email');eq(e.ctx.SiteI18n.language,lang);eq(e.ctx.document.getElementById('purchase-status').textContent,'translated-verified-'+lang);eq(e.ctx.document.getElementById('account-email').textContent,'adult@example.invalid');eq(e.sent.some(x=>x.url.endsWith('/web/checkout')),false);
 }
 const report={at:new Date().toISOString(),localeCount:registry.length,publicRouteCount:publicRoutes.length,publicEditionChecks:registry.length*publicRoutes.length,assertions,network:'Mocked VM only; zero live telemetry/auth/payment requests',passed:true};fs.mkdirSync(docs,{recursive:true});fs.writeFileSync(path.join(docs,'measurement-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
