(() => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  const nav = document.querySelector('.nav');
  const footer = document.querySelector('.site-footer');
  const active = (pages) => pages.includes(path) ? ' aria-current="page"' : '';

  if (nav) {
    nav.outerHTML = `
      <div class="announcement-bar"><div class="container announcement-inner"><span class="announcement-dot"></span><span>Built for thoughtful Shopify growth</span><a href="index.html#install">Start your 5-day Premium trial&nbsp; →</a></div></div>
      <header class="nav">
        <div class="container nav-inner">
          <a class="brand" href="index.html" aria-label="zavoka AI home">zavok<span class="logo-final-a">a</span></a>
          <button class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false">☰</button>
          <nav class="nav-links" aria-label="Main navigation">
            <a href="index.html#features"${active(['index.html'])}>How it works</a>
            <a href="pricing.html"${active(['pricing.html'])}>Pricing</a>
            <a href="about.html"${active(['about.html'])}>Our story</a>
            <a href="enterprise.html"${active(['enterprise.html'])}>For enterprise</a>
            <a href="contact.html"${active(['contact.html'])}>Contact</a>
            <span class="nav-divider" aria-hidden="true"></span>
            <a class="nav-login" href="${path === 'index.html' ? '#merchant-login' : 'index.html#merchant-login'}">Merchant login</a>
            <a class="button button-small" href="index.html#install">Start free trial</a>
          </nav>
        </div>
      </header>`;

    const menu = document.querySelector('.menu-toggle');
    const links = document.querySelector('.nav-links');
    menu?.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menu.textContent = open ? '×' : '☰';
    });
    links?.querySelectorAll('a').forEach(link => link.addEventListener('click', (event) => {
      links.classList.remove('open');
      menu?.setAttribute('aria-expanded', 'false');
      if (menu) menu.textContent = '☰';
      if (link.classList.contains('nav-login') && path === 'index.html') {
        event.preventDefault();
        const panel = document.getElementById('merchant-login');
        panel?.classList.add('open');
        panel?.setAttribute('aria-hidden', 'false');
        document.getElementById('loginEmail')?.focus();
      }
    }));
  }

  if (footer) {
    footer.innerHTML = `
      <div class="container footer-main">
        <div class="footer-intro">
          <a class="brand" href="index.html">zavok<span class="logo-final-a">a</span></a>
          <p>A more personal way for Shopify stores to welcome, guide, and convert every visitor.</p>
        </div>
        <div class="footer-links-group">
          <div class="footer-column"><h3>Products</h3><a href="#" target="_blank" rel="noopener noreferrer">SEO Rank</a></div>
          <div class="footer-column"><h3>Explore</h3><a href="index.html#features">How it works</a><a href="pricing.html">Pricing</a><a href="enterprise.html">Enterprise</a><a href="index.html#install">Install app</a></div>
          <div class="footer-column"><h3>Company</h3><a href="about.html">Our story</a><a href="contact.html">Contact us</a><a href="index.html#merchant-login">Merchant login</a><a href="index.html#install">Get started</a></div>
          <div class="footer-column"><h3>Legal</h3><a href="terms.html">Terms &amp; conditions</a><a href="privacy.html">Privacy policy</a><a href="refunds.html">Refund &amp; cancellation</a><a href="dpa.html">Data processing agreement</a><a href="subprocessors.html">Subprocessors &amp; third parties</a><a href="cookies.html">Cookie policy</a><button class="cookie-settings-trigger" type="button">Cookie settings</button></div>
        </div>
      </div>
      <div class="container footer-tagline">Made for Shopify merchants who care about their customers.</div>
      <div class="container footer-bottom"><span>© 2026 zavoka AI. All rights reserved.</span><span>Sales conversations, made human.</span></div>`;
  }

  if (window.location.hash === '#merchant-login') {
    const panel = document.getElementById('merchant-login');
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
  }

  const consentScript = document.createElement('script');
  consentScript.src = 'js/cookie-consent.js';
  consentScript.onload = () => {
    const currencyScript = document.createElement('script');
    currencyScript.src = 'js/currency.js';
    document.body.append(currencyScript);
  };
  document.body.append(consentScript);
})();
