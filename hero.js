/* One responsive asset, no audible autoplay, and no motion/download on data-saving visits. */
(() => {
  const film = document.getElementById('santas-calling');
  const video = document.getElementById('heroVideo');
  if (!film || !video) return;
  const compact = matchMedia('(max-width: 600px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const watch = document.getElementById('playFilm');
  const play = document.getElementById('filmPlay');
  const sound = document.getElementById('filmSound');
  const soundLabel = document.getElementById('filmSoundLabel');
  const seek = document.getElementById('filmSeek');
  const time = document.getElementById('filmTime');
  const full = document.getElementById('filmFullscreen');
  const captions = document.getElementById('filmCaptions');
  const failure = document.getElementById('filmError');
  const controls = document.getElementById('filmControls');
  let loaded = false;
  let userPaused = false;
  let inView = true;
  const shouldAutoplay = () => !reduced.matches && !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType);
  const format = seconds => `0:${String(Math.floor(seconds || 0)).padStart(2, '0')}`;

  function setSource() {
    // Keep an active film's aspect ratio stable if the device rotates mid-playback.
    const mode = compact.matches ? 'portrait' : 'landscape';
    video.src = `assets/trailer/santas-calling-v4-${mode}.mp4`;
    video.poster = `assets/trailer/poster-${mode}.webp`;
    loaded = true;
    video.load();
  }
  function update() {
    const playing = !video.paused && !video.ended;
    film.classList.toggle('is-playing', playing);
    film.classList.toggle('is-audible', !video.muted);
    play.setAttribute('aria-label', video.ended ? 'Replay film' : playing ? 'Pause film' : 'Play film');
    sound.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Mute film');
    sound.setAttribute('aria-pressed', String(!video.muted));
    soundLabel.textContent = video.muted ? 'Sound on' : 'Sound off';
    const duration = Number.isFinite(video.duration) ? video.duration : 26;
    time.textContent = `${format(video.currentTime)} / ${format(duration)}`;
    seek.disabled = !Number.isFinite(video.duration);
    seek.max = duration;
    seek.value = video.currentTime;
    seek.style.setProperty('--progress', `${100 * video.currentTime / duration}%`);
    seek.setAttribute('aria-valuetext', `${format(video.currentTime)} of ${format(duration)}`);
  }
  function start({ audible = false, restart = false } = {}) {
    if (!loaded) setSource();
    userPaused = false;
    if (audible) { video.muted = false; video.loop = false; }
    if (restart || video.ended) video.currentTime = 0;
    failure.hidden = true;
    const attempt = video.play();
    if (attempt) attempt.catch(() => {
      // Autoplay policies leave a usable poster and explicit play controls.
      if (video.error) failure.hidden = false;
      update();
    });
    update();
  }

  controls.hidden = false;
  watch.hidden = false;
  video.muted = true;
  video.loop = true;
  video.controls = false;
  for (const event of ['play', 'pause', 'ended', 'volumechange', 'timeupdate', 'durationchange', 'loadedmetadata']) video.addEventListener(event, update);
  video.addEventListener('loadeddata', () => film.classList.add('is-ready'));
  video.addEventListener('error', () => {
    film.classList.remove('is-ready');
    failure.hidden = false;
    update();
  });
  watch.addEventListener('click', () => {
    start({ audible: true, restart: true });
    film.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
    play.focus({ preventScroll: true });
  });
  play.addEventListener('click', () => {
    if (video.paused || video.ended) start();
    else { userPaused = true; video.pause(); }
  });
  sound.addEventListener('click', () => {
    if (video.muted) {
      // First sound activation starts at the beginning, so the narrator's opening is heard.
      start({ audible: true, restart: true });
    } else { video.muted = true; update(); }
  });
  document.getElementById('filmRestart').addEventListener('click', () => start({ restart: true }));
  captions.addEventListener('click', () => {
    const track = video.textTracks[0];
    if (!track) return;
    const showing = track.mode !== 'showing';
    track.mode = showing ? 'showing' : 'disabled';
    captions.setAttribute('aria-pressed', String(showing));
    captions.setAttribute('aria-label', showing ? 'Hide captions' : 'Show captions');
  });
  seek.addEventListener('input', () => {
    if (Number.isFinite(video.duration)) video.currentTime = Number(seek.value);
    update();
  });
  full.hidden = !(film.requestFullscreen || video.webkitEnterFullscreen);
  full.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (film.requestFullscreen) await film.requestFullscreen();
      else { if (!loaded) start(); video.webkitEnterFullscreen(); }
    } catch { /* Inline controls remain available if fullscreen is unavailable. */ }
  });
  document.addEventListener('fullscreenchange', () => full.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'));
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (!inView) video.pause();
    else if (!document.hidden && !userPaused && video.muted && shouldAutoplay()) start();
  }, { threshold: .1 }).observe(film);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (inView && !userPaused && video.muted && shouldAutoplay()) start();
  });
  reduced.addEventListener('change', () => { if (reduced.matches) video.pause(); });
  update();
})();
