const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (err) => {
    console.log('PAGEERROR:', err.message);
    if (err.stack) console.log('STACK:', err.stack.split('\n').slice(0, 6).join('\n'));
  });
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('GOTO_ERR', e.message));
  await page.waitForTimeout(3000);
  await browser.close();
})();
