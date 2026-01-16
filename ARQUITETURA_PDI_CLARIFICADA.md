# 🎯 Arquitetura de PDI - Clarificação Definitiva

**Data:** 15 de Janeiro de 2026  
**Status:** ✅ Clarificado

---

## 📊 Estrutura Hierárquica

```
COLABORADOR (Único)
    ↓
PDI (Único por Ciclo)
    ├── AÇÃO 1
    ├── AÇÃO 2
    ├── AÇÃO 3
    └── AÇÃO N
```

---

## 🔄 Fluxo de Progresso

### Nível PDI (Container)
```
PDI: Rascunho
    ↓ (Admin cria)
PDI: Aguardando Ações
    ↓ (Colaborador propõe ações)
PDI: Em Execução
    ↓ (Ações sendo executadas e validadas)
PDI: Concluído
    ↓ (Quando TODAS as ações estão concluídas)
```

### Nível AÇÃO (Fluxo Real)
```
AÇÃO: Pendente Aprovação Líder
    ↓ (Líder aprova)
AÇÃO: Aprovada Líder
    ↓ (Colaborador executa)
AÇÃO: Em Andamento
    ↓ (Colaborador envia evidência)
AÇÃO: Evidência Enviada
    ↓ (Admin valida evidência)
AÇÃO: Evidência Aprovada
    ↓
AÇÃO: Concluída
```

---

## 🚨 Regra Crítica

**O fluxo de aprovação, solicitação de alteração e envio de evidências acontece NO NÍVEL DE AÇÃO, NÃO DE PDI.**

O PDI é apenas um **container** que agrupa as ações de um colaborador em um ciclo.

---

## 📋 Responsabilidades por Papel

### ADMINISTRADOR
- ✅ Cria o PDI (único por colaborador por ciclo)
- ✅ Cria as AÇÕES dentro do PDI
- ✅ Valida evidências enviadas pelo colaborador
- ✅ Aprova/rejeita solicitações de alteração de ações

### LÍDER
- ✅ Aprova cada AÇÃO (muda status para "aprovada_lider")
- ✅ Visualiza PDI de sua equipe
- ✅ Visualiza seu próprio PDI (como colaborador)
- ✅ Pode solicitar alteração em ações

### COLABORADOR
- ✅ Visualiza seu PDI
- ✅ Aceita/rejeita ações
- ✅ Executa ações
- ✅ Envia evidências
- ✅ Pode solicitar alteração em ações

---

## 🔐 Regras de Negócio

### PDI
1. **Único por Ciclo:** Um colaborador tem apenas um PDI por ciclo (UNIQUE constraint)
2. **Criação Admin-Only:** Apenas administrador cria PDI
3. **Conclusão Automática:** PDI é concluído quando TODAS as ações estão concluídas

### AÇÃO
1. **Aprovação Líder:** Cada ação deve ser aprovada pelo líder antes de execução
2. **Evidência Obrigatória:** Ação só é concluída após evidência ser validada por admin
3. **Solicitação de Alteração:** Líder ou Colaborador podem solicitar alteração (Admin aprova)

---

## 📊 Estados e Transições

### PDI States
```
rascunho → aguardando_aprovacao → ativo → concluido
                                           ↓
                                      cancelado
```

### AÇÃO States
```
pendente_aprovacao_lider
    ↓
aprovada_lider
    ↓
em_andamento
    ↓
evidencia_enviada
    ↓
evidencia_aprovada
    ↓
concluida

Caminhos alternativos:
- reprovada_lider (volta para pendente_aprovacao_lider)
- evidencia_reprovada (volta para em_andamento)
- correcao_solicitada (aguarda ajuste)
- vencida (prazo expirou)
- cancelada (cancelada)
```

---

## 🎯 Exemplo Prático

**Cenário:** João é Colaborador, Maria é seu Líder, Admin é Carlos

### Dia 1: Criação do PDI
```
Carlos (Admin) cria PDI para João no ciclo 2026.1
PDI Status: rascunho
```

### Dia 2: Criação de Ações
```
Carlos (Admin) cria 3 ações no PDI de João:
- Ação 1: "Aprender Python" (Micro: Programação)
- Ação 2: "Certificação Agile" (Micro: Metodologia)
- Ação 3: "Liderança de Projeto" (Micro: Liderança)

Todas as ações começam em: pendente_aprovacao_lider
```

### Dia 3: Aprovação do Líder
```
Maria (Líder) aprova as 3 ações
Ação 1 Status: aprovada_lider
Ação 2 Status: aprovada_lider
Ação 3 Status: aprovada_lider
```

### Dias 4-30: Execução
```
João (Colaborador) executa as ações
Ação 1 Status: em_andamento
Ação 2 Status: em_andamento
Ação 3 Status: em_andamento
```

### Dia 31: Envio de Evidências
```
João envia evidências para cada ação
Ação 1 Status: evidencia_enviada
Ação 2 Status: evidencia_enviada
Ação 3 Status: evidencia_enviada
```

### Dia 32: Validação Admin
```
Carlos (Admin) valida as evidências
Ação 1 Status: evidencia_aprovada → concluida
Ação 2 Status: evidencia_aprovada → concluida
Ação 3 Status: evidencia_aprovada → concluida

PDI Status: concluido (porque TODAS as ações estão concluídas)
```

---

## 🔔 Notificações

### Quando Notificar

| Evento | Destinatário | Mensagem |
|--------|--------------|----------|
| PDI Criado | Colaborador | "Seu PDI foi criado para o ciclo 2026.1" |
| Ação Criada | Colaborador | "Nova ação adicionada ao seu PDI" |
| Ação Aguardando Aprovação | Líder | "Ação aguardando sua aprovação" |
| Ação Aprovada | Colaborador | "Sua ação foi aprovada" |
| Ação Reprovada | Colaborador | "Sua ação foi reprovada" |
| Evidência Enviada | Admin | "Evidência aguardando validação" |
| Evidência Aprovada | Colaborador | "Sua evidência foi aprovada" |
| Evidência Reprovada | Colaborador | "Sua evidência foi reprovada" |
| Solicitação de Alteração | Admin | "Solicitação de alteração aguardando aprovação" |
| PDI Concluído | Colaborador, Líder | "PDI concluído com sucesso" |

---

## 🏗️ Arquitetura de Banco de Dados

```
users (Colaborador, Líder, Admin)
    ↓
pdis (Único por ciclo)
    ↓
actions (Múltiplas por PDI)
    ├── evidences (Evidências de cada ação)
    ├── adjustmentRequests (Solicitações de alteração)
    └── notifications (Notificações)
```

---

## ✅ Checklist de Implementação

- [ ] PDI criado apenas por Admin
- [ ] PDI único por ciclo (constraint UNIQUE)
- [ ] Ações com 11 status possíveis
- [ ] Fluxo de aprovação de ação por Líder
- [ ] Envio de evidência por Colaborador
- [ ] Validação de evidência por Admin
- [ ] Solicitação de alteração de ação
- [ ] Notificações automáticas
- [ ] PDI concluído quando todas as ações concluídas
- [ ] Testes de integração completos

---

**Status:** ✅ Clarificado e Documentado  
**Próximo Passo:** Implementar router tRPC com esta arquitetura
