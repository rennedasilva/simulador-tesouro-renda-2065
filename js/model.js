const TARGET_DATE = new Date('2065-12-15T00:00:00');
const PAY_YEARS = 20; // 240 pagamentos mensais ≈ 20 anos de renda

function yearsToConv() {
  return Math.max(0, (TARGET_DATE - new Date()) / (1000 * 60 * 60 * 24 * 365.25));
}

// Fator de anuidade: valor presente de n pagamentos anuais a taxa r
function annuity(r, n) {
  return Math.abs(r) < 1e-9 ? n : (1 - Math.pow(1 + r, -n)) / r;
}

// Valor na curva: crescimento pela taxa real contratada + IPCA
function curveValue(PV, t, rc, i) {
  return PV * Math.pow((1 + rc) * (1 + i), t);
}

// Valor a mercado: reprecifica os fluxos futuros pela taxa de mercado na venda
// Se t >= Tc (após conversão), não há mais marcação — retorna curva
function marketValue(PV, t, rc, rm, i, Tc) {
  if (t >= Tc) return curveValue(PV, t, rc, i);
  const num = Math.pow(1 + rc, Tc) * annuity(rm, PAY_YEARS);
  const den = annuity(rc, PAY_YEARS) * Math.pow(1 + rm, Tc - t);
  return (PV * num / den) * Math.pow(1 + i, t);
}
