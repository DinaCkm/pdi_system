# 📋 Análise Completa CORRIGIDA: Implementação de PDI e Ações

## 🎯 **OBJETIVO GERAL**

Implementar as páginas de gestão de PDI e Ações, que são o **coração do sistema**. O PDI é um container único por colaborador/ciclo que agrupa múltiplas ações de desenvolvimento. O status do PDI é calculado automaticamente baseado na conclusão de todas as ações.

---

## 🏗️ **ARQUITETURA CORRETA DO SISTEMA**

### **Hierarquia:**
```
Ciclo Semestral (período: 01/01/2024 a 30/06/2024)
  └── PDI (1 por colaborador - container único)
       ├── Ação 1: Curso de Liderança (Competência: Liderança → Gestão de Pessoas → Resolução de Conflitos)
       ├── Ação 2: Projeto Prático (Competência: Técnica → Desenvolvimento → Python Avançado)
       └── Ação 3: Mentoria (Competência: Comportamental → Comunicação → Apresentações)
```

### **Regra Fundamental:**
**1 PDI = 1 Colaborador + 1 Ciclo**
- Não pode haver 2 PDIs para o mesmo colaborador no mesmo ciclo
- PDI é um **container** que agrupa todas as ações de desenvolvimento do colaborador naquele período
- PDI não tem "conteúdo próprio" além das ações que o compõem

---

## 📊 **ESTRUTURA DE DADOS CORRIGIDA**

### **PDI (Container de Ações)**
```typescript
{
  id: number
  colaboradorId: number          // Dono do PDI (único por ciclo)
  cicloId: number                 // Período de vigência
  titulo: string                  // Ex: "PDI - João Silva - 1º Semestre 2024"
  objetivoGeral?: string          // Descrição geral do desenvolvimento esperado
  status: CALCULADO AUTOMATICAMENTE
    - "em_andamento": Enquanto houver ações não concluídas
    - "concluido": APENAS quando TODAS as ações tiverem evidências aprovadas
    - "cancelado": Se o PDI for cancelado manualmente
  createdBy: number               // Admin que criou
  createdAt: timestamp
  updatedAt: timestamp
}
```

### **Cálculo Automático de Status do PDI:**
```typescript
function calcularStatusPDI(pdiId) {
  const acoes = getAcoesByPDI(pdiId);
  
  // Se não há ações, PDI está em andamento
  if (acoes.length === 0) return "em_andamento";
  
  // Verificar se TODAS as ações estão concluídas
  const todasConcluidas = acoes.every(acao => 
    acao.status === "concluida" // evidência aprovada pelo Admin
  );
  
  return todasConcluidas ? "concluido" : "em_andamento";
}
```

### **Ação (Coração do PDI)**
```typescript
{
  id: number
  pdiId: number                   // PDI pai (container)
  blocoId: number                 // Competência Bloco
  macroId: number                 // Competência Macro
  microId: number                 // Competência Micro (específica)
  nome: string                    // Ex: "Curso de Gestão de Conflitos"
  descricao: string               // Detalhamento da ação
  prazo: timestamp                // DEVE estar dentro do ciclo
  status: 12 status possíveis (ver abaixo)
  justificativaReprovacaoLider?: string
  createdBy: number               // Admin que criou
  createdAt: timestamp
  updatedAt: timestamp
}
```

### **12 Status de Ação (Ciclo de Vida Completo):**
1. `pendente_aprovacao_lider` - Aguardando líder aprovar
2. `aprovada_lider` - Líder aprovou, colaborador pode iniciar
3. `reprovada_lider` - Líder reprovou, Admin precisa ajustar
4. `em_andamento` - Colaborador iniciou execução
5. `em_discussao` - Solicitação de ajuste pendente
6. `evidencia_enviada` - Colaborador enviou evidências
7. `evidencia_aprovada` - Admin aprovou evidências (intermediário)
8. `evidencia_reprovada` - Admin reprovou evidências
9. `correcao_solicitada` - Admin solicitou correção das evidências
10. `concluida` - **Ação finalizada** (evidências aprovadas + ação marcada como concluída)
11. `vencida` - Prazo expirado (job automático)
12. `cancelada` - Ação cancelada

