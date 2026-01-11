# 📋 Análise Completa: Implementação de PDI e Ações

## 🎯 **OBJETIVO GERAL**

Implementar as páginas de gestão de PDI e Ações, que são o **coração do sistema**. As ações compõem um PDI e definem o plano de desenvolvimento do colaborador.

---

## 🏗️ **ARQUITETURA DO SISTEMA**

### **Hierarquia:**
```
Ciclo Semestral (período)
  └── PDI (plano do colaborador)
       └── Ações (atividades de desenvolvimento)
            └── Competências (Bloco → Macro → Micro)
```

### **Fluxo Completo:**

1. **Admin cria Ciclo Semestral** (ex: 1º Semestre 2024)
2. **Admin cria PDI** para um colaborador específico vinculado ao ciclo
3. **Admin cria Ações** dentro do PDI, cada ação vinculada a uma competência Micro
4. **Líder aprova/reprova** as ações criadas
5. **Colaborador executa** as ações aprovadas
6. **Colaborador envia evidências** de conclusão
7. **Admin avalia evidências** e conclui ou solicita correção

---

## 📊 **ESTRUTURA DE DADOS**

### **PDI (Plano de Desenvolvimento Individual)**
```typescript
{
  id: number
  colaboradorId: number          // Quem vai executar
  cicloId: number                 // Período de vigência
  titulo: string                  // Ex: "Desenvolvimento em Liderança"
  objetivoGeral?: string          // Descrição do objetivo
  status: "em_andamento" | "concluido" | "cancelado"
  createdBy: number               // Admin que criou
  createdAt: timestamp
  updatedAt: timestamp
}
```

### **Ação (Atividade de Desenvolvimento)**
```typescript
{
  id: number
  pdiId: number                   // PDI pai
  blocoId: number                 // Competência Bloco
  macroId: number                 // Competência Macro
  microId: number                 // Competência Micro (específica)
  nome: string                    // Ex: "Curso de Gestão de Conflitos"
  descricao: string               // Detalhamento da ação
  prazo: timestamp                // DEVE estar dentro do ciclo
  status: 11 status possíveis (ver abaixo)
  justificativaReprovacaoLider?: string
  createdBy: number               // Admin que criou
  createdAt: timestamp
  updatedAt: timestamp
}
```

### **11 Status de Ação:**
1. `pendente_aprovacao_lider` - Aguardando líder aprovar
2. `aprovada_lider` - Líder aprovou
3. `reprovada_lider` - Líder reprovou
4. `em_andamento` - Colaborador iniciou execução
5. `em_discussao` - Solicitação de ajuste pendente
6. `evidencia_enviada` - Colaborador enviou evidências
7. `evidencia_aprovada` - Admin aprovou evidências
8. `evidencia_reprovada` - Admin reprovou evidências
9. `correcao_solicitada` - Admin solicitou correção
10. `concluida` - Ação finalizada com sucesso
11. `vencida` - Prazo expirado (job automático)
12. `cancelada` - Ação cancelada

---

## ✅ **BACKEND JÁ IMPLEMENTADO**

### **Procedures tRPC de PDI:**
- ✅ `pdis.list` - Listar todos os PDIs (Admin)
- ✅ `pdis.getById` - Buscar PDI por ID
- ✅ `pdis.getByColaborador` - PDIs de um colaborador
- ✅ `pdis.getByCiclo` - PDIs de um ciclo
- ✅ `pdis.myPDIs` - PDIs do usuário logado
- ✅ `pdis.create` - Criar PDI (Admin)
- ✅ `pdis.update` - Atualizar status do PDI (Admin)
- ✅ `pdis.delete` - Excluir PDI (Admin)

### **Procedures tRPC de Ações:**
- ✅ `actions.list` - Listar todas as ações (Admin)
- ✅ `actions.getById` - Buscar ação por ID
- ✅ `actions.getByPDI` - Ações de um PDI específico
- ✅ `actions.myActions` - Ações do usuário logado
- ✅ `actions.pendingApproval` - Ações pendentes de aprovação (Admin/Líder)
- ✅ `actions.create` - Criar ação (Admin) **COM VALIDAÇÃO DE PRAZO**
- ✅ `actions.update` - Atualizar ação (Admin)
- ✅ `actions.delete` - Excluir ação (Admin)
- ✅ `actions.approve` - Líder aprovar ação
- ✅ `actions.reject` - Líder reprovar ação
- ✅ `actions.startExecution` - Colaborador iniciar execução

### **Validações Implementadas:**
- ✅ Prazo da ação DEVE estar dentro do período do ciclo
- ✅ Notificações automáticas para líder quando ação é criada
- ✅ Notificações para colaborador quando ação é aprovada/reprovada

