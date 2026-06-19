import { storagePut } from "../storage";

const LOGO_URL = "https://iili.io/B7NgXwB.png";

interface CertificateData {
  nomeColaborador: string;
  tituloAcao: string;
  competencia?: string;
  dataConclusao: string;
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

function escapeHtml(str: string): string {
  return escapeXml(str).replace(/`/g, "&#96;");
}

function svgText(text: string, y: number, size: number, color: string, weight = "700") {
  return `<text x="540" y="${y}" text-anchor="middle" fill="${color}" font-size="${size}" font-weight="${weight}" font-family="Arial, Helvetica, sans-serif">${escapeXml(text)}</text>`;
}

function svgLines(lines: string[], startY: number, size: number, lineHeight: number, color: string, weight = "700") {
  return lines.map((line, idx) => svgText(line, startY + idx * lineHeight, size, color, weight)).join("\n");
}

function buildCertificateSvg(data: CertificateData): string {
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

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
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

  <rect x="330" y="72" width="420" height="62" rx="31" ry="31" fill="url(#badgeGrad)"/>
  ${svgText("DESAFIO CONCLUÍDO", 112, 28, "#FFFFFF", "800")}

  <rect x="342" y="165" width="396" height="130" rx="20" ry="20" fill="#FFFFFF" fill-opacity="0.96"/>
  <image href="${LOGO_URL}" x="390" y="182" width="300" height="96" preserveAspectRatio="xMidYMid meet"/>

  <line x1="310" y1="338" x2="770" y2="338" stroke="#f97316" stroke-opacity="0.75" stroke-width="3"/>

  ${svgText("Mais um passo na jornada de", 386, 25, "#cbd5e1", "500")}
  ${svgText(nomeDisplay, 453, 46, "#FFFFFF", "800")}
  ${pdiLines.length ? svgLines(pdiLines, 500, 22, 30, "#cbd5e1", "600") : ""}

  <rect x="86" y="560" width="908" height="245" rx="26" ry="26" fill="#FFFFFF" fill-opacity="0.10" stroke="#FFFFFF" stroke-opacity="0.20" stroke-width="2"/>
  ${svgText("AÇÃO SUPERADA", 610, 20, "#34d399", "800")}
  ${svgLines(tituloLines, 667, 34, 44, "#FFFFFF", "800")}
  ${competenciaDisplay ? svgText(`Competência: ${competenciaDisplay}`, 765, 22, "#cbd5e1", "500") : ""}

  ${svgText(`Concluída em ${data.dataConclusao}`, 848, 22, "#94a3b8", "500")}
  ${svgText("Cada desafio superado impulsiona", 905, 27, "#FFFFFF", "600")}
  ${svgText("a sua carreira. Continue evoluindo!", 942, 27, "#FFFFFF", "600")}
  ${svgText("#DesenvolvimentoProfissional  #PDI  #EcoDoBem  #EVOLUIR", 1000, 18, "#fb923c", "700")}
</svg>`;
}

function buildDownloadPage(svg: string, fileName: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Card de Conquista</title>
  <style>
    body { margin: 0; min-height: 100vh; background: #0b1020; color: white; font-family: Arial, Helvetica, sans-serif; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
    main { width: min(760px, 100%); text-align: center; }
    .preview { display: block; width: min(520px, 92vw); height: auto; margin: 0 auto 18px; border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    button { border: 0; border-radius: 12px; padding: 14px 22px; color: #fff; font-weight: 700; background: linear-gradient(90deg, #4f46e5, #9333ea); cursor: pointer; font-size: 15px; }
    p { color: #cbd5e1; font-size: 13px; margin-top: 12px; }
  </style>
</head>
<body>
  <main>
    <img id="preview" class="preview" alt="Card de Conquista" />
    <button id="downloadBtn" type="button">Baixar card em PNG</button>
    <p>Se o download não começar automaticamente, clique no botão acima.</p>
  </main>
  <script>
    const svgText = `${escapeHtml(svg)}`;
    const fileName = "${escapeHtml(fileName)}";
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const preview = document.getElementById("preview");
    preview.src = svgUrl;

    function downloadPng() {
      const image = new Image();
      image.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, 1080, 1080);
        canvas.toBlob(function (blob) {
          if (!blob) return;
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
        }, "image/png");
      };
      image.src = svgUrl;
    }

    document.getElementById("downloadBtn").addEventListener("click", downloadPng);
    setTimeout(downloadPng, 500);
  </script>
</body>
</html>`;
}

export async function generateCertificate(data: CertificateData): Promise<{ url: string; key: string }> {
  const svg = buildCertificateSvg(data);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `card-conquista-${timestamp}-${randomSuffix}.png`;
  const fileKey = `certificados/conquista-${timestamp}-${randomSuffix}.html`;
  const html = buildDownloadPage(svg, fileName);

  const { url, key } = await storagePut(fileKey, Buffer.from(html, "utf-8"), "text/html; charset=utf-8");
  return { url, key };
}
