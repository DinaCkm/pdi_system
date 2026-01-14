# Varredura de Erros - Sistema de Gestão de PDI

## Resumo Executivo
- **Total de Testes**: 50
- **Testes Passando**: 34
- **Testes Falhando**: 6
- **Testes Pulados**: 10
- **Arquivos de Teste com Falhas**: 5

---

## Erros Identificados

### 1. **Erro de Validação de Tipo: `id` undefined**
**Severidade**: 🔴 CRÍTICA  
**Arquivos Afetados**: 
- `server/pdi.actions.test.ts` (linhas 180, 195)
- `server/actions.create.test.ts`
- `server/actions.adjustment.test.ts`

**Descrição**: O campo `id` está sendo recebido como `undefined` em várias mutations, causando erro de validação Zod.

**Erro Exato**:
```
TRPCError: Invalid input: expected number, received undefined
path: ["id"]
```

**Possíveis Causas**:
1. Testes não estão passando o ID corretamente
2. Função `db.createAction()` não está retornando o ID
3. Problema na geração de IDs no banco de dados

**Testes Falhando**:
- "deve criar uma ação como Admin"
- "deve aprovar uma ação como Líder"
- "deve iniciar execução de ação como Colaborador"

---

### 2. **Erro em `evidences.create.test.ts`**
**Severidade**: 🔴 CRÍTICA  
**Arquivo**: `server/evidences.create.test.ts`

**Descrição**: Testes de criação de evidências estão falhando (2 falhas)

**Possíveis Causas**:
1. Problema com o upload para S3 (implementação recente)
2. Validação de campos obrigatórios (satisfactionScore, descrição)
3. Problema com a estrutura de dados dos arquivos

---

### 3. **Erro em `adjustment.limit.test.ts`**
**Severidade**: 🟡 ALTA  
**Arquivo**: `server/adjustment.limit.test.ts`

**Descrição**: Testes de limite de solicitações de ajuste (máximo 5) estão falhando

**Testes Falhando**:
- "Bloqueio de Solicitações de Ajuste - Limite de 5"
- "Função getAdjustmentStats > deve retornar stats corretos para ação sem solicitações"
- "Função getAdjustmentStats > deve retornar motivoBloqueio='pending' quando há solicitação pendente"

**Possíveis Causas**:
1. Função `getAdjustmentStats()` não está funcionando corretamente
2. Lógica de bloqueio de solicitações não implementada
3. Problema com contagem de solicitações

---

### 4. **Erro em `actions.adjustment.test.ts`**
**Severidade**: 🟡 ALTA  
**Arquivo**: `server/actions.adjustment.test.ts`

**Descrição**: Sistema de solicitação de ajuste de ações com validação de status

**Testes Falhando**:
- "Colaborador NÃO deve conseguir solicitar ajuste em ação com status inválido"

**Possíveis Causas**:
1. Validação de status não está funcionando
2. Permissões de colaborador não estão sendo verificadas

---

## Análise por Severidade

### 🔴 CRÍTICA (3 problemas)
1. Erro de `id` undefined em múltiplos testes
2. Falhas em `evidences.create.test.ts`
3. Impacto direto na funcionalidade de criar ações e evidências

### 🟡 ALTA (2 problemas)
1. Sistema de limite de ajustes não funcionando
2. Validação de status em solicitações de ajuste

### 🟢 MÉDIA (0 problemas)
- Nenhum identificado neste momento

---

## Próximas Etapas

1. **Investigar erro de `id` undefined**
   - Verificar se `db.createAction()` retorna o ID corretamente
   - Verificar testes para garantir que estão passando dados corretos

2. **Corrigir testes de evidências**
   - Validar estrutura de dados esperada pela mutation
   - Testar upload para S3

3. **Implementar/corrigir lógica de limite de ajustes**
   - Verificar função `getAdjustmentStats()`
   - Implementar bloqueio após 5 solicitações

4. **Validar permissões e status**
   - Verificar lógica de validação de status
   - Testar permissões de colaborador

---

## Recomendações

1. **Prioridade 1**: Corrigir erro de `id` undefined (afeta 3 testes críticos)
2. **Prioridade 2**: Corrigir testes de evidências (funcionalidade recém-implementada)
3. **Prioridade 3**: Implementar sistema de limite de ajustes
4. **Prioridade 4**: Validar permissões e status

---

## Notas Adicionais

- Os testes que estão passando (34/50) indicam que a maioria da funcionalidade está funcionando
- Os testes pulados (10) podem ser testes condicionais ou que requerem setup específico
- A taxa de sucesso atual é de 68% (34/50)