---

## 🚨 **PONTOS CRÍTICOS IDENTIFICADOS**

### **1. Integração com IA para Sugestão de Ações**
**Requisito do usuário:**
> "ao criar a ação precisamos que este campo possa ter a ajuda da ia para criar os planos de desenvolvimento com base nas macro e micro areas"

**Solução:**
- Adicionar botão "✨ Sugerir com IA" no formulário de criação de ação
- IA recebe: Bloco, Macro, Micro selecionados
- IA sugere: Nome da ação + Descrição detalhada
- Admin pode aceitar, editar ou rejeitar sugestão

### **2. Dependência de Criação**
**Ordem obrigatória:**
1. Criar Ciclo Semestral
2. Criar PDI vinculado ao ciclo
3. Criar Ações vinculadas ao PDI

**Validações necessárias:**
- Não permitir criar PDI se não houver ciclo ativo
- Não permitir criar Ação se não houver PDI
- Validar que colaborador tem líder antes de criar PDI

### **3. Filtros e Visualizações**
**Admin precisa ver:**
- PDIs por colaborador
- PDIs por ciclo
- PDIs por departamento
- Ações por PDI
- Ações por status
- Ações pendentes de aprovação

**Líder precisa ver:**
- PDIs de seus liderados
- Ações pendentes de aprovação de seus liderados

**Colaborador precisa ver:**
- Seus próprios PDIs
- Suas próprias ações
- Status de cada ação

---

## 📝 **PLANO DE IMPLEMENTAÇÃO**

### **FASE 1: Página de Gestão de PDIs** ⭐ COMEÇAR AQUI

#### **1.1 Listagem de PDIs**
- [ ] Criar página `/pdis` com DashboardLayout
- [ ] Tabela com colunas: Colaborador, Ciclo, Título, Status, Ações (contador), Data Criação
- [ ] Badges coloridos para status (em_andamento=azul, concluido=verde, cancelado=cinza)
- [ ] Botão "Novo PDI" (Admin only)
- [ ] Busca por nome do colaborador ou título
- [ ] Filtros: Ciclo, Status, Departamento

#### **1.2 Criação de PDI**
- [ ] Modal "Criar Novo PDI"
- [ ] Campos:
  - Select Colaborador (apenas Líderes e Colaboradores ativos)
  - Select Ciclo (apenas ciclos ativos)
  - Input Título (obrigatório)
  - Textarea Objetivo Geral (opcional)
- [ ] Validações:
  - Colaborador deve ter líder
  - Ciclo deve estar ativo
  - Não permitir PDI duplicado (mesmo colaborador + mesmo ciclo)
- [ ] Toast de sucesso após criar

#### **1.3 Visualização de PDI**
- [ ] Ao clicar na linha, abrir página `/pdis/[id]`
- [ ] Exibir informações do PDI
- [ ] Listar ações do PDI (mini-tabela)
- [ ] Botão "Adicionar Ação" → redireciona para criação de ação
- [ ] Botão "Editar PDI" (apenas status)
- [ ] Botão "Excluir PDI" (com confirmação)

#### **1.4 Edição e Exclusão**
- [ ] Modal de edição: apenas status
- [ ] Modal de confirmação antes de excluir
- [ ] Validar se há ações vinculadas antes de excluir

---

### **FASE 2: Página de Gestão de Ações** ⭐ APÓS FASE 1

#### **2.1 Criação de Ação (CRÍTICO - COM IA)**
- [ ] Modal "Criar Nova Ação"
- [ ] Campos:
  - Select PDI (obrigatório)
  - Select Bloco (obrigatório)
  - Select Macro (filtrado por Bloco selecionado)
  - Select Micro (filtrado por Macro selecionado)
  - Input Nome (obrigatório)
  - Textarea Descrição (obrigatório)
  - DatePicker Prazo (obrigatório, min=início ciclo, max=fim ciclo)
  - **Botão "✨ Sugerir com IA"** (ao lado de Nome e Descrição)

#### **2.2 Integração com IA**
- [ ] Função `generateActionSuggestion(blocoId, macroId, microId)`
- [ ] Usar `invokeLLM` do backend
- [ ] Prompt: "Com base na competência [Bloco] → [Macro] → [Micro], sugira um nome e descrição detalhada para uma ação de desenvolvimento profissional."
- [ ] Resposta estruturada JSON: `{ nome: string, descricao: string }`
- [ ] Botão de loading enquanto IA processa
- [ ] Preencher campos automaticamente com sugestão
- [ ] Permitir edição manual após sugestão