---

## ✅ **FLUXO COMPLETO CORRIGIDO**

### **Fase 1: Criação (Admin)**
1. Admin cria **1 PDI único** para Colaborador João no Ciclo "1º Semestre 2024"
   - Título: "PDI - João Silva - 1º Semestre 2024"
   - Objetivo Geral: "Desenvolver habilidades de liderança e comunicação"
   - Status inicial: `em_andamento`

2. Admin cria **Ação 1** no PDI de João
   - Nome: "Curso de Gestão de Conflitos"
   - Competência: Liderança → Gestão de Pessoas → Resolução de Conflitos
   - Prazo: 31/03/2024
   - Status inicial: `pendente_aprovacao_lider`

3. Admin cria **Ação 2** no PDI de João
   - Nome: "Projeto Prático de Liderança"
   - Competência: Liderança → Gestão de Equipes → Delegação
   - Prazo: 30/05/2024
   - Status inicial: `pendente_aprovacao_lider`

4. Admin cria **Ação 3** no PDI de João
   - Nome: "Mentoria com Líder Sênior"
   - Competência: Comportamental → Comunicação → Feedback
   - Prazo: 30/06/2024
   - Status inicial: `pendente_aprovacao_lider`

### **Fase 2: Aprovação (Líder)**
5. Líder de João recebe notificação de 3 ações pendentes
6. Líder **aprova** Ação 1, 2 e 3
   - Ação 1 status: `aprovada_lider`
   - Ação 2 status: `aprovada_lider`
   - Ação 3 status: `aprovada_lider`
7. João recebe notificação: "Suas ações foram aprovadas"

### **Fase 3: Execução (Colaborador)**
8. João **inicia** Ação 1
   - Ação 1 status: `em_andamento`
9. João completa o curso e **envia evidências** (certificado + relatório)
   - Ação 1 status: `evidencia_enviada`
10. Admin recebe notificação e **aprova evidências** da Ação 1
    - Ação 1 status: `concluida` ✅
    - **PDI status: ainda `em_andamento`** (Ação 2 e 3 não concluídas)

11. João **inicia** Ação 2
    - Ação 2 status: `em_andamento`
12. João completa o projeto e **envia evidências** (relatório + apresentação)
    - Ação 2 status: `evidencia_enviada`
13. Admin **aprova evidências** da Ação 2
    - Ação 2 status: `concluida` ✅
    - **PDI status: ainda `em_andamento`** (Ação 3 não concluída)

14. João **inicia** Ação 3
    - Ação 3 status: `em_andamento`
15. João completa a mentoria e **envia evidências** (relatório de aprendizados)
    - Ação 3 status: `evidencia_enviada`
16. Admin **aprova evidências** da Ação 3
    - Ação 3 status: `concluida` ✅
    - **PDI status: AUTOMATICAMENTE muda para `concluido`** ✅✅✅

### **Resultado Final:**
- ✅ Ação 1: `concluida`
- ✅ Ação 2: `concluida`
- ✅ Ação 3: `concluida`
- ✅ **PDI: `concluido`** (calculado automaticamente)

---

## 🚨 **VALIDAÇÕES CRÍTICAS**

### **1. Unicidade de PDI**
```sql
-- Não pode haver 2 PDIs para o mesmo colaborador no mesmo ciclo
UNIQUE INDEX idx_pdi_colaborador_ciclo ON pdis(colaboradorId, cicloId)
```

**Validação no backend:**
```typescript
// Ao criar PDI
const pdiExistente = await db.getPDIByColaboradorAndCiclo(colaboradorId, cicloId);
if (pdiExistente) {
  throw new TRPCError({ 
    code: 'BAD_REQUEST', 
    message: 'Colaborador já possui PDI neste ciclo' 
  });
}
```

