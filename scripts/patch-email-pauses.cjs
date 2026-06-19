const fs = require('fs');

const filePath = 'server/_core/email.ts';
let source = fs.readFileSync(filePath, 'utf8');

const original = source;

function replaceRequired(label, pattern, replacement) {
  const before = source;
  source = source.replace(pattern, replacement);
  if (source === before) {
    throw new Error(`Email pause patch failed: ${label}`);
  }
}

replaceRequired(
  'pause evidence approved manager email',
  /  let envioLider = true;\n  if \(liderEmail && liderName\) \{[\s\S]*?subject: `INFORMATIVO — Evidência Aprovada — \$\{colaboradorName\} — \$\{tituloAcaoTexto\}`,[\s\S]*?  \}\n\n  return envioColaborador && envioLider;/,
  `  let envioLider = true;
  if (liderEmail && liderName) {
    console.log('[Email] Manager email paused: evidence approved notification');
  }

  return envioColaborador && envioLider;`
);

replaceRequired(
  'pause evidence sent manager email',
  /(export async function sendEmailEvidenciaEnviadaParaLider[\s\S]*?  const tituloAcaoTexto = toEmailInlineText\(tituloAcao\);\n)\n  let relatoDetalhado = '';/,
  `$1
  console.log(\`[Email] Manager email paused: evidence sent notification - \${colaboradorName} - \${tituloAcaoTexto}\`);
  return true;

  let relatoDetalhado = '';`
);

if (source === original) {
  throw new Error('Email pause patch did not change any code.');
}

fs.writeFileSync(filePath, source);
console.log('[Email] Manager evidence email pauses applied during build.');
