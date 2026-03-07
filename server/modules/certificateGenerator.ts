import { createCanvas, loadImage } from "canvas";
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
 * Gera um card de conquista motivacional como imagem PNG
 * para o colaborador compartilhar no LinkedIn.
 */
export async function generateCertificate(data: CertificateData): Promise<{ url: string; key: string }> {
  const WIDTH = 1080;
  const HEIGHT = 1080; // Formato quadrado ideal para LinkedIn
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // ===== FUNDO COM GRADIENTE VIBRANTE =====
  const bgGrad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bgGrad.addColorStop(0, "#0f172a");    // Azul muito escuro
  bgGrad.addColorStop(0.3, "#1e1b4b");  // Índigo escuro
  bgGrad.addColorStop(0.6, "#312e81");  // Índigo
  bgGrad.addColorStop(1, "#1e3a5f");    // Azul escuro
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ===== ELEMENTOS DECORATIVOS - Círculos de luz =====
  // Círculo grande no canto superior direito
  const circGrad1 = ctx.createRadialGradient(900, 120, 10, 900, 120, 250);
  circGrad1.addColorStop(0, "rgba(99, 102, 241, 0.25)");
  circGrad1.addColorStop(1, "rgba(99, 102, 241, 0)");
  ctx.fillStyle = circGrad1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Círculo médio no canto inferior esquerdo
  const circGrad2 = ctx.createRadialGradient(150, 900, 10, 150, 900, 200);
  circGrad2.addColorStop(0, "rgba(249, 115, 22, 0.2)");
  circGrad2.addColorStop(1, "rgba(249, 115, 22, 0)");
  ctx.fillStyle = circGrad2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Círculo sutil no centro
  const circGrad3 = ctx.createRadialGradient(540, 500, 10, 540, 500, 350);
  circGrad3.addColorStop(0, "rgba(139, 92, 246, 0.08)");
  circGrad3.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = circGrad3;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ===== BORDA SUTIL COM GRADIENTE =====
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  roundRect(ctx, 30, 30, WIDTH - 60, HEIGHT - 60, 20);
  ctx.stroke();

  // ===== EMOJI FOGUETE / ESTRELAS DECORATIVAS =====
  ctx.font = "48px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🚀", 100, 130);
  ctx.fillText("⭐", WIDTH - 100, 180);
  ctx.fillText("✨", 160, HEIGHT - 150);
  ctx.fillText("🎯", WIDTH - 140, HEIGHT - 130);

  // ===== BADGE "DESAFIO CONCLUÍDO" =====
  // Fundo do badge
  const badgeW = 380;
  const badgeH = 50;
  const badgeX = (WIDTH - badgeW) / 2;
  const badgeY = 80;
  const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
  badgeGrad.addColorStop(0, "#f97316");
  badgeGrad.addColorStop(1, "#ea580c");
  ctx.fillStyle = badgeGrad;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 25);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🏆  DESAFIO CONCLUÍDO!", WIDTH / 2, badgeY + 33);

  // ===== LOGO COM FUNDO BRANCO =====
  try {
    const logo = await loadImage(LOGO_URL);
    const logoHeight = 75;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    const logoPadX = 20;
    const logoPadY = 12;
    const logoBgX = (WIDTH - logoWidth) / 2 - logoPadX;
    const logoBgY = 155 - logoPadY;
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    roundRect(ctx, logoBgX, logoBgY, logoWidth + logoPadX * 2, logoHeight + logoPadY * 2, 12);
    ctx.fill();
    ctx.drawImage(logo, (WIDTH - logoWidth) / 2, 155, logoWidth, logoHeight);
  } catch (e) {
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ECO DO BEM", WIDTH / 2, 210);
  }

  // ===== TEXTO PRINCIPAL =====
  // Linha decorativa
  const lineGrad = ctx.createLinearGradient(WIDTH / 2 - 150, 0, WIDTH / 2 + 150, 0);
  lineGrad.addColorStop(0, "rgba(249, 115, 22, 0)");
  lineGrad.addColorStop(0.5, "rgba(249, 115, 22, 0.6)");
  lineGrad.addColorStop(1, "rgba(249, 115, 22, 0)");
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2 - 150, 265);
  ctx.lineTo(WIDTH / 2 + 150, 265);
  ctx.stroke();

  // "Mais um passo na jornada de"
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "20px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Mais um passo na jornada de", WIDTH / 2, 305);

  // Nome do colaborador
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 38px Arial, sans-serif";
  const nomeDisplay = data.nomeColaborador.length > 30
    ? data.nomeColaborador.substring(0, 28) + "..."
    : data.nomeColaborador;
  ctx.fillText(nomeDisplay, WIDTH / 2, 355);

  // Linha decorativa abaixo do nome
  const lineGrad2 = ctx.createLinearGradient(WIDTH / 2 - 120, 0, WIDTH / 2 + 120, 0);
  lineGrad2.addColorStop(0, "rgba(255, 255, 255, 0)");
  lineGrad2.addColorStop(0.5, "rgba(255, 255, 255, 0.3)");
  lineGrad2.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.strokeStyle = lineGrad2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2 - 120, 372);
  ctx.lineTo(WIDTH / 2 + 120, 372);
  ctx.stroke();

  // ===== CARD DA AÇÃO (Glassmorphism) =====
  const cardX = 70;
  const cardY = 400;
  const cardW = WIDTH - 140;
  const cardH = 220;

  // Fundo do card com transparência
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  // Borda do card
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, cardW, cardH, 16);
  ctx.stroke();

  // Label "AÇÃO SUPERADA"
  ctx.fillStyle = "#34d399";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("✅  AÇÃO SUPERADA", WIDTH / 2, cardY + 35);

  // Título da ação
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 24px Arial, sans-serif";
  const tituloLines = wrapText(ctx, `"${data.tituloAcao}"`, cardW - 80);
  let tituloY = cardY + 75;
  for (const line of tituloLines) {
    ctx.fillText(line, WIDTH / 2, tituloY);
    tituloY += 32;
  }

  // Competência
  if (data.competencia) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "16px Arial, sans-serif";
    const compText = data.competencia.length > 50
      ? data.competencia.substring(0, 48) + "..."
      : data.competencia;
    ctx.fillText(`Competência: ${compText}`, WIDTH / 2, cardY + cardH - 45);
  }

  // Data
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText(`Concluída em ${data.dataConclusao}`, WIDTH / 2, cardY + cardH - 18);

  // ===== FRASE MOTIVACIONAL =====
  const motY = cardY + cardH + 50;

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "italic 20px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText('"Cada desafio superado é combustível', WIDTH / 2, motY);
  ctx.fillText('para a sua carreira. Continue evoluindo!"', WIDTH / 2, motY + 30);

  // ===== BARRA INFERIOR - PROGRAMA =====
  const barY = HEIGHT - 180;

  // Linha separadora
  const sepGrad = ctx.createLinearGradient(100, 0, WIDTH - 100, 0);
  sepGrad.addColorStop(0, "rgba(249, 115, 22, 0)");
  sepGrad.addColorStop(0.3, "rgba(249, 115, 22, 0.4)");
  sepGrad.addColorStop(0.7, "rgba(99, 102, 241, 0.4)");
  sepGrad.addColorStop(1, "rgba(99, 102, 241, 0)");
  ctx.strokeStyle = sepGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(100, barY);
  ctx.lineTo(WIDTH - 100, barY);
  ctx.stroke();

  // Programa EVOLUIR
  ctx.fillStyle = "#f97316";
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PROGRAMA EVOLUIR", WIDTH / 2, barY + 35);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "15px Arial, sans-serif";
  ctx.fillText("Ecossistema de Desenvolvimento do B.E.M", WIDTH / 2, barY + 60);

  // Menções
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("@competênciasdobem  •  @ecobem", WIDTH / 2, barY + 90);

  // Hashtags
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText("#DesenvolvimentoProfissional  #PDI  #EcoDoBem  #EVOLUIR", WIDTH / 2, barY + 115);

  // ===== GERAR IMAGEM E UPLOAD =====
  const buffer = canvas.toBuffer("image/png");
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileKey = `certificados/conquista-${timestamp}-${randomSuffix}.png`;

  const { url, key } = await storagePut(fileKey, buffer, "image/png");
  return { url, key };
}

/**
 * Desenha um retângulo com cantos arredondados
 */
function roundRect(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Quebra texto em múltiplas linhas se exceder a largura máxima
 */
function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3); // Máximo 3 linhas
}
