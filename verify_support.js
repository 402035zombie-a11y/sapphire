const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
  const errors = [], unhandled = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => unhandled.push(e.message));
  await page.goto('http://localhost:8055/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  // Клик на SupportButton (heart icon) — центр сердца x=2518, y=42
  await page.mouse.click(2518, 42);
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => {
    const overlay = [...document.querySelectorAll('div')].find(d => {
      const s = getComputedStyle(d);
      return s.position === 'absolute' && parseInt(s.zIndex) >= 1000;
    });
    if (!overlay) return { overlay: false };
    const kids = [...overlay.querySelectorAll('div')];
    const metalPanels = kids.filter(d => {
      const sh = getComputedStyle(d).boxShadow;
      return sh && sh !== 'none' && (sh.includes('rgb') || sh.includes('rgba'));
    });
    const hasText = [...document.querySelectorAll('*')].some(e => e.textContent?.includes('Support the author'));
    const btns = [...document.querySelectorAll('*')].filter(e => {
      const t = (e.textContent || '').trim();
      return ['Watch an ad (30s)', 'Thanks, not now', 'Buy a subscription / Donate'].includes(t);
    }).map(e => (e.textContent || '').trim());
    return {
      overlay: true,
      panels: metalPanels.length,
      hasTitle: hasText,
      buttons: btns,
    };
  });
  console.log('SUPPORT_MODAL:', JSON.stringify(info, null, 2));
  console.log('ERRORS:', errors.length, errors.slice(0,5));
  console.log('UNHANDLED:', unhandled.length, unhandled.slice(0,5));
  await browser.close();
})();
