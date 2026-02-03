import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // 1. Total de ações
  const totalResult = await db.execute(sql`SELECT COUNT(*) as total FROM actions`);
  const totalAcoes = totalResult[0][0].total;
  
  // 2. Ações por status
  const statusResult = await db.execute(sql`SELECT status, COUNT(*) as quantidade FROM actions GROUP BY status ORDER BY quantidade DESC`);
  
  // 3. Ações por macrocompetência
  const macroResult = await db.execute(sql`
    SELECT cm.nome as macro, COUNT(*) as quantidade 
    FROM actions a 
    JOIN competencias_macros cm ON a.macroId = cm.id 
    GROUP BY cm.nome 
    ORDER BY quantidade DESC
  `);
  
  // 4. Ações por usuário (top 20)
  const userResult = await db.execute(sql`
    SELECT u.name as usuario, u.cpf, COUNT(*) as quantidade 
    FROM actions a 
    JOIN pdis p ON a.pdiId = p.id 
    JOIN users u ON p.colaboradorId = u.id 
    GROUP BY u.id, u.name, u.cpf 
    ORDER BY quantidade DESC 
    LIMIT 20
  `);
  
  // 5. Total de PDIs com ações
  const pdisResult = await db.execute(sql`SELECT COUNT(DISTINCT pdiId) as total FROM actions`);
  const totalPdis = pdisResult[0][0].total;
  
  // 6. Ações por ciclo
  const cicloResult = await db.execute(sql`
    SELECT c.nome as ciclo, COUNT(*) as quantidade 
    FROM actions a 
    JOIN pdis p ON a.pdiId = p.id 
    JOIN ciclos c ON p.cicloId = c.id 
    GROUP BY c.nome 
    ORDER BY c.nome
  `);
  
  // Gerar relatório
  let relatorio = `# Relatório de Ações Importadas\n\n`;
  relatorio += `**Data de geração:** ${new Date().toLocaleString('pt-BR')}\n\n`;
  relatorio += `---\n\n`;
  
  relatorio += `## Resumo Geral\n\n`;
  relatorio += `| Indicador | Valor |\n`;
  relatorio += `|-----------|-------|\n`;
  relatorio += `| Total de Ações | ${totalAcoes} |\n`;
  relatorio += `| PDIs com Ações | ${totalPdis} |\n`;
  relatorio += `| Macrocompetências | ${macroResult[0].length} |\n\n`;
  
  relatorio += `## Ações por Status\n\n`;
  relatorio += `| Status | Quantidade |\n`;
  relatorio += `|--------|------------|\n`;
  for (const row of statusResult[0]) {
    relatorio += `| ${row.status || 'pendente'} | ${row.quantidade} |\n`;
  }
  relatorio += `\n`;
  
  relatorio += `## Ações por Ciclo\n\n`;
  relatorio += `| Ciclo | Quantidade |\n`;
  relatorio += `|-------|------------|\n`;
  for (const row of cicloResult[0]) {
    relatorio += `| ${row.ciclo} | ${row.quantidade} |\n`;
  }
  relatorio += `\n`;
  
  relatorio += `## Ações por Macrocompetência\n\n`;
  relatorio += `| Macrocompetência | Quantidade |\n`;
  relatorio += `|------------------|------------|\n`;
  for (const row of macroResult[0]) {
    relatorio += `| ${row.macro} | ${row.quantidade} |\n`;
  }
  relatorio += `\n`;
  
  relatorio += `## Top 20 Usuários com Mais Ações\n\n`;
  relatorio += `| Usuário | CPF | Quantidade |\n`;
  relatorio += `|---------|-----|------------|\n`;
  for (const row of userResult[0]) {
    relatorio += `| ${row.usuario} | ${row.cpf} | ${row.quantidade} |\n`;
  }
  relatorio += `\n`;
  
  // Salvar relatório
  fs.writeFileSync('/home/ubuntu/relatorio_acoes.md', relatorio);
  console.log('Relatório salvo em: /home/ubuntu/relatorio_acoes.md');
  console.log(`\nTotal de ações: ${totalAcoes}`);
  console.log(`PDIs com ações: ${totalPdis}`);
  
  process.exit(0);
}

main().catch(console.error);
