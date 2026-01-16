# Fase 2: Validação de Configuração Posterior
## Regras de Departamento vs Perfil - Análise Completa

**Data:** 15 de Janeiro de 2026  
**Status:** Análise em Progresso  
**Objetivo:** Implementar validações rigorosas no fluxo de configuração de usuários

---

## 📋 Regras de "Departamento vs Perfil"

### 1. Restrição de Liderança
**Regra:** Um Líder é terminantemente proibido de ser membro do mesmo departamento que ele lidera.

**Contexto:**
- Um Líder pode liderar o departamento "Vendas"
- Mas o Líder NÃO pode estar vinculado como colaborador em "Vendas"
- O Líder deve estar vinculado como colaborador em outro departamento (ex: "Estratégia")

**Implementação:**
```
IF role === "lider" AND selectedDepartamento === selectedDepartamentoColaborador
  THEN Bloquear e exibir erro: "Departamentos devem ser distintos"
```

**Validação Atual:** ✅ Implementada em ConfigurarUsuario.tsx (linhas 124-126)

---

### 2. Dualidade de Departamentos
**Regra:** Um Líder deve possuir vínculos com dois departamentos distintos.

**Estrutura:**
```
Líder (João)
├─ Departamento 1: Vendas (LIDERA)
│  └─ Usuários: Pedro, Ana
└─ Departamento 2: Estratégia (COLABORADOR)
   └─ Líder: Maria
```

**Campos Obrigatórios para Líder:**
1. `selectedDepartamento` - Departamento que LIDERA
2. `selectedDepartamentoColaborador` - Departamento onde É COLABORADOR
3. `selectedLeaderColaborador` - Seu líder em Estratégia

**Validação Atual:** ✅ Implementada com 3 campos distintos

---

### 3. Vínculos Operacionais (Sem Usuários Órfãos)
**Regra:** Todo usuário com papel operacional deve possuir vínculos hierárquicos e departamentais claros.

**Cenários Válidos:**

| Perfil | Departamento | Líder | Status |
|--------|-------------|-------|--------|
| Colaborador | Vendas | João | ✅ Válido |
| Líder | Vendas (lidera) + Estratégia (colaborador) | Maria | ✅ Válido |
| Admin | Opcional | Opcional | ✅ Válido |

**Cenários Inválidos:**

| Perfil | Departamento | Líder | Problema |
|--------|-------------|-------|----------|
| Colaborador | Vendas | NULL | ❌ Órfão |
| Líder | Vendas | NULL | ❌ Sem líder superior |
| Colaborador | NULL | João | ❌ Sem departamento |

**Validação Necessária:**
```
IF (role === "colaborador" OR role === "lider") AND !departamentoId
  THEN Erro: "Departamento é obrigatório"

IF (role === "colaborador" OR role === "lider") AND !leaderId
  THEN Erro: "Líder é obrigatório"
```

---

### 4. Perfil de Administrador
**Regra:** Administrador pode atuar sem departamento vinculado ou estar associado a um departamento especial.

**Características:**
- Departamento: Opcional
- Líder: Opcional
- Permissões: Acesso total ao sistema

**Validação:**
```
IF role === "admin"
  THEN departamentoId e leaderId são OPCIONAIS
```

---

## 🔐 Regras de Ouro Consolidadas

### Regra 1: Bloqueio de Autoatribuição
**Implementação:** ✅ Ativa
```
IF selectedLeader === userId
  THEN Bloquear e exibir erro
```

### Regra 2: Bloqueio de Conflito de Departamentos
**Implementação:** ✅ Ativa
```
IF role === "lider" AND selectedDepartamento === selectedDepartamentoColaborador
  THEN Bloquear e exibir erro
```

### Regra 3: Bloqueio de CPF Duplicado
**Implementação:** ✅ Ativa
```
IF cpfNormalizado JÁ EXISTE NO BANCO
  THEN Bloquear criação e exibir: "Este CPF já está cadastrado"
```

### Regra 4: Bloqueio de Email Duplicado
**Implementação:** ✅ Ativa
```
IF emailNormalizado JÁ EXISTE NO BANCO
  THEN Bloquear criação e exibir: "Este email já está cadastrado"
```

