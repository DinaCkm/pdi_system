# Análise de Impacto e Riscos: PDIs de Líderes sem Aprovação

## Regra de Negócio Proposta

Quando o Admin/RH cria um PDI para um usuário com papel **"lider"**, o PDI deve nascer automaticamente com status **"em_andamento"** e com validação já registrada, sem necessidade de aprovação do superior hierárquico. As solicitações de ajuste/nova ação dos líderes continuam seguindo o fluxo normal.

---

## Situação Atual dos PDIs de Líderes no Banco de Dados

| Métrica | Valor |
|---|---|
| Total de líderes no sistema | 24 |
| Total de PDIs de líderes | 46 |
| PDIs **com** validação (já aprovados pelo líder superior) | 11 |
| PDIs **sem** validação (aguardando aprovação) | 35 |

**Observação importante:** Todos os 46 PDIs de líderes já possuem status **"em_andamento"**. Ou seja, o status já está correto. O problema é que **35 PDIs não possuem registro na tabela `pdi_validacoes`**, o que faz o frontend exibir "Aguardando Aprovação do Líder" mesmo com status "em_andamento".

---

## Pontos de Alteração Necessários

### 1. Backend — Criação de PDI (`server/db.ts`, função `createPDI`)

**O que muda:** Após criar o PDI, verificar se o colaborador é líder. Se sim, criar automaticamente um registro na tabela `pdi_validacoes` para que o PDI já nasça como "validado".

**Risco:** BAIXO. A função `createPDI` já cria com status "em_andamento". A única adição é inserir o registro de validação automaticamente.

### 2. Frontend — Tela "Meu PDI" (`client/src/pages/MeuPDI.tsx`)

**O que muda:** Para líderes, não exibir o banner "Aguardando Aprovação do Líder" quando o PDI não tem validação. Ou, alternativamente, a correção no backend (item 1) resolve isso automaticamente.

**Risco:** BAIXO. A lógica é condicional e não afeta colaboradores.

### 3. Frontend — Tela "PDIs da Equipe" (`client/src/pages/PDIsEquipe.tsx`)

**O que muda:** O botão "Aprovar e Validar Plano" não deve aparecer para PDIs de líderes (já que não precisam de aprovação). Ou, se a validação for criada automaticamente no backend, o botão já desaparece naturalmente.

**Risco:** BAIXO. Se a validação for criada automaticamente, nenhuma alteração é necessária nesta tela.

### 4. Frontend — Tabela de PDIs Admin (`client/src/components/DataTablePDIs.tsx`)

**O que muda:** O filtro "Aguardando Aprovação" e o badge "Aguardando Aprovação do Líder" não devem aparecer para PDIs de líderes. Ou, novamente, se a validação for criada automaticamente, isso se resolve sozinho.

**Risco:** BAIXO.

### 5. Backend — Notificações (`server/routers/notifications.ts`)

**O que muda:** A contagem de `pdisAwaitingApproval` para o líder inclui PDIs do departamento que estão "em_andamento" sem validação. Se os PDIs de líderes tiverem validação automática, eles não serão mais contados como pendentes.

**Risco:** BAIXO. A lógica já filtra por `pdi_validacoes`.

---

## Dados Existentes — Tratamento dos 35 PDIs sem Validação

**Situação:** 35 PDIs de líderes já existem no banco com status "em_andamento" mas **sem registro de validação**. Isso faz o sistema exibir "Aguardando Aprovação do Líder" para esses PDIs.

**Proposta de migração:** Executar um script SQL que cria registros de validação automática para todos os 35 PDIs de líderes que ainda não possuem validação. O registro será criado com:
- `liderId` = ID do próprio admin (sistema)
- `aprovadoEm` = data/hora atual
- `justificativa` = "Validação automática — PDI de líder não requer aprovação"

**Risco:** BAIXO. Apenas insere registros novos na tabela `pdi_validacoes`. Não altera nenhum dado existente. Os 11 PDIs que já possuem validação não serão afetados.

---

## Resumo de Riscos

| Alteração | Risco | Justificativa |
|---|---|---|
| Backend: auto-validar PDI de líder na criação | BAIXO | Apenas adiciona um INSERT extra após a criação |
| Frontend: ocultar banner/botão para líderes | BAIXO | Condicional simples, não afeta outros perfis |
| Migração: validar 35 PDIs existentes | BAIXO | Apenas INSERT de novos registros, sem UPDATE/DELETE |
| Notificações: contagem de pendências | NENHUM | Se resolve automaticamente com a validação |
| Solicitações de ajuste/nova ação | NENHUM | Não são afetadas (regra se aplica apenas ao PDI) |
| Emails existentes | NENHUM | Não há email de validação de PDI no sistema |

---

## Abordagem Recomendada

A abordagem mais segura e simples é:

1. **Backend:** Na função `createPDI`, após inserir o PDI, verificar se o colaborador tem role "lider". Se sim, criar automaticamente o registro em `pdi_validacoes`.

2. **Migração de dados:** Executar SQL para criar validação automática nos 35 PDIs existentes de líderes sem validação.

3. **Nenhuma alteração no frontend necessária**, pois a lógica de exibição já se baseia na existência do registro em `pdi_validacoes`. Se o registro existir, o banner "Aguardando Aprovação" desaparece e o botão "Aprovar e Validar" também.

**Total de arquivos a alterar:** 1 (server/db.ts) + 1 script SQL de migração.
