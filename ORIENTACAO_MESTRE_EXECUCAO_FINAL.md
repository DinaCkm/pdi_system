# 🎖️ ORIENTAÇÃO MESTRE DE EXECUÇÃO - Fase 3 Final

**Objetivo Central:** Fluxo de PDI Auditável e Transparente

---

## 🎯 Diretrizes Estratégicas

O sistema deve ser uma **vitrine de transparência e credibilidade**. O ciclo de vida do PDI é focado na **Ação** como unidade de progresso, garantindo que:

- ✅ Colaborador visualiza cada etapa
- ✅ Líder valida conveniência
- ✅ RH (Dina) detém a palavra final
- ✅ Auditoria completa de todas as mudanças

---

## 1️⃣ Implementação das Regras de Ouro no Backend

### Regra #7: Criação Admin-Only

```tsx
// pdi.router.ts
criarPdi: adminProcedure
  .input(z.object({
    colaboradorId: z.number(),
    cicloId: z.number(),
    titulo: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Apenas Admin pode criar
    // Validação de permissão já garantida por adminProcedure
  })
```

### Regra #8: Validação de Unicidade

```tsx
// Tratar erro UNIQUE no backend
try {
  const result = await db.insert(pdis).values({
    colaboradorId: input.colaboradorId,
    cicloId: input.cicloId,
    // ...
  });
} catch (error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Este colaborador já possui um PDI ativo para o ciclo selecionado",
    });
  }
  throw error;
}
```

### Regra #9: Validação de Prazo dentro do Ciclo

```tsx
// criarAcao
criarAcao: adminProcedure
  .input(z.object({
    pdiId: z.number(),
    prazo: z.date(),
    // ...
  }))
  .mutation(async ({ ctx, input }) => {
    // JOIN com ciclos
    const pdi = await db
      .select()
      .from(pdis)
      .where(eq(pdis.id, input.pdiId))
      .limit(1);

    const ciclo = await db
      .select()
      .from(ciclos)
      .where(eq(ciclos.id, pdi[0].cicloId))
      .limit(1);

    // Validar prazo
    if (input.prazo < ciclo[0].dataInicio || input.prazo > ciclo[0].dataFim) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Prazo deve estar entre ${ciclo[0].dataInicio.toLocaleDateString()} e ${ciclo[0].dataFim.toLocaleDateString()}`,
      });
    }
  })
```

---

## 2️⃣ Fluxo de Ajustes e Transparência (Regra #10 REFINADA)

### Status Intermediário: `lider_de_acordo`

**Novo Status Adicionado ao Fluxo:**

```
pendente_confirmacao_lider
    ↓ (Líder confirma)
lider_de_acordo ← NOVO STATUS
    ↓ (Admin aprova + edita)
aprovada
```

### Campo Obrigatório: `feedback_lider`

**Schema Update:**

```tsx
// drizzle/schema.ts
export const adjustmentRequests = mysqlTable("adjustment_requests", {
  id: int().primaryKey().autoincrement(),
  // ... campos existentes ...
  
  // NOVO CAMPO
  feedback_lider: text("feedback_lider").notNull().default(""),
  
  // ... resto dos campos ...
});
```

### Visibilidade Total

**Permissões de Leitura:**

```tsx
// Colaborador pode ler feedback_lider
// Líder pode ler feedback_lider
// Admin pode ler feedback_lider

// Apenas Líder pode ESCREVER feedback_lider
```

### Trava de Edição

```tsx
// aprovarAlteracao (adminProcedure)
// Apenas Admin pode editar dados técnicos após status = lider_de_acordo

if (solicitacao[0].status !== "lider_de_acordo") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Aguardando confirmação do líder antes de editar",
  });
}

