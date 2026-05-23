// ---- BCB SGS (séries temporais) ----
// Retorna o último valor da série. API suporta CORS nativamente.
async function bcbSgs(codigo) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/1?formato=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`BCB SGS ${codigo}: HTTP ${res.status}`);
  const arr = await res.json();
  if (!arr.length) throw new Error(`BCB SGS ${codigo}: resposta vazia`);
  const last = arr[arr.length - 1];
  return { valor: parseFloat(last.valor.replace(',', '.')), data: last.data };
}

// ---- BCB PTAX (dólar intraday) ----
// A API PTAX publica cotações ao longo do dia (10h, 11h, 12h, 13h, cierre ~16h).
// Suporta CORS nativamente — nenhum proxy necessário.
async function bcbPtax(date) {
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  const url  = [
    'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata',
    `/CotacaoDolarDia(dataCotacao=@d)?@d='${mm}-${dd}-${yyyy}'`,
    '&$top=100&$format=json&$select=cotacaoVenda,dataHoraCotacao',
  ].join('');

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`PTAX: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.value?.length) throw new Error('PTAX: sem cotações no dia');

  const last = json.value[json.value.length - 1];
  return { valor: last.cotacaoVenda, timestamp: last.dataHoraCotacao };
}

function fmtPtaxTime(raw) {
  // BCB retorna "2026-05-22 13:06:26.947" — converte para Date com T
  const d = new Date(raw.replace(' ', 'T'));
  if (isNaN(d)) return raw.slice(0, 16);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Tenta hoje; se não houver cotação ainda (fim de semana / antes das 10h), recua até 5 dias úteis.
async function fetchDolar() {
  for (let offset = 0; offset <= 5; offset++) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    try {
      const r = await bcbPtax(d);
      return { valor: r.valor, meta: `PTAX · ${fmtPtaxTime(r.timestamp)}` };
    } catch {}
  }
  // Último recurso: série SGS 1 (PTAX diária, publica D-1)
  const r = await bcbSgs(1);
  return { valor: r.valor, meta: `PTAX · ${r.data}` };
}

// ---- Taxa Tesouro Renda+ 2065 — rate.json gerado pelo GitHub Actions ----
// O workflow .github/workflows/fetch-rate.yml roda diariamente (dias úteis, 9h BRT)
// com Playwright + stealth, captura a taxa do site oficial e commita data/rate.json.
// Se o fetch falhar ou o arquivo não existir, cai silenciosamente para o localStorage.

async function fetchLiveRate() {
  try {
    const res = await fetch('data/rate.json', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return;
    const d = await res.json();
    if (!d.taxa || d.taxa <= 0) return;

    const taxaStr = d.taxa.toFixed(2).replace('.', ',');

    $('dotTesouro').className = 'dot ok';
    $('valTesouro').innerHTML = `IPCA + ${taxaStr}<span class="unit">%</span>`;
    $('metaTesouro').innerHTML =
      `automático · ${d.data} · <a href="${TESOURO_URL}" target="_blank" rel="noopener">conferir</a>`;
    $('hintContratada').textContent = `ao vivo ${taxaStr}%`;

    if (!window._userTouchedRates) {
      $('contratada').value = taxaStr;
      $('venda').value      = taxaStr;
      recalc();
    }

    // Persiste localmente para uso offline
    localStorage.setItem(LS_RATE_KEY, d.taxa.toString());
  } catch {
    // Falha silenciosa — fallback já está visível via initTesouro()
  }
}

// ---- Taxa Tesouro Renda+ 2065 (modo manual + localStorage) ----
// O endpoint oficial da Tesouro Direto retornou 410 Gone em mai/2026.
// O site está protegido por Cloudflare WAF com managed challenge (JS obrigatório),
// tornando qualquer acesso server-side ou via CORS proxy impossível.
// Solução: persistimos a taxa que o usuário informou via localStorage.

const LS_RATE_KEY = 'tr2065_taxa';
const TESOURO_URL = 'https://www.tesourodireto.com.br/titulos/precos-e-taxas.htm';

function initTesouro() {
  const saved     = localStorage.getItem(LS_RATE_KEY);
  const savedRate = saved ? parseFloat(saved) : null;

  // Fallback: lê o valor padrão do próprio input quando não há dado salvo
  const inputVal   = parseNum($('contratada').value);
  const displayRate = savedRate ?? (inputVal > 0 ? inputVal : null);
  const taxaStr    = displayRate != null ? displayRate.toFixed(2).replace('.', ',') : null;
  const fromStorage = savedRate != null;

  $('dotTesouro').className = 'dot man';
  $('valTesouro').classList.remove('skel');
  $('valTesouro').innerHTML = taxaStr
    ? `IPCA + ${taxaStr}<span class="unit">%</span>`
    : `IPCA + —<span class="unit">%</span>`;
  $('metaTesouro').innerHTML = taxaStr
    ? fromStorage
      ? `salvo · <a href="${TESOURO_URL}" target="_blank" rel="noopener">conferir agora</a>`
      : `padrão · <a href="${TESOURO_URL}" target="_blank" rel="noopener">informe a taxa real</a>`
    : `informe a taxa · <a href="${TESOURO_URL}" target="_blank" rel="noopener">ver no Tesouro Direto</a>`;

  if (!window._userTouchedRates) {
    if (fromStorage) {
      $('contratada').value = taxaStr;
      $('venda').value      = taxaStr;
    }
    $('hintContratada').textContent = fromStorage ? `salvo ${taxaStr}%` : `padrão ${taxaStr}%`;
  }
}

function saveTesouroRate(taxaStr) {
  const v = parseNum(taxaStr);
  if (v > 0) {
    localStorage.setItem(LS_RATE_KEY, v.toString());
    $('metaTesouro').innerHTML =
      `salvo · <a href="${TESOURO_URL}" target="_blank" rel="noopener">conferir agora</a>`;
    $('hintContratada').textContent = `salvo ${taxaStr}%`;
    $('dotTesouro').className = 'dot man';
    $('valTesouro').innerHTML = `IPCA + ${taxaStr}<span class="unit">%</span>`;
  }
}

// ---- Loaders BCB ----

async function loadBCB() {
  // IPCA acumulado 12 meses (série 13522)
  bcbSgs(13522)
    .then((r) => {
      setInd('Ipca', true,
        `${r.valor.toFixed(2).replace('.', ',')}<span class="unit">%</span>`,
        `acum. · ${r.data}`);
      $('ipca').value = r.valor.toFixed(2).replace('.', ',');
      recalc();
    })
    .catch(() => setInd('Ipca', false, `4,37<span class="unit">%</span>`, 'offline · último conhecido'));

  // Meta Selic (série 432)
  bcbSgs(432)
    .then((r) => {
      setInd('Selic', true,
        `${r.valor.toFixed(2).replace('.', ',')}<span class="unit">%</span>`,
        `meta a.a. · ${r.data}`);
    })
    .catch(() => setInd('Selic', false, `14,50<span class="unit">%</span>`, 'offline · último conhecido'));

  // CDI anualizado base 252 (série 4389)
  bcbSgs(4389)
    .then((r) => {
      setInd('Cdi', true,
        `${r.valor.toFixed(2).replace('.', ',')}<span class="unit">%</span>`,
        `a.a. · ${r.data}`);
    })
    .catch(() => setInd('Cdi', false, `14,40<span class="unit">%</span>`, 'offline · último conhecido'));

  // Dólar via PTAX intraday — mais atual que a série SGS 1 (publica só D-1)
  fetchDolar()
    .then((r) => {
      setInd('Dolar', true, `R$ ${r.valor.toFixed(2).replace('.', ',')}`, r.meta);
    })
    .catch(() => setInd('Dolar', false, `R$ —`, 'offline'));
}