### **2. Cálculo Automático de Status**
**Admin NÃO pode alterar status do PDI manualmente**

```typescript
// Procedure de update de PDI - REMOVER campo status
update: adminProcedure
  .input(z.object({
    id: z.number(),
    titulo: z.string().optional(),
    objetivoGeral: z.string().optional(),
    // status: REMOVIDO - calculado automaticamente
  }))
```

**Trigger ou função que recalcula status:**
```typescript
// Após Admin aprovar evidências de uma ação
async function aprovarEvidencia(acaoId) {
  // 1. Marcar ação como concluída
  await db.updateAction(acaoId, { status: "concluida" });
  
  // 2. Buscar PDI da ação
  const acao = await db.getActionById(acaoId);
  const pdi = await db.getPDIById(acao.pdiId);
  
  // 3. Recalcular status do PDI
  const novoStatus = await calcularStatusPDI(pdi.id);
  
  // 4. Atualizar PDI se necessário
  if (pdi.status !== novoStatus) {
    await db.updatePDI(pdi.id, { status: novoStatus });
    
    // 5. Notificar colaborador se PDI foi concluído
    if (novoStatus === "concluido") {
      await db.createNotification({
        destinatarioId: pdi.colaboradorId,
        tipo: "pdi_concluido",
        titulo: "PDI Concluído!",
        mensagem: "Parabéns! Você concluiu todas as ações do seu PDI.",
      });
    }
  }
}
```

### **3. Validação de Prazo das Ações**
**Já implementado no backend (linhas 601-607 do routers.ts)**
```typescript
if (prazoDate < ciclo.dataInicio || prazoDate > ciclo.dataFim) {
  throw new TRPCError({ 
    code: 'BAD_REQUEST', 
    message: `Prazo deve estar entre ${ciclo.dataInicio} e ${ciclo.dataFim}` 
  });
}
```

---

## 📝 **PLANO DE IMPLEMENTAÇÃO CORRIGIDO**

### **FASE 1: Página de Gestão de PDIs** ⭐ COMEÇAR AQUI

#### **1.1 Listagem de PDIs**
- Criar página `/pdis` com DashboardLayout
- Tabela com colunas:
  - Colaborador (nome + departamento)
  - Ciclo (nome do ciclo)
  - Título do PDI
  - Progresso (ex: "2/3 ações concluídas")
  - Status (badge colorido - calculado automaticamente)
  - Data Criação
  - Ações (botão "Ver Ações")
- Botão "Novo PDI" (Admin only)
- Busca por nome do colaborador
- Filtros: Ciclo, Status, Departamento

#### **1.2 Validação de Unicidade**
**Antes de criar PDI:**
```typescript
// Verificar se colaborador já tem PDI no ciclo selecionado
const pdiExistente = trpc.pdis.getByColaboradorAndCiclo.useQuery({
  colaboradorId: selectedColaborador,
  cicloId: selectedCiclo,
});

if (pdiExistente.data) {
  toast.error("Colaborador já possui PDI neste ciclo");
  return;
}
```

#### **1.3 Criação de PDI**
- Modal "Criar Novo PDI"
- Campos:
  - **Select Colaborador** (apenas Líderes e Colaboradores ativos que TÊM líder)
  - **Select Ciclo** (apenas ciclos ativos)
  - **Input Título** (sugestão automática: "PDI - [Nome Colaborador] - [Nome Ciclo]")
  - **Textarea Objetivo Geral** (opcional)
- Validações:
  - Colaborador deve ter líder
  - Ciclo deve estar ativo
  - **Não permitir PDI duplicado** (mesmo colaborador + mesmo ciclo)
- Toast de sucesso: "PDI criado! Agora adicione ações de desenvolvimento."
- **Redirecionar automaticamente** para página de detalhes do PDI

