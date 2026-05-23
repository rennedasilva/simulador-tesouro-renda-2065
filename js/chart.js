let chart;

function initChart() {
  const ctx = $('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Na curva',
          data: [],
          borderColor: '#C9A658',
          backgroundColor: 'rgba(201,166,88,0.12)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: 'Marcação',
          data: [],
          borderColor: '#8A8779',
          backgroundColor: 'rgba(138,135,121,0.10)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1B2024',
          borderColor: '#2A2F2A',
          borderWidth: 1,
          titleColor: '#8A8779',
          bodyColor: '#E7E2D2',
          padding: 10,
          cornerRadius: 8,
          titleFont: { family: 'Geist Mono', size: 11 },
          bodyFont: { family: 'Geist Mono', size: 11 },
          callbacks: {
            title: (items) => 'Ano ' + items[0].label,
            label: (item) =>
              (item.datasetIndex === 0 ? 'Na curva: ' : 'Marcação: ') + fmtBRL(item.parsed.y),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#5A5750', font: { family: 'Geist Mono', size: 10 } },
        },
        y: {
          grid: { color: '#232729' },
          border: { display: false },
          ticks: {
            color: '#5A5750',
            font: { family: 'Geist Mono', size: 10 },
            callback: (v) =>
              v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'k' : v,
          },
        },
      },
    },
  });
}

function updateChart(PV, anos, rc, rm, i, Tc, marcHex) {
  const steps = Math.max(Math.ceil(anos), 1);
  const labels = [], dc = [], dm = [];

  for (let y = 0; y <= steps; y++) {
    const c = curveValue(PV, y, rc, i);
    const m = marketValue(PV, y, rc, rm, i, Tc);
    labels.push(y);
    dc.push(Math.round(c - Math.max(0, c - PV) * 0.15));
    dm.push(Math.round(m - Math.max(0, m - PV) * 0.15));
  }

  chart.data.labels = labels;
  chart.data.datasets[0].data = dc;
  chart.data.datasets[1].data = dm;
  chart.data.datasets[1].borderColor = marcHex;
  chart.data.datasets[1].backgroundColor =
    marcHex === '#C25A4A' ? 'rgba(194,90,74,0.10)' :
    marcHex === '#9CB377' ? 'rgba(156,179,119,0.10)' :
    'rgba(138,135,121,0.10)';

  chart.update('none');
}
