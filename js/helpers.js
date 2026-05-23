const $ = (id) => document.getElementById(id);

const fmtBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    .format(isFinite(v) ? v : 0);

const fmtPct = (v) =>
  (isFinite(v) ? v : 0).toFixed(2).replace('.', ',') + '%';

const parseNum = (s) => {
  const n = parseFloat(String(s ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

const sanitize = (s) => {
  let v = String(s).replace(/[^0-9.,]/g, '');
  const i = v.search(/[.,]/);
  if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/[.,]/g, '');
  return v;
};
