# 🎯 Impacto de Cada Status no PDI e no Ciclo de Desenvolvimento

## 📊 Visão Geral

Este documento explica como cada status de ação impacta:
1. **Status do PDI** (em_andamento, concluido, cancelado)
2. **Progresso do ciclo** de desenvolvimento do colaborador
3. **Métricas e indicadores** do sistema

---

## 🔄 Cálculo do Status do PDI

### **Regra Fundamental:**
O status do PDI é **calculado automaticamente** baseado no status de TODAS as suas ações.

```typescript
function calcularStatusPDI(pdiId: number): "em_andamento" | "concluido" | "cancelado" {
  const acoes = getAcoesByPDI(pdiId);
  
  // Se não há ações, PDI está em andamento
  if (acoes.length === 0) {
    return "em_andamento";
  }
  
  // Filtrar apenas ações não canceladas
  const acoesAtivas = acoes.filter(a => a.status !== "cancelada");
  
  // Se todas as ações foram canceladas
  if (acoesAtivas.length === 0) {
    return "cancelado";
  }
  
  // Verificar se TODAS as ações ativas estão concluídas
  const todasConcluidas = acoesAtivas.every(a => a.status === "concluida");
  
  return todasConcluidas ? "concluido" : "em_andamento";
}
```

### **Quando Recalcular:**
- ✅ Após Admin aprovar evidências → `concluida`
- ✅ Após Admin cancelar ação → `cancelada`
- ✅ Após Admin reabrir ação vencida → `em_andamento`
- ❌ **NÃO recalcular** em outras transições (não afetam conclusão do PDI)

---

## 📋 Impacto de Cada Status no PDI

### **1. pendente_aprovacao_lider** 🟠

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI
- PDI permanece `em_andamento`

**Impacto no Progresso:**
- Ação ainda não iniciada
- Não aparece no cálculo de "X de Y ações concluídas"

**Métricas:**
- Tempo médio de aprovação do líder
- Taxa de aprovação vs reprovação

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: em_andamento 🔵
- Ação 3: pendente_aprovacao_lider 🟠 ← NÃO conta

Progresso: 1/2 ações concluídas (50%)
Status PDI: em_andamento
```

---

### **2. aprovada_lider** ✅

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI (ainda não iniciada)
- PDI permanece `em_andamento`

**Impacto no Progresso:**
- Ação aprovada mas não iniciada
- Aparece como "aguardando início"

**Métricas:**
- Tempo entre aprovação e início da execução
- Taxa de ações aprovadas que são iniciadas

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: em_andamento 🔵
- Ação 3: aprovada_lider ✅ ← NÃO conta

Progresso: 1/2 ações concluídas (50%)
Status PDI: em_andamento
```

---

### **3. reprovada_lider** ❌

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI
- PDI permanece `em_andamento`
- Ação fica "invisível" para o colaborador

**Impacto no Progresso:**
- Não aparece no cálculo de progresso
- Admin precisa ajustar e reenviar

**Métricas:**
- Taxa de reprovação por líder
- Motivos mais comuns de reprovação
- Tempo médio para ajuste e reenvio

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: em_andamento 🔵
- Ação 3: reprovada_lider ❌ ← NÃO conta

Progresso: 1/2 ações concluídas (50%)
Status PDI: em_andamento
```

---

### **4. em_andamento** 🔵

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI (ainda não concluída)
- PDI permanece `em_andamento`

**Impacto no Progresso:**
- Ação em execução
- Aparece como "em andamento" no progresso

**Métricas:**
- Tempo médio de execução
- Taxa de conclusão dentro do prazo
- Ações próximas do vencimento (7 dias)

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: em_andamento 🔵 ← NÃO conta
- Ação 3: em_andamento 🔵 ← NÃO conta

Progresso: 1/3 ações concluídas (33%)
Status PDI: em_andamento
```

**Alerta Especial:**
- **7 dias antes do prazo:** Badge "⚠️ Vence em 7 dias"
- **No dia do prazo:** Badge "🚨 Vence hoje!"

---

### **5. em_discussao** 💬

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI
- PDI permanece `em_andamento`