#### **1.4 Visualização Detalhada do PDI**
- Página `/pdis/[id]`
- **Seção 1: Informações do PDI**
  - Colaborador (nome, cargo, departamento)
  - Líder (nome)
  - Ciclo (nome, período)
  - Título
  - Objetivo Geral
  - Status (badge grande - calculado automaticamente)
  - Progresso visual (barra de progresso: X/Y ações concluídas)

- **Seção 2: Ações do PDI** (tabela)
  - Colunas: Nome, Competência (Bloco→Macro→Micro), Prazo, Status, Ações
  - Badges coloridos para cada status
  - Botão "➕ Nova Ação" (abre modal de criação)
  - Botão "✏️ Editar" em cada ação (Admin)
  - Botão "🗑️ Excluir" em cada ação (Admin, com confirmação)
  - Se não houver ações: mensagem "Nenhuma ação cadastrada. Clique em 'Nova Ação' para começar."

- **Seção 3: Ações Administrativas**
  - Botão "Editar PDI" (apenas título e objetivo geral)
  - Botão "Cancelar PDI" (com confirmação e justificativa)
  - **NÃO há botão para alterar status** (calculado automaticamente)

#### **1.5 Edição de PDI**
- Modal de edição
- Campos editáveis:
  - Título
  - Objetivo Geral
- **Status NÃO é editável** (calculado automaticamente)
- Toast de sucesso após salvar

---

### **FASE 2: Criação de Ações com IA** ⭐ APÓS FASE 1

#### **2.1 Modal de Criação de Ação (Wizard em 4 Steps)**

**Step 1: Selecionar PDI**
- Se veio da página de detalhes do PDI, já vem pré-selecionado
- Caso contrário, mostrar Select de PDIs ativos
- Exibir informações do PDI: Colaborador, Ciclo, Período do ciclo

**Step 2: Selecionar Competência**
- Select Bloco (lista de blocos ativos)
- Select Macro (filtrado por Bloco selecionado)
- Select Micro (filtrado por Macro selecionado)
- Exibir hierarquia completa: Bloco → Macro → Micro

**Step 3: Definir Ação com IA ✨**
- Botão grande: **"✨ Sugerir Ação com IA"**
- Input Nome da Ação (obrigatório)
- Textarea Descrição da Ação (obrigatório)

**Fluxo da IA:**
```typescript
async function sugerirAcaoComIA(blocoId, macroId, microId) {
  // 1. Buscar nomes das competências
  const bloco = await trpc.competencias.getBlocoById.query({ id: blocoId });
  const macro = await trpc.competencias.getMacroById.query({ id: macroId });
  const micro = await trpc.competencias.getMicroById.query({ id: microId });
  
  // 2. Chamar IA com prompt estruturado
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "Você é um especialista em desenvolvimento profissional e RH. Sua tarefa é sugerir ações práticas de desenvolvimento baseadas em competências específicas."
      },
      {
        role: "user",
        content: `
          Com base na seguinte competência, sugira uma ação de desenvolvimento profissional:
          
          Bloco: ${bloco.nome}
          Macro: ${macro.nome}
          Micro: ${micro.nome} - ${micro.descricao}
          
          Forneça:
          1. Um nome curto e objetivo para a ação (máximo 60 caracteres)
          2. Uma descrição detalhada da ação (3-5 linhas) explicando:
             - O que o colaborador deve fazer
             - Como isso desenvolverá a competência
             - Resultados esperados
          
          Formato de resposta JSON:
          {
            "nome": "Nome da ação",
            "descricao": "Descrição detalhada da ação"
          }
        `
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "acao_sugerida",
        strict: true,
        schema: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome curto da ação" },
            descricao: { type: "string", description: "Descrição detalhada da ação" }
          },
          required: ["nome", "descricao"],
          additionalProperties: false
        }
      }
    }
  });
  
  // 3. Parsear resposta
  const sugestao = JSON.parse(response.choices[0].message.content);
  return sugestao;
}
```

