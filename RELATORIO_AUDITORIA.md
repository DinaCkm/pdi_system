# Relatório de Auditoria do Sistema PDI

**Data:** 29 de Janeiro de 2026  
**Versão do Sistema:** cd938160  
**Auditor:** Manus AI

---

## Resumo Executivo

Este relatório apresenta os resultados da auditoria completa do código do Sistema de Gestão de PDI. A análise foi realizada sem alterações no código, apenas identificando potenciais problemas, inconsistências e oportunidades de melhoria.

---

## 1. Estatísticas Gerais do Projeto

| Métrica | Valor |
|---------|-------|
| Total de linhas no backend (db.ts + routers.ts) | 3.519 |
| Total de linhas nas páginas do frontend | 15.355 |
| Total de linhas nos componentes | 10.837 |
| Número de rotas (páginas) | 37 |
| Número de tabelas no banco | 17 |
| Arquivos de teste | 171 |
| Erros de TypeScript | 109 |

---

## 2. Erros de TypeScript Identificados

### 2.1 Distribuição por Tipo de Erro

| Código | Quantidade | Descrição |
|--------|------------|-----------|
| TS7006 | 59 | Parâmetro implicitamente tem tipo 'any' |
| TS2339 | 18 | Propriedade não existe no tipo |
| TS2322 | 7 | Tipo não é atribuível a outro tipo |
| TS2304 | 6 | Não foi possível encontrar o nome |
| TS2353 | 5 | Propriedade não existe em tipo literal |
| TS2724 | 3 | Membro exportado não encontrado |
| TS2551 | 3 | Propriedade não existe (sugestão de correção) |
| TS2345 | 3 | Argumento não é atribuível ao parâmetro |
| TS2802 | 2 | Tipo só pode ser iterado com flag específica |
| TS2358 | 2 | Lado esquerdo de operação aritmética |
| TS2769 | 1 | Nenhuma sobrecarga corresponde |

### 2.2 Arquivos com Mais Erros

| Arquivo | Problemas Principais |
|---------|---------------------|
| `client/src/pages/Users.tsx` | Múltiplos parâmetros sem tipagem (any implícito), propriedade 'description' não existe em ModalProps |
| `client/src/pages/PDIs.tsx` | Procedure `createBulk` não existe, parâmetros sem tipagem |
| `client/src/pages/MinhasPendencias.tsx` | Tipo File[] incompatível com tipo esperado de evidências |
| `client/src/pages/ImportarUsuarios.tsx` | Procedure `importBulk` não existe |
| `client/src/pages/Setup.tsx` | Procedure `setup` não existe |
| `client/src/pages/SolicitacoesAdmin.tsx` | Uso de `departments` em vez de `departamentos` |
| `server/_core/context.ts` | Export `User` não existe no schema |
| `server/_core/customAuth.ts` | Propriedade `lastSignedIn` não existe no tipo |

---

## 3. Código Potencialmente Desnecessário

### 3.1 Arquivo Não Utilizado

| Arquivo | Tamanho | Observação |
|---------|---------|------------|
| `client/src/pages/ComponentShowcase.tsx` | 1.437 linhas | **Não é importado em nenhum lugar do projeto.** Este arquivo parece ser uma página de demonstração de componentes que não está sendo utilizada. |

### 3.2 Console.log em Produção

