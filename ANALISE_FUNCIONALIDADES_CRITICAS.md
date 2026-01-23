# Análise Detalhada das 3 Funcionalidades Críticas

## 1. FLUXO DE EVIDÊNCIAS (Colaborador → Admin)

### Estado Atual
- ✅ Backend: 100% implementado
  - `evidences.create` - Colaborador enviar evidência
  - `evidences.aprovar` - Admin aprovar
  - `evidences.reprovar` - Admin reprovar
  - `evidences.getPending` - Listar evidências pendentes
  
- ✅ Frontend: 100% implementado
  - `EvidenciaModal.tsx` - Modal para envio
  - `EvidenciasPendentes.tsx` - Página de avaliação (Admin)
  - Integrado em `MinhasPendencias.tsx`

- ✅ Banco de Dados:
  - `evidences` - Tabela principal
  - `evidenceFiles` - Arquivos anexados
  - `evidenceTexts` - Textos/descrições

### O que Precisa Ser Feito
- [ ] Testar fluxo completo end-to-end
- [ ] Verificar se notificações estão sendo enviadas
- [ ] Validar upload de arquivos para S3
- [ ] Criar testes unitários

### Fluxo Esperado
1. Colaborador acessa "Minhas Ações"
2. Clica em "Registrar Minha Conquista"
3. Modal abre com campos de descrição
4. Colaborador pode anexar arquivos
5. Clica em "Registrar Evidência"
6. Sistema gera ID único (EV-XXXXXX)
7. Mostra alerta verde com instruções de email
8. Admin acessa "Evidências Pendentes"
9. Admin visualiza, aprova ou reprova
10. Colaborador recebe notificação

---

## 2. FLUXO DE SOLICITAÇÕES DE AJUSTE (Colaborador/Líder → Admin)

### Estado Atual
- ✅ Backend: Parcialmente implementado
  - Tabela `adjustmentRequests` existe
  - Campos: `status`, `justificativa`, `camposAjustar`
  - Suporta: `colaborador` e `lider` como solicitantes

- ❌ Frontend: NÃO implementado
  - Falta página para Colaborador/Líder solicitar ajuste
  - Falta página para Admin avaliar solicitações
  - Falta integração em "Minhas Ações"

- ⚠️ Backend: Procedures tRPC não implementadas
  - `adjustmentRequests.create` - Criar solicitação
  - `adjustmentRequests.list` - Listar pendentes
  - `adjustmentRequests.aprovar` - Admin aprovar
  - `adjustmentRequests.reprovar` - Admin reprovar

### O que Precisa Ser Feito
- [ ] Implementar procedures tRPC no backend
- [ ] Criar página de solicitação (Colaborador/Líder)
- [ ] Criar página de avaliação (Admin)
- [ ] Integrar em "Minhas Ações" e "Ações"
- [ ] Implementar notificações
- [ ] Criar testes unitários

### Fluxo Esperado
1. Colaborador/Líder acessa "Minhas Ações"
2. Clica em "Solicitar Alteração" em uma ação
3. Modal abre com campos:
   - Campos a ajustar (checkbox: título, descrição, prazo, competência)
   - Justificativa (textarea obrigatória)
4. Clica em "Enviar Solicitação"
5. Admin acessa "Solicitações de Ajuste"
6. Admin visualiza, aprova ou reprova com justificativa
7. Colaborador/Líder recebe notificação

### Restrições
- Máximo 5 solicitações por ação
- Só pode solicitar se ação não foi iniciada
- Admin é o único que pode fazer alterações

---

## 3. SISTEMA DE NOTIFICAÇÕES (Alertas de Prazos e Mudanças)

### Estado Atual
- ✅ Backend: Estrutura base existe
  - Tabela `notifications` criada
  - Suporta diferentes tipos de notificações
  
- ❌ Frontend: Não implementado
  - Falta componente de sino/badge
  - Falta página de notificações
  - Falta integração visual

- ❌ Jobs: Não implementado
  - Falta job diário para marcar ações vencidas
  - Falta job para alertas 7 dias antes do vencimento

### O que Precisa Ser Feito
- [ ] Implementar procedure tRPC para listar notificações
- [ ] Criar componente de sino com badge
- [ ] Criar página de notificações
- [ ] Implementar notificações em tempo real (quando ação muda de status)
- [ ] Implementar jobs automáticos
- [ ] Integrar em DashboardLayout
- [ ] Criar testes unitários

### Tipos de Notificações
1. **Ação Criada** - Colaborador recebe quando admin cria ação
2. **Ação Aprovada** - Colaborador recebe quando líder aprova
3. **Ação Reprovada** - Colaborador recebe quando líder reprova
4. **Evidência Aprovada** - Colaborador recebe quando admin aprova
5. **Evidência Reprovada** - Colaborador recebe quando admin reprova
6. **Solicitação Aprovada** - Colaborador/Líder recebe quando admin aprova
7. **Solicitação Reprovada** - Colaborador/Líder recebe quando admin reprova
8. **Vencimento Próximo** - Colaborador recebe 7 dias antes
9. **Ação Vencida** - Colaborador recebe quando prazo passa

### Fluxo Esperado
1. Usuário vê sino na barra superior
2. Clica no sino para abrir dropdown
3. Vê lista de notificações recentes
4. Clica em "Ver Todas" para página completa
5. Pode marcar como lida
6. Pode deletar notificação

---

## Prioridade de Implementação

### HOJE (Fase 1-3)
1. ✅ Validar Fluxo de Evidências (já está pronto)
2. ✅ Implementar Fluxo de Solicitações de Ajuste (backend + frontend)

### AMANHÃ (Fase 4-5)
3. ✅ Implementar Sistema de Notificações (básico)
4. ✅ Testes e validações completas

---

## Dependências Entre Funcionalidades

```
Fluxo de Evidências
  ↓ (notificação quando aprovada/reprovada)
Sistema de Notificações

Fluxo de Solicitações
  ↓ (notificação quando aprovada/reprovada)
Sistema de Notificações

Fluxo de Solicitações
  ↓ (pode solicitar ajuste em ação com evidência)
Fluxo de Evidências
```

---

## Próximos Passos

1. **Validar Fluxo de Evidências** (30 min)
   - Testar envio de evidência
   - Testar aprovação/reprovação
   - Verificar notificações

2. **Implementar Backend de Solicitações** (1h)
   - Criar procedures tRPC
   - Implementar lógica de validação

3. **Implementar Frontend de Solicitações** (1.5h)
   - Criar modal de solicitação
   - Criar página de avaliação
   - Integrar em "Minhas Ações"

4. **Implementar Notificações** (1h)
   - Criar componente de sino
   - Criar página de notificações
   - Integrar em DashboardLayout

5. **Testes Completos** (1h)
   - Testar todos os fluxos
   - Validar permissões
   - Verificar notificações

**Tempo Total Estimado: 5 horas**
