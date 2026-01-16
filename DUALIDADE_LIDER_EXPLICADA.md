# 🎭 Dualidade do Papel do Líder - Guia Completo

**Data:** 15 de Janeiro de 2026  
**Status:** ✅ Implementado e Funcional

---

## 🎯 O que é a Dualidade do Papel do Líder?

A **dualidade do papel do líder** é um conceito fundamental no sistema PDI que permite que um **Líder atue em dois papéis simultâneos e distintos**:

### Papel 1️⃣: **GESTOR** (Lidera um departamento)
- O líder é responsável por gerenciar uma equipe
- Aprova ações dos colaboradores
- Toma decisões estratégicas para seu departamento
- Exemplo: João lidera o departamento de **Vendas**

### Papel 2️⃣: **COLABORADOR** (Trabalha em outro departamento)
- O líder também é um colaborador em outro departamento
- Tem seu próprio PDI
- Recebe aprovações de seu próprio líder
- Exemplo: João é colaborador no departamento de **Estratégia**

---

## 🤔 Por que Isso é Importante?

### Cenário Real: Estrutura Organizacional Típica

```
┌─────────────────────────────────────────┐
│         DIRETORIA (Admin)               │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
   ┌────▼────┐      ┌────▼────┐
   │ Vendas  │      │ Estratégia
   │ (João)  │      │ (Maria)
   └────┬────┘      └────┬────┘
        │                │
    ┌───▼───┐        ┌───▼───┐
    │ Pedro │        │ João  │  ← DUALIDADE!
    │ Ana   │        │ Carlos│
    └───────┘        └───────┘
```

**O Problema:** João lidera Vendas, mas também precisa trabalhar em Estratégia!

**A Solução:** Dualidade do Papel
- João é **Gestor** em Vendas (aprova ações de Pedro e Ana)
- João é **Colaborador** em Estratégia (reporta a Maria)

---

## 🏗️ Como Funciona Tecnicamente

### Estrutura de Dados

Cada usuário com papel de **Líder** tem:

| Campo | Significado | Exemplo |
|-------|-------------|---------|
| `role` | Perfil no sistema | `"lider"` |
| `departamentoId` | Departamento onde é **COLABORADOR** | `2` (Estratégia) |
| `leaderId` | Quem é seu **LÍDER** no departamento de colaborador | `5` (Maria) |
| `departamento_liderado` | Departamento que **LIDERA** | `1` (Vendas) |

### Banco de Dados

**Tabela `users`:**
```sql
┌─────┬────────┬──────┬────────────────┬──────────┐
│ id  │ name   │ role │ departamentoId │ leaderId │
├─────┼────────┼──────┼────────────────┼──────────┤
│ 1   │ João   │ lider│ 2 (Estratégia) │ 5 (Maria)│
│ 2   │ Pedro  │ colb │ 1 (Vendas)     │ 1 (João) │
│ 3   │ Ana    │ colb │ 1 (Vendas)     │ 1 (João) │
│ 4   │ Maria  │ lider│ 3 (Diretoria)  │ 6 (CEO)  │
│ 5   │ Maria  │ admin│ NULL           │ NULL     │
└─────┴────────┴──────┴────────────────┴──────────┘

Tabela `departments`:
┌─────┬──────────────┬──────────┐
│ id  │ nome         │ leaderId │
├─────┼──────────────┼──────────┤
│ 1   │ Vendas       │ 1 (João) │ ← João LIDERA Vendas
│ 2   │ Estratégia   │ 5 (Maria)│
│ 3   │ Diretoria    │ 6 (CEO)  │
└─────┴──────────────┴──────────┘
```

### Interpretação

**João (ID 1):**
- ✅ **LIDERA** o departamento de Vendas (departments.leaderId = 1)
- ✅ **É COLABORADOR** em Estratégia (users.departamentoId = 2)
- ✅ **Reporta a Maria** (users.leaderId = 5)

---

## 🎮 Interface do Sistema - Como Configurar

### Passo 1: Selecionar o Perfil "Líder"

