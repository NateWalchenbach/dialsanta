/* Launch homepage: optional preview, local UI preferences, no microphone or signup calls. */
(() => {
  'use strict';
  const t = text => window.SiteI18n?.t(text) ?? text;
  const store = 'https://apps.apple.com/app/apple-store/id6808069158?pt=128424654&ct=website&mt=8';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const snow = document.querySelector('.hero-snow');
  const toggle = document.querySelector('.snow-toggle');
  let snowOn = !reduced.matches;
  try { if (sessionStorage.getItem('dialsanta.snow') === 'off') snowOn = false; } catch { /* Optional visual preference. */ }
  if (snow && toggle) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 30; i++) {
      const flake = document.createElement('span');
      flake.className = 'flake';
      flake.style.cssText = `--x:${i * 61.8034 % 100}%;--size:${1.4 + (i * 17 % 19) / 10}px;--opacity:${.16 + (i * 7 % 25) / 100};--duration:${17 + i * 7 % 15}s;--delay:-${i * 11 % 30}s;--drift:${i * 23 % 76 - 38}px`;
      fragment.append(flake);
    }
    snow.append(fragment);
    const updateSnow = () => {
      const enabled = snowOn && !reduced.matches;
      snow.classList.toggle('is-off', !enabled);
      snow.classList.toggle('is-paused', document.hidden);
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.querySelector('.snow-state').textContent = t(enabled ? 'Snow on' : 'Snow off');
      toggle.disabled = reduced.matches;
    };
    toggle.addEventListener('click', () => {
      snowOn = !snowOn;
      try { sessionStorage.setItem('dialsanta.snow', snowOn ? 'on' : 'off'); } catch { /* Nonessential. */ }
      updateSnow();
    });
    reduced.addEventListener('change', updateSnow);
    document.addEventListener('visibilitychange', updateSnow);
    updateSnow();
  }
  // Silent, clearly labeled examples: load only when visible and motion is allowed.
  const demo = document.getElementById('heroDemoVideo');
  const demoToggle = document.querySelector('.demo-toggle');
  const demoNext = document.querySelector('.demo-next');
  const demoError = document.querySelector('.hero-demo-error');
  let demoInView = false, demoUserPaused = false, demoRequested = false;
  let demoIndex = 1, demoFailed = false, demoStarting = false;
  let demoGeneration = 0, demoSyncQueued = false;
  const connection = navigator.connection;
  const anyDialogOpen = () => Boolean(document.querySelector('dialog[open]'));
  const demoEligible = () => demo && demoInView && !document.hidden && !anyDialogOpen() && !demoUserPaused && !demoFailed && (demoRequested || (!reduced.matches && !connection?.saveData));
  const demoStatus = () => {
    if (!demo || !demoToggle) return;
    const playing = !demo.paused && !demo.ended;
    demoToggle.classList.toggle('is-playing', playing);
    demoToggle.querySelector('span').textContent = t(playing ? 'Pause demo' : 'Play demo');
    demoToggle.setAttribute('aria-label', t(playing ? 'Pause demo' : 'Play demo'));
    demo.setAttribute('aria-label', t('Demo {number} of {total}').replace('{number}', demoIndex).replace('{total}', demo.dataset.demoCount));
  };
  const demoSource = () => {
    const src = `/assets/launch/hero-demo-${demoIndex}.mp4`;
    if (demo.getAttribute('src') !== src) {
      demoGeneration++;
      demo.poster = `/assets/launch/hero-demo-${demoIndex}.jpg`;
      demo.src = src;
      demo.load();
    }
  };
  const syncDemo = async () => {
    if (!demo) return;
    if (!demoEligible()) { demo.pause(); demoStatus(); return; }
    if (demoStarting) { demoSyncQueued = true; return; }
    if (!demo.paused && !demo.ended) return;
    demoStarting = true;
    demo.defaultMuted = true;
    demo.muted = true;
    demoSource();
    const generation = demoGeneration;
    try {
      await demo.play();
      if (!demoEligible()) demo.pause();
    } catch (error) {
      // Browsers may decline autoplay; the visible Play button remains usable.
      if (generation === demoGeneration && error.name !== 'AbortError') demoUserPaused = true;
    } finally {
      demoStarting = false; demoStatus();
      if (demoSyncQueued || generation !== demoGeneration) {
        demoSyncQueued = false;
        syncDemo();
      }
    }
  };
  if (demo && demoToggle && demoNext) {
    demoToggle.hidden = false; demoNext.hidden = false;
    demoToggle.addEventListener('click', () => {
      if (!demo.paused && !demo.ended) {
        demoUserPaused = true; demo.pause();
      } else {
        demoUserPaused = false; demoRequested = true;
        if (demoFailed) { demoFailed = false; demo.removeAttribute('src'); demoError.hidden = true; }
        syncDemo();
      }
      demoStatus();
    });
    demoNext.addEventListener('click', () => {
      demo.pause(); demoIndex = demoIndex % Number(demo.dataset.demoCount) + 1;
      demoFailed = false; demoError.hidden = true;
      demoUserPaused = false; demoRequested = true;
      demoSource(); syncDemo(); demoStatus();
    });
    demo.addEventListener('ended', () => {
      // Next example loads only if the hero is still visible and playing is permitted.
      if (demoEligible()) {
        demoIndex = demoIndex % Number(demo.dataset.demoCount) + 1;
        syncDemo();
      }
    });
    ['play', 'pause', 'ended', 'loadedmetadata'].forEach(name => demo.addEventListener(name, demoStatus));
    demo.addEventListener('error', () => {
      demoFailed = true; demoError.hidden = false; demoStatus();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        demoInView = entries[0].isIntersecting && entries[0].intersectionRatio >= .15;
        syncDemo();
      }, { threshold: [0, .15] }).observe(demo);
    } else { demoInView = true; syncDemo(); }
    new MutationObserver(syncDemo).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    reduced.addEventListener('change', () => { demoRequested = false; syncDemo(); });
    connection?.addEventListener?.('change', () => { demoRequested = false; syncDemo(); });
    document.addEventListener('visibilitychange', syncDemo);
    addEventListener('pagehide', () => demo.pause());
    addEventListener('pageshow', syncDemo);
    demoStatus();
  }
  const filmDialog = document.getElementById('film-dialog');
  const video = document.getElementById('heroVideo');
  let filmOpener;
  document.querySelectorAll('[data-watch]').forEach(button => button.addEventListener('click', async () => {
    filmOpener = button;
    demo?.pause();
    if (!filmDialog?.showModal) {
      location.assign('/assets/launch/preview.mp4');
      return;
    }
    filmDialog.showModal();
    filmDialog.querySelector('.film-error').hidden = true;
    filmDialog.querySelector('[data-close]').focus();
    video.muted = false;
    if (video.ended) video.currentTime = 0;
    try { await video.play(); }
    catch { if (video.error) filmDialog.querySelector('.film-error').hidden = false; }
  }));
  video?.addEventListener('error', () => { filmDialog.querySelector('.film-error').hidden = false; });
  filmDialog?.addEventListener('cancel', () => video.pause());
  filmDialog?.addEventListener('close', () => { video.pause(); filmOpener?.focus({ preventScroll: true }); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video?.pause(); });
  addEventListener('pagehide', () => video?.pause());

  const characters = {
    santa: ['Santa', 'He knows their name, hears their wishes, and answers their wonderfully important questions.', 'Santa is included. Live calls use purchased minutes.'],
    mrsclaus: ['Mrs. Claus', 'A warm hello from the North Pole kitchen. A little kindness, a little laughter, and plenty to talk about.', 'Available with a US$0.99 in-app unlock. Calls also use purchased minutes.'],
    comet: ['Comet', 'An energetic friend from Santa’s reindeer crew, ready for a little North Pole silliness.', 'Available with a US$0.99 in-app unlock. Calls also use purchased minutes.'],
    pip: ['Pip', 'A little elf with a very big Christmas spirit.', 'This friend is coming soon. You can already call Santa, Mrs. Claus and Comet in the app.'],
    crumble: ['Crumble', 'The sweetest friend in the North Pole.', 'This friend is coming soon. You can already call Santa, Mrs. Claus and Comet in the app.'],
    flurry: ['Flurry', 'A little snow. A little silliness. A lot of Christmas magic.', 'This friend is coming soon. You can already call Santa, Mrs. Claus and Comet in the app.']
  };
  const characterDialog = document.getElementById('character-dialog');
  let characterOpener;
  document.querySelectorAll('[data-character]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.character;
    if (!characters[id]) return;
    if (!characterDialog?.showModal) { location.assign(store); return; }
    characterOpener = button;
    const [name, description, availability] = characters[id];
    const content = document.getElementById('character-content');
    content.replaceChildren();
    const img = document.createElement('img');
    img.src = `/assets/north-pole/${id}-standing.webp`;
    img.alt = t(name);img.width = 384;img.height = 576;content.append(img);
    const heading = document.createElement('h2');heading.id = 'character-title';heading.textContent = t(name);content.append(heading);
    const text = document.createElement('p');text.textContent = t(description);content.append(text);
    const note = document.createElement('p');note.className = 'character-availability';note.textContent = t(availability) + (id === 'comet' ? ' ' + t('Comet currently speaks English.') : '');content.append(note);
    const link = document.createElement('a');link.className = 'download-button';link.href = store;link.dataset.download = `character-${id}`;link.textContent = t('Download for iPhone');content.append(link);
    const illustration = document.createElement('p');illustration.className = 'illustration-note';illustration.textContent = t('Character illustration');content.append(illustration);
    characterDialog.showModal();characterDialog.querySelector('[data-close]').focus();
  }));
  characterDialog?.addEventListener('close', () => characterOpener?.focus({ preventScroll: true }));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
  });
  const sticky = document.querySelector('.mobile-download');
  const hero = document.querySelector('.hero-shell');
  const ending = document.querySelector('.final-cta');
  if (sticky && hero && ending && 'IntersectionObserver' in window) {
    let heroVisible = true, finalVisible = false;
    const update = () => { sticky.hidden = heroVisible || finalVisible; };
    new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting;update(); }, { threshold: 0 }).observe(hero);
    new IntersectionObserver(entries => { finalVisible = entries[0].isIntersecting;update(); }, { threshold: 0 }).observe(ending);
  }
})();
