import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// Ler o arquivo CSV do usuário
const csvContent = fs.readFileSync('/home/ubuntu/upload/acoes_ultimo_formatado.csv', 'utf-8');
const lines = csvContent.split('\n').filter(l => l.trim());

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Buscar todos os usuários por CPF
  const usersResult = await db.execute(sql`SELECT id, cpf, name FROM users WHERE cpf IS NOT NULL`);
  const usersRows = usersResult[0];
  
  const usersByCpf = new Map();
  for (const row of usersRows) {
    const cpfLimpo = row.cpf?.replace(/\D/g, '');
    usersByCpf.set(cpfLimpo, { id: row.id, nome: row.name });
  }
  
  // Buscar macrocompetências
  const macrosResult = await db.execute(sql`SELECT id, nome FROM competencias_macros WHERE ativo = 1`);
  const macrosRows = macrosResult[0];
  const macrosByNome = new Map();
  for (const row of macrosRows) {
    macrosByNome.set(row.nome?.toLowerCase().trim(), row.id);
  }
  
  // Buscar ciclos
  const ciclosResult = await db.execute(sql`SELECT id, nome FROM ciclos`);
  const ciclosRows = ciclosResult[0];
  const ciclosByNome = new Map();
  for (const row of ciclosRows) {
    ciclosByNome.set(row.nome?.toLowerCase().trim(), row.id);
  }
  
  // Buscar PDIs
  const pdisResult = await db.execute(sql`SELECT id, colaboradorId, cicloId FROM pdis`);
  const pdisRows = pdisResult[0];
  const pdisByUserAndCiclo = new Map();
  const pdisByUser = new Map();
  for (const row of pdisRows) {
    const key = `${row.colaboradorId}_${row.cicloId}`;
    pdisByUserAndCiclo.set(key, row.id);
    if (!pdisByUser.has(row.colaboradorId)) {
      pdisByUser.set(row.colaboradorId, []);
    }
    pdisByUser.get(row.colaboradorId).push(row);
  }
  
  console.log(`Usuários: ${usersRows.length}`);
  console.log(`Macros: ${macrosRows.length}`);
  console.log(`Ciclos: ${ciclosRows.length}`);
  console.log(`PDIs: ${pdisRows.length}`);
  
  // Simular importação
  const erros = [];
  const sucessos = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';');
    if (parts.length < 7) {
      erros.push({ linha: i + 1, erro: 'Linha com formato inválido', dados: lines[i].substring(0, 50) });
      continue;
    }
    
    const [cpf, cicloNome, macroNome, microcompetencia, titulo, descricao, prazo] = parts;
    
    // 1. Verificar CPF
    const cpfLimpo = cpf?.replace(/\D/g, '');
    const user = usersByCpf.get(cpfLimpo);
    if (!user) {
      erros.push({ linha: i + 1, erro: `Usuário não encontrado`, cpf });
      continue;
    }
    
    // 2. Verificar Ciclo
    const cicloId = ciclosByNome.get(cicloNome?.toLowerCase().trim());
    if (!cicloId) {
      erros.push({ linha: i + 1, erro: `Ciclo não encontrado: "${cicloNome}"`, cpf, nome: user.nome });
      continue;
    }
    
    // 3. Verificar PDI
    const pdiKey = `${user.id}_${cicloId}`;
    let pdiId = pdisByUserAndCiclo.get(pdiKey);
    
    if (!pdiId) {
      // Tentar pegar qualquer PDI do usuário
      const pdisDoUser = pdisByUser.get(user.id) || [];
      if (pdisDoUser.length > 0) {
        pdiId = pdisDoUser[0].id;
      }
    }
    
    if (!pdiId) {
      erros.push({ linha: i + 1, erro: `Usuário não possui PDI cadastrado`, cpf, nome: user.nome, ciclo: cicloNome });
      continue;
    }
    
    // 4. Verificar Macrocompetência
    const macroId = macrosByNome.get(macroNome?.toLowerCase().trim());
    if (!macroId) {
      erros.push({ linha: i + 1, erro: `Macrocompetência não encontrada`, cpf, nome: user.nome, macro: macroNome });
      continue;
    }
    
    // Sucesso
    sucessos.push({ linha: i + 1, cpf, nome: user.nome });
  }
  
  console.log(`\n=== RESULTADO DA SIMULAÇÃO ===`);
  console.log(`✅ Sucessos: ${sucessos.length}`);
  console.log(`❌ Erros: ${erros.length}`);
  
  // Agrupar erros por tipo
  const errosPorTipo = {};
  for (const erro of erros) {
    const tipo = erro.erro.split(':')[0];
    if (!errosPorTipo[tipo]) {
      errosPorTipo[tipo] = [];
    }
    errosPorTipo[tipo].push(erro);
  }
  
  console.log(`\n=== ERROS POR TIPO ===`);
  for (const [tipo, lista] of Object.entries(errosPorTipo)) {
    console.log(`\n${tipo}: ${lista.length} erros`);
    // Mostrar exemplos
    for (const erro of lista.slice(0, 3)) {
      console.log(`  Linha ${erro.linha}: ${erro.nome || erro.cpf} - ${erro.macro || erro.ciclo || ''}`);
    }
    if (lista.length > 3) {
      console.log(`  ... e mais ${lista.length - 3} erros`);
    }
  }
  
  // Salvar erros em arquivo
  fs.writeFileSync('/home/ubuntu/erros_importacao.json', JSON.stringify(erros, null, 2));
  console.log(`\nErros salvos em: /home/ubuntu/erros_importacao.json`);
  
  process.exit(0);
}

main().catch(console.error);
