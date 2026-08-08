const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => logs.push('GOTO ' + e.message));
  await page.waitForTimeout(2000);
  // найти кнопку "Загрузить книгу"
  const btn = await page.getByText('Загрузить книгу').first();
  logs.push('BTN_FOUND: ' + (await btn.count()));
  await btn.click().catch(e => logs.push('CLICK_ERR ' + e.message));
  await page.waitForTimeout(1500);
  // проверить, есть ли input[type=file]
  const hasInput = await page.evaluate(() => !!document.querySelector('input[type=file]'));
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));
  logs.push('HAS_INPUT: ' + hasInput);
  logs.push('BODY: ' + bodyText);
  console.log(logs.join('\n'));
  await browser.close();
})();
