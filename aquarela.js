// O estilo aquarela: lavagens suaves em camadas, bordas onde o pigmento junta,
// papel com granulacao. Mesma forma de saida do retro.js (um quadro e um mapa de
// atraso por camada, tudo em funcao do x do mundo, sem emenda) e o mesmo codigo
// de cores: R, G e B do quadro dizem quanto ali e da cor 1, 2 e 3 do tema; o
// que nao tem pigmento e transparente (papel). Com opcoes.paleta (hex) as cores
// saem misturadas, para a previa.
//
// Aqui o atraso de cada mancha e sorteado, nao vem do x: com uma frente larga
// (espalha ~ uma tela) cada coisa aparece numa coluna da tela, enquanto rola.
"use strict";

const VIEW_H = 700;
const HORIZONTE = 440;

function desenhar(seed, cursor, W, H, opcoes) {
  const s = Number(BigInt(seed) % 2147483647n);
  const viewW = (VIEW_H * W) / H;
  const m = opcoes.margem || 0;
  const x0 = cursor - 300;
  const x1 = cursor + viewW + 300;
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

  const PAPEL = [0, 0, 0], COR1 = [1, 0, 0], COR2 = [0, 1, 0], COR3 = [0, 0, 1];
  function cor(w, alfa) {
    const a = alfa === undefined ? 1 : alfa;
    if (!pal) return `rgba(${Math.round(w[0] * 255)},${Math.round(w[1] * 255)},${Math.round(w[2] * 255)},${r2(a)})`;
    const c = [0, 1, 2].map((i) => {
      const base = pal.papel[i];
      return Math.round(base + w[0] * (pal.cor1[i] - base) + w[1] * (pal.cor2[i] - base) + w[2] * (pal.cor3[i] - base));
    });
    return `rgba(${c},${r2(a)})`;
  }

  const camadas = [[], [], []];
  function pôr(c, atraso, forma) { camadas[c].push({ atraso, forma }); }
  const cru = (d) => { const v = Math.round(Math.min(0.999, Math.max(0, d)) * 65534) + 1; return `rgb(${v >> 8},${v & 255},0)`; };

  // Mancha: o desenho (com filtro de borda irregular) e, no mapa, a forma crua
  // engordada pelo deslocamento do filtro.
  // O filtro e aplicado uma vez por camada (ver `dos`), nao por mancha.
  // `soMapa`: o pedaco so existe no mapa (a serra e uma peca so no quadro).
  function mancha(c, atraso, svgForma, svgMapa, soMapa) {
    pôr(c, atraso, (e) => e.q ? (soMapa ? "" : svgForma) : (svgMapa === "" ? "" : `<g fill="${e.o}" stroke="${e.o}" stroke-width="26" stroke-linejoin="round">${svgMapa || svgForma.replace(/fill="[^"]*"/g, "").replace(/stroke="[^"]*"/g, "")}</g>`));
  }

  // Serra: cume em funcao do x, fechado em `base`; lavagem + borda mais escura.
  function serra(c, atraso0, sal, escala, amp, base, w1, a1, w2, a2) {
    const pts = [];
    for (let x = Math.floor(x0 / 10) * 10; x <= x1; x += 10) {
      const n = ruido(x / (300 * escala), sal) * 0.65 + ruido(x / (95 * escala), sal + 1) * 0.28 + ruido(x / (31 * escala), sal + 2) * 0.07;
      pts.push([x, r2(base - amp * (0.2 + 0.8 * n))]);
    }
    const linha = pts.map((p) => p.join(",")).join(" ");
    const poli = `${pts[0][0]},${base + 40} ${linha} ${pts[pts.length - 1][0]},${base + 40}`;
    // No quadro a serra e uma peca so (sem emendas de lavagem); no mapa ela
    // se parte em trechos de 700, cada um com o proprio atraso sorteado.
    mancha(c, 0,
      `<polygon points="${poli}" fill="${cor(w1, a1)}"/>` +
      (w2 ? `<polygon points="${poli}" fill="${cor(w2, a2)}" transform="translate(0 -14)"/>` : "") +
      `<polyline points="${linha}" fill="none" stroke="${cor(w1, Math.min(1, a1 * 1.5))}" stroke-width="3" stroke-linejoin="round"/>`,
      "", false);
    // Fatias estreitas com atraso que varia devagar com o x: a serra cresce
    // aos poucos, como lavagem, em vez de aparecer em pedacos soltos.
    for (let a = Math.floor(x0 / 120); a * 120 < x1; a++) {
      const seg = pts.filter((p) => p[0] >= a * 120 && p[0] <= a * 120 + 120);
      if (seg.length < 2) continue;
      const lin = seg.map((p) => p.join(",")).join(" ");
      mancha(c, ruido(a * 120 / 600, sal + 40), "", `<polygon points="${seg[0][0]},${base + 40} ${lin} ${seg[seg.length - 1][0]},${base + 40}"/>`, true);
    }
    return pts;
  }

  // ---- camada 0: lavagem do ceu, sol, serra distante
  for (let i = Math.floor((x0 - 500) / 1100); i <= (x1 + 500) / 1100; i++) {
    const cx = i * 1100 + h(i, 1, 1) * 500, cy = 120 + h(i, 2, 1) * 200;
    const rx = 260 + h(i, 3, 1) * 220, ry = 70 + h(i, 4, 1) * 70;
    mancha(0, h(i, 5, 1), `<ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(rx)}" ry="${r2(ry)}" fill="${cor(h(i, 6, 1) > 0.5 ? COR1 : COR2, 0.16 + h(i, 7, 1) * 0.1)}"/>`);
  }
  for (let i = Math.floor((x0 - 150) / 1500); i <= (x1 + 150) / 1500; i++) {
    const cx = i * 1500 + 750 + (h(i, 8, 2) - 0.5) * 200, cy = 250;
    mancha(0, h(i, 9, 2), `<circle cx="${r2(cx)}" cy="${cy}" r="82" fill="${cor(COR2, 0.5)}"/>` + `<circle cx="${r2(cx)}" cy="${cy}" r="82" fill="none" stroke="${cor(COR2, 0.45)}" stroke-width="4"/>`);
  }
  serra(0, 0, 5, 1.7, 110, HORIZONTE - 20, COR1, 0.2, null, 0);

  // ---- camada 1: serras do meio, neblina e pinheiros
  const meio = serra(1, 0, 17, 1.15, 190, HORIZONTE + 30, COR1, 0.42, COR2, 0.1);
  for (let i = Math.floor((x0 - 100) / 900); i <= (x1 + 100) / 900; i++) {
    const cx = i * 900 + h(i, 11, 3) * 700;
    mancha(1, h(i, 12, 3), `<ellipse cx="${r2(cx)}" cy="${HORIZONTE + 20}" rx="${r2(260 + h(i, 13, 3) * 200)}" ry="26" fill="${cor(COR3, 0.2)}"/>`);
  }
  for (let i = Math.floor(x0 / 70); i * 70 < x1; i++) {
    if (h(i, 14, 4) > 0.38) continue;
    const x = i * 70 + h(i, 15, 4) * 60;
    const k = Math.min(meio.length - 1, Math.max(0, Math.round((x - Math.floor(x0 / 10) * 10) / 10)));
    const y = meio[k][1] + 6, al = 0.4 + h(i, 16, 4) * 0.3, t = 22 + h(i, 17, 4) * 24;
    mancha(1, h(i, 18, 4), `<polygon points="${r2(x)},${r2(y - t)} ${r2(x - t * 0.32)},${r2(y)} ${r2(x + t * 0.32)},${r2(y)}" fill="${cor(COR3, al)}"/>`);
  }

  // ---- camada 2: primeiro plano, pradaria escura e arvores
  serra(2, 0, 31, 0.8, 120, HORIZONTE + 150, COR3, 0.36, COR1, 0.14);
  for (let i = Math.floor((x0 - 100) / 600); i <= (x1 + 100) / 600; i++) {
    if (h(i, 21, 5) > 0.6) continue;
    const bx = i * 600 + h(i, 22, 5) * 450, by = 560 + h(i, 23, 5) * 110;
    const alt = 150 + h(i, 24, 5) * 120, r = 55 + h(i, 25, 5) * 40;
    mancha(2, h(i, 26, 5),
      `<path d="M${r2(bx)} ${r2(by)} Q${r2(bx + 8)} ${r2(by - alt * 0.5)} ${r2(bx + 2)} ${r2(by - alt)}" fill="none" stroke="${cor(COR3, 0.8)}" stroke-width="7" stroke-linecap="round"/>` +
      `<ellipse cx="${r2(bx + 4)}" cy="${r2(by - alt - r * 0.4)}" rx="${r2(r * 1.2)}" ry="${r2(r)}" fill="${cor(COR1, 0.4)}"/>` +
      `<ellipse cx="${r2(bx - r * 0.3)}" cy="${r2(by - alt - r * 0.2)}" rx="${r2(r * 0.8)}" ry="${r2(r * 0.7)}" fill="${cor(COR2, 0.28)}"/>`,
      `<rect x="${r2(bx - r * 1.4)}" y="${r2(by - alt - r * 1.4)}" width="${r2(r * 2.8)}" height="${r2(alt + r * 1.4)}"/>`);
  }

  const defs =
    `<defs>` +
    `<filter id="agua" filterUnits="userSpaceOnUse" x="${cursor - m - 200}" y="-100" width="${viewW + 2 * m + 400}" height="${VIEW_H + 200}">` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="4" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="24" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feGaussianBlur in="d" stdDeviation="1.6" result="b"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="9" result="g"/>` +
    `<feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.25" result="ga"/>` +
    `<feComposite in="b" in2="ga" operator="in"/>` +
    `</filter></defs>`;

  function envolver(corpo, fundo, extra) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round((W * (viewW + 2 * m)) / viewW)}" height="${H}" ${extra || ""} ` +
      `viewBox="${cursor - m} 0 ${viewW + 2 * m} ${VIEW_H}" preserveAspectRatio="xMidYMid slice">${defs}` +
      (fundo ? `<rect x="${cursor - m - 10}" y="-10" width="${viewW + 2 * m + 20}" height="${VIEW_H + 20}" fill="${fundo}"/>` : "") +
      `<g>${corpo}</g></svg>`;
  }
  const dos = (c) => (c === undefined ? [0, 1, 2] : [c]).flatMap((k) => camadas[k]);
  // Um filtro por camada; no quadro cada camada e um grupo.
  const quadroDe = (c) => (c === undefined ? [0, 1, 2] : [c])
    .map((k) => `<g filter="url(#agua)">${camadas[k].map((el) => el.forma({ q: true })).join("")}</g>`).join("");
  return {
    quadro: (c) => envolver(quadroDe(c), c === undefined ? (pal ? cor(PAPEL) : "rgb(0,0,0)") : "", ""),
    ordem: (c) => envolver(dos(c).map((el) => el.forma({ o: cru(el.atraso) })).join(""), "rgb(0,0,0)", 'shape-rendering="crispEdges"'),
  };
}

module.exports = { desenhar };