- Botão de loading: "✨ Gerando sugestão..." (5-10 segundos)
- Após receber sugestão:
  - Preencher campos Nome e Descrição automaticamente
  - Mostrar badge: "✨ Sugerido por IA"
  - Permitir edição manual
  - Botão "🔄 Gerar nova sugestão" (caso não goste)

**Step 4: Definir Prazo**
- DatePicker com restrições:
  - Data mínima: `ciclo.dataInicio`
  - Data máxima: `ciclo.dataFim`
- Mensagem de ajuda: "Escolha uma data entre [DD/MM/AAAA] e [DD/MM/AAAA]"
- Validação visual antes de enviar

#### **2.2 Botão de Revisão Final**
- Exibir resumo completo:
  - PDI: [Colaborador] - [Ciclo]
  - Competência: [Bloco] → [Macro] → [Micro]
  - Nome: [nome da ação]
  - Descrição: [descrição]
  - Prazo: [DD/MM/AAAA]
- Botão "Criar Ação" (verde, grande)
- Toast de sucesso: "Ação criada! Líder será notificado para aprovação."

#### **2.3 Listagem de Ações na Página do PDI**
- Atualizar tabela automaticamente após criar ação
- Exibir nova ação no topo com badge "NOVA"
- Mostrar status `pendente_aprovacao_lider`

---

### **FASE 3: Interface de Aprovação (Líder)**

#### **3.1 Página de Aprovações**
- Página `/aprovacoes` (apenas para Líder)
- Listar ações com status `pendente_aprovacao_lider` de seus liderados
- Tabela com colunas:
  - Colaborador
  - PDI (título)
  - Ação (nome)
  - Competência (Bloco→Macro→Micro)
  - Prazo
  - Data Criação
  - Ações (Aprovar / Reprovar)

#### **3.2 Aprovação**
- Botão "✅ Aprovar"
- Modal de confirmação: "Tem certeza que deseja aprovar esta ação?"
- Após aprovar:
  - Ação status: `aprovada_lider`
  - Notificação para colaborador: "Ação aprovada! Você pode iniciar a execução."
  - Toast: "Ação aprovada com sucesso"

#### **3.3 Reprovação**
- Botão "❌ Reprovar"
- Modal com textarea obrigatória: "Justificativa da reprovação"
- Após reprovar:
  - Ação status: `reprovada_lider`
  - Notificação para Admin: "Ação reprovada pelo líder. Justificativa: [texto]"
  - Toast: "Ação reprovada. Admin será notificado."

---

### **FASE 4: Interface de Execução (Colaborador)**

#### **4.1 Página "Meu PDI"**
- Página `/meu-pdi` (apenas para Colaborador)
- Exibir PDI do colaborador no ciclo ativo
- Seção 1: Progresso Geral
  - Barra de progresso visual
  - "X de Y ações concluídas"
  - Status do PDI (badge)
- Seção 2: Minhas Ações
  - Listar todas as ações do PDI
  - Filtros: Todas / Pendentes / Em Andamento / Concluídas
  - Ordenação: Por prazo (mais próximo primeiro)

#### **4.2 Iniciar Execução**
- Botão "▶️ Iniciar" (apenas para ações com status `aprovada_lider`)
- Modal de confirmação: "Ao iniciar, você se compromete a executar esta ação dentro do prazo."
- Após iniciar:
  - Ação status: `em_andamento`
  - Toast: "Ação iniciada! Boa sorte!"

#### **4.3 Enviar Evidências**
- Botão "📎 Enviar Evidências" (apenas para ações `em_andamento`)
- Modal com:
  - Upload de arquivos (múltiplos)
  - Textarea para texto descritivo
  - Botão "Enviar"
- Após enviar:
  - Ação status: `evidencia_enviada`
  - Notificação para Admin: "Colaborador enviou evidências para avaliação"
  - Toast: "Evidências enviadas! Aguarde avaliação do Admin."

---

### **FASE 5: Avaliação de Evidências (Admin)**

