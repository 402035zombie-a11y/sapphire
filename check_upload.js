const { chromium } = require('playwright');
const fs = require('fs');

// создадим тестовый txt
fs.writeFileSync('C:/Users/DELL/test_book.txt', 'Hello world. This is a test book. We are learning English.\nThe cat sat on the mat. She was happy.');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => logs.push('GOTO ' + e.message));
  await page.waitForTimeout(2000);
  const input = page.locator('input[type=file]');
  logs.push('INPUT_COUNT: ' + (await input.count()));
  await input.setInputFiles('C:/Users/DELL/test_book.txt').catch(e => logs.push('SETFILE_ERR ' + e.message));
  await page.waitForTimeout(2000);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));
  logs.push('BODY_AFTER: ' + bodyText);
  console.log(logs.join('\n'));
  await browser.close();
})();
