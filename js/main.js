let loading = false;

async function refreshAll() {
  if (loading) return;
  loading = true;

  $('refreshIcon').classList.add('spin');
  $('refreshLabel').textContent = 'buscando…';
  // Tesouro não tem API ao vivo — deixa o dot 'man' intacto
  ['Ipca', 'Selic', 'Cdi', 'Dolar'].forEach((p) => { $('dot' + p).className = 'dot load'; });

  await Promise.allSettled([loadBCB(), fetchLiveRate()]);

  $('updatedAt').textContent = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  $('refreshIcon').classList.remove('spin');
  $('refreshLabel').textContent = 'atualizar';
  loading = false;
}

function bindInput(id, isRate) {
  const el = $(id);
  el.addEventListener('input', () => {
    el.value = sanitize(el.value);
    if (isRate) window._userTouchedRates = true;
    // Persiste a taxa contratada para o card do Tesouro
    if (id === 'contratada') saveTesouroRate(el.value);
    recalc();
  });
}

['valor', 'anos', 'ipca'].forEach((id) => bindInput(id, false));
['contratada', 'venda'].forEach((id) => bindInput(id, true));

$('resetVenda').addEventListener('click', () => {
  $('venda').value = $('contratada').value;
  recalc();
});
$('refreshBtn').addEventListener('click', refreshAll);

initTesouro();
initChart();
renderPresets();
recalc();
refreshAll();