// Apenas então Admin pode fazer as edições
const updateData = {
  descricao: input.novaDescricao,
  prazo: input.novoPrazo,
  // ...
};
```

---

## 3️⃣ Componentização da Timeline (PDITimeline.tsx)

### Badges de Responsabilidade

**Mapeamento de Status → Badge:**

```tsx
const statusBadges = {
  "pendente_aprovacao_lider": {
    texto: "Aguardando Líder",
    cor: "bg-yellow-100 text-yellow-800",
    icone: "⏳",
  },
  "lider_de_acordo": {
    texto: "Com Dina (RH)",
    cor: "bg-blue-100 text-blue-800",
    icone: "👤",
  },
  "evidencia_enviada": {
    texto: "Aguardando Validação RH",
    cor: "bg-orange-100 text-orange-800",
    icone: "📋",
  },
  "concluida": {
    texto: "Concluída",
    cor: "bg-green-100 text-green-800",
    icone: "✅",
  },
  "reprovada": {
    texto: "Reprovada",
    cor: "bg-red-100 text-red-800",
    icone: "❌",
  },
};
```

### Histórico de Comentários (Chat Cronológico)

```tsx
// Dentro de cada card de ação
<div className="mt-4 space-y-3">
  <h4 className="font-bold">Histórico de Interações</h4>
  
  {historico.map((item) => (
    <div key={item.id} className="border-l-2 border-gray-300 pl-3">
      <div className="text-sm font-semibold">
        {item.ator} ({item.role})
      </div>
      <div className="text-sm text-gray-600">
        {item.data.toLocaleString()}
      </div>
      <div className="text-sm mt-1">
        {item.acao}: {item.comentario}
      </div>
    </div>
  ))}
</div>
```

---

## 4️⃣ Validação Final de Evidências

### Procedure `validarEvidencia` (Admin-Only)

```tsx
validarEvidencia: adminProcedure
  .input(z.object({
    evidenciaId: z.number(),
    aprovada: z.boolean(),
    justificativa: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { db, user } = ctx;

    // Validar evidência existe
    const evidencia = await db
      .select()
      .from(evidences)
      .where(eq(evidences.id, input.evidenciaId))
      .limit(1);

    if (!evidencia.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Evidência não encontrada",
      });
    }

    // Atualizar evidência
    const novoStatus = input.aprovada ? "aprovada" : "reprovada";
    await db
      .update(evidences)
      .set({
        status: novoStatus,
        justificativaAdmin: input.justificativa || null,
        evaluatedAt: new Date(),
        evaluatedBy: user.id,
      })
      .where(eq(evidences.id, input.evidenciaId));

    // Atualizar ação
    if (input.aprovada) {
      const acao = await db
        .select()
        .from(actions)
        .where(eq(actions.id, evidencia[0].actionId))
        .limit(1);

      if (acao.length) {
        // Registrar conclusão
        await db
          .update(actions)
          .set({
            status: "concluida",
            concluidoEm: new Date(),
            concluidoPor: user.id,
            concluidoPorNome: user.name,
            updatedAt: new Date(),
          })
          .where(eq(actions.id, evidencia[0].actionId));

        // Registrar no audit log
        await db.insert(auditLog).values({
          tabela: "actions",
          registroId: acao[0].id,
          acao: "concluida",
          usuario: user.id,
          descricao: `Ação concluída e validada por ${user.name} (RH) em ${new Date().toLocaleString()}`,
          dataMudanca: new Date(),
        });
      }
    }

    return {
      id: input.evidenciaId,
      status: novoStatus,
      mensagem: input.aprovada
        ? "Ação concluída e validada"
        : "Evidência reprovada",
    };
  })
```

---

## 5️⃣ Checklist de Ação Imediata

### Backend

- [ ] Executar `pnpm db:push` para aplicar:
  - Índice `UNIQUE(colaboradorId, cicloId)`
  - Campo `feedback_lider` em `adjustmentRequests`
  - Tabela `auditLog` para rastreamento

- [ ] Atualizar `pdi-ajustes.router.ts`:
  - Adicionar status `lider_de_acordo`
  - Obrigar `feedback_lider` ao confirmar
  - Trava de edição após `lider_de_acordo`

- [ ] Criar/Atualizar `validarEvidencia`:
  - Usar `adminProcedure`
  - Registrar conclusão com data/hora
  - Registrar no `auditLog`

### Frontend

- [ ] Separar abas rigorosamente:
  - **"Meu PDI"** (Líder vê suas metas)
  - **"Minha Equipe"** (Líder vê e comenta)

- [ ] Atualizar `PDITimeline.tsx`:
  - Adicionar badges de responsabilidade
  - Exibir histórico de comentários
  - Mostrar `feedback_lider` quando disponível

- [ ] Implementar popup:
  - "Você conversou com seu líder?"
  - Enviar email ao Líder quando colaborador solicita

### Auditoria

- [ ] Criar tabela `auditLog` se não existir
- [ ] Registrar cada mudança de status
- [ ] Registrar quem fez cada ação
- [ ] Registrar data/hora de cada mudança

---

## 🎯 Fluxo Completo Refinado

```
1. ADMIN cria PDI
   └─ Status: rascunho
   └─ Registra no auditLog