#### **2.3 Validações de Prazo**
- [ ] DatePicker com datas mínima/máxima baseadas no ciclo do PDI
- [ ] Mensagem de ajuda: "Escolha uma data entre [início] e [fim] do ciclo"
- [ ] Validação visual antes de enviar
- [ ] Backend já valida (linhas 601-607 do routers.ts)

#### **2.4 Listagem de Ações**
- [ ] Tabela na página `/pdis/[id]` com ações do PDI
- [ ] Colunas: Nome, Competência (Bloco→Macro→Micro), Prazo, Status, Ações
- [ ] Badges coloridos para cada status
- [ ] Botão "Editar" (Admin)
- [ ] Botão "Excluir" (Admin, com confirmação)

#### **2.5 Edição de Ação**
- [ ] Modal de edição (Admin)
- [ ] Permitir editar: Nome, Descrição, Competências, Prazo
- [ ] Mesmas validações da criação
- [ ] Botão "✨ Sugerir com IA" também disponível

---

### **FASE 3: Interface de Aprovação (Líder)**
- [ ] Página `/aprovacoes` para Líder
- [ ] Listar ações pendentes de aprovação
- [ ] Botão "Aprovar" e "Reprovar"
- [ ] Modal de reprovação com justificativa obrigatória
- [ ] Notificações após aprovação/reprovação

---

### **FASE 4: Interface de Execução (Colaborador)**
- [ ] Página `/meu-pdi` para Colaborador
- [ ] Listar seus PDIs e ações
- [ ] Botão "Iniciar Execução" para ações aprovadas
- [ ] Botão "Enviar Evidências" para ações em andamento
- [ ] Upload de arquivos + textos descritivos

---

### **FASE 5: Testes e Validações**
- [ ] Criar testes unitários para criação de PDI
- [ ] Criar testes unitários para criação de ação
- [ ] Criar testes unitários para validação de prazo
- [ ] Criar testes unitários para sugestão de IA
- [ ] Testar fluxo completo: Ciclo → PDI → Ação → Aprovação → Execução

---

## 🎨 **DESIGN E UX**

### **Cores e Badges:**
- `em_andamento` / `pendente_aprovacao_lider`: Azul
- `aprovada_lider` / `concluida` / `evidencia_aprovada`: Verde
- `reprovada_lider` / `evidencia_reprovada` / `cancelada`: Vermelho
- `em_discussao` / `correcao_solicitada`: Laranja
- `evidencia_enviada`: Roxo
- `vencida`: Cinza escuro

### **Ícones:**
- PDI: 📋 (ClipboardList)
- Ação: ✅ (CheckSquare)
- Competência: 🎯 (Target)
- IA: ✨ (Sparkles)
- Prazo: 📅 (Calendar)

---

## ⚠️ **RISCOS E MITIGAÇÕES**

### **Risco 1: IA não gerar sugestões relevantes**
**Mitigação:**
- Prompt bem estruturado com contexto completo
- Permitir regeneração de sugestão
- Sempre permitir edição manual

### **Risco 2: Complexidade do formulário de ação**
**Mitigação:**
- Dividir em steps (Wizard)
- Step 1: Selecionar PDI
- Step 2: Selecionar Competências (Bloco→Macro→Micro)
- Step 3: Definir Nome e Descrição (com IA)
- Step 4: Definir Prazo

### **Risco 3: Performance com muitas ações**
**Mitigação:**
- Paginação na listagem
- Filtros eficientes
- Lazy loading de ações ao expandir PDI

---

## 📌 **DECISÕES TÉCNICAS**

1. **Usar Wizard (Steps) para criação de ação** - Reduz complexidade visual
2. **IA como assistente opcional** - Não obrigatório, mas incentivado
3. **Validação de prazo no frontend E backend** - Dupla camada de segurança
4. **Notificações automáticas** - Já implementadas no backend
5. **DatePicker com restrições** - Melhor UX que erro após submit

---

## ✅ **CHECKLIST ANTES DE COMEÇAR**

- [x] Ler e entender schema completo
- [x] Ler e entender procedures tRPC
- [x] Identificar validações existentes
- [x] Mapear fluxo completo de status
- [x] Definir estrutura de páginas
- [x] Planejar integração com IA
- [x] Documentar riscos e mitigações
- [ ] Obter aprovação do usuário para o plano
- [ ] Iniciar implementação FASE 1

---

## 🚀 **PRÓXIMO PASSO**

**Aguardando aprovação do usuário para iniciar FASE 1: Página de Gestão de PDIs**

Após aprovação, começarei pela listagem básica de PDIs, depois criação, e finalmente visualização detalhada com ações.
