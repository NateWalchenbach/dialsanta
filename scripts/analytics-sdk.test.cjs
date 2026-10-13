const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');

test('shipped PostHog SDK produces sanitized events and honors withdrawal', async () => {
  const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body><button data-analytics-deny>Off</button><a href="/parents.html">Parents</a></body></html>', {
    url:'https://dialsanta.app/?analytics_qa=1&email=secret@example.com#secret', runScripts:'outside-only', pretendToBeVisual:true,
  });
  const w=dom.window;
  // Unit environment: no resources are fetched and all SDK transports stay local.
  w.fetch=async()=>({ok:true,status:200,json:async()=>({}),text:async()=>''});
  w.XMLHttpRequest=class {open(){} setRequestHeader(){} send(){} abort(){}};
  w.navigator.sendBeacon=()=>true;
  w.SiteI18n={normalizeLanguage:()=> 'en',stripLocale:x=>x};
  w.localStorage.setItem('dialsanta.website.analytics','allow');
  w.localStorage.setItem('dialsanta.website.detailed-analytics.v1','allow');
  w.eval(fs.readFileSync('assets/vendor/posthog-1.438.9.js','utf8'));
  w.eval(fs.readFileSync('acquisition.js','utf8'));
  const ph=w.DialSantaPostHog;
  const event=ph.capture('website_navigation_click', {destination:'parents',href:'https://dialsanta.app/parents.html?token=SECRET',email:'secret@example.com'});
  assert.equal(event.event,'website_navigation_click');
  assert.match(JSON.stringify(event.timestamp), /2026|20\d\d-/);
  assert.equal(event.properties.$current_url,'https://dialsanta.app/');
  assert.equal(event.properties.analytics_qa,true);
  assert.equal(event.properties.$process_person_profile,false);
  assert.ok(event.properties.$session_id);
  assert.ok(event.properties.distinct_id);
  assert.equal(event.properties.href,'https://dialsanta.app/parents.html');
  assert.ok(!JSON.stringify(event).includes('SECRET'));
  assert.ok(!JSON.stringify(event).includes('secret@example'));
  assert.equal(ph.config.capture_pageleave,true);
  assert.equal(ph.config.enable_heatmaps,true);
  assert.equal(ph.config.session_recording.maskAllInputs,true);
  const snapshot=ph.config.before_send({event:'$snapshot',timestamp:new Date(),properties:{$snapshot_data:[{type:2,data:{node:{type:0,childNodes:[{type:1,name:'html',publicId:'',systemId:'',id:2}]}}}]}});
  assert.equal(snapshot.properties.$snapshot_data[0].data.node.childNodes[0].name,'html');
  w.document.querySelector('button').click();
  assert.equal(ph.has_opted_out_capturing(),true);
  assert.equal(ph.capture('$pageview'),undefined);
  dom.window.close();
});