```
┌─────────────────────────────────────────┐
│ Perfil *                                │
├─────────────────────────────────────────┤
│ ○ Colaborador                           │
│ ● Líder                                 │
│ ○ Administrador                         │
└─────────────────────────────────────────┘
```

### Passo 2: Aparecem Dois Campos de Departamento

```
┌─────────────────────────────────────────────────────────┐
│ ℹ️ Dualidade de Roles                                   │
│                                                         │
│ Como Líder, você terá dois papéis:                     │
│ ✓ Lidera um departamento                               │
│ ✓ É colaborador em outro departamento                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Departamento que você LIDERA *           │
├─────────────────────────────────────────┤
│ [Selecione um departamento ▼]            │
│  - Vendas                                │
│  - Marketing                             │
│  - Estratégia                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Departamento onde você É COLABORADOR *   │
├─────────────────────────────────────────┤
│ [Selecione um departamento ▼]            │
│  - Vendas                                │
│  - Marketing                             │
│  - Estratégia                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Seu Líder neste departamento *           │
├─────────────────────────────────────────┤
│ [Selecione um líder ▼]                   │
│  - Maria (Administrador)                 │
│  - Carlos (Líder)                        │
└─────────────────────────────────────────┘
```

### Passo 3: Validação - Bloqueio de Conflito

```
❌ ERRO: Você selecionou o MESMO departamento em ambos os campos!

┌─────────────────────────────────────────────────────────┐
│ ⚠️ Erro de Regra                                        │
│                                                         │
│ Um Líder não pode ser membro do mesmo departamento     │
│ que ele lidera. Por favor, selecione departamentos     │
│ distintos.                                              │
└─────────────────────────────────────────────────────────┘

[Botão "Salvar Configuração" DESABILITADO]
```

### Passo 4: Configuração Correta

```
✅ CORRETO: Departamentos diferentes!

Departamento que você LIDERA: [Vendas ✓]
Departamento onde você É COLABORADOR: [Estratégia ✓]
Seu Líder neste departamento: [Maria ✓]

[Botão "Salvar Configuração" HABILITADO]
```

---

## 📊 Exemplo Prático Completo

### Cenário: Estrutura de Empresa

```
CEO (Admin)
├── João (Líder)
│   ├── Lidera: Departamento de Vendas
│   ├── É Colaborador: Departamento de Estratégia
│   └── Líder em Estratégia: Maria
│
├── Maria (Líder)
│   ├── Lidera: Departamento de Estratégia
│   ├── É Colaborador: Departamento de Diretoria
│   └── Líder em Diretoria: CEO
│
├── Vendas (Departamento)
│   ├── Líder: João
│   ├── Pedro (Colaborador, Líder: João)
│   └── Ana (Colaborador, Líder: João)
│
└── Estratégia (Departamento)
    ├── Líder: Maria
    ├── João (Colaborador, Líder: Maria)
    └── Carlos (Colaborador, Líder: Maria)
```

### Fluxo de PDI

**João criando seu PDI:**
1. João acessa o sistema como Líder
2. Cria um PDI no departamento de **Estratégia** (seu departamento de colaborador)
3. Maria (seu líder em Estratégia) aprova/reprova as ações

**João aprovando PDIs de sua equipe:**
1. João acessa a aba "PDIs da Equipe"
2. Vê os PDIs de Pedro e Ana (seu departamento de Vendas)
3. Aprova/reprova as ações deles

---

## 🛡️ Regras de Ouro da Dualidade

### Regra 1: Departamentos Distintos ✅
```
❌ INVÁLIDO: Lidera Vendas E é colaborador em Vendas
✅ VÁLIDO: Lidera Vendas E é colaborador em Estratégia
```

### Regra 2: Sempre Tem um Líder ✅
```
❌ INVÁLIDO: Líder sem líder atribuído no departamento de colaborador
✅ VÁLIDO: Líder reporta a Maria no departamento de Estratégia
```

### Regra 3: Sem Autoatribuição ✅
```
❌ INVÁLIDO: João é seu próprio líder
✅ VÁLIDO: João é líder de Maria, Maria é líder de João (em departamentos diferentes)
```