#### **5.1 Página de Avaliação**
- Página `/avaliacoes` (apenas para Admin)
- Listar ações com status `evidencia_enviada`
- Tabela com colunas:
  - Colaborador
  - Ação (nome)
  - Competência
  - Data de Envio
  - Ações (Avaliar)

#### **5.2 Avaliar Evidências**
- Modal de avaliação:
  - Exibir arquivos enviados (download)
  - Exibir texto descritivo
  - Botões:
    - "✅ Aprovar Evidências" → Ação status: `concluida`
    - "❌ Reprovar Evidências" → Ação status: `evidencia_reprovada`
    - "🔄 Solicitar Correção" → Ação status: `correcao_solicitada`

#### **5.3 Recálculo Automático do PDI**
**Após aprovar evidências:**
```typescript
// Backend: procedure actions.approveEvidence
async function aprovarEvidencia(acaoId) {
  // 1. Atualizar ação para concluída
  await db.updateAction(acaoId, { status: "concluida" });
  
  // 2. Buscar PDI
  const acao = await db.getActionById(acaoId);
  const pdi = await db.getPDIById(acao.pdiId);
  
  // 3. Recalcular status do PDI
  const acoes = await db.getActionsByPDIId(pdi.id);
  const todasConcluidas = acoes.every(a => a.status === "concluida");
  
  // 4. Atualizar PDI se todas as ações foram concluídas
  if (todasConcluidas) {
    await db.updatePDI(pdi.id, { status: "concluido" });
    
    // 5. Notificar colaborador
    await db.createNotification({
      destinatarioId: pdi.colaboradorId,
      tipo: "pdi_concluido",
      titulo: "🎉 PDI Concluído!",
      mensagem: "Parabéns! Você concluiu todas as ações do seu PDI com sucesso.",
    });
  }
  
  return { success: true };
}
```

---

## 🎨 **DESIGN E UX**

