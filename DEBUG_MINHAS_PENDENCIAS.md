# Problema: Status de Evidência Não Atualiza em "Minhas Ações"

## 🔴 Problema Descrito
Na página "Minhas Ações" (MinhasPendencias.tsx), quando uma ação tem uma evidência aprovada pelo administrador:
- ✅ O status VERDE "✓ Ação Concluída" **APARECE** corretamente
- ❌ MAS o botão azul "Registrar Minha Conquista" **CONTINUA APARECENDO** abaixo
- ❌ O ID de validação **NÃO APARECE** abaixo do status verde

## 📋 Fluxo Esperado
1. **Inicial**: Botão azul "Registrar Minha Conquista" (clicável)
2. **Após enviar evidência**: Status AMARELO "⏳ Evidência em Análise" (bloqueado, sem botão)
3. **Após aprovação do admin**: Status VERDE "✓ Ação Concluída" com ID de validação (bloqueado, sem botão)
4. **Se rejeitada**: Volta ao Botão azul (clicável novamente)

## 🔍 Tentativas de Solução

### Tentativa 1: Filtro por ActionId
**Problema identificado**: A variável `ultimaEvidencia` era compartilhada entre todas as ações no loop.

**Solução tentada**: Criar `evidenciaDesta_Acao` usando `.find()` dentro do map:
```javascript
const evidenciaDesta_Acao = allUserEvidences?.find(
  (e: any) => e.actionId === acao.id
);
```

**Resultado**: ❌ Não funcionou - o botão azul continuava aparecendo

---

### Tentativa 2: Adicionar ID de Validação
**Código adicionado** (linha 366):
```javascript
<div className="text-xs text-green-600 mt-1 font-normal">
  ID Validação: {evidenciaDesta_Acao.id}
</div>
```

**Resultado**: ❌ O ID não aparecia na tela

---

### Tentativa 3: Criar Procedimento `listByUser`
**Problema identificado**: O procedimento `trpc.evidences.listByUser` não existia no servidor.

**Solução implementada** (server/routers.ts, linhas 290-310):
```typescript
listByUser: protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user?.id;
  if (!userId) return [];
  
  // Buscar todas as ações do usuário
  const userActions = await db.execute(
    sql`SELECT id FROM actions WHERE responsavelId = ${userId}`
  );
  const [actions]: any = userActions;
  
  if (!actions || actions.length === 0) return [];
  
  // Buscar todas as evidências dessas ações
  const actionIds = actions.map((a: any) => a.id);
  const evidencesData = await db.execute(
    sql`SELECT * FROM evidences WHERE actionId IN (${actionIds.join(',')})`
  );
  const [evidences]: any = evidencesData;
  
  return evidences || [];
}),
```

**Resultado**: ✅ Procedimento criado, mas dados ainda não apareciam corretamente

---

### Tentativa 4: Adicionar Invalidate para Recarregar
**Código adicionado** (MinhasPendencias.tsx, linha 116):
```javascript
const submitEvidenceMutation = trpc.evidences.create.useMutation({
  onSuccess: () => {
    toast.success("Evidência enviada!");
    utils.actions.list.invalidate();
    utils.evidences.listByUser.invalidate(); // ← Adicionado
    // ...
  },
```

**Resultado**: ✅ Adicionado, mas não resolveu o problema principal

---

### Tentativa 5: Adicionar Logs de Debug
**Código adicionado** (MinhasPendencias.tsx, linhas 98-105):
```javascript
useEffect(() => {
  console.log('[MinhasPendencias] allUserEvidences:', allUserEvidences);
  console.log('[MinhasPendencias] Total de evidências:', allUserEvidences?.length);
  if (allUserEvidences && allUserEvidences.length > 0) {
    console.log('[MinhasPendencias] Primeira evidência:', allUserEvidences[0]);
  }
}, [allUserEvidences]);
```

**Resultado**: ✅ Logs confirmaram que `allUserEvidences` **ESTÁ SENDO CARREGADO CORRETAMENTE**

---

### Tentativa 6: Reescrever Lógica Usando Status da Ação
**Código reescrito** (MinhasPendencias.tsx, linhas 352-394):

**Antes** (não funcionava):
```javascript
if (evidenciaDesta_Acao?.status === 'aprovada') {
  // Mostrar verde
}
```

**Depois** (usando status da ação):
```javascript
// Se a ação está concluída, mostrar verde com ID
if (acao.status === 'concluida' && evidenciaDesta_Acao) {
  return (
    <div className="w-full py-3 px-4 bg-green-100 text-green-700 border border-green-200 rounded-lg font-bold flex flex-col items-center justify-center cursor-default">
      <div className="flex items-center justify-center">
        <span className="mr-2">✓</span> Ação Concluída
      </div>
      <div className="text-xs text-green-600 mt-1 font-normal">
        ID Validação: {evidenciaDesta_Acao.id}
      </div>
    </div>
  );
}

// Se a ação está em análise, mostrar amarelo
if (acao.status === 'aguardando_avaliacao') {
  return (
    <div className="w-full py-3 px-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-medium flex items-center justify-center cursor-wait">
      <span className="mr-2">⏳</span> Evidência em Análise
    </div>
  );
}

// Caso contrário, mostrar botão azul
return (
  <button onClick={() => { ... }}>
    Registrar Minha Conquista
  </button>
);
```

**Resultado**: ⏳ Aguardando teste (recompilação em andamento)

---

## 🎯 Hipóteses Principais

### Hipótese 1: Status da Ação vs Status da Evidência
- Quando o admin aprova uma evidência, qual campo é atualizado?
  - `evidences.status` = 'aprovada'?
  - `actions.status` = 'concluida'?
  - Ambos?

### Hipótese 2: Valores de Status Diferentes
- Possível que o status seja:
  - `'concluida'` (com "i") em vez de `'aprovada'`
  - `'concluído'` (com acento)
  - Algo diferente no banco de dados

### Hipótese 3: Sincronização de Dados
- O `allUserEvidences` pode estar carregando dados antigos
- O `acao.status` pode não estar sendo atualizado em tempo real

---

## 📊 Arquivos Modificados

1. **client/src/pages/MinhasPendencias.tsx**
   - Adicionado logs de debug
   - Adicionado invalidate para `listByUser`
   - Reescrita lógica de status

2. **server/routers.ts**
   - Adicionado procedimento `listByUser` (linhas 290-310)

---

## ❓ Perguntas para o Consultor

1. Qual é o **status exato** que vem do banco de dados quando uma evidência é aprovada?
   - Na tabela `evidences`: qual é o valor em `status`?
   - Na tabela `actions`: qual é o valor em `status` após aprovação?

2. Quando o admin clica em "Aprovar" no AdminDashboard, quais campos são atualizados?
   - Apenas `evidences.status`?
   - Apenas `actions.status`?
   - Ambos?

3. O `listByUser` está retornando as evidências com o status correto?
   - Pode fazer um SELECT direto no banco para verificar?

4. Há cache ou sincronização que pode estar atrasando os dados?

---

## 🔧 Próximas Ações Recomendadas

1. Verificar no banco de dados qual é o status exato de uma ação concluída
2. Adicionar console.log no servidor para ver o que `listByUser` está retornando
3. Verificar se `approve` mutation está atualizando corretamente `actions.status`
4. Testar a lógica reescrita com os valores corretos de status
