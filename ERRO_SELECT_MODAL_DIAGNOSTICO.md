# Erro: SelectContent Fica Atrás do Modal - Diagnóstico Completo

## Descrição do Erro

Quando o usuário clica em um botão "Novo Macro" ou "Novo Micro", um modal é aberto com um formulário. Dentro deste formulário há um campo `<Select>` (dropdown) para selecionar um Bloco (para Macro) ou uma Macro (para Micro).

**Problema:** Quando o usuário clica no `<SelectTrigger>`, o `<SelectContent>` (a lista de opções) fica renderizado **atrás do modal**, tornando impossível visualizar ou selecionar as opções.

## Sintomas

1. Modal abre normalmente
2. Usuário clica no dropdown
3. A lista de opções aparece, mas está **oculta atrás do modal**
4. Impossível interagir com as opções

## Tentativas de Correção

### Tentativa 1: Adicionar `z-50` ao SelectContent

**Código:**
```tsx
<SelectContent className="z-50">
  {blocos?.map((bloco) => (...))}
</SelectContent>
```

**Resultado:** ❌ **NÃO FUNCIONOU**

**Motivo:** O problema não é apenas z-index. O SelectContent é renderizado em um portal (Radix UI), e o modal também usa um portal com seu próprio contexto de stacking.

---

### Tentativa 2: Adicionar `z-50` + `sideOffset={4}`

**Código:**
```tsx
<SelectContent className="z-50" sideOffset={4}>
  {blocos?.map((bloco) => (...))}
</SelectContent>
```

**Resultado:** ❌ **NÃO FUNCIONOU**

**Motivo:** `sideOffset` apenas controla o espaçamento entre o trigger e o content. Não resolve o problema de stacking.

---

### Tentativa 3: Investigar Histórico de Commits

**Ação:** Procurei no histórico de commits por soluções anteriores.

**Commits Encontrados:**
- `da2423f` - "Corrigido erro crítico NotFoundError: removeChild adicionando sideOffset={4} a TODOS os SelectContent"
- `8c0d856` - "CORREÇÃO COMPLETA: Adicionar sideOffset={4} a TODOS os SelectContent em Dialog"
- `99e16c7` - "Correção do erro 'NotFoundError: Failed to execute removeChild' ao clicar em Select dentro de Dialogs"
- `a9d12a2` - "Erro NotFoundError ao editar ação corrigido removendo position="popper" dos SelectContent"

**Observação:** Os commits mencionam `sideOffset={4}` como solução, mas isso não funcionou neste caso.

---

### Tentativa 4: Restaurar Arquivo Anterior que Funcionava

**Ação:** Extraí o arquivo `Competencias.tsx` do commit `399dc81` que tinha a funcionalidade implementada e funcionando.

**Mudanças Aplicadas:**
- Alterado de 3 botões separados para 1 botão com DropdownMenu
- Estados separados para cada formulário (nomeBloco, nomeMacro, nomeMicro, etc.)
- Removido `z-50` e `sideOffset={4}` do SelectContent (volta ao padrão)
- Estrutura idêntica ao commit anterior que funcionava

**Resultado:** ⏳ **AGUARDANDO TESTE**

---

## Análise Técnica

### Problema Raiz

O erro ocorre porque:

1. **Modal (ModalCustomizado)** é renderizado como um portal com `z-index` alto
2. **SelectContent** também é renderizado como um portal (Radix UI)
3. Os portais têm contextos de stacking separados
4. O SelectContent é criado fora do DOM do Modal, então herda o z-index do contexto global, não do modal

### Soluções Possíveis

1. **Usar DropdownMenu em vez de Select** (Solução aplicada)
   - DropdownMenu é renderizado no mesmo contexto do Modal
   - Evita o problema de portais separados

2. **Adicionar `position="popper"` ao SelectContent**
   - Mencionado em commits anteriores
   - Pode resolver o problema de renderização

3. **Usar `portal={false}` no SelectContent**
   - Força o SelectContent a ser renderizado no DOM do Modal
   - Pode resolver o problema de stacking

4. **Aumentar z-index do Modal**
   - Não é recomendado, pois pode afetar outros componentes

---

## Estrutura do Arquivo Atual

**Arquivo:** `/home/ubuntu/pdi_system/client/src/pages/Competencias.tsx`

**Componentes:**
- 1 botão "Criar Competência" com DropdownMenu
- 3 DropdownMenuItems: "Novo Bloco", "Nova Macro", "Nova Micro"
- 3 Modais: ModalCustomizado para cada tipo
- SelectContent sem atributos especiais (padrão)

---

## Próximas Ações Recomendadas

1. **Testar a versão atual** com DropdownMenu
2. **Se ainda não funcionar:**
   - Adicionar `position="popper"` ao SelectContent
   - Ou adicionar `portal={false}` ao SelectContent
3. **Se ainda não funcionar:**
   - Considerar usar um componente alternativo (ex: Combobox)
   - Ou usar um componente customizado sem portal

---

## Referências de Commits Anteriores

- Commit `399dc81`: Implementação que funcionava com DropdownMenu
- Commit `da2423f`: Tentativa de correção com `sideOffset={4}`
- Commit `a9d12a2`: Tentativa de correção removendo `position="popper"`

---

## Histórico de Mudanças

| Data | Tentativa | Resultado |
|------|-----------|-----------|
| 17 JAN 2025 | z-50 | ❌ Não funcionou |
| 17 JAN 2025 | z-50 + sideOffset={4} | ❌ Não funcionou |
| 17 JAN 2025 | Restaurar arquivo anterior | ⏳ Aguardando teste |