**Impacto no Progresso:**
- Ação pausada aguardando decisão do Admin
- Aparece como "em discussão"

**Métricas:**
- Tempo médio de resolução de ajustes
- Taxa de aprovação vs reprovação de ajustes
- Tipos de ajustes mais solicitados

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: em_discussao 💬 ← NÃO conta
- Ação 3: em_andamento 🔵

Progresso: 1/3 ações concluídas (33%)
Status PDI: em_andamento
```

---

### **6. evidencia_enviada** 📎

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI (aguardando avaliação)
- PDI permanece `em_andamento`

**Impacto no Progresso:**
- Ação aguardando avaliação
- Aparece como "evidência enviada"

**Métricas:**
- Tempo médio de avaliação pelo Admin
- Taxa de aprovação vs reprovação de evidências
- Quantidade de evidências enviadas por ação

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: evidencia_enviada 📎 ← NÃO conta
- Ação 3: em_andamento 🔵

Progresso: 1/3 ações concluídas (33%)
Status PDI: em_andamento
```

---

### **7. evidencia_aprovada** ✅

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI (ainda não marcada como concluída)
- PDI permanece `em_andamento`

**Impacto no Progresso:**
- Ação com evidências aprovadas, aguardando conclusão final
- Aparece como "evidência aprovada"

**Métricas:**
- Tempo entre aprovação de evidências e conclusão final

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: evidencia_aprovada ✅ ← NÃO conta (ainda)
- Ação 3: em_andamento 🔵

Progresso: 1/3 ações concluídas (33%)
Status PDI: em_andamento
```

**Observação:**
- Admin pode querer aguardar outras validações antes de marcar como concluída
- Este é um status intermediário

---

### **8. evidencia_reprovada** ❌

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI
- PDI permanece `em_andamento`

**Impacto no Progresso:**
- Ação com evidências reprovadas, precisa refazer
- Aparece como "evidência reprovada"

**Métricas:**
- Taxa de reprovação de evidências
- Motivos mais comuns de reprovação
- Tempo médio para refazer evidências

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: evidencia_reprovada ❌ ← NÃO conta
- Ação 3: em_andamento 🔵

Progresso: 1/3 ações concluídas (33%)
Status PDI: em_andamento
```

---

### **9. correcao_solicitada** 🔄

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI
- PDI permanece `em_andamento`

**Impacto no Progresso:**
- Ação aguardando correção de evidências
- Aparece como "correção solicitada"

**Métricas:**
- Tempo médio para correção
- Taxa de aprovação após correção
- Tipos de correções mais solicitadas

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: correcao_solicitada 🔄 ← NÃO conta
- Ação 3: em_andamento 🔵

Progresso: 1/3 ações concluídas (33%)
Status PDI: em_andamento
```

---

### **10. concluida** 🎉

**Impacto no PDI:**
- ✅ **CONTA** para conclusão do PDI
- **Se TODAS as ações ativas estão `concluida`** → PDI status = `concluido` ✅✅✅

**Impacto no Progresso:**
- Ação finalizada com sucesso
- Aparece no cálculo de "X de Y ações concluídas"

**Métricas:**
- Taxa de conclusão dentro do prazo
- Tempo médio de conclusão
- Taxa de conclusão por competência

**Exemplo 1 - PDI ainda em andamento:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: concluida ✅
- Ação 3: em_andamento 🔵

Progresso: 2/3 ações concluídas (67%)
Status PDI: em_andamento ← Ainda tem ação pendente
```

**Exemplo 2 - PDI concluído:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: concluida ✅
- Ação 3: concluida ✅

Progresso: 3/3 ações concluídas (100%)
Status PDI: concluido ✅✅✅ ← TODAS as ações concluídas!

Notificação enviada:
"🎉 PDI Concluído! Parabéns! Você concluiu todas as ações do seu PDI com sucesso."
```

---

### **11. vencida** ⏰

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI
- PDI permanece `em_andamento`
- **NÃO impede** conclusão do PDI (Admin pode reabrir ou cancelar)

**Impacto no Progresso:**
- Ação vencida, precisa de ação do Admin
- Aparece como "vencida" no progresso

**Métricas:**
- Taxa de ações vencidas
- Tempo médio de atraso
- Taxa de reabertura vs cancelamento

**Exemplo:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: vencida ⏰ ← NÃO conta
- Ação 3: em_andamento 🔵

Progresso: 1/3 ações concluídas (33%)
Status PDI: em_andamento
```

