import { storagePut } from "../storage";

interface CertificateData {
  nomeColaborador: string;
  tituloAcao: string;
  competencia?: string;
  dataConclusao: string; // formato dd/mm/yyyy
  pdiTitulo?: string;
}

function wrapTextSVG(text: string, maxCharsPerLine: number, maxLines = 3): string[] {
  const words = (text || "").split(" ").filter(Boolean);
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

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgText(text: string, y: number, size: number, color: string, weight = "700") {
  return `<text x="540" y="${y}" text-anchor="middle" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Arial, Helvetica, sans-serif">${escapeXml(text)}</text>`;
}

function svgLines(lines: string[], startY: number, size: number, lineHeight: number, color: string, weight = "700") {
  return lines.map((line, idx) => svgText(line, startY + idx * lineHeight, size, color, weight)).join("\n");
}

/**
 * Gera um card de conquista como SVG.
 *
 * Motivo: no Railway, a conversão SVG > PNG via renderizador do servidor está
 * preservando fundo/formas, mas não está renderizando texto. Por isso, nesta versão
 * de teste, o servidor entrega o SVG diretamente para o navegador renderizar os textos.
 */
export async function generateCertificate(data: CertificateData): Promise<{ url: string; key: string }> {
  const WIDTH = 1080;
  const HEIGHT = 1080;

  const nomeDisplay = data.nomeColaborador?.length > 34
    ? data.nomeColaborador.substring(0, 32) + "..."
    : data.nomeColaborador || "Colaborador";

  const tituloLines = wrapTextSVG(data.tituloAcao || "Ação concluída", 38, 3);
  const pdiLines = data.pdiTitulo ? wrapTextSVG(data.pdiTitulo, 48, 2) : [];
  const competenciaDisplay = data.competencia
    ? (data.competencia.length > 58 ? data.competencia.substring(0, 56) + "..." : data.competencia)
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="45%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#1e3a5f"/>
    </linearGradient>
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
    <radialGradient id="glow1" cx="82%" cy="12%" r="30%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="16%" cy="82%" r="28%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow1)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow2)"/>
  <rect x="34" y="34" width="1012" height="1012" rx="28" ry="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="2"/>

  <rect x="330" y="82" width="420" height="62" rx="31" ry="31" fill="url(#badgeGrad)"/>
  ${svgText("DESAFIO CONCLUÍDO", 122, 28, "#FFFFFF", "800")}

  <rect x="365" y="180" width="350" height="112" rx="18" ry="18" fill="#FFFFFF" fill-opacity="0.96"/>
  ${svgText("eco do bem", 225, 34, "#312e81", "800")}
  ${svgText("Programa Evoluir", 260, 20, "#f97316", "700")}

  <line x1="310" y1="330" x2="770" y2="330" stroke="#f97316" stroke-opacity="0.75" stroke-width="3"/>

  ${svgText("Mais um passo na jornada de", 378, 25, "#cbd5e1", "500")}
  ${svgText(nomeDisplay, 445, 46, "#FFFFFF", "800")}
  ${pdiLines.length ? svgLines(pdiLines, 492, 22, 30, "#cbd5e1", "600") : ""}

  <rect x="86" y="555" width="908" height="245" rx="26" ry="26" fill="#FFFFFF" fill-opacity="0.10" stroke="#FFFFFF" stroke-opacity="0.20" stroke-width="2"/>
  ${svgText("AÇÃO SUPERADA", 605, 20, "#34d399", "800")}
  ${svgLines(tituloLines, 662, 34, 44, "#FFFFFF", "800")}
  ${competenciaDisplay ? svgText(`Competência: ${competenciaDisplay}`, 760, 22, "#cbd5e1", "500") : ""}

  ${svgText(`Concluída em ${data.dataConclusao}`, 846, 22, "#94a3b8", "500")}
  ${svgText("Cada desafio superado impulsiona", 905, 27, "#FFFFFF", "600")}
  ${svgText("a sua carreira. Continue evoluindo!", 942, 27, "#FFFFFF", "600")}
  ${svgText("#DesenvolvimentoProfissional  #PDI  #EcoDoBem  #EVOLUIR", 1000, 18, "#fb923c", "700")}
</svg>`;

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileKey = `certificados/conquista-${timestamp}-${randomSuffix}.svg`;

  const { url, key } = await storagePut(fileKey, Buffer.from(svg, "utf-8"), "image/svg+xml");
  return { url, key };
}
