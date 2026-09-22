(() => {
  const form = document.getElementById('waitlist');
  const dialog = document.getElementById('waitlist-dialog');
  if (!form || !dialog || typeof dialog.showModal !== 'function') return;
  const email = form.elements.email;
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('waitlist-status');
  let pending = false;
  const read = (storage, key) => { try { return window[storage].getItem(key) === '1'; } catch { return false; } };
  const remember = (storage, key) => { try { window[storage].setItem(key, '1'); } catch { /* Storage may be blocked. In-memory state still prevents repeats. */ } };
  let shown = read('sessionStorage', 'dialsanta.waitlist.shown') || read('localStorage', 'dialsanta.waitlist.joined');
  let qualified = false;
  let remaining = 30000;
  let visibleSince = null;
  let timer;
  let previousFocus;

  function pauseTimer() {
    if (visibleSince !== null) remaining = Math.max(0, remaining - (performance.now() - visibleSince));
    visibleSince = null;
    clearTimeout(timer);
  }

  function openWhenReady(manual = false) {
    if (dialog.open || (!manual && (shown || !qualified)) || document.hidden || document.fullscreenElement || document.getElementById('heroVideo')?.webkitDisplayingFullscreen) return;
    if (!manual && document.querySelector('dialog[open]')) return;
    document.getElementById('heroVideo')?.pause();
    previousFocus = document.activeElement;
    dialog.showModal();
    shown = true;
    remember('sessionStorage', 'dialsanta.waitlist.shown');
    pauseTimer();
    window.removeEventListener('scroll', checkScroll);
    document.getElementById('waitlist-title').focus({ preventScroll: true });
  }

  function checkScroll() {
    const film = document.getElementById('santas-calling');
    const navBottom = Math.max(0, document.getElementById('nav')?.getBoundingClientRect().bottom ?? 0);
    // Below the viewport on arrival is not the same as having scrolled past it.
    if (film && window.scrollY > 0 && film.getBoundingClientRect().bottom <= navBottom) qualified = true;
    openWhenReady();
  }

  function resumeTimer() {
    if (shown || document.hidden || visibleSince !== null) return;
    visibleSince = performance.now();
    timer = setTimeout(() => { pauseTimer(); qualified = true; openWhenReady(); }, remaining);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseTimer();
    else { openWhenReady(); resumeTimer(); }
  });
  document.addEventListener('fullscreenchange', () => openWhenReady());
  document.getElementById('heroVideo')?.addEventListener('webkitendfullscreen', () => openWhenReady());
  if (!shown) {
    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    resumeTimer();
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-join]');
    if (!trigger) return;
    event.preventDefault();
    document.getElementById('character-dialog')?.close();
    openWhenReady(true);
  });

  const close = () => dialog.close();
  document.getElementById('waitlist-close').addEventListener('click', close);
  document.getElementById('waitlist-later').addEventListener('click', close);
  // Native dialog provides Escape dismissal and keeps keyboard focus inside.
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) close();
  });
  dialog.addEventListener('close', () => {
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    pending = true;
    button.disabled = true;
    button.textContent = 'Joining…';
    status.classList.remove('is-error');
    status.textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api-production-b742.up.railway.app/web/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value.trim(), consent: true, website: form.elements.website.value }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true) {
        throw new Error(response.status === 429 ? 'Too many attempts. Please try again in an hour.' : response.status === 400 ? 'Please enter a valid email address.' : 'We couldn’t save your email. Please try again.');
      }
      form.reset();
      remember('localStorage', 'dialsanta.waitlist.joined');
      form.classList.add('is-complete');
      document.getElementById('waitlist-later').textContent = 'Done';
      status.textContent = 'You’re on the list! We’ll email you when Dial Santa launches.';
      status.focus({ preventScroll: true });
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = error instanceof TypeError || error.name === 'AbortError' ? 'We couldn’t connect. Please check your connection and try again.' : error.message;
    } finally {
      clearTimeout(timeout);
      pending = false;
      button.disabled = false;
      button.textContent = 'Join the waitlist';
    }
  });
})();