**Ações do Admin:**
- **Reabrir com novo prazo:** Ação volta para `em_andamento`
- **Cancelar:** Ação vai para `cancelada` (não conta mais)

---

### **12. cancelada** 🚫

**Impacto no PDI:**
- ❌ **NÃO conta** para conclusão do PDI
- **Ação é excluída do cálculo de progresso**
- Se TODAS as ações restantes estão `concluida` → PDI pode ser concluído

**Impacto no Progresso:**
- Ação cancelada não aparece no cálculo
- Progresso é recalculado sem essa ação

**Métricas:**
- Taxa de cancelamento
- Motivos mais comuns de cancelamento
- Impacto no tempo de conclusão do PDI

**Exemplo 1 - Ação cancelada:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: cancelada 🚫 ← NÃO conta
- Ação 3: em_andamento 🔵

Progresso: 1/2 ações concluídas (50%) ← Ação 2 não conta
Status PDI: em_andamento
```

**Exemplo 2 - PDI concluído após cancelamento:**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: concluida ✅
- Ação 2: concluida ✅
- Ação 3: cancelada 🚫 ← NÃO conta

Progresso: 2/2 ações concluídas (100%) ← Ação 3 não conta
Status PDI: concluido ✅✅✅ ← TODAS as ações ativas concluídas!
```

**Exemplo 3 - PDI cancelado (todas as ações canceladas):**
```
PDI: João Silva - 1º Semestre 2024
- Ação 1: cancelada 🚫
- Ação 2: cancelada 🚫
- Ação 3: cancelada 🚫

Progresso: 0/0 ações concluídas (N/A)
Status PDI: cancelado 🚫 ← TODAS as ações canceladas
```

---

## 📊 Tabela Resumo de Impacto

| Status | Conta para PDI? | Aparece no Progresso? | Recalcula PDI? | Pode Concluir PDI? |
|--------|----------------|----------------------|----------------|-------------------|
| `pendente_aprovacao_lider` | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `aprovada_lider` | ❌ Não | ✅ Sim (aguardando) | ❌ Não | ❌ Não |
| `reprovada_lider` | ❌ Não | ❌ Não | ❌ Não | ❌ Não |
| `em_andamento` | ❌ Não | ✅ Sim | ❌ Não | ❌ Não |
| `em_discussao` | ❌ Não | ✅ Sim | ❌ Não | ❌ Não |
| `evidencia_enviada` | ❌ Não | ✅ Sim | ❌ Não | ❌ Não |
| `evidencia_aprovada` | ❌ Não | ✅ Sim | ❌ Não | ❌ Não |
| `evidencia_reprovada` | ❌ Não | ✅ Sim | ❌ Não | ❌ Não |
| `correcao_solicitada` | ❌ Não | ✅ Sim | ❌ Não | ❌ Não |
| **`concluida`** | **✅ SIM** | **✅ Sim** | **✅ SIM** | **✅ SIM** |
| `vencida` | ❌ Não | ✅ Sim | ❌ Não | ❌ Não |
| `cancelada` | ❌ Não | ❌ Não (excluída) | ✅ Sim | ⚠️ Depende* |

**\* Depende:** Se todas as ações restantes (não canceladas) estão `concluida`, o PDI pode ser concluído.

---

## 🎯 Impacto no Ciclo de Desenvolvimento

### **Ciclo Semestral: 01/01/2024 a 30/06/2024**

