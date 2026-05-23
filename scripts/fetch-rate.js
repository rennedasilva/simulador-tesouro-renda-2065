const path = require('path');
const fs   = require('fs');

// Garante que require() encontre node_modules dentro de scripts/
process.chdir(__dirname);

const { chromium } = require('playwright-extra');
const stealth      = require('puppeteer-extra-plugin-stealth');
chromium.use(stealth());

const TD_URL = 'https://www.tesourodireto.com.br/titulos/precos-e-taxas.htm';
const OUT    = path.join(__dirname, '..', 'data', 'rate.json');
const SHOT   = path.join(__dirname, 'screenshot.png');

// Padrões de regex em ordem de especificidade
// A taxa fica entre 3% e 25% para um IPCA+ realista
const PATTERNS = [
  /Renda\+[\s\S]{0,120}?2065[\s\S]{0,400}?IPCA\s*\+\s*(\d{1,2}[,\.]\d{2})\s*%/,
  /2065[\s\S]{0,400}?IPCA\s*\+\s*(\d{1,2}[,\.]\d{2})\s*%/,
  /IPCA\s*\+\s*(\d{1,2}[,\.]\d{2})\s*%[\s\S]{0,300}?2065/,
  /Renda[\s\S]{0,600}?IPCA\s*\+\s*(\d{1,2}[,\.]\d{2})\s*%/,
];

function extraiTaxa(texto) {
  for (let i = 0; i < PATTERNS.length; i++) {
    const m = texto.match(PATTERNS[i]);
    if (m) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (v >= 3 && v <= 25) {
        console.log(`[padrão ${i + 1}] IPCA + ${v}%`);
        return v;
      }
    }
  }
  return null;
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const ctx = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'pt-BR',
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { 'Accept-Language': 'pt-BR,pt;q=0.9' },
    });

    const page = await ctx.newPage();

    // Remove flag de automação antes de qualquer script da página
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    console.log('Carregando', TD_URL);
    await page.goto(TD_URL, { waitUntil: 'networkidle', timeout: 90_000 });

    // Aguarda possível challenge do Cloudflare resolver
    await page.waitForTimeout(8_000);

    await page.screenshot({ path: SHOT, fullPage: true });
    console.log('Screenshot salvo em', SHOT);

    const texto = await page.evaluate(() => document.body.innerText);
    console.log('Início do texto da página:\n', texto.slice(0, 600), '\n...');

    const taxa = extraiTaxa(texto);

    if (!taxa) {
      console.error('Taxa não encontrada. Texto completo:\n', texto.slice(0, 3000));
      process.exit(1);
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(
      OUT,
      JSON.stringify(
        { taxa, data: new Date().toISOString().split('T')[0], fonte: 'tesourodireto.com.br' },
        null,
        2,
      ) + '\n',
    );
    console.log('Salvo em', OUT, '->', { taxa });
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
