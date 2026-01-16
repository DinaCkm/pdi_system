# 📋 Fase 3: Requisitos Adicionais Consolidados

**Data:** Janeiro 2026  
**Status:** 📝 Documentado para Implementação  

---

## 🎯 9 Requisitos Críticos Adicionais

### 1️⃣ Limite de Solicitações de Ajuste (Máximo 5)

**Regra:** Um colaborador ou líder pode fazer no máximo **5 solicitações de ajuste** por PDI.

**Implementação:**
```tsx
// Validação no backend (pdi-ajustes.router.ts)
const totalSolicitacoes = await db
  .select()
  .from(adjustmentRequests)
  .where(eq(adjustmentRequests.actionId, input.acaoId))
  .where(eq(adjustmentRequests.solicitanteId, user.id));

if (totalSolicitacoes.length >= 5) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Limite de 5 solicitações de ajuste atingido para esta ação",
  });
}
```

**Mensagem:** "Você atingiu o limite de 5 solicitações de ajuste para esta ação. Contate o administrador."

---

### 2️⃣ Histórico Completo de Solicitações

**Regra:** Exibir TODAS as solicitações (pendentes, resolvidas, aceitas, recusadas), não apenas as pendentes.

**Campos Obrigatórios:**
- `dataSolicitacao` (quando foi criada)
- `dataResposta` (quando foi respondida)
- Filtro por status

**Nome da Tela:** "Histórico de Solicitações" (não "Solicitações Pendentes")

**Implementação:**
```tsx
// Procedure: listarSolicitacoesCompleto (com histórico)
listarSolicitacoesCompleto: protectedProcedure
  .input(z.object({
    status: z.enum([...]).optional(),
    dataInicio: z.date().optional(),
    dataFim: z.date().optional(),
  }))
  .query(async ({ ctx, input }) => {
    // Retornar TODAS as solicitações com datas
  })
```

---

### 3️⃣ Popup de Confirmação (Colaborador)

**Regra:** Ao enviar uma solicitação de ajuste, exibir popup perguntando: **"Você já conversou com seu líder sobre esta alteração?"**

**Comportamento:**
- Se **SIM** → Prosseguir com solicitação
- Se **NÃO** → Bloquear envio com mensagem "Recomendamos conversar com seu líder antes de solicitar alterações"

**Implementação:**
```tsx
// Apenas na página do Colaborador
const [confirmouComLider, setConfirmouComLider] = useState(false);

// Popup
<Dialog open={showConfirmacao}>
  <p>Você já conversou com seu líder sobre esta alteração?</p>
  <button onClick={() => setConfirmouComLider(true)}>Sim</button>
  <button onClick={() => setConfirmouComLider(false)}>Não</button>
</Dialog>

// Habilitar submit apenas se confirmouComLider === true
```

---

### 4️⃣ Notificação por Email ao Líder

**Regra:** Quando colaborador solicita ajuste, enviar email ao seu líder.

**Email:**
- **Assunto:** `PARA A SUA CIÊNCIA - ALTERAÇÃO NO PDI`
- **Conteúdo:** 
  - Colaborador X solicitou alterações na ação do PDI
  - Detalhe da alteração solicitada
  - **Nota:** "Não é necessário responder a este e-mail"

**Implementação:**
```tsx
// Após solicitação ser criada
await sendEmailSolicitacaoAjuste({
  to: liderEmail,
  colaboradorNome: user.name,
  acaoDescricao: acao.descricao,
  alteracaoSolicitada: input.descricaoSolicitacao,
});
```

---

### 5️⃣ Edição Completa pelo Administrador

**Regra:** Ao aprovar uma solicitação, Admin pode editar **TODOS os campos**, não apenas o solicitado.

**Campos Editáveis:**
- Descrição
- Prazo
- Competência (Bloco/Macro/Micro)
- Status
- Qualquer outro campo da ação

**Implementação:**
```tsx
// Procedure: aprovarAlteracao
// Permitir edição de múltiplos campos
const updateData = {
  descricao: input.novaDescricao || acao.descricao,
  prazo: input.novoPrazo || acao.prazo,
  microId: input.novoMicroId || acao.microId,
  status: input.novoStatus || acao.status,
  // ... mais campos
};
```

---

### 6️⃣ Histórico Detalhado de Alterações

**Regra:** Exibir claramente o que foi alterado, campo por campo.

**Formato:**
- Se alterado: `CAMPO: VALOR_ORIGINAL → ALTERAÇÃO PARA: NOVO_VALOR`
- Se mantido: `CAMPO: MANTIDO`