```
Início do Ciclo (01/01)
  ↓
Admin cria PDI para João
  ↓
Admin cria 3 ações (prazo: 31/03, 30/04, 30/05)
  ↓
Líder aprova ações (05/01)
  ↓
João inicia Ação 1 (10/01)
  ↓
João envia evidências Ação 1 (25/03)
  ↓
Admin aprova evidências Ação 1 (28/03)
  ↓
Ação 1: concluida ✅ (28/03)
  ↓
João inicia Ação 2 (01/04)
  ↓
João envia evidências Ação 2 (25/04)
  ↓
Admin aprova evidências Ação 2 (28/04)
  ↓
Ação 2: concluida ✅ (28/04)
  ↓
João inicia Ação 3 (01/05)
  ↓
João envia evidências Ação 3 (25/05)
  ↓
Admin aprova evidências Ação 3 (28/05)
  ↓
Ação 3: concluida ✅ (28/05)
  ↓
PDI: concluido ✅✅✅ (28/05)
  ↓
Fim do Ciclo (30/06)
```

**Resultado:**
- ✅ PDI concluído **antes** do fim do ciclo (28/05 vs 30/06)
- ✅ Todas as ações concluídas dentro do prazo
- ✅ Colaborador desenvolveu 3 competências

---

## 📈 Métricas de Sucesso

### **Métricas de PDI:**
- **Taxa de conclusão de PDI:** % de PDIs concluídos no ciclo
- **Tempo médio de conclusão:** Dias entre criação e conclusão do PDI
- **Taxa de conclusão dentro do ciclo:** % de PDIs concluídos antes do fim do ciclo

### **Métricas de Ação:**
- **Taxa de conclusão de ações:** % de ações concluídas
- **Taxa de conclusão dentro do prazo:** % de ações concluídas antes do prazo
- **Tempo médio de execução:** Dias entre início e conclusão da ação
- **Taxa de aprovação de evidências:** % de evidências aprovadas na primeira tentativa

### **Métricas de Aprovação:**
- **Tempo médio de aprovação do líder:** Dias entre criação e aprovação da ação
- **Taxa de aprovação do líder:** % de ações aprovadas vs reprovadas
- **Tempo médio de avaliação de evidências:** Dias entre envio e avaliação

### **Métricas de Qualidade:**
- **Taxa de reprovação de evidências:** % de evidências reprovadas
- **Taxa de correção solicitada:** % de evidências que precisaram correção
- **Taxa de ações vencidas:** % de ações que venceram sem conclusão
- **Taxa de cancelamento:** % de ações canceladas

---

## 🔔 Alertas e Notificações Automáticas

### **Alertas de Prazo:**
- **7 dias antes do prazo:**
  - Colaborador: "⚠️ Ação vence em 7 dias: [Ação]"
  - Líder: "⚠️ Ação do colaborador [Nome] vence em 7 dias"

- **No dia do prazo:**
  - Colaborador: "🚨 Ação vence hoje! [Ação]"
  - Líder: "🚨 Ação do colaborador [Nome] vence hoje"

- **Após vencimento (job automático):**
  - Colaborador: "⏰ Ação vencida: [Ação]"
  - Líder: "⏰ Ação do colaborador [Nome] venceu"
  - Admin: "⏰ Ação vencida: [Ação] - Colaborador: [Nome]"

### **Alertas de Progresso:**
- **50% do ciclo passado:**
  - Se PDI < 50% concluído: "⚠️ Atenção! Você está atrasado no seu PDI."

- **75% do ciclo passado:**
  - Se PDI < 75% concluído: "🚨 Urgente! Prazo do ciclo se aproxima."

- **Fim do ciclo:**
  - Se PDI não concluído: "⏰ Ciclo encerrado. PDI não concluído."

---

## 🎯 Conclusão

**Regra de Ouro:**
> O PDI só é concluído quando **TODAS** as ações ativas (não canceladas) estão com status `concluida`.

**Responsabilidades:**
- **Admin:** Criar PDI e ações, avaliar evidências, recalcular status
- **Líder:** Aprovar ações, acompanhar progresso
- **Colaborador:** Executar ações, enviar evidências
- **Sistema:** Recalcular status automaticamente, enviar notificações, marcar ações vencidas

**Próximos Passos:**
1. ✅ Arquitetura documentada
2. ✅ Fluxograma de status documentado
3. ✅ Impacto no PDI documentado
4. 🔜 Implementar alterações no backend
5. 🔜 Implementar FASE 1: Página de Gestão de PDIs
