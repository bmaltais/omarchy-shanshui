// O estilo retro: sol listrado, montanhas de arame e piso de grade, anos 80.
//
// Mesma forma de saida do desenho do Shan Shui (um quadro e um mapa de atraso
// por camada), mas tudo aqui e funcao do x do mundo, sem estado: uma faixa
// nao precisa das vizinhas e duas faixas lado a lado casam sem emenda.
//
// Movimento: o mapa de atraso tem o canal B livre; aqui ele diz como o pixel
// se mexe (1..120: balanco da palmeira, cresce com a altura). A palmeira tem
// uma zona de peso em volta da copa, acima do horizonte, onde so ela existe
// na camada 2. So o shader usa, com o tempo como uniforme: nada e redesenhado.
//
// Cores: o quadro nao leva cor, leva PAPEIS. Em cada pixel, R, G e B dizem
// quanto ali e da cor 1 (acento), da cor 2 (urgente) e da cor 3 (foreground)
// do tema, e o shader mistura. Preto opaco e o papel (o fundo). Com
// opcoes.paleta (hex), as cores saem ja misturadas, para a previa.
"use strict";

const VIEW_H = 700;
const HORIZONTE = 455;

// Camadas de profundidade: 0 longe (ceu, sol), 1 meio (montanhas), 2 perto
// (piso e palmeiras). Sem camada, tudo junto, sobre papel.
function desenhar(seed, cursor, W, H, opcoes) {
  const s = Number(BigInt(seed) % 2147483647n);
  const viewW = (VIEW_H * W) / H;
  // Margem (unidades do mundo) que a faixa leva de cada lado: o balanco le o
  // quadro um pouco alem da borda, e sem pixel ali o traco rasgaria na emenda.
  const m = opcoes.margem || 0;
  const x0 = cursor - 400;
  const x1 = cursor + viewW + 400;
  const pal = opcoes.paleta || null;

  function h(a, b, c) {
    let x = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177) + s) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  function ruido(x, sal) {
    const i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f);
    return h(i, sal, 7) * (1 - t) + h(i + 1, sal, 7) * t;
  }
  const r2 = (v) => Math.round(v * 100) / 100;

  // Papeis (r, g, b) -> cor do SVG.
  const PAPEL = [0, 0, 0];
  const ACENTO = [1, 0, 0], URGENTE = [0, 1, 0], TEXTO = [0, 0, 1];
  function cor(w, alfa) {
    const a = alfa === undefined ? 1 : alfa;
    if (!pal) return `rgba(${Math.round(w[0] * 255)},${Math.round(w[1] * 255)},${Math.round(w[2] * 255)},${a})`;
    const c = [0, 1, 2].map((i) => {
      const base = pal.papel[i];
      return Math.round(base + w[0] * (pal.acento[i] - base) + w[1] * (pal.urgente[i] - base) + w[2] * (pal.texto[i] - base));
    });
    return `rgba(${c},${a})`;
  }

  // Um elemento: o desenho (quadro) e o atraso dele (ordem), em [0, 1). No mapa
