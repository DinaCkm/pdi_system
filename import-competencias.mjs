import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import { competenciasBlocos, competenciasMacros, competenciasMicros } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const csvContent = `Módulo,Macrocompetência,Microcompetência
Competências Comportamentais e Postura Profissional,Ética, Integridade e Responsabilidade Institucional,Transparência e accountability
Competências Comportamentais e Postura Profissional,Ética, Integridade e Responsabilidade Institucional,Conduta ética no serviço público
Competências Comportamentais e Postura Profissional,Ética, Integridade e Responsabilidade Institucional,Responsabilidade institucional e conformidade
Competências Comportamentais e Postura Profissional,Comunicação e Relacionamento Profissional,Comunicação clara e objetiva
Competências Comportamentais e Postura Profissional,Comunicação e Relacionamento Profissional,Comunicação institucional e técnica
Competências Comportamentais e Postura Profissional,Comunicação e Relacionamento Profissional,Relacionamento interpessoal
Competências Comportamentais e Postura Profissional,Inteligência Emocional e Autoconhecimento,Autocontrole emocional
Competências Comportamentais e Postura Profissional,Inteligência Emocional e Autoconhecimento,Gestão de conflitos
Competências Comportamentais e Postura Profissional,Inteligência Emocional e Autoconhecimento,Resiliência emocional
Competências Comportamentais e Postura Profissional,Adaptabilidade e Flexibilidade,Adaptação a mudanças organizacionais
Competências Comportamentais e Postura Profissional,Adaptabilidade e Flexibilidade,Flexibilidade frente a cenários complexos
Competências Comportamentais e Postura Profissional,Adaptabilidade e Flexibilidade,Aprendizagem contínua
Competências Comportamentais e Postura Profissional,Protagonismo e Autogestão,Autonomia responsável
Competências Comportamentais e Postura Profissional,Protagonismo e Autogestão,Tomada de decisão individual
Competências Comportamentais e Postura Profissional,Protagonismo e Autogestão,Responsabilidade sobre entregas
Competências Comportamentais e Postura Profissional,Planejamento Pessoal e Gestão do Tempo,Organização do trabalho
Competências Comportamentais e Postura Profissional,Planejamento Pessoal e Gestão do Tempo,Priorização de atividades
Competências Comportamentais e Postura Profissional,Planejamento Pessoal e Gestão do Tempo,Cumprimento de prazos
Competências Comportamentais e Postura Profissional,Presença Profissional e Postura Institucional,Postura profissional
Competências Comportamentais e Postura Profissional,Presença Profissional e Postura Institucional,Representação institucional
Competências Comportamentais e Postura Profissional,Presença Profissional e Postura Institucional,Ética na atuação externa
Liderança, Gestão e Visão Organizacional,Liderança e Gestão de Pessoas,Liderança situacional
Liderança, Gestão e Visão Organizacional,Liderança e Gestão de Pessoas,Desenvolvimento de pessoas
Liderança, Gestão e Visão Organizacional,Liderança e Gestão de Pessoas,Delegação e acompanhamento
Liderança, Gestão e Visão Organizacional,Gestão de Equipes e Clima Organizacional,Trabalho em equipe
Liderança, Gestão e Visão Organizacional,Gestão de Equipes e Clima Organizacional,Engajamento e motivação
Liderança, Gestão e Visão Organizacional,Gestão de Equipes e Clima Organizacional,Clima e cultura organizacional
Liderança, Gestão e Visão Organizacional,Resolução de Problemas e Tomada de Decisão Gerencial,Análise de problemas
Liderança, Gestão e Visão Organizacional,Resolução de Problemas e Tomada de Decisão Gerencial,Decisão baseada em evidências
Liderança, Gestão e Visão Organizacional,Resolução de Problemas e Tomada de Decisão Gerencial,Gestão de riscos
Liderança, Gestão e Visão Organizacional,Inovação, Criatividade e Visão Estratégica,Pensamento estratégico
Liderança, Gestão e Visão Organizacional,Inovação, Criatividade e Visão Estratégica,Inovação aplicada
Liderança, Gestão e Visão Organizacional,Inovação, Criatividade e Visão Estratégica,Visão de futuro
Gestão, Processos e Governança,Gestão de Projetos e Processos,Gestão de projetos e indicadores
Gestão, Processos e Governança,Gestão de Projetos e Processos,Monitoramento de entregas
Gestão, Processos e Governança,Gestão de Projetos e Processos,Melhoria contínua (PDCA)
Gestão, Processos e Governança,Estratégia e Gestão por Resultados,Planejamento estratégico
Gestão, Processos e Governança,Estratégia e Gestão por Resultados,Definição e acompanhamento de metas
Gestão, Processos e Governança,Estratégia e Gestão por Resultados,Indicadores de resultado e impacto
Gestão, Processos e Governança,Governança, Controles Internos e Compliance,Estrutura de governança
Gestão, Processos e Governança,Governança, Controles Internos e Compliance,Controles internos
Gestão, Processos e Governança,Governança, Controles Internos e Compliance,Compliance e conformidade
Gestão, Processos e Governança,Gestão Administrativa e Processual,Gestão de processos administrativos
Gestão, Processos e Governança,Gestão Administrativa e Processual,Apoio administrativo e logístico
Gestão, Processos e Governança,Gestão Administrativa e Processual,Rotinas institucionais
Gestão, Processos e Governança,Gestão do Conhecimento e Documentação Institucional,Gestão documental e arquivística
Gestão, Processos e Governança,Gestão do Conhecimento e Documentação Institucional,Rastreabilidade da informação
Gestão, Processos e Governança,Gestão do Conhecimento e Documentação Institucional,Uso do SEI e sistemas correlatos
Tecnologia, Dados e Transformação Digital,Tecnologia, Dados e Transformação Digital,Uso de sistemas corporativos
Tecnologia, Dados e Transformação Digital,Tecnologia, Dados e Transformação Digital,Análise de dados para decisão
Tecnologia, Dados e Transformação Digital,Tecnologia, Dados e Transformação Digital,Transformação digital aplicada
Tecnologia, Dados e Transformação Digital,Ferramentas de Apoio à Gestão,Excel avançado
Tecnologia, Dados e Transformação Digital,Ferramentas de Apoio à Gestão,Dashboards e relatórios
Tecnologia, Dados e Transformação Digital,Ferramentas de Apoio à Gestão,Ferramentas digitais de apoio
Atuação Finalística e Relacionamento Institucional,Atendimento e Relacionamento com o Cliente,Atendimento ao cliente/empreendedor
Atuação Finalística e Relacionamento Institucional,Atendimento e Relacionamento com o Cliente,Escuta ativa
Atuação Finalística e Relacionamento Institucional,Atendimento e Relacionamento com o Cliente,Qualidade no atendimento
Atuação Finalística e Relacionamento Institucional,Vendas, Negociação e Soluções Comerciais,Técnicas de negociação
Atuação Finalística e Relacionamento Institucional,Vendas, Negociação e Soluções Comerciais,Soluções comerciais
Atuação Finalística e Relacionamento Institucional,Vendas, Negociação e Soluções Comerciais,Relacionamento com parceiros
Atuação Finalística e Relacionamento Institucional,Marketing Institucional e Aplicado,Marketing institucional
Atuação Finalística e Relacionamento Institucional,Marketing Institucional e Aplicado,Comunicação de produtos e serviços
Atuação Finalística e Relacionamento Institucional,Marketing Institucional e Aplicado,Posicionamento institucional
Atuação Finalística e Relacionamento Institucional,Políticas Públicas e Desenvolvimento Territorial,Articulação institucional
Atuação Finalística e Relacionamento Institucional,Políticas Públicas e Desenvolvimento Territorial,Alinhamento a políticas públicas
Atuação Finalística e Relacionamento Institucional,Políticas Públicas e Desenvolvimento Territorial,Desenvolvimento territorial
Atuação Finalística e Relacionamento Institucional,Ouvidoria e Relacionamento Institucional,Tratamento de manifestações
Atuação Finalística e Relacionamento Institucional,Ouvidoria e Relacionamento Institucional,Fluxo de ouvidoria
Atuação Finalística e Relacionamento Institucional,Ouvidoria e Relacionamento Institucional,Resposta e acompanhamento
Administração, Finanças e Conformidade,Finanças, Orçamento e Contabilidade Pública,Planejamento e execução orçamentária
Administração, Finanças e Conformidade,Finanças, Orçamento e Contabilidade Pública,Contabilidade pública
Administração, Finanças e Conformidade,Finanças, Orçamento e Contabilidade Pública,Prestação de contas
Administração, Finanças e Conformidade,Gestão Orçamentária e Financeira,Controle da execução financeira
Administração, Finanças e Conformidade,Gestão Orçamentária e Financeira,Análise de custos
Administração, Finanças e Conformidade,Gestão Orçamentária e Financeira,Ajustes e créditos orçamentários
Administração, Finanças e Conformidade,Compras, Contratos e Gestão Contratual,Apoio a compras e contratações
Administração, Finanças e Conformidade,Compras, Contratos e Gestão Contratual,Gestão de contratos
Administração, Finanças e Conformidade,Compras, Contratos e Gestão Contratual,Fiscalização contratual
Administração, Finanças e Conformidade,Contratação de Obras e Serviços de Engenharia,Contratações técnicas
Administração, Finanças e Conformidade,Contratação de Obras e Serviços de Engenharia,Fiscalização de obras
Administração, Finanças e Conformidade,Contratação de Obras e Serviços de Engenharia,Normas e procedimentos
Administração, Finanças e Conformidade,Legislação, Normas e Conformidade Jurídica,Legislação aplicada
Administração, Finanças e Conformidade,Legislação, Normas e Conformidade Jurídica,Normas internas
Administração, Finanças e Conformidade,Legislação, Normas e Conformidade Jurídica,Conformidade legal
Administração, Finanças e Conformidade,Tributação e Obrigações Fiscais,Obrigações fiscais
Administração, Finanças e Conformidade,Tributação e Obrigações Fiscais,Legislação tributária
Administração, Finanças e Conformidade,Tributação e Obrigações Fiscais,Compliance fiscal
Competências Técnicas Específicas,Competências Técnicas da Função,Conhecimentos técnicos específicos
Competências Técnicas Específicas,Competências Técnicas da Função,Procedimentos próprios da área
Competências Técnicas Específicas,Competências Técnicas da Função,Normas e rotinas especializadas`;

