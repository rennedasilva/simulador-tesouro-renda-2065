const PRESETS = [
  { label: '3,0', value: '3',    hint: 'Meta BC' },
  { label: '4,4', value: '4,37', hint: 'Atual 12m' },
  { label: '6,0', value: '6',    hint: 'Pressão' },
  { label: '8,0', value: '8',    hint: 'Crise' },
];

function renderPresets() {
  const cur = parseNum($('ipca').value);
  $('presets').innerHTML = PRESETS.map((p) => {
    const active = Math.abs(cur - parseNum(p.value)) < 0.001;
    return `<button class="preset${active ? ' active' : ''}" data-v="${p.value}">
      <div class="pv">${p.label}%</div><div class="ph">${p.hint}</div></button>`;
  }).join('');
  document.querySelectorAll('.preset').forEach((b) => {
    b.addEventListener('click', () => { $('ipca').value = b.dataset.v; recalc(); });
  });
}

function setInd(prefix, ok, valHtml, metaText) {
  $('dot' + prefix).className = 'dot ' + (ok ? 'ok' : 'err');
  $('val' + prefix).classList.remove('skel');
  $('val' + prefix).innerHTML = valHtml;
  $('meta' + prefix).textContent = metaText;
}

function recalc() {
  const Tc = yearsToConv();
  $('anosConv').textContent = '~' + Tc.toFixed(1).replace('.', ',');

  const PV = Math.max(0, parseNum($('valor').value));
  const a  = Math.max(0, parseNum($('anos').value));
  const i  = parseNum($('ipca').value) / 100;
  const rc = parseNum($('contratada').value) / 100;
  const rm = parseNum($('venda').value) / 100;

  const curva   = curveValue(PV, a, rc, i);
  const mercado = marketValue(PV, a, rc, rm, i, Tc);

  const irMerc  = Math.max(0, mercado - PV) * 0.15;
  const liqMerc = mercado - irMerc;
  const irCurva  = Math.max(0, curva - PV) * 0.15;
  const liqCurva = curva - irCurva;

  const realLiq   = liqMerc / Math.pow(1 + i, a);
  const realGanho = realLiq - PV;
  const efeito    = liqMerc - liqCurva;

  const isMaturity = a >= Tc;
  const hasMarc    = Math.abs(rm - rc) > 0.0001 && !isMaturity;
  const taxaComp   = ((1 + rc) * (1 + i) - 1) * 100;

  // Hero
  $('heroCap').textContent = isMaturity
    ? `Valor na conversão (${a || 0} anos)`
    : `Valor de venda em ${a || 0} ${a === 1 ? 'ano' : 'anos'} (líq.)`;
  $('heroBig').textContent    = fmtBRL(liqMerc);
  $('heroBruto').textContent  = fmtBRL(mercado);
  $('heroIr').textContent     = '−' + fmtBRL(irMerc);

  // Marcação a mercado
  const marcColor = efeito < -1 ? 'var(--red)' : efeito > 1 ? 'var(--green)' : 'var(--muted)';
  const marcHex   = efeito < -1 ? '#C25A4A'    : efeito > 1 ? '#9CB377'      : '#8A8779';

  $('marcacaoCard').style.display = isMaturity ? 'none' : 'block';
  $('curvaVal').textContent = fmtBRL(liqCurva);
  $('deltaLbl').textContent =
    'Δ taxa: ' + fmtPct(parseNum($('venda').value) - parseNum($('contratada').value)) + ' a.a.';
  $('efeitoVal').textContent = (efeito >= 0 ? '+' : '') + fmtBRL(efeito);
  $('efeitoVal').style.color = marcColor;
  $('marcacaoNote').textContent = !hasMarc ? '' : (efeito < 0
    ? 'Vender com taxa de mercado acima da contratada reduz o preço unitário. Quanto mais perto de 2065, menor o efeito.'
    : 'Vender com taxa de mercado abaixo da contratada eleva o preço unitário (ágio favorável).');

  // Poder de compra real
  $('realVal').textContent    = fmtBRL(realLiq);
  $('realGanho').textContent  = (realGanho >= 0 ? '+' : '') + fmtBRL(realGanho);
  $('realGanho').style.color  = realGanho >= 0 ? '#9CB377' : '#C25A4A';
  $('taxaComp').textContent   = fmtPct(taxaComp) + ' a.a.';

  // Gráfico
  updateChart(PV, a, rc, rm, i, Tc, marcHex);
  $('legendMarc').style.background  = marcHex;
  $('legendMarcLbl').textContent    = hasMarc ? 'Com marcação' : 'Marcação = curva';

  renderPresets();
}
