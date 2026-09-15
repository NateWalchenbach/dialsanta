(() => {
  const API = 'https://api-production-b742.up.railway.app';
  const STORAGE = 'dialsanta.verified-web-account';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const session = params.get('session_id');
  const packID = params.get('pack');
  let auth = null, config, selectedPack, enteredEmail = '', requestID = crypto.randomUUID();
  let busy = false, resendAfter = 0, pollTimer, checkGeneration = 0;
  try { auth = JSON.parse(sessionStorage.getItem(STORAGE) || 'null'); } catch { /* storage can be unavailable */ }
  const showError = message => { $('purchase-error').textContent = message; $('purchase-error').hidden = !message; };
  function remember(value) {
    auth = value;
    try { value ? sessionStorage.setItem(STORAGE, JSON.stringify(value)) : sessionStorage.removeItem(STORAGE); } catch { /* works in this tab without storage */ }
  }
  async function api(path, body, extraHeaders = {}) {
    const response = await fetch(`${API}${path}`, {
      method: body === undefined ? 'GET' : 'POST', cache: 'no-store',
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}), ...extraHeaders },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) remember(null);
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }
    return data;
  }
  async function action(button, work) {
    if (busy) return;
    busy = true; button.disabled = true; showError('');
    try { await work(); }
    catch (error) {
      if (!auth && !$('verified-account').hidden) signIn();
      showError(error.message || 'Could not connect. Please try again.');
    }
    finally { busy = false; button.disabled = false; }
  }
  function signIn() {
    clearTimeout(pollTimer); checkGeneration++;
    $('verified-account').hidden = true; $('code-form').hidden = true; $('email-form').hidden = false;
    $('checkout').hidden = true; $('check-again').hidden = true;
    $('purchase-status').textContent = session ? 'Verify the email you used before checkout to view your purchase.' : 'Step 1 of 2 · Verify your email';
    $('email').focus();
  }
  function accountView(email) {
    $('email-form').hidden = true; $('code-form').hidden = true; $('verified-account').hidden = false;
    $('account-email').textContent = email;
    $('account-instruction').textContent = 'Your minutes will belong to this email. Use it to sign into Dial Santa on your iPhone.';
  }
  async function checkPayment(attempt = 0, generation = ++checkGeneration) {
    clearTimeout(pollTimer);
    const result = await api(`/web/checkout/${encodeURIComponent(session)}`);
    if (generation !== checkGeneration) return;
    accountView(result.email);
    $('checkout').hidden = true;
    if (result.status === 'credited') {
      $('purchase-title').textContent = 'Your minutes are saved.';
      $('purchase-intro').textContent = `${result.minutes} minutes have been added to your account.`;
      $('purchase-status').textContent = 'Payment confirmed';
      $('account-instruction').textContent = `Sign into Dial Santa with ${result.email} to use your minutes. You can install the app later — your minutes will be waiting.`;
      $('check-again').hidden = true;
    } else {
      $('purchase-status').textContent = result.status === 'expired' ? 'Checkout expired. No completed payment was confirmed.' : 'Waiting for payment confirmation. Your minutes are not confirmed yet.';
      $('check-again').hidden = false;
      if (result.status === 'pending' && attempt < 9) pollTimer = setTimeout(() => checkPayment(attempt + 1, generation).catch(error => showError(error.message)), 3000);
    }
  }
  async function signedIn() {
    const account = await api('/web/account');
    accountView(account.email);
    if (session) { await checkPayment(); return; }
    $('purchase-status').textContent = 'Step 2 of 2 · Your email is verified';
    $('checkout').hidden = !config.purchasesEnabled;
  }
  async function sendCode() {
    const remaining = Math.ceil((resendAfter - Date.now()) / 1000);
    if (remaining > 0) throw new Error(`Please wait ${remaining} seconds before requesting another code.`);
    await api('/auth/request-code', { email: enteredEmail });
    resendAfter = Date.now() + 30000;
    $('email-form').hidden = true; $('code-form').hidden = false;
    $('code-sent-to').textContent = `Sent to ${enteredEmail}. Your code expires in 10 minutes.`;
    $('code').value = ''; $('code').focus();
    $('purchase-status').textContent = 'Check your email for your verification code.';
  }
  $('email-form').addEventListener('submit', event => {
    event.preventDefault(); enteredEmail = $('email').value.trim().toLowerCase();
    action(event.submitter, sendCode);
  });
  $('code-form').addEventListener('submit', event => {
    event.preventDefault();
    action(event.submitter, async () => {
      const verified = await api('/auth/verify', { email: enteredEmail, code: $('code').value.trim() });
      remember(verified); requestID = crypto.randomUUID();
      await signedIn();
    });
  });
  $('resend-code').addEventListener('click', event => action(event.currentTarget, sendCode));
  $('change-email').addEventListener('click', () => { remember(null); signIn(); });
  $('sign-out').addEventListener('click', () => {
    remember(null); showError(''); requestID = crypto.randomUUID();
    $('purchase-title').innerHTML = 'Your minutes.<br><em>Your account.</em>';
    $('purchase-intro').textContent = 'Verify your email first, so your minutes are waiting when you sign into Dial Santa.';
    signIn();
  });
  $('checkout').addEventListener('click', event => action(event.currentTarget, async () => {
    const result = await api('/web/checkout', { pack: selectedPack.id }, { 'Idempotency-Key': requestID });
    const destination = new URL(result.url);
    if (destination.protocol !== 'https:' || destination.hostname !== 'checkout.stripe.com') throw new Error('Invalid checkout destination. Please contact support.');
    location.assign(destination.href);
  }));
  $('check-again').addEventListener('click', event => action(event.currentTarget, () => checkPayment()));
  async function init() {
    config = await api('/web/config');
    if (!session && !config.purchasesEnabled) {
      $('purchase-status').textContent = 'Minute purchases are coming soon. No payment can be made here yet.';
      return;
    }
    selectedPack = config.packs.find(pack => pack.id === packID);
    if (!session && !selectedPack) { $('purchase-status').textContent = 'Choose a minute pack on the website to get started.'; return; }
    $('purchase-content').hidden = false;
    if (selectedPack && !session) {
      $('pack-summary').hidden = false;
      $('pack-summary').textContent = `${selectedPack.minutes} minutes · ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedPack.amountCents / 100)} · one-time purchase`;
    }
    if (auth?.token) {
      try { await signedIn(); }
      catch (error) { if (!auth) signIn(); showError(error.message); }
    } else signIn();
    if (params.has('cancelled')) $('purchase-status').textContent = 'Checkout was cancelled. You can try again when you’re ready.';
  }
  init().catch(error => { $('purchase-status').textContent = 'Could not check purchase availability.'; showError(error.message); });
  addEventListener('pagehide', () => { clearTimeout(pollTimer); checkGeneration++; });
})();
