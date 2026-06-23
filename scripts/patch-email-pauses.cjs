const fs = require('fs');

const filePath = 'server/_core/email.ts';
let source = fs.readFileSync(filePath, 'utf8');

function replaceIfPresent(label, pattern, replacement) {
  const before = source;
  source = source.replace(pattern, replacement);
  if (source === before) {
    console.log(`[Email] Patch already applied or not needed: ${label}`);
  } else {
    console.log(`[Email] Patch applied: ${label}`);
  }
}

replaceIfPresent(
  'pause evidence approved manager email',
  /  let envioLider = true;\n  if \(liderEmail && liderName\) \{[\s\S]*?subject: `INFORMATIVO — Evidência Aprovada — \$\{colaboradorName\} — \$\{tituloAcaoTexto\}`[\s\S]*?  \}\n\n  return envioColaborador && envioLider;/,
  `  let envioLider = true;\n  if (liderEmail && liderName) {\n    console.log('[Email] Manager email paused: evidence approved notification');\n  }\n\n  return envioColaborador && envioLider;`
);

replaceIfPresent(
  'pause evidence sent manager email',
  /(export async function sendEmailEvidenciaEnviadaParaLider[\s\S]*?  const tituloAcaoTexto = toEmailInlineText\(tituloAcao\);\n)\n  let relatoDetalhado = '';/,
  `$1\n  console.log(\`[Email] Manager email paused: evidence sent notification - \${colaboradorName} - \${tituloAcaoTexto}\`);\n  return true;\n\n  let relatoDetalhado = '';`
);

fs.writeFileSync(filePath, source);
console.log('[Email] Manager evidence email pauses check complete.');