**Exemplo:**
```
DESCRIÇÃO: Aprender Python → ALTERAÇÃO PARA: Aprender Python e SQL
PRAZO: 02/06/2026 → ALTERAÇÃO PARA: 05/06/2026
COMPETÊNCIA: MANTIDO
```

**Implementação:**
```tsx
// Tabela de histórico
const historicoAlteracoes = [
  { campo: "descricao", original: "...", alterado: "...", status: "alterado" },
  { campo: "prazo", original: "...", alterado: "...", status: "alterado" },
  { campo: "competencia", original: "...", alterado: "...", status: "mantido" },
];
```

---

### 7️⃣ Notificações Automáticas por Email

**Regra:** Sistema de notificação automática para diferentes papéis.

**Mapeamento:**
| Evento | Destinatário | Assunto | Conteúdo |
|--------|-------------|---------|----------|
| PDI criado | Colaborador | PDI Criado | Seu PDI foi criado para o ciclo X |
| PDI criado | Líder | PDI da Equipe | Novo PDI criado para X |
| Ação aguardando aprovação | Líder | Ação Aguardando Aprovação | Ação de X aguarda sua aprovação |
| Ação aprovada | Colaborador | Ação Aprovada | Sua ação foi aprovada |
| Evidência enviada | Admin | Evidência Aguardando Validação | Evidência de X aguarda validação |
| Evidência aprovada | Colaborador | Evidência Aprovada | Sua evidência foi aprovada |
| Ajuste solicitado | Líder | PARA SUA CIÊNCIA - ALTERAÇÃO NO PDI | Colaborador X solicitou alterações |
| Ajuste aprovado | Colaborador | Ajuste Aprovado | Sua solicitação de ajuste foi aprovada |
| Ajuste rejeitado | Colaborador | Ajuste Rejeitado | Sua solicitação de ajuste foi rejeitada |

**Implementação:**
```tsx
// Disparar notificação após cada mudança de status
await notifyOwner({
  title: "Ação Aguardando Aprovação",
  content: `Ação de ${colaborador.name} aguarda sua aprovação`,
  destinatario: lider.email,
});
```

---

### 8️⃣ Líder Pode Solicitar Alterações

**Regra:** Líder pode solicitar alterações tanto no seu próprio PDI quanto no PDI de seus subordinados.

**Cenários:**
1. Líder solicita alteração no seu PDrio (atua como Colaborador)
2. Líder solicita alteração no PDI de subordinado

**Implementação:**
```tsx
// Validação no solicitarAlteracao
if (user.role === "lider") {
  // Pode solicitar no seu PDI
  if (pdi.colaboradorId === user.id) return true;
  
  // Pode solicitar no PDI de subordinados
  const subordinado = await db
    .select()
    .from(users)
    .where(eq(users.leaderId, user.id))
    .where(eq(users.id, pdi.colaboradorId));
  
  if (subordinado.length) return true;
}
```

---

### 9️⃣ Administrador é Líder (Sem PDI Próprio)

**Regra:** Admin é considerado Líder, mesmo sem PDI próprio.

**Implicações:**
- Admin pode visualizar PDIs de toda a organização
- Admin não tem PDI próprio
- Admin tem responsabilidades de Líder (aprovação, validação)

**Implementação:**
```tsx
// Ao buscar líderes para atribuição
const lideres = await db
  .select()
  .from(users)
  .where(
    or(
      eq(users.role, "lider"),
      eq(users.role, "admin")
    )
  );
```

---

## 📊 Checklist de Implementação

- [ ] Limite de 5 solicitações (validação no backend)
- [ ] Histórico completo com datas
- [ ] Popup de confirmação (frontend)
- [ ] Email ao Líder quando colaborador solicita
- [ ] Edição completa pelo Admin
- [ ] Histórico detalhado (Original → Alterado ou Mantido)
- [ ] Notificações automáticas por email
- [ ] Líder pode solicitar alterações (próprio + subordinados)
- [ ] Admin considerado Líder no sistema

---

## 🔗 Integração com Fase 3

Esses requisitos refinam os procedures já criados:

- **`solicitarAlteracao`** → Adicionar limite de 5 + validação de Líder
- **`listarSolicitacoes`** → Criar `listarSolicitacoesCompleto` com histórico
- **`aprovarAlteracao`** → Permitir edição de múltiplos campos + histórico detalhado
- **Frontend** → Popup de confirmação + visualização de histórico

---

## 🚀 Próximos Passos

1. Atualizar `pdi-ajustes.router.ts` com novos requisitos
2. Criar procedure `listarSolicitacoesCompleto`
3. Implementar popup no frontend
4. Configurar sistema de emails
5. Criar testes de integração