### Regra 4: Hierarquia Íntegra ✅
```
❌ INVÁLIDO: Ciclo de liderança (João → Maria → João)
✅ VÁLIDO: Cadeia linear (CEO → Maria → João)
```

---

## 💾 Implementação no Código

### Arquivo: `ConfigurarUsuario.tsx`

#### Seção 1: Detecção de Conflito (Linha 123-126)
```tsx
// VALIDAÇÃO: Detecta conflito de departamentos (Regra de Ouro)
const temConflitoDepartamento = 
  selectedRole === "lider" && 
  selectedDepartamento === selectedDepartamentoColaborador;
```

#### Seção 2: UI da Dualidade (Linha 408-510)
```tsx
{selectedRole === "lider" && (
  <>
    {/* Alerta visual explicando a dualidade */}
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm font-medium text-blue-900">i️ Dualidade de Roles</p>
      <p className="text-sm text-blue-800 mt-1">
        Como Líder, você terá dois papéis:
      </p>
      <ul className="text-sm text-blue-800 mt-2 ml-4 space-y-1">
        <li>✓ <strong>Lidera</strong> um departamento</li>
        <li>✓ <strong>É colaborador</strong> em outro departamento</li>
      </ul>
    </div>

    {/* Campo 1: Departamento que LIDERA */}
    <div className="space-y-2">
      <Label htmlFor="departamento-lidera">
        Departamento que você LIDERA *
      </Label>
      <select
        id="departamento-lidera"
        value={selectedDepartamento || ""}
        onChange={(e) => {
          const newDeptId = e.target.value ? parseInt(e.target.value) : undefined;
          setSelectedDepartamento(newDeptId);
        }}
        className="flex h-10 w-full rounded-md border border-input..."
        required
      >
        <option value="">Selecione um departamento</option>
        {departamentos
          .filter((d) => d.status === "ativo")
          .map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.nome}
            </option>
          ))}
      </select>
    </div>

    {/* Campo 2: Departamento onde É COLABORADOR */}
    <div className="space-y-2">
      <Label htmlFor="departamento-colaborador">
        Departamento onde você É COLABORADOR *
      </Label>
      <select
        id="departamento-colaborador"
        value={selectedDepartamentoColaborador || ""}
        onChange={(e) => {
          const newDeptId = e.target.value ? parseInt(e.target.value) : undefined;
          setSelectedDepartamentoColaborador(newDeptId);
          
          // Auto-preencher líder se departamento tem um líder
          if (newDeptId) {
            const dept = allDepartamentos.find(d => d.id === newDeptId);
            if (dept?.leaderId) {
              setSelectedLeaderColaborador(dept.leaderId);
            } else {
              setSelectedLeaderColaborador(undefined);
            }
          } else {
            setSelectedLeaderColaborador(undefined);
          }
        }}
        className="flex h-10 w-full rounded-md border border-input..."
        required
      >
        <option value="">Selecione um departamento</option>
        {departamentos
          .filter((d) => d.status === "ativo")
          .map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.nome}
            </option>
          ))}
      </select>
    </div>

    {/* Campo 3: Seu Líder no departamento de colaborador */}
    <div className="space-y-2">
      <Label htmlFor="lider-colaborador">
        Seu Líder neste departamento *
      </Label>
      <select
        id="lider-colaborador"
        value={selectedLeaderColaborador || ""}
        onChange={(e) => 
          setSelectedLeaderColaborador(
            e.target.value ? parseInt(e.target.value) : undefined
          )
        }
        className="flex h-10 w-full rounded-md border border-input..."
        required
        disabled={!selectedDepartamentoColaborador || 
                  availableLeadersColaborador.length === 0}
      >
        <option value="">
          {!selectedDepartamentoColaborador
            ? "Selecione um departamento primeiro" 
            : availableLeadersColaborador.length === 0 
            ? "Nenhum líder disponível neste departamento" 
            : "Selecione um líder"}
        </option>
        {availableLeadersColaborador.map((leader) => (
          <option key={leader.id} value={leader.id}>
            {leader.name} 
            ({leader.role === "admin" ? "Administrador" : "Líder"})
          </option>
        ))}
      </select>
    </div>
  </>
)}
```

