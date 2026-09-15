// Server-controlled launch gate. Static markup remains disabled if JS/network fails.
(() => {
  fetch('https://api-production-b742.up.railway.app/web/config', { cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
    .then(config => {
      if (config.purchasesEnabled !== true) return;
      document.querySelectorAll('[data-minute-pack]').forEach(button => {
        const pack = config.packs.find(item => item.id === button.dataset.minutePack);
        if (!pack) return;
        const link = document.createElement('a');
        link.className = button.className;
        link.href = `purchase.html?pack=${encodeURIComponent(pack.id)}`;
        link.textContent = `Buy ${pack.minutes} minutes`;
        button.replaceWith(link);
      });
      const availability = document.getElementById('purchase-availability');
      if (availability) availability.textContent = 'Verify your email before checkout. Your minutes will be waiting when you sign into Dial Santa with the same email.';
      const note = document.getElementById('purchase-note');
      if (note) note.textContent = 'One-time payment · Minutes saved to your verified email';
    }).catch(() => { /* purchasing stays disabled */ });
})();
