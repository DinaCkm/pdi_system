import { Resvg } from "@resvg/resvg-js";
import { storagePut } from "../storage";

// Logo URL
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663192322263/Uksxtg83ZJDkZPJL3fCmwT/eco-do-bem-logo-cropped_564da75a.png";

interface CertificateData {
  nomeColaborador: string;
  tituloAcao: string;
  competencia?: string;
  dataConclusao: string; // formato dd/mm/yyyy
  pdiTitulo?: string;
}

/**
 * Quebra texto em múltiplas linhas baseado em caracteres por linha estimados
 */
function wrapTextSVG(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3); // Máximo 3 linhas
}

/**
 * Escapa caracteres especiais para SVG
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Gera um card de conquista motivacional como imagem PNG
 * usando SVG + resvg-js (sem dependências nativas como canvas).
 */
export async function generateCertificate(data: CertificateData): Promise<{ url: string; key: string }> {
  const WIDTH = 1080;
  const HEIGHT = 1080;

  const nomeDisplay = data.nomeColaborador.length > 30
    ? data.nomeColaborador.substring(0, 28) + "..."
    : data.nomeColaborador;

  const tituloLines = wrapTextSVG(`"${data.tituloAcao}"`, 40);
  const competenciaDisplay = data.competencia
    ? (data.competencia.length > 50 ? data.competencia.substring(0, 48) + "..." : data.competencia)
    : "";

  // Gerar linhas de título da ação
  let tituloSVG = "";
  let tituloY = 555;
  for (const line of tituloLines) {
    tituloSVG += `<text x="540" y="${tituloY}" text-anchor="middle" fill="#FFFFFF" font-size="24" font-weight="bold" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>\n`;
    tituloY += 34;
  }

  // Competência (posição dinâmica baseada nas linhas do título)
  const compY = tituloY + 20;
  const competenciaSVG = competenciaDisplay
    ? `<text x="540" y="${compY}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="16" font-family="Arial, Helvetica, sans-serif">Compet&#234;ncia: ${escapeXml(competenciaDisplay)}</text>`
    : "";

  // Data de conclusão
  const dataY = competenciaDisplay ? compY + 30 : compY + 5;
  const dataSVG = `<text x="540" y="${dataY}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="14" font-family="Arial, Helvetica, sans-serif">Conclu&#237;da em ${escapeXml(data.dataConclusao)}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <!-- Gradiente de fundo -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="30%" stop-color="#1e1b4b"/>
      <stop offset="60%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#1e3a5f"/>
    </linearGradient>
    <!-- Gradiente do badge -->
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
    <!-- Gradiente da linha separadora inferior -->
    <linearGradient id="sepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(249,115,22,0)" />
      <stop offset="30%" stop-color="rgba(249,115,22,0.4)" />
      <stop offset="70%" stop-color="rgba(99,102,241,0.4)" />
      <stop offset="100%" stop-color="rgba(99,102,241,0)" />
    </linearGradient>
    <!-- Gradiente da linha decorativa -->
    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(249,115,22,0)" />
      <stop offset="50%" stop-color="rgba(249,115,22,0.6)" />
      <stop offset="100%" stop-color="rgba(249,115,22,0)" />
    </linearGradient>
    <!-- Gradiente da linha abaixo do nome -->
    <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(255,255,255,0)" />
      <stop offset="50%" stop-color="rgba(255,255,255,0.3)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </linearGradient>
    <!-- Brilho circular superior direito -->
    <radialGradient id="glow1" cx="83%" cy="11%" r="23%">
      <stop offset="0%" stop-color="rgba(99,102,241,0.25)"/>
      <stop offset="100%" stop-color="rgba(99,102,241,0)"/>
    </radialGradient>
    <!-- Brilho circular inferior esquerdo -->
    <radialGradient id="glow2" cx="14%" cy="83%" r="19%">
      <stop offset="0%" stop-color="rgba(249,115,22,0.2)"/>
      <stop offset="100%" stop-color="rgba(249,115,22,0)"/>
    </radialGradient>
    <!-- Brilho central sutil -->
    <radialGradient id="glow3" cx="50%" cy="46%" r="32%">
      <stop offset="0%" stop-color="rgba(139,92,246,0.08)"/>
      <stop offset="100%" stop-color="rgba(139,92,246,0)"/>
    </radialGradient>
  </defs>

  <!-- Fundo com gradiente -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)"/>

  <!-- Efeitos de brilho -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow1)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow2)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow3)"/>

  <!-- Borda sutil -->
  <rect x="30" y="30" width="${WIDTH - 60}" height="${HEIGHT - 60}" rx="20" ry="20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

  <!-- Emojis decorativos -->
  <text x="100" y="130" font-size="48" font-family="Arial, sans-serif" text-anchor="middle">&#x1F680;</text>
  <text x="${WIDTH - 100}" y="180" font-size="48" font-family="Arial, sans-serif" text-anchor="middle">&#x2B50;</text>
  <text x="160" y="${HEIGHT - 150}" font-size="48" font-family="Arial, sans-serif" text-anchor="middle">&#x2728;</text>
  <text x="${WIDTH - 140}" y="${HEIGHT - 130}" font-size="48" font-family="Arial, sans-serif" text-anchor="middle">&#x1F3AF;</text>

  <!-- Badge "DESAFIO CONCLUÍDO" -->
  <rect x="350" y="80" width="380" height="50" rx="25" ry="25" fill="url(#badgeGrad)"/>
  <text x="540" y="113" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="bold" font-family="Arial, Helvetica, sans-serif">&#x1F3C6;  DESAFIO CONCLU&#205;DO!</text>

  <!-- Logo com fundo branco arredondado -->
  <rect x="430" y="155" width="220" height="95" rx="12" ry="12" fill="rgba(255,255,255,0.95)"/>
  <image href="${LOGO_URL}" x="445" y="165" width="190" height="75" preserveAspectRatio="xMidYMid meet"/>

  <!-- Linha decorativa -->
  <line x1="390" y1="285" x2="690" y2="285" stroke="url(#lineGrad)" stroke-width="1.5"/>

  <!-- "Mais um passo na jornada de" -->
  <text x="540" y="325" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="20" font-family="Arial, Helvetica, sans-serif">Mais um passo na jornada de</text>

  <!-- Nome do colaborador -->
  <text x="540" y="375" text-anchor="middle" fill="#FFFFFF" font-size="38" font-weight="bold" font-family="Arial, Helvetica, sans-serif">${escapeXml(nomeDisplay)}</text>

  <!-- Linha decorativa abaixo do nome -->
  <line x1="420" y1="392" x2="660" y2="392" stroke="url(#lineGrad2)" stroke-width="1"/>

  <!-- Card da ação (Glassmorphism) -->
  <rect x="70" y="420" width="${WIDTH - 140}" height="240" rx="16" ry="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>

  <!-- Label "AÇÃO SUPERADA" -->
  <text x="540" y="460" text-anchor="middle" fill="#34d399" font-size="14" font-weight="bold" font-family="Arial, Helvetica, sans-serif">&#x2705;  A&#199;&#195;O SUPERADA</text>

  <!-- Título da ação (dinâmico) -->
  ${tituloSVG}

  <!-- Competência -->
  ${competenciaSVG}

  <!-- Data -->
  ${dataSVG}

  <!-- Frase motivacional -->
  <text x="540" y="720" text-anchor="middle" fill="#FFFFFF" font-size="20" font-style="italic" font-family="Arial, Helvetica, sans-serif">"Cada desafio superado &#233; combust&#237;vel</text>
  <text x="540" y="750" text-anchor="middle" fill="#FFFFFF" font-size="20" font-style="italic" font-family="Arial, Helvetica, sans-serif">para a sua carreira. Continue evoluindo!"</text>

  <!-- Linha separadora inferior -->
  <line x1="100" y1="800" x2="${WIDTH - 100}" y2="800" stroke="url(#sepGrad)" stroke-width="1.5"/>

  <!-- Programa EVOLUIR -->
  <text x="540" y="840" text-anchor="middle" fill="#f97316" font-size="18" font-weight="bold" font-family="Arial, Helvetica, sans-serif">PROGRAMA EVOLUIR</text>
  <text x="540" y="868" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="15" font-family="Arial, Helvetica, sans-serif">Ecossistema de Desenvolvimento do B.E.M</text>

  <!-- Menções -->
  <text x="540" y="900" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-size="14" font-family="Arial, Helvetica, sans-serif">@compet&#234;nciasdobem  &#8226;  @ecobem</text>

  <!-- Hashtags -->
  <text x="540" y="930" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="13" font-family="Arial, Helvetica, sans-serif">#DesenvolvimentoProfissional  #PDI  #EcoDoBem  #EVOLUIR</text>

</svg>`;

  // Converter SVG para PNG usando resvg-js
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: WIDTH,
    },
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Upload para S3
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileKey = `certificados/conquista-${timestamp}-${randomSuffix}.png`;

  const { url, key } = await storagePut(fileKey, Buffer.from(pngBuffer), "image/png");
  return { url, key };
}
