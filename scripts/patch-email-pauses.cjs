const fs = require('fs');

const filePath = 'server/_core/email.ts';
let source = fs.readFileSync(filePath, 'utf8');

const approvedLeaderBefore = `  let envioLider = true;
  if (liderEmail && liderName) {`;

const approvedLeaderAfter = `  let envioLider = true;
  if (liderEmail && liderName) {
    console.log("[Email] Manager email paused: evidence approved notification");
  }
  if (false && liderEmail && liderName) {`;

const sentLeaderBefore = `  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  let relatoDetalhado = '';`;

const sentLeaderAfter = `  const tituloAcaoTexto = toEmailInlineText(tituloAcao);

  console.log(\`[Email] Manager email paused: evidence sent notification - \${colaboradorName} - \${tituloAcaoTexto}\`);
  return true;

  let relatoDetalhado = '';`;

const original = source;
source = source.replace(approvedLeaderBefore, approvedLeaderAfter);
source = source.replace(sentLeaderBefore, sentLeaderAfter);

if (source === original) {
  throw new Error('Email pause patch did not change any code.');
}

fs.writeFileSync(filePath, source);
console.log('[Email] Manager email pauses applied during build.');
