const puppeteer = require('puppeteer');
const path = require('path');

const posters = [
  { html: 'poster1.html', png: 'POSTER_1_teaser.png' },
  { html: 'poster2.html', png: 'POSTER_2_bot.png' },
  { html: 'poster3.html', png: 'POSTER_3_97percent.png' },
];

(async () => {
  console.log('PNG fayllar yasalmoqda...\n');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

  for (const p of posters) {
    const filePath = 'file:///' + path.join(__dirname, p.html).replace(/\\/g, '/');
    await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({
      path: path.join(__dirname, p.png),
      type: 'png'
    });
    console.log('✓ ' + p.png + ' — tayyor!');
  }

  await browser.close();
  console.log('\nHamma PNG fayllar shov/ papkasida!');
})();
