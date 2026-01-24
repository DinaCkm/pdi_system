# Código para Revisão - Problema em "Minhas Ações"

## 🎯 Problema
Quando uma ação é aprovada pelo admin:
- ✅ Status verde "✓ Ação Concluída" aparece
- ❌ Botão azul "Registrar Minha Conquista" continua aparecendo
- ❌ ID de validação não aparece

---

## 📁 Arquivos Principais

### 1. **client/src/pages/MinhasPendencias.tsx** (Linhas 351-394)

**Lógica Atual (Reescrita):**
```javascript
<div className="mt-4 w-full">
  {(() => {
    // Usar status da AÇÃO para determinar o que mostrar
    const evidenciaDesta_Acao = allUserEvidences?.find(
      (e: any) => e.actionId === acao.id
    );
    
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
      <button
        onClick={() => {
          setSelectedAcaoEvidence(acao);
          setShowEvidenceDialog(true);
        }}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-md active:scale-95"
      >
        Registrar Minha Conquista
      </button>
    );
  })()}
</div>
```

**Dados Usados:**
- `allUserEvidences` - Array de todas as evidências do usuário (carregado via `trpc.evidences.listByUser`)
- `acao.status` - Status da ação (ex: 'concluida', 'aguardando_avaliacao', 'em_andamento')
- `evidenciaDesta_Acao.id` - ID da evidência específica para aquela ação

---

### 2. **server/routers.ts** (Linhas 290-310)

**Novo Procedimento `listByUser`:**
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

---

### 3. **Mutation para Criar Evidência** (Linhas 112-127)

**Invalidate Adicionado:**
```typescript
const submitEvidenceMutation = trpc.evidences.create.useMutation({
  onSuccess: () => {
    toast.success("Evidência enviada!");
    utils.actions.list.invalidate();
    utils.evidences.listByUser.invalidate(); // ← Recarrega todas as evidências
    setTimeout(() => {
      setShowEvidenceDialog(false);
      setEvidenceDescription("");
      setEvidenceFile(null);
    }, 100);
  },
  onError: (error: any) => {
    const mensagem = error?.message || "Não foi possível enviar...";
    toast.error(mensagem);
  },
});
```

---

### 4. **Approve Mutation no AdminDashboard** (server/routers.ts, Linhas 219-235)

**O que acontece quando admin aprova:**
```typescript
approve: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const ev = await db.getEvidenceById(input.id);
    if(ev) {
        // 1. Atualiza status da evidência para 'aprovada'
        await db.updateEvidenceStatus(input.id, { status: 'aprovada', evaluatedBy: ctx.user!.id, evaluatedAt: new Date() });
        
        // 2. Atualiza status da ação para 'concluida'
        await db.updateAction(ev.actionId, { status: 'concluida' });
        
        // 3. Notifica o proprietário
        const action = await db.getActionById(ev.actionId);
        if(action) {
            await notifyOwner({
                title: '✅ Evidência Aprovada',
                content: `A evidência para a ação "${action.titulo}" foi aprovada pelo administrador.`
            });
        }
    }
    return { success: true };
}),
```

---

## 🔍 Dados Carregados (Debug Logs)

**Console Log adicionado** (Linhas 98-105):
```javascript
useEffect(() => {
  console.log('[MinhasPendencias] allUserEvidences:', allUserEvidences);
  console.log('[MinhasPendencias] Total de evidências:', allUserEvidences?.length);
  if (allUserEvidences && allUserEvidences.length > 0) {
    console.log('[MinhasPendencias] Primeira evidência:', allUserEvidences[0]);
  }
}, [allUserEvidences]);
```

**Resultado:** ✅ Confirma que `allUserEvidences` **ESTÁ SENDO CARREGADO CORRETAMENTE**

---

## ❓ Perguntas Críticas para o Consultor

1. **Qual é o status exato no banco de dados?**
   - Quando ação é aprovada, qual valor aparece em `actions.status`?
   - É `'concluida'` ou `'concluído'` ou outro?

2. **A query `listByUser` está retornando as evidências corretas?**
   - Execute: `SELECT * FROM evidences WHERE actionId IN (SELECT id FROM actions WHERE responsavelId = 840001) LIMIT 5;`
   - Qual é o `status` retornado?

3. **O `approve` mutation está atualizando ambos os registros?**
   - Verifique se `actions.status` está sendo atualizado para `'concluida'`
   - Verifique se `evidences.status` está sendo atualizado para `'aprovada'`

4. **Há delay ou cache?**
   - O `invalidate` está funcionando?
   - Os dados estão sendo recarregados?

---

## 🔧 Próximas Ações

1. Verificar valores exatos no banco de dados
2. Adicionar console.log no servidor para ver o que `listByUser` retorna
3. Testar a lógica reescrita com valores corretos
4. Considerar adicionar `invalidate` no AdminDashboard após aprovar/rejeitar
