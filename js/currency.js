(() => {
  const options = [
    { code: 'USD', name: 'U.S. Dollar', rate: 1, locale: 'en-US' },
    { code: 'EUR', name: 'Euro', rate: 0.92, locale: 'de-DE' },
    { code: 'GBP', name: 'British Pound', rate: 0.79, locale: 'en-GB' },
    { code: 'CAD', name: 'Canadian Dollars', rate: 1.36, locale: 'en-CA' },
    { code: 'AUD', name: 'Australian Dollars', rate: 1.53, locale: 'en-AU' },
    { code: 'INR', name: 'Indian Rupees', rate: 83.5, locale: 'en-IN' },
    { code: 'CNY', name: 'China Yuan RMB', rate: 7.24, locale: 'zh-CN' }
  ];
  const storageKey = 'zavokaCurrency';
  const ratesKey = 'zavokaCurrencyRates';
  const ratesUrl = 'https://open.er-api.com/v6/latest/USD';
  const refreshAfter = 6 * 60 * 60 * 1000;
  const currency = code => options.find(item => item.code === code) || options[0];
  const hasPreferenceConsent = () => window.ZavokaConsent?.allowsPreferences?.() === true;
  let selected = currency(hasPreferenceConsent() ? localStorage.getItem(storageKey) : 'USD');
  let ratesUpdatedAt = null;
  const originalText = new WeakMap();

  const format = (usdAmount, code = selected.code) => {
    const target = currency(code);
    return new Intl.NumberFormat(target.locale, {
      style: 'currency', currency: target.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: target.code === 'INR' ? 0 : 2
    }).format(Number(usdAmount) * target.rate);
  };

  const convertText = text => text.replace(/\$\s?(\d[\d,]*(?:\.\d+)?)/g, (match, amount) => {
    const value = Number(amount.replace(/,/g, ''));
    return Number.isFinite(value) ? format(value) : match;
  });

  const renderText = root => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script,style,noscript,textarea,option,[contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
        return /\$\s?\d/.test(originalText.get(node) ?? node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const baseText = originalText.get(node);
      const display = selected.code === 'USD' ? baseText : convertText(baseText);
      if (node.nodeValue !== display) node.nodeValue = display;
    }
  };

  const setRates = (rates, updatedAt) => {
    for (const item of options) {
      if (item.code === 'USD') continue;
      const rate = Number(rates?.[item.code]);
      if (!Number.isFinite(rate) || rate <= 0) return false;
    }
    for (const item of options) {
      if (item.code !== 'USD') item.rate = Number(rates[item.code]);
    }
    ratesUpdatedAt = updatedAt || Date.now();
    renderText(document.body);
    return true;
  };

  const formatUpdateTime = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'the latest available update' : date.toLocaleString();
  };

  const updateRateInfo = message => {
    const info = document.querySelector('.currency-info');
    if (info) info.textContent = message;
  };

  const rateDescription = () => ratesUpdatedAt
    ? `Display rates are fetched from ExchangeRate-API and were last updated ${formatUpdateTime(ratesUpdatedAt)}. The provider typically updates daily; conversions are indicative and may differ from your final checkout amount.`
    : 'Live exchange rates are unavailable; showing built-in fallback rates. Final billing currency is confirmed at checkout.';

  const loadCachedRates = () => {
    if (!hasPreferenceConsent()) return false;
    try {
      const cached = JSON.parse(localStorage.getItem(ratesKey) || 'null');
      if (!cached || !cached.rates || !setRates(cached.rates, cached.updatedAt)) return false;
      return Date.now() - Number(cached.cachedAt || 0) < refreshAfter;
    } catch {
      return false;
    }
  };

  const refreshRates = async () => {
    try {
      const response = await fetch(ratesUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Exchange rate request failed (${response.status})`);
      const data = await response.json();
      if (data.result !== 'success' || !setRates(data.rates, data.time_last_update_utc)) {
        throw new Error('Exchange rate response was incomplete');
      }
      if (hasPreferenceConsent()) {
        try {
          localStorage.setItem(ratesKey, JSON.stringify({
            rates: Object.fromEntries(options.map(item => [item.code, item.rate])),
            updatedAt: ratesUpdatedAt,
            cachedAt: Date.now()
          }));
        } catch { /* Continue with in-memory rates if storage is unavailable. */ }
      }
      updateRateInfo(rateDescription());
    } catch {
      updateRateInfo(rateDescription());
    }
  };

  const buildControl = () => {
    const host = document.querySelector('.nav-links') || document.querySelector('.nav-inner') || document.querySelector('.admin-top-actions');
    if (!host || document.querySelector('.currency-control')) return;
    const control = document.createElement('div');
    control.className = 'currency-control';
    control.innerHTML = `<button class="currency-trigger" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Choose display currency"><span class="currency-trigger-symbol"></span><span class="currency-trigger-code"></span><span aria-hidden="true">⌄</span></button><div class="currency-menu" hidden><div class="currency-options" role="group" aria-label="Display currency"></div><button class="currency-more" type="button" aria-expanded="false">Rate info <span aria-hidden="true">›</span></button><p class="currency-info" hidden>Loading current exchange rates…</p></div>`;
    const trigger = control.querySelector('.currency-trigger');
    const menu = control.querySelector('.currency-menu');
    const optionsList = control.querySelector('.currency-options');
    const more = control.querySelector('.currency-more');
    options.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'currency-option';
      button.dataset.currency = item.code;
      button.innerHTML = `<span class="currency-option-symbol"></span><span>${item.name}</span><span class="currency-option-code">${item.code}</span>`;
      button.addEventListener('click', () => {
        selected = item;
        if (hasPreferenceConsent()) localStorage.setItem(storageKey, item.code);
        updateControl();
        renderText(document.body);
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      });
      optionsList.append(button);
    });
    trigger.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-expanded', String(!menu.hidden));
    });
    more.addEventListener('click', () => {
      const info = control.querySelector('.currency-info');
      info.hidden = !info.hidden;
      more.setAttribute('aria-expanded', String(!info.hidden));
    });
    document.addEventListener('click', event => {
      if (!control.contains(event.target)) {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
    host.append(control);
    control._update = updateControl;

    function updateControl() {
      const symbols = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', INR: '₹', CNY: '¥' };
      control.querySelector('.currency-trigger-symbol').textContent = symbols[selected.code];
      control.querySelector('.currency-trigger-code').textContent = selected.code;
      control.querySelectorAll('.currency-option').forEach(button => {
        button.querySelector('.currency-option-symbol').textContent = symbols[button.dataset.currency];
        button.setAttribute('aria-pressed', String(button.dataset.currency === selected.code));
      });
    }
    updateControl();
  };

  window.ZavokaCurrency = { format, getCode: () => selected.code };
  loadCachedRates();
  buildControl();
  updateRateInfo(rateDescription());
  renderText(document.body);
  refreshRates();
  window.setInterval(refreshRates, refreshAfter);

  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) renderText(node.parentElement || document.body);
        else if (node.nodeType === Node.ELEMENT_NODE) renderText(node);
      });
      else if (record.type === 'characterData' && !originalText.has(record.target)) {
        originalText.set(record.target, record.target.nodeValue);
        renderText(record.target.parentElement || document.body);
      }
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  window.addEventListener('zavoka:consentchange', event => {
    if (event.detail?.preferences === true) {
      try { localStorage.setItem(storageKey, selected.code); } catch { /* Keep the selection for this tab. */ }
      refreshRates();
    } else {
      selected = options[0];
      try { localStorage.removeItem(storageKey); localStorage.removeItem(ratesKey); } catch { /* Continue without persisted preferences. */ }
      document.querySelector('.currency-control')?._update?.();
      renderText(document.body);
    }
  });

  window.addEventListener('storage', event => {
    if (!hasPreferenceConsent()) return;
    if (event.key === storageKey) {
      selected = currency(event.newValue);
      document.querySelector('.currency-control')?._update?.();
      renderText(document.body);
    } else if (event.key === ratesKey && event.newValue) {
      try {
        const cached = JSON.parse(event.newValue);
        if (setRates(cached.rates, cached.updatedAt)) updateRateInfo(rateDescription());
      } catch { /* Ignore invalid cross-tab rate data. */ }
    }
  });
})();
