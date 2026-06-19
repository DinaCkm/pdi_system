import { Resvg } from "@resvg/resvg-js";
import { storagePut } from "../storage";

interface CertificateData {
  nomeColaborador: string;
  tituloAcao: string;
  competencia?: string;
  dataConclusao: string; // formato dd/mm/yyyy
  pdiTitulo?: string;
}

/**
 * Quebra texto em múltiplas linhas baseado em caracteres por linha estimados.
 */
function wrapTextSVG(text: string, maxCharsPerLine: number, maxLines = 3): string[] {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines) break;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);
  return lines;
}

/**
 * Escapa caracteres especiais para SVG.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTextLines(lines: string[], startY: number, fontSize: number, lineHeight: number, extraClass = ""): string {
  return lines.map((line, index) => (
    `<text x="540" y="${startY + index * lineHeight}" text-anchor="middle" class="txt ${extraClass}" font-size="${fontSize}" font-weight="700">${escapeXml(line)}</text>`
  )).join("\n");
}

/**
 * Gera um card de conquista motivacional como imagem PNG.
 *
 * Observação técnica: o card anterior dependia de imagem remota e de emojis/fontes que
 * podem não renderizar corretamente no ambiente do Railway. Esta versão usa texto e
 * formas SVG simples, com fonte padrão de sistema, para evitar cards vazios.
 */
export async function generateCertificate(data: CertificateData): Promise<{ url: string; key: string }> {
  const WIDTH = 1080;
  const HEIGHT = 1080;

  const nomeDisplay = data.nomeColaborador.length > 34
    ? data.nomeColaborador.substring(0, 32) + "..."
    : data.nomeColaborador;

  const tituloLines = wrapTextSVG(data.tituloAcao, 36, 3);
  const pdiLines = data.pdiTitulo ? wrapTextSVG(data.pdiTitulo, 44, 2) : [];
  const competenciaDisplay = data.competencia
    ? (data.competencia.length > 56 ? data.competencia.substring(0, 54) + "..." : data.competencia)
    : "";

  const tituloSVG = buildTextLines(tituloLines, 520, 32, 42, "white");
  const pdiSVG = pdiLines.length > 0
    ? buildTextLines(pdiLines, 406, 20, 28, "muted")
    : "";

  const competenciaSVG = competenciaDisplay
    ? `<text x="540" y="675" text-anchor="middle" class="txt muted" font-size="22">Competência: ${escapeXml(competenciaDisplay)}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="32%" stop-color="#1e1b4b"/>
      <stop offset="66%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#1e3a5f"/>
    </linearGradient>
    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <radialGradient id="glowTop" cx="82%" cy="12%" r="30%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBottom" cx="16%" cy="82%" r="26%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
    <style>
      .txt { font-family: DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif; }
      .white { fill: #ffffff; }
      .muted { fill: #cbd5e1; }
      .soft { fill: #94a3b8; }
      .orange { fill: #fb923c; }
      .green { fill: #34d399; }
    </style>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowTop)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowBottom)"/>

  <rect x="34" y="34" width="${WIDTH - 68}" height="${HEIGHT - 68}" rx="28" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>

  <rect x="340" y="82" width="400" height="58" rx="29" fill="url(#orangeGrad)"/>
  <text x="540" y="119" text-anchor="middle" class="txt white" font-size="24" font-weight="800">DESAFIO CONCLUÍDO</text>

  <rect x="390" y="172" width="300" height="102" rx="18" fill="#ffffff" fill-opacity="0.96"/>
  <text x="540" y="214" text-anchor="middle" class="txt" fill="#312e81" font-size="26" font-weight="800">eco do bem</text>
  <text x="540" y="244" text-anchor="middle" class="txt" fill="#f97316" font-size="17" font-weight="700">desenvolvimento humano</text>

  <line x1="350" y1="314" x2="730" y2="314" stroke="url(#orangeGrad)" stroke-width="3" stroke-opacity="0.65"/>

  <text x="540" y="362" text-anchor="middle" class="txt muted" font-size="23">Mais um passo na jornada de</text>
  <text x="540" y="452" text-anchor="middle" class="txt white" font-size="44" font-weight="800">${escapeXml(nomeDisplay)}</text>
  ${pdiSVG}

  <rect x="92" y="480" width="896" height="260" rx="24" fill="#ffffff" fill-opacity="0.09" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
  <text x="540" y="478" text-anchor="middle" class="txt green" font-size="18" font-weight="800">AÇÃO SUPERADA</text>
  ${tituloSVG}
  ${competenciaSVG}
  <text x="540" y="710" text-anchor="middle" class="txt soft" font-size="19">Concluída em ${escapeXml(data.dataConclusao)}</text>

  <text x="540" y="805" text-anchor="middle" class="txt white" font-size="25" font-style="italic">Cada desafio superado é combustível</text>
  <text x="540" y="840" text-anchor="middle" class="txt white" font-size="25" font-style="italic">para a sua carreira. Continue evoluindo!</text>

  <line x1="150" y1="884" x2="930" y2="884" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>

  <text x="540" y="930" text-anchor="middle" class="txt orange" font-size="25" font-weight="800">PROGRAMA EVOLUIR</text>
  <text x="540" y="962" text-anchor="middle" class="txt muted" font-size="18">Ecossistema de Desenvolvimento do B.E.M</text>
  <text x="540" y="1002" text-anchor="middle" class="txt soft" font-size="16">#DesenvolvimentoProfissional  #PDI  #EcoDoBem  #EVOLUIR</text>
</svg>`;

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: WIDTH,
    },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "DejaVu Sans",
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileKey = `certificados/conquista-${timestamp}-${randomSuffix}.png`;

  const { url, key } = await storagePut(fileKey, Buffer.from(pngBuffer), "image/png");
  return { url, key };
}
