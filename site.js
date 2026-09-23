(() => {
  const t = window.SiteI18n.t;
  const dialog = document.getElementById('character-dialog');
  const content = document.getElementById('character-content');
  const video = document.getElementById('heroVideo');
  const media = video?.closest('.media');
  const playButton = media?.querySelector('.play');
  const videoError = media?.querySelector('.video-error');
  const phone = video?.closest('.main-phone');
  let previousFocus;
  const cast = {
    santa: [t('Santa'), t('He knows their name. He hears their wishes. He answers them, right there on the call.')],
    mrsclaus: [t('Mrs. Claus'), t('A warm hello from the North Pole kitchen.')],
    comet: [t('Comet'), t('Meet a friendly face from Santa’s reindeer crew.')],
    pip: [t('Pip'), t('A little elf with plenty of Christmas spirit.')],
    crumble: [t('Crumble'), t('Meet the sweetest friend in the North Pole.')],
    flurry: [t('Flurry'), t('A little snow. A little silliness. A lot of Christmas magic.')],
  };
  function showVideoError() {
    media.classList.remove('playing');
    phone.classList.remove('video-front');
    videoError.hidden = false;
    playButton.hidden = true;
  }
  playButton?.addEventListener('click', async () => {
    videoError.hidden = true;
    media.classList.add('playing');
    video.controls = true;
    video.muted = false;
    if (video.ended) video.currentTime = 0;
    try { await video.play(); }
    catch { showVideoError(); }
  });
  video?.addEventListener('play', () => phone.classList.add('video-front'));
  video?.addEventListener('pause', () => phone.classList.remove('video-front'));
  video?.addEventListener('ended', () => {
    phone.classList.remove('video-front');
    media.classList.remove('playing');
    video.controls = false;
  });
  video?.addEventListener('error', showVideoError);
  document.querySelectorAll('[data-character]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.character;
      if (!cast[id]) return;
      const [name, description] = cast[id];
      video?.pause();
      previousFocus = button;
      content.innerHTML = `<img class="detail-image" src="/assets/north-pole/${id}-portrait.webp" alt="${name}"><h2 id="character-title">${name}</h2><p>${description}</p><p class="detail-note">${t("The North Pole cast is growing. More friends join through the season.")}</p><button class="detail-action" type="button" data-join>${t("Get launch updates")}</button>`;
      dialog.showModal();
    });
  });
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => previousFocus?.focus({ preventScroll: true }));

  const snow = document.querySelector('.snow-layer');
  const toggle = document.querySelector('.snow-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = !reduced.matches;
  const flakes = document.createDocumentFragment();
  for (let i = 0; i < 55; i++) {
    const flake = document.createElement('span');
    flake.className = 'snowflake';
    flake.style.cssText = `--x:${(i * 61.8034) % 100}%;--size:${1.8 + (i * 17 % 30) / 10}px;--alpha:${.2 + (i * 11 % 40) / 100};--duration:${13 + i * 7 % 15}s;--delay:-${i * 11 % 27}s;--drift:${(i * 23 % 90) - 45}px`;
    flakes.append(flake);
  }
  snow.append(flakes);
  function updateSnow() {
    const on = enabled && !reduced.matches;
    snow.classList.toggle('paused', !on || document.hidden);
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', on ? t('Pause falling snow') : t('Start falling snow'));
    toggle.querySelector('.snow-state').textContent = on ? t('Snow on') : t('Snow off');
    toggle.disabled = reduced.matches;
  }
  toggle.addEventListener('click', () => { enabled = !enabled; updateSnow(); });
  document.addEventListener('visibilitychange', () => {
    updateSnow();
    if (document.hidden) video?.pause();
  });
  reduced.addEventListener('change', updateSnow);
  addEventListener('pagehide', () => video?.pause());
  updateSnow();
})();