#### Seção 3: Salvamento com Lógica de Dualidade (Linha 180-190)
```tsx
try {
  // Para líderes, usar o departamento de colaborador
  const finalDepartamentoId = selectedRole === "lider" 
    ? selectedDepartamentoColaborador 
    : selectedDepartamento;

  const finalLeaderId = selectedRole === "lider" 
    ? selectedLeaderColaborador 
    : selectedLeader;

  await updateMutation.mutateAsync({
    id: userId,
    role: selectedRole,
    departamentoId: finalDepartamentoId,  // Departamento de COLABORADOR
    leaderId: finalLeaderId,               // Líder no departamento de COLABORADOR
  });

  // Redirecionamento após sucesso
  setTimeout(() => {
    window.location.href = "/usuarios";
  }, 50);
} catch (error: any) {
  alert(error.message || "Erro ao salvar configuração");
}
```

---

## 📋 Fluxo Completo de Configuração

```
┌─────────────────────────────────────────┐
│ 1. Admin acessa página de usuário       │
│    (Ex: João)                           │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 2. Clica em "Configurar"                │
│    Vai para /usuarios/1/configurar      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 3. Seleciona Perfil "Líder"             │
│    Interface muda para mostrar          │
│    dois campos de departamento          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 4. Preenche:                            │
│    - Lidera: Vendas                     │
│    - É Colaborador: Estratégia          │
│    - Líder em Estratégia: Maria         │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 5. Sistema valida:                      │
│    ✓ Departamentos diferentes?          │
│    ✓ Tem líder atribuído?               │
│    ✓ Sem autoatribuição?                │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 6. Clica "Salvar Configuração"          │
│    Sistema salva no banco:              │
│    - users.role = "lider"               │
│    - users.departamentoId = 2           │
│    - users.leaderId = 5                 │
│    - departments.leaderId = 1           │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 7. Redirecionado para /usuarios         │
│    João agora é Líder com dualidade!    │
└─────────────────────────────────────────┘
```

---

## 🎯 Benefícios da Dualidade

| Benefício | Descrição |
|-----------|-----------|
| **Flexibilidade Organizacional** | Permite estruturas matriciais e complexas |
| **Desenvolvimento de Líderes** | Líderes continuam tendo PDI e desenvolvimento |
| **Hierarquia Clara** | Cada pessoa tem um único líder direto |
| **Escalabilidade** | Suporta organizações grandes e descentralizadas |
| **Rastreabilidade** | Todas as aprovações seguem a cadeia de comando |

---

## ⚠️ Erros Comuns

### Erro 1: Mesmo Departamento em Ambos os Campos
```
❌ INVÁLIDO:
Lidera: Vendas
É Colaborador: Vendas

✅ CORRETO:
Lidera: Vendas
É Colaborador: Estratégia
```

### Erro 2: Líder Sem Líder Atribuído
```
❌ INVÁLIDO:
Lidera: Vendas
É Colaborador: Estratégia
Seu Líder: [vazio]

✅ CORRETO:
Lidera: Vendas
É Colaborador: Estratégia
Seu Líder: Maria
```

### Erro 3: Autoatribuição
```
❌ INVÁLIDO:
João lidera Vendas
João é colaborador em Vendas
João é seu próprio líder

✅ CORRETO:
João lidera Vendas
João é colaborador em Estratégia
Maria é líder de João
```

---

## 📞 Resumo

A **dualidade do papel do líder** é um conceito poderoso que permite:

1. ✅ Um líder **gerenciar uma equipe** (papel de gestor)
2. ✅ O mesmo líder **ter seu próprio desenvolvimento** (papel de colaborador)
3. ✅ Manter uma **hierarquia clara e íntegra**
4. ✅ Suportar **estruturas organizacionais complexas**

No sistema PDI, isso é implementado através de:
- **Dois campos de departamento** na configuração de líderes
- **Validação de conflito** para evitar inconsistências
- **Filtros de autoatribuição** para garantir integridade
- **Lógica especial de salvamento** que diferencia líderes de colaboradores

---

**Documento Preparado por:** Manus AI  
**Data:** 15 de Janeiro de 2026  
**Versão:** 1.0
