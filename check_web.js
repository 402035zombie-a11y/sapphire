const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  const logs = [];
  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));

  await page.goto('http://localhost:8082', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => errors.push('GOTO: ' + e.message));
  await page.waitForTimeout(4000);

  const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 300) : 'NO BODY');
  const rootHtml = await page.evaluate(() => {
    const r = document.getElementById('root');
    return r ? r.innerHTML.slice(0, 200) : 'NO ROOT';
  });

  console.log('=== CONSOLE ERRORS ===');
  console.log(errors.length ? errors.join('\n') : 'NONE');
  console.log('=== BODY TEXT (first 300) ===');
  console.log(bodyText);
  console.log('=== ROOT INNER (first 200) ===');
  console.log(rootHtml);

  await browser.close();
})();