// os tracos saem 3 unidades mais grossos: ele e rasterizado em meia resolucao,
// sem antialias, e um traco de 1-2 px viraria pontos e tracinhos (que, com o
// balanco, tremem).
  // forma(estilo) devolve o SVG com o estilo pedido.
  const camadas = [[], [], []];
  function pôr(c, atraso, forma) { camadas[c].push({ atraso, forma }); }

  const cruB = (d, b) => { const v = Math.round(Math.min(0.999, Math.max(0, d)) * 65534) + 1; return `rgb(${v >> 8},${v & 255},${b})`; };
  const cru = (d) => cruB(d, 0);

  // ---- camada 0: estrelas e sol
  for (let i = Math.floor(x0 / 110); i < x1 / 110; i++) {
    if (h(i, 1, 1) > 0.4) continue;
    const x = i * 110 + h(i, 2, 1) * 110, y = h(i, 3, 1) * 330, rr = 0.8 + h(i, 4, 1) * 1.1;
    const al = 0.4 + h(i, 5, 1) * 0.6;
    pôr(0, 0.02 + h(i, 6, 1) * 0.15, (e) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(e.q ? rr : rr + 1.5)}" ${e.q ? `fill="${cor(TEXTO, al)}"` : `fill="${e.o}"`}/>`);
  }
  const CEL = 2600, SR = 135, SY = 245;
  for (let i = Math.floor((x0 - SR) / CEL); i <= (x1 + SR) / CEL; i++) {
    const cx = i * CEL + 500 + h(i, 8, 2) * 1500;
    const id = "s" + (i < 0 ? "n" + -i : i);
    // Faixas: a metade de cima cheia, a de baixo em fatias cada vez mais finas.
    let faixas = `<rect x="${cx - SR}" y="${SY - SR}" width="${2 * SR}" height="${SR}"/>`;
    for (let j = 0; j < 7; j++) {
      const passo = SR / 7, y = SY + j * passo + passo * (j / 8);
      faixas += `<rect x="${cx - SR}" y="${r2(y)}" width="${2 * SR}" height="${r2(passo * (1 - j / 8) - 1)}"/>`;
    }
    pôr(0, 0.1, (e) =>
      `<defs><clipPath id="${id}"><circle cx="${cx}" cy="${SY}" r="${SR}"/></clipPath>` +
      (e.q ? `<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="${SY - SR}" x2="0" y2="${SY + SR}">` +
        `<stop offset="0" stop-color="${cor(URGENTE)}"/><stop offset="1" stop-color="${cor(ACENTO)}"/></linearGradient>` : "") +
      `</defs><g clip-path="url(#${id})" fill="${e.q ? `url(#${id}g)` : e.o}">${faixas}</g>`);
  }

  // ---- montanhas: cume em funcao do x, fechadas no horizonte
  function serra(c, atraso, sal, escala, amp, fio, sombra) {
    const pts = [];
    for (let x = Math.floor(x0 / 6) * 6; x <= x1; x += 6) {
      const n = ruido(x / (260 * escala), sal) * 0.62 + ruido(x / (85 * escala), sal + 1) * 0.28 + ruido(x / (28 * escala), sal + 2) * 0.1;
      const pico = 1 - Math.abs(2 * n - 1);
      pts.push([x, r2(HORIZONTE - amp * (0.15 + 0.85 * pico * pico))]);
    }
    const linha = pts.map((p) => p.join(",")).join(" ");
    const poli = `${pts[0][0]},${HORIZONTE} ${linha} ${pts[pts.length - 1][0]},${HORIZONTE}`;
    pôr(c, atraso, (e) => e.q
      ? `<polygon points="${poli}" fill="${cor(PAPEL)}"/>` + (sombra ? sombra(pts, e) : "") +
        `<polyline points="${linha}" fill="none" stroke="${cor(ACENTO, fio)}" stroke-width="2.2" stroke-linejoin="round"/>`
      : `<polygon points="${poli}" fill="${e.o}" stroke="${e.o}" stroke-width="5.2"/>`);
  }
  // Fundo, mais baixa e fraca (camada 0), e a serra do meio.
  serra(0, 0.3, 11, 1.6, 95, 0.45, null);
  // Linhas de varredura por dentro da serra do meio: o arame.
  serra(1, 0.4, 3, 1, 200, 1, (pts, e) => {
    let l = "";
    for (let k = 1; k <= 6; k++) {
      const y = HORIZONTE - k * 26;
      // trechos da linha de varredura que ficam por dentro da montanha
      let ini = null;
      for (let i = 0; i < pts.length; i++) {
        const dentro = pts[i][1] <= y;
        if (dentro && ini === null) ini = pts[i][0];
        if ((!dentro || i === pts.length - 1) && ini !== null) {
          l += `<line x1="${ini}" y1="${y}" x2="${pts[i][0]}" y2="${y}" stroke="${cor(ACENTO, 0.55 - k * 0.06)}" stroke-width="1.2"/>`;
          ini = null;
        }
      }
    }
    return l;
  });

  // ---- camada 2: piso em grade e palmeiras
  pôr(2, 0.55, (e) => e.q
    ? `<rect x="${x0}" y="${HORIZONTE}" width="${x1 - x0}" height="${VIEW_H - HORIZONTE + 10}" fill="${cor(PAPEL)}"/>`
    : `<rect x="${x0}" y="${HORIZONTE}" width="${x1 - x0}" height="${VIEW_H - HORIZONTE + 10}" fill="${e.o}"/>`);
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = r2(HORIZONTE + (VIEW_H - HORIZONTE + 6) * t * t);
    pôr(2, 0.6 + 0.2 * t, (e) => `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" ${e.q ? `stroke="${cor(ACENTO, 0.9)}"` : `stroke="${e.o}"`} stroke-width="${r2(1 + 2.2 * t + (e.q ? 0 : 3))}"/>`);
  }
  const LARG = 100, INCL = 0.45, ALTO = VIEW_H - HORIZONTE + 6;
  for (let j = Math.floor((x0 - ALTO * INCL) / LARG); j <= x1 / LARG; j++) {
    const xa = j * LARG;
    pôr(2, 0.65 + h(j, 9, 3) * 0.2, (e) => `<line x1="${xa}" y1="${HORIZONTE}" x2="${r2(xa + ALTO * INCL)}" y2="${HORIZONTE + ALTO}" ${e.q ? `stroke="${cor(ACENTO, 0.7)}"` : `stroke="${e.o}"`} stroke-width="${e.q ? 1.6 : 4.6}"/>`);
  }
  for (let i = Math.floor((x0 - 120) / 520); i <= (x1 + 120) / 520; i++) {
    if (h(i, 12, 4) > 0.55) continue;
    const bx = i * 520 + h(i, 13, 4) * 400, by = HORIZONTE + 30 + h(i, 14, 4) * 150;
    // A copa fica sempre acima do horizonte (a zona de peso nao toca o piso).
    const alt = Math.max(120 + h(i, 15, 4) * 90, by - HORIZONTE + 100), inc = (h(i, 16, 4) - 0.5) * 70;
    const tx = bx + inc, ty = by - alt;
    let folhas = "";
    for (let f = 0; f < 7; f++) {
      const a = 0.12 * Math.PI + (f / 6) * 0.76 * Math.PI, dx = Math.cos(a), up = Math.sin(a);
      folhas += `<path d="M${r2(tx)} ${r2(ty)} Q${r2(tx + dx * 70)} ${r2(ty - 12 - up * 38)} ${r2(tx + dx * 112)} ${r2(ty + 40 + (1 - up) * 55)}"/>`;
    }
    const gid = "p" + (i < 0 ? "n" + -i : i);
    pôr(2, 0.95, (e) =>
      (e.q ? "" : `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${HORIZONTE}" x2="0" y2="${r2(ty)}">` +
        `<stop offset="0" stop-color="rgb(0,0,0)"/><stop offset="1" stop-color="rgb(0,0,120)"/></linearGradient>` +
        // o traco leva o mesmo peso da zona, senao o pixel dele ficaria parado
        `<linearGradient id="${gid}s" gradientUnits="userSpaceOnUse" x1="0" y1="${HORIZONTE}" x2="0" y2="${r2(ty)}">` +
        `<stop offset="0" stop-color="${e.ob(0)}"/><stop offset="1" stop-color="${e.ob(120)}"/></linearGradient></defs>` +
        `<rect x="${r2(tx - 130)}" y="${r2(ty - 70)}" width="260" height="${r2(HORIZONTE - ty + 68)}" fill="url(#${gid})" style="mix-blend-mode:lighten"/>`) +
      `<g fill="none" stroke="${e.q ? cor(TEXTO) : `url(#${gid}s)`}" stroke-width="${e.q ? 5 : 8}" stroke-linecap="round">` +
      `<path d="M${r2(bx)} ${r2(by)} Q${r2(bx + inc * 0.2)} ${r2(by - alt * 0.5)} ${r2(tx)} ${r2(ty)}"/>` +
      `<g stroke-width="${e.q ? 3.2 : 6.2}">${folhas}</g></g>`);
  }

  function envolver(corpo, fundo, extra) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round((W * (viewW + 2 * m)) / viewW)}" height="${H}" ${extra || ""} ` +
      `viewBox="${cursor - m} 0 ${viewW + 2 * m} ${VIEW_H}" preserveAspectRatio="xMidYMid slice">` +
      (fundo ? `<rect x="${cursor - m - 10}" y="-10" width="${viewW + 2 * m + 20}" height="${VIEW_H + 20}" fill="${fundo}"/>` : "") +
      `<g>${corpo}</g></svg>`;
  }
  const dos = (c) => (c === undefined ? [0, 1, 2] : [c]).flatMap((k) => camadas[k]);
  return {
    quadro: (c) => envolver(dos(c).map((el) => el.forma({ q: true })).join(""),
      c === undefined ? cor(PAPEL) : "", ""),
    ordem: (c) => envolver(dos(c).map((el) => el.forma({ o: cru(el.atraso), ob: (b) => cruB(el.atraso, b) })).join(""), "rgb(0,0,0)",
      'shape-rendering="crispEdges"'),
  };
}

module.exports = { desenhar };