async function importCompetencias() {
  console.log("🚀 Iniciando importação de competências...\n");
  
  const lines = csvContent.split('\n').filter(line => line.trim());
  const dataLines = lines.slice(1); // Pular cabeçalho
  
  const blocoMap = new Map();
  const macroMap = new Map();
  
  let stats = { blocos: 0, macros: 0, micros: 0, skipped: 0 };
  
  for (const line of dataLines) {
    const [modulo, macro, micro] = line.split(',').map(s => s.trim());
    
    if (!modulo || !macro || !micro) continue;
    
    // 1. Criar ou buscar Bloco
    let blocoId;
    if (blocoMap.has(modulo)) {
      blocoId = blocoMap.get(modulo);
    } else {
      const existing = await db.select().from(competenciasBlocos)
        .where(eq(competenciasBlocos.nome, modulo)).limit(1);
      
      if (existing.length > 0) {
        blocoId = existing[0].id;
        console.log(`  ⏭️  Bloco já existe: "${modulo}"`);
      } else {
        const result = await db.insert(competenciasBlocos).values({ nome: modulo });
        blocoId = result[0].insertId;
        stats.blocos++;
        console.log(`  ✅ Bloco criado: "${modulo}"`);
      }
      blocoMap.set(modulo, blocoId);
    }
    
    // 2. Criar ou buscar Macro
    const macroKey = `${blocoId}-${macro}`;
    let macroId;
    if (macroMap.has(macroKey)) {
      macroId = macroMap.get(macroKey);
    } else {
      const existing = await db.select().from(competenciasMacros)
        .where(and(
          eq(competenciasMacros.nome, macro),
          eq(competenciasMacros.blocoId, blocoId)
        )).limit(1);
      
      if (existing.length > 0) {
        macroId = existing[0].id;
        console.log(`    ⏭️  Macro já existe: "${macro}"`);
      } else {
        const result = await db.insert(competenciasMacros).values({ 
          blocoId, 
          nome: macro 
        });
        macroId = result[0].insertId;
        stats.macros++;
        console.log(`    ✅ Macro criada: "${macro}"`);
      }
      macroMap.set(macroKey, macroId);
    }
    
    // 3. Criar Micro
    const existing = await db.select().from(competenciasMicros)
      .where(and(
        eq(competenciasMicros.nome, micro),
        eq(competenciasMicros.macroId, macroId)
      )).limit(1);
    
    if (existing.length > 0) {
      stats.skipped++;
      console.log(`      ⏭️  Micro já existe: "${micro}"`);
    } else {
      await db.insert(competenciasMicros).values({ 
        macroId, 
        nome: micro 
      });
      stats.micros++;
      console.log(`      ✅ Micro criada: "${micro}"`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMO DA IMPORTAÇÃO");
  console.log("=".repeat(60));
  console.log(`✅ Blocos criados:  ${stats.blocos}`);
  console.log(`✅ Macros criadas:  ${stats.macros}`);
  console.log(`✅ Micros criadas:  ${stats.micros}`);
  console.log(`⏭️  Itens ignorados: ${stats.skipped} (já existiam)`);
  console.log(`📦 Total processado: ${dataLines.length}`);
  console.log("=".repeat(60));
  
  process.exit(0);
}

importCompetencias().catch(err => {
  console.error("❌ Erro na importação:", err);
  process.exit(1);
});