2. ADMIN cria AÇÃO
   └─ Status: pendente_aprovacao_lider
   └─ Registra no auditLog

3. LÍDER aprova AÇÃO
   └─ Status: aprovada_lider
   └─ Registra no auditLog
   └─ Notifica Colaborador

4. COLABORADOR executa AÇÃO
   └─ Status: em_andamento

5. COLABORADOR solicita ALTERAÇÃO
   └─ Popup: "Conversou com seu líder?"
   └─ Email: Notifica Líder
   └─ Status Solicitação: pendente_confirmacao_lider

6. LÍDER confirma ALTERAÇÃO
   └─ Status Solicitação: lider_de_acordo
   └─ Campo: feedback_lider (obrigatório)
   └─ Registra no auditLog
   └─ Notifica Admin

7. ADMIN aprova ALTERAÇÃO
   └─ Status Solicitação: aprovada
   └─ Admin edita AÇÃO (múltiplos campos)
   └─ Registra histórico detalhado
   └─ Registra no auditLog

8. COLABORADOR envia EVIDÊNCIA
   └─ Status Ação: evidencia_enviada
   └─ Notifica Admin

9. ADMIN valida EVIDÊNCIA
   └─ Status Ação: concluida
   └─ Registra: "Concluída por Dina em [Data]"
   └─ Registra no auditLog

10. Quando TODAS as ações concluídas
    └─ Status PDI: concluido (automático)
    └─ Registra no auditLog
```

---

## 📊 Tabelas Necessárias

### `adjustmentRequests` (Atualizado)

```sql
CREATE TABLE adjustment_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  actionId INT NOT NULL,
  solicitanteId INT NOT NULL,
  tipoSolicitacao ENUM(...),
  descricaoSolicitacao TEXT,
  liderConfirmacao BOOLEAN,
  liderConfirmadoPor INT,
  feedback_lider TEXT NOT NULL DEFAULT '',  -- NOVO
  liderJustificativa TEXT,
  liderConfirmadoAt DATETIME,
  status ENUM('pendente_confirmacao_lider', 'lider_de_acordo', 'pendente_admin', 'aprovada', 'rejeitada'),
  respondidoPor INT,
  justificativaResposta TEXT,
  respondidoAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (actionId) REFERENCES actions(id),
  FOREIGN KEY (solicitanteId) REFERENCES users(id),
  FOREIGN KEY (liderConfirmadoPor) REFERENCES users(id),
  FOREIGN KEY (respondidoPor) REFERENCES users(id)
);
```

### `auditLog` (Nova)

```sql
CREATE TABLE audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tabela VARCHAR(50) NOT NULL,
  registroId INT NOT NULL,
  acao VARCHAR(50) NOT NULL,
  usuario INT NOT NULL,
  descricao TEXT,
  dataMudanca DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario) REFERENCES users(id),
  INDEX (tabela, registroId),
  INDEX (dataMudanca)
);
```

---

## ✅ Veredito Final

Com essas implementações, o sistema operará com:

✅ **Transparência Total:** Cada ação é rastreada e auditada  
✅ **Credibilidade:** Feedback do Líder é obrigatório e visível  
✅ **Controle:** Admin detém a palavra final em todas as edições  
✅ **Rastreabilidade:** Audit log completo de todas as mudanças  
✅ **Dualidade:** Líder atua como validador e colaborador

**Status:** 🎖️ **PRODUCTION READY PARA FASE 4**