---

## Análise Detalhada dos Erros

### Erro 1: `id` undefined em `pdi.actions.test.ts`

**Arquivo**: `server/pdi.actions.test.ts`  
**Linhas**: 173, 180-181, 195-196

**Código Problemático**:
```typescript
// Linha 173: Atribui actionId dentro do primeiro teste
actionId = actions[0]!.id;

// Linha 180-181: Segundo teste tenta usar actionId
const result = await caller.actions.approve({
  id: actionId,  // ← Pode estar undefined
});
```

**Causa Raiz**: 
A variável `actionId` é declarada no escopo do `describe` (linha 31), mas é atribuída apenas dentro do primeiro teste. Se o primeiro teste falhar ou não executar completamente, `actionId` permanecerá `undefined` quando o segundo teste tentar usá-lo.

**Solução Recomendada**:
1. Garantir que o primeiro teste execute com sucesso antes do segundo
2. Usar `beforeEach` ou `beforeAll` para setup compartilhado
3. Adicionar validação para garantir que `actionId` não é undefined

---

### Erro 2: Falhas em `evidences.create.test.ts`

**Arquivo**: `server/evidences.create.test.ts`

**Possíveis Causas**:
1. **Upload para S3**: A implementação recente de upload para S3 pode estar falhando
2. **Validação de campos**: O campo `satisfactionScore` foi adicionado recentemente e pode não estar sendo validado corretamente
3. **Estrutura de dados**: Os testes podem estar enviando dados em formato incorreto

**Ação Necessária**: 
- Verificar se a função `storagePut` está sendo chamada corretamente
- Validar se os testes estão passando os dados no formato esperado
- Testar upload de arquivo manualmente

---

### Erro 3: Limite de Solicitações de Ajuste

**Arquivo**: `server/adjustment.limit.test.ts`

**Função Problemática**: `getAdjustmentStats()`

**Descrição**: 
O sistema deveria bloquear solicitações de ajuste após 5 tentativas, mas a lógica não está funcionando corretamente.

**Possíveis Causas**:
1. Função `getAdjustmentStats()` não está retornando dados corretos
2. Lógica de contagem de solicitações está incorreta
3. Campo `motivoBloqueio` não está sendo preenchido corretamente

---

### Erro 4: Validação de Status em Solicitações de Ajuste

**Arquivo**: `server/actions.adjustment.test.ts`

**Teste Falhando**: "Colaborador NÃO deve conseguir solicitar ajuste em ação com status inválido"

**Descrição**: 
A validação de status não está impedindo que colaboradores solicitem ajustes em ações com status inválido.

**Possíveis Causas**:
1. Validação de status não está implementada
2. Permissões de colaborador não estão sendo verificadas
3. Lógica de status está incorreta

---

## Impacto dos Erros

| Erro | Funcionalidade Afetada | Usuários Afetados | Prioridade |
|------|------------------------|-------------------|-----------|
| `id` undefined | Criação e aprovação de ações | Administradores, Líderes | 🔴 CRÍTICA |
| Evidências | Envio de evidências | Colaboradores | 🔴 CRÍTICA |
| Limite de ajustes | Limite de 5 solicitações | Colaboradores, Administradores | 🟡 ALTA |
| Validação de status | Validação de status | Colaboradores | 🟡 ALTA |

---

## Plano de Ação

### Fase 1: Corrigir Erro Crítico de `id` undefined
1. Investigar por que `actionId` fica undefined
2. Verificar se `db.createAction()` retorna ID corretamente
3. Adicionar validação nos testes
4. Executar testes novamente

### Fase 2: Corrigir Testes de Evidências
1. Verificar estrutura de dados esperada
2. Testar upload para S3 manualmente
3. Validar campos obrigatórios
4. Executar testes novamente

### Fase 3: Implementar Limite de Ajustes
1. Verificar função `getAdjustmentStats()`
2. Implementar lógica de bloqueio após 5 solicitações
3. Adicionar campo `motivoBloqueio` corretamente
4. Executar testes novamente

### Fase 4: Validar Status
1. Implementar validação de status
2. Verificar permissões de colaborador
3. Testar diferentes cenários de status
4. Executar testes novamente

---

## Próximas Ações Imediatas

1. **Investigar `id` undefined** - Executar teste com debug
2. **Revisar implementação de evidências** - Verificar upload S3
3. **Testar manualmente** - Validar fluxos no navegador
4. **Corrigir testes** - Atualizar estrutura de dados esperada