### Regra 5: Validação de Departamento Obrigatório (Colaborador/Líder)
**Implementação:** ⏳ Pendente
```
IF (role === "colaborador" OR role === "lider") AND !departamentoId
  THEN Bloquear e exibir erro
```

### Regra 6: Validação de Líder Obrigatório (Colaborador/Líder)
**Implementação:** ⏳ Pendente
```
IF (role === "colaborador" OR role === "lider") AND !leaderId
  THEN Bloquear e exibir erro
```

---

## 📊 Matriz de Validação Completa

| Validação | Colaborador | Líder | Admin | Status |
|-----------|-------------|-------|-------|--------|
| Departamento Obrigatório | ✅ Sim | ✅ Sim (2) | ❌ Não | ⏳ Implementar |
| Líder Obrigatório | ✅ Sim | ✅ Sim | ❌ Não | ⏳ Implementar |
| Autoatribuição Bloqueada | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Ativa |
| Conflito Departamentos | N/A | ✅ Sim | N/A | ✅ Ativa |
| CPF Duplicado Bloqueado | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Ativa |
| Email Duplicado Bloqueado | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Ativa |

---

## 🎯 Próximos Passos (Fase 2)

### Passo 1: Implementar Validações Pendentes
- [ ] Validação de Departamento Obrigatório
- [ ] Validação de Líder Obrigatório
- [ ] Mensagens de erro específicas para cada cenário

### Passo 2: Atualizar ConfigurarUsuario.tsx
- [ ] Adicionar validação de campos obrigatórios antes de submit
- [ ] Desabilitar botão "Salvar" se validações falharem
- [ ] Exibir mensagens de erro em tempo real

### Passo 3: Criar Testes de Integração
- [ ] Teste: Colaborador sem departamento (deve falhar)
- [ ] Teste: Colaborador sem líder (deve falhar)
- [ ] Teste: Líder com departamentos iguais (deve falhar)
- [ ] Teste: Líder sem líder superior (deve falhar)
- [ ] Teste: Admin sem departamento (deve passar)

### Passo 4: Validar Fluxo Completo
- [ ] Criar usuário com todos os dados válidos
- [ ] Configurar perfil com regras aplicadas
- [ ] Verificar sincronização no banco de dados

---

## 📝 Exemplo de Fluxo Correto

### Cenário: Cadastrar João como Líder

**Fase 1: Criação Inicial**
```
Nome: João Silva
Email: joao@empresa.com
CPF: 123.456.789-01
Cargo: Gerente de Vendas
Perfil: (Pendente - será configurado na Fase 2)
```

**Fase 2: Configuração Posterior**
```
Perfil: Líder
Departamento que LIDERA: Vendas
Departamento onde É COLABORADOR: Estratégia
Seu Líder: Maria (Diretora de Estratégia)
```

**Validações Aplicadas:**
1. ✅ Vendas ≠ Estratégia (departamentos distintos)
2. ✅ Maria ≠ João (não é autoatribuição)
3. ✅ Maria tem role "lider" ou "admin" (pode ser líder)
4. ✅ Maria está em Estratégia (departamento correto)

**Resultado:** ✅ Configuração salva com sucesso

---

## 🔍 Exemplo de Fluxo Incorreto

### Cenário: Tentar Cadastrar Pedro como Líder (INVÁLIDO)

**Tentativa:**
```
Perfil: Líder
Departamento que LIDERA: Vendas
Departamento onde É COLABORADOR: Vendas (ERRO!)
Seu Líder: João
```

**Validações Falhadas:**
1. ❌ Vendas = Vendas (departamentos iguais)
2. ❌ Mensagem: "Departamentos devem ser distintos"
3. ❌ Botão "Salvar" desabilitado

**Resultado:** ❌ Configuração bloqueada

---

## 📌 Checklist de Implementação

- [x] Análise de Regras de Departamento vs Perfil
- [ ] Implementação de Validações Pendentes
- [ ] Atualização de ConfigurarUsuario.tsx
- [ ] Criação de Testes de Integração
- [ ] Validação de Fluxo Completo
- [ ] Documentação Final

---

**Próxima Fase:** Implementação de Validações de Integridade Hierárquica
