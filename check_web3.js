const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message + (err.stack ? '\n' + err.stack.split('\n').slice(0,4).join('\n') : '')));
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => errors.push('GOTO: ' + e.message));
  await page.waitForTimeout(4000);
  const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 400) : 'NO BODY');
  console.log('=== ERRORS ===\n' + (errors.length ? errors.join('\n---\n') : 'NONE'));
  console.log('=== BODY (400) ===\n' + bodyText);
  await browser.close();
})();
