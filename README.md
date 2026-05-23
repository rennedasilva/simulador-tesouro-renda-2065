# Simulador Tesouro Renda+ 2065

Aplicação web estática (sem backend) para simular cenários de IPCA sobre o título **Tesouro Renda+ Aposentadoria Extra 2065**, incluindo o efeito de **marcação a mercado** em caso de venda antes da conversão (15/12/2065). Os principais indicadores econômicos são buscados **ao vivo** ao abrir a página.

## O que a aplicação faz

- **Dashboard ao vivo** com IPCA (12 meses), Meta Selic, CDI anualizado, dólar e a taxa atual do Renda+ 2065.
- **Simulador** com entradas de: valor investido, tempo até a venda/resgate, IPCA simulado, taxa real contratada e taxa real de mercado na venda.
- **Marcação a mercado**: compara o valor "na curva" (segurando até a conversão) com o valor de venda antecipada precificado pela taxa de mercado.
- **Poder de compra** em reais de hoje (descontando a inflação simulada) e gráfico de trajetória.

## Fontes de dados ao vivo

| Indicador | Fonte | Acesso |
|---|---|---|
| IPCA 12m, Meta Selic, CDI a.a., Dólar | Banco Central — API SGS (`api.bcb.gov.br`) | direto do navegador (CORS liberado) |
| Taxa do Renda+ 2065 | Tesouro Direto (JSON oficial da B3) | via proxy CORS público |

A API oficial do Tesouro fica atrás de Cloudflare e **não libera CORS**, então a taxa do título é buscada por meio de proxies públicos (`allorigins`, `corsproxy.io`, `thingproxy`), com tentativa em cascata. Se todos falharem, a aplicação usa um valor de fallback e permite edição manual — o cálculo continua funcionando normalmente.

> Os indicadores do Banco Central são a base mais confiável, pois não dependem de proxy. A taxa do Tesouro é "melhor esforço".

## Como fazer o deploy no GitHub Pages

1. Crie um repositório no GitHub (ex.: `renda-mais-2065`).
2. Envie o arquivo `index.html` para a raiz do repositório:
   ```bash
   git init
   git add index.html README.md
   git commit -m "Simulador Renda+ 2065"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/renda-mais-2065.git
   git push -u origin main
   ```
3. No GitHub, vá em **Settings → Pages**.
4. Em **Build and deployment → Source**, selecione **Deploy from a branch**.
5. Escolha a branch **main** e a pasta **/ (root)**. Salve.
6. Aguarde ~1 minuto. A página ficará disponível em:
   `https://SEU_USUARIO.github.io/renda-mais-2065/`

Não há etapa de build — é HTML/CSS/JS puro com Chart.js via CDN. Basta o `index.html` no repositório.

## Rodando localmente

Como a página usa `fetch`, abra via servidor local (não com `file://`) para evitar bloqueios:

```bash
# Python
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## Premissas do cálculo

- O Renda+ paga 240 parcelas mensais a partir de 15/12/2065, aproximadas aqui como uma anuidade anual de 20 anos.
- A marcação a mercado precifica o fluxo futuro pela taxa de mercado informada na venda.
- IR de 15% sobre os rendimentos (alíquota mínima, após 720 dias); zero em caso de prejuízo.
- IPCA e taxas constantes durante o período simulado.
- Não inclui a taxa de custódia da B3 nem aportes mensais.

**Não constitui recomendação de investimento.**

## Personalização

- Para trocar o título-alvo, ajuste o filtro em `loadTesouro()` (busca por nome contendo "renda" e "2065") e a data `TARGET_DATE`.
- Os códigos de série do Banco Central estão em `loadBCB()` (13522 = IPCA 12m, 432 = Meta Selic, 4389 = CDI a.a., 1 = Dólar).