| Local | Quantidade |
|-------|------------|
| Backend (server/*.ts) | 104 ocorrências |
| Frontend (pages + components) | 20 ocorrências |

**Recomendação:** Remover ou substituir por um sistema de logging apropriado para produção.

---

## 4. Comentários TODO/FIXME Pendentes

| Arquivo | Linha | Comentário |
|---------|-------|------------|
| `client/src/components/AuditoriaHistorico.tsx` | 24 | `// TODO: Remover cast quando getAuditLog for adicionado ao router` |
| `client/src/pages/MeuPDI.tsx` | 38 | `// TODO: Implementar modal de envio de evidências` |

---

## 5. Testes Automatizados

### 5.1 Resultado da Execução

| Métrica | Valor |
|---------|-------|
| Arquivos de teste | 9 executados |
| Testes passando | 38 |
| Testes falhando | 1 |

### 5.2 Teste Falhando

**Arquivo:** `server/evidences.debug.test.ts`  
**Erro:** `Field 'fileName' doesn't have a default value`  
**Causa:** O teste está tentando inserir um registro em `evidence_files` sem fornecer o campo `fileName`, que é obrigatório.

---

## 6. Estrutura do Banco de Dados

### 6.1 Tabelas Identificadas (17 total)

1. `acoes_historico` - Histórico de alterações em ações
2. `actions` - Ações de desenvolvimento
3. `adjustment_comments` - Comentários em solicitações de ajuste
4. `adjustment_requests` - Solicitações de ajuste
5. `audit_log` - Log de auditoria
6. `ciclos` - Ciclos de avaliação
7. `competencias_macros` - Macrocompetências
8. `departamentos` - Departamentos
9. `evidence_files` - Arquivos de evidência
10. `evidence_texts` - Textos de evidência
11. `evidences` - Evidências
12. `notifications` - Notificações
13. `pdis` - Planos de Desenvolvimento Individual
14. `user_department_roles` - Papéis de usuário por departamento
15. `users` - Usuários
16. `deletion_audit_log` - Log de exclusões
17. `pdi_validacoes` - Validações de PDI

---

## 7. Procedures Backend Não Encontradas (Referenciadas no Frontend)

| Procedure | Arquivo que Referencia |
|-----------|----------------------|
| `trpc.users.importBulk` | ImportarUsuarios.tsx |
| `trpc.pdis.createBulk` | PDIs.tsx |
| `trpc.system.setup` | Setup.tsx |
| `trpc.actions.listByPDI` | PDIDetalhes.tsx |
| `trpc.departments` | SolicitacoesAdmin.tsx (deveria ser `departamentos`) |

---

## 8. Arquivos Grandes que Podem Ser Refatorados

| Arquivo | Linhas | Recomendação |
|---------|--------|--------------|
| `server/db.ts` | 2.598 | Considerar dividir em módulos por domínio (users, actions, pdis, etc.) |
| `client/src/pages/MinhasPendencias.tsx` | 887 | Extrair componentes menores |
| `client/src/pages/Importacao.tsx` | 727 | Extrair lógica de importação para hooks |
| `client/src/pages/AdminDashboard.tsx` | 734 | Extrair widgets para componentes separados |
| `client/src/pages/PDIsEquipe.tsx` | 690 | Extrair tabela e filtros para componentes |

---

## 9. Classificação de Severidade

### 9.1 Alta Prioridade (Impacto Funcional)

1. **Procedures inexistentes** - Páginas como ImportarUsuarios, Setup e PDIDetalhes podem não funcionar corretamente
2. **Teste falhando** - Indica possível problema na função `createEvidenceFile`
3. **Tipagem incorreta em MinhasPendencias** - Pode causar erros em runtime ao enviar evidências

### 9.2 Média Prioridade (Qualidade de Código)

1. **109 erros de TypeScript** - Principalmente falta de tipagem (any implícito)
2. **124 console.log** - Devem ser removidos ou substituídos por logging apropriado
3. **Arquivo ComponentShowcase.tsx não utilizado** - 1.437 linhas de código morto

### 9.3 Baixa Prioridade (Melhoria Contínua)

1. **TODOs pendentes** - 2 comentários TODO que devem ser resolvidos
2. **Arquivos grandes** - Oportunidade de refatoração para melhor manutenibilidade

---

## 10. Conclusão

O sistema está funcional, mas apresenta **109 erros de TypeScript** que, embora não impeçam a execução (devido ao modo de compilação permissivo), representam riscos potenciais de bugs em runtime. Os principais pontos de atenção são:

1. **Procedures inexistentes** referenciadas no frontend
2. **Arquivo de 1.437 linhas não utilizado** (ComponentShowcase.tsx)
3. **124 console.log** que devem ser removidos para produção
4. **1 teste falhando** que indica problema na função de criar arquivos de evidência

**Recomendação:** Priorizar a correção das procedures inexistentes e do teste falhando antes de novas implementações.

---

*Relatório gerado automaticamente pela auditoria do sistema.*