### **Cores e Badges:**
- PDI `em_andamento`: Azul (#3B82F6)
- PDI `concluido`: Verde (#10B981)
- PDI `cancelado`: Cinza (#6B7280)

### **Ações:**
- `pendente_aprovacao_lider`: Laranja (#F59E0B)
- `aprovada_lider`: Verde Claro (#34D399)
- `reprovada_lider`: Vermelho (#EF4444)
- `em_andamento`: Azul (#3B82F6)
- `evidencia_enviada`: Roxo (#8B5CF6)
- `concluida`: Verde Escuro (#059669)
- `vencida`: Cinza Escuro (#374151)

### **Ícones:**
- PDI: 📋 (ClipboardList)
- Ação: ✅ (CheckSquare)
- Competência: 🎯 (Target)
- IA: ✨ (Sparkles)
- Prazo: 📅 (Calendar)
- Evidências: 📎 (Paperclip)
- Progresso: 📊 (BarChart)

---

## ⚠️ **ALTERAÇÕES NECESSÁRIAS NO BACKEND**

### **1. Adicionar Validação de Unicidade**
```typescript
// server/routers.ts - procedure pdis.create
create: adminProcedure
  .input(z.object({
    colaboradorId: z.number(),
    cicloId: z.number(),
    titulo: z.string().min(1, "Título é obrigatório"),
    objetivoGeral: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // ADICIONAR: Verificar se já existe PDI para este colaborador neste ciclo
    const pdiExistente = await db.getPDIByColaboradorAndCiclo(
      input.colaboradorId, 
      input.cicloId
    );
    
    if (pdiExistente) {
      throw new TRPCError({ 
        code: 'BAD_REQUEST', 
        message: 'Colaborador já possui PDI neste ciclo' 
      });
    }
    
    await db.createPDI({
      ...input,
      createdBy: ctx.user!.id,
    });
    return { success: true };
  }),
```

### **2. Adicionar Função de Busca por Colaborador e Ciclo**
```typescript
// server/db.ts
export async function getPDIByColaboradorAndCiclo(
  colaboradorId: number, 
  cicloId: number
) {
  const [pdi] = await db
    .select()
    .from(pdis)
    .where(
      and(
        eq(pdis.colaboradorId, colaboradorId),
        eq(pdis.cicloId, cicloId)
      )
    )
    .limit(1);
  return pdi;
}
```

### **3. Remover Edição Manual de Status do PDI**
```typescript
// server/routers.ts - procedure pdis.update
update: adminProcedure
  .input(z.object({
    id: z.number(),
    titulo: z.string().optional(),
    objetivoGeral: z.string().optional(),
    // REMOVER: status (calculado automaticamente)
  }))
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    await db.updatePDI(id, data);
    return { success: true };
  }),
```

### **4. Adicionar Procedure de Aprovação de Evidências com Recálculo**
```typescript
// server/routers.ts - adicionar em actions router
approveEvidence: adminProcedure
  .input(z.object({ 
    acaoId: z.number(),
    justificativa: z.string().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Atualizar ação para concluída
    await db.updateAction(input.acaoId, { status: "concluida" });
    
    // 2. Buscar PDI da ação
    const acao = await db.getActionById(input.acaoId);
    if (!acao) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
    }
    
    const pdi = await db.getPDIById(acao.pdiId);
    if (!pdi) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'PDI não encontrado' });
    }
    
    // 3. Recalcular status do PDI
    const acoes = await db.getActionsByPDIId(pdi.id);
    const todasConcluidas = acoes.every(a => a.status === "concluida");
    
    // 4. Atualizar PDI se todas as ações foram concluídas
    if (todasConcluidas && pdi.status !== "concluido") {
      await db.updatePDI(pdi.id, { status: "concluido" });
      
      // 5. Notificar colaborador
      await db.createNotification({
        destinatarioId: pdi.colaboradorId,
        tipo: "pdi_concluido",
        titulo: "🎉 PDI Concluído!",
        mensagem: "Parabéns! Você concluiu todas as ações do seu PDI com sucesso.",
      });
    }
    
    // 6. Notificar colaborador sobre aprovação da evidência
    await db.createNotification({
      destinatarioId: pdi.colaboradorId,
      tipo: "evidencia_aprovada",
      titulo: "Evidência Aprovada",
      mensagem: `Sua evidência da ação "${acao.nome}" foi aprovada!`,
    });
    
    return { success: true, pdiConcluido: todasConcluidas };
  }),
```

### **5. Adicionar Procedure para Buscar PDI por Colaborador e Ciclo**
```typescript
// server/routers.ts - adicionar em pdis router
getByColaboradorAndCiclo: protectedProcedure
  .input(z.object({ 
    colaboradorId: z.number(),
    cicloId: z.number()
  }))
  .query(async ({ input }) => {
    return await db.getPDIByColaboradorAndCiclo(
      input.colaboradorId, 
      input.cicloId
    );
  }),
```

---

## ✅ **CHECKLIST ANTES DE COMEÇAR IMPLEMENTAÇÃO**

- [x] Entender que PDI é único por colaborador/ciclo
- [x] Entender que status do PDI é calculado automaticamente
- [x] Entender que PDI só é concluído quando TODAS as evidências são aprovadas
- [x] Mapear alterações necessárias no backend
- [x] Planejar integração com IA para sugestão de ações
- [x] Definir fluxo completo: Criação → Aprovação → Execução → Evidências → Conclusão
- [ ] Obter aprovação do usuário para o plano corrigido
- [ ] Implementar alterações no backend (validações + recálculo automático)
- [ ] Iniciar implementação FASE 1: Página de Gestão de PDIs

---

## 🚀 **PRÓXIMO PASSO**

**Aguardando aprovação do usuário para:**
1. Implementar alterações no backend (validações + recálculo automático)
2. Iniciar FASE 1: Página de Gestão de PDIs

Após aprovação, começarei pelas alterações críticas no backend e depois pela listagem de PDIs.
