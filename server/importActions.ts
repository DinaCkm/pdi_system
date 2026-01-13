import { z } from "zod";
import { adminProcedure, router } from "./_core/customTrpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

/**
 * Tipo de linha do CSV de importação
 */
type ActionImportRow = {
  cpf: string;
  cicloNome: string;
  nomeAcao: string;
  descricaoAcao: string;
  microcompetenciaNome: string;
  prazo: string; // formato: DD/MM/YYYY
};

/**
 * Resultado da validação de uma linha
 */
type ValidationResult = {
  row: number;
  valid: boolean;
  errors: string[];
  data?: {
    colaboradorId: number;
    colaboradorNome: string;
    pdiId: number;
    cicloId: number;
    cicloNome: string;
    blocoId: number;
    blocoNome: string;
    macroId: number;
    macroNome: string;
    microId: number;
    microNome: string;
    nomeAcao: string;
    descricaoAcao: string;
    prazo: Date;
  };
};

/**
 * Valida uma linha do CSV
 */
async function validateRow(row: ActionImportRow, rowNumber: number): Promise<ValidationResult> {
  const errors: string[] = [];

  // 1. Validar campos obrigatórios
  if (!row.cpf || row.cpf.trim() === "") {
    errors.push("CPF é obrigatório");
  }
  if (!row.cicloNome || row.cicloNome.trim() === "") {
    errors.push("Nome do ciclo é obrigatório");
  }
  if (!row.nomeAcao || row.nomeAcao.trim() === "") {
    errors.push("Nome da ação é obrigatório");
  }
  if (!row.descricaoAcao || row.descricaoAcao.trim() === "") {
    errors.push("Descrição da ação é obrigatória");
  }
  if (!row.microcompetenciaNome || row.microcompetenciaNome.trim() === "") {
    errors.push("Microcompetência é obrigatória");
  }
  if (!row.prazo || row.prazo.trim() === "") {
    errors.push("Prazo é obrigatório");
  }

  // Se faltam campos obrigatórios, retornar erro
  if (errors.length > 0) {
    return { row: rowNumber, valid: false, errors };
  }

  try {
    // 2. Buscar colaborador por CPF
    const colaborador = await db.getUserByCpf(row.cpf.trim());
    if (!colaborador) {
      errors.push(`Colaborador com CPF ${row.cpf} não encontrado`);
      return { row: rowNumber, valid: false, errors };
    }

    // 3. Buscar ciclo por nome
    const ciclo = await db.getCicloByNome(row.cicloNome.trim());
    if (!ciclo) {
      errors.push(`Ciclo "${row.cicloNome}" não encontrado`);
      return { row: rowNumber, valid: false, errors };
    }

    // 4. Buscar PDI do colaborador neste ciclo
    const pdi = await db.getPDIByColaboradorAndCiclo(colaborador.id, ciclo.id);
    if (!pdi) {
      errors.push(`PDI não encontrado para ${colaborador.name} no ciclo ${ciclo.nome}`);
      return { row: rowNumber, valid: false, errors };
    }

    // 5. Buscar microcompetência por nome
    const micro = await db.getMicroByNome(row.microcompetenciaNome.trim());
    if (!micro) {
      errors.push(`Microcompetência "${row.microcompetenciaNome}" não encontrada`);
      return { row: rowNumber, valid: false, errors };
    }

    // 6. Buscar macro e bloco da micro
    const macro = await db.getMacroById(micro.macroId);
    if (!macro) {
      errors.push(`Macrocompetência não encontrada para micro "${row.microcompetenciaNome}"`);
      return { row: rowNumber, valid: false, errors };
    }

    const bloco = await db.getBlocoById(macro.blocoId);
    if (!bloco) {
      errors.push(`Bloco não encontrado para macro "${macro.nome}"`);
      return { row: rowNumber, valid: false, errors };
    }

    // 7. Validar e parsear prazo (formato DD/MM/YYYY)
    const prazoRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const prazoMatch = row.prazo.trim().match(prazoRegex);
    if (!prazoMatch) {
      errors.push(`Prazo "${row.prazo}" inválido. Use formato DD/MM/YYYY`);
      return { row: rowNumber, valid: false, errors };
    }

    const [, dia, mes, ano] = prazoMatch;
    const prazoDate = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));

    // Verificar se data é válida
    if (isNaN(prazoDate.getTime())) {
      errors.push(`Prazo "${row.prazo}" é uma data inválida`);
      return { row: rowNumber, valid: false, errors };
    }

    // 8. Validar se prazo está dentro do ciclo
    if (prazoDate < ciclo.dataInicio || prazoDate > ciclo.dataFim) {
      const inicioFormatado = ciclo.dataInicio.toLocaleDateString('pt-BR');
      const fimFormatado = ciclo.dataFim.toLocaleDateString('pt-BR');
      errors.push(
        `Prazo ${row.prazo} está fora do ciclo (${inicioFormatado} a ${fimFormatado})`
      );
      return { row: rowNumber, valid: false, errors };
    }

    // 9. Verificar se já existe ação com mesmo nome para este PDI
    const acaoExistente = await db.getActionByPDIAndNome(pdi.id, row.nomeAcao.trim());
    if (acaoExistente) {
      errors.push(`Ação "${row.nomeAcao}" já existe para este colaborador neste ciclo`);
      return { row: rowNumber, valid: false, errors };
    }

    // Tudo OK!
    return {
      row: rowNumber,
      valid: true,
      errors: [],
      data: {
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.name,
        pdiId: pdi.id,
        cicloId: ciclo.id,
        cicloNome: ciclo.nome,
        blocoId: bloco.id,
        blocoNome: bloco.nome,
        macroId: macro.id,
        macroNome: macro.nome,
        microId: micro.id,
        microNome: micro.nome,
        nomeAcao: row.nomeAcao.trim(),
        descricaoAcao: row.descricaoAcao.trim(),
        prazo: prazoDate,
      },
    };
  } catch (error: any) {
    errors.push(`Erro ao validar: ${error.message}`);
    return { row: rowNumber, valid: false, errors };
  }
}

/**
 * Router de importação de ações
 */
export const importActionsRouter = router({
  /**
   * Valida todas as linhas do CSV antes de importar
   */
  validate: adminProcedure
    .input(z.object({
      rows: z.array(z.object({
        cpf: z.string(),
        cicloNome: z.string(),
        nomeAcao: z.string(),
        descricaoAcao: z.string(),
        microcompetenciaNome: z.string(),
        prazo: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const results: ValidationResult[] = [];

      // Validar todas as linhas
      for (let i = 0; i < input.rows.length; i++) {
        const result = await validateRow(input.rows[i], i + 1);
        results.push(result);
      }

      // Contar válidas e inválidas
      const validCount = results.filter(r => r.valid).length;
      const invalidCount = results.filter(r => !r.valid).length;

      return {
        results,
        summary: {
          total: results.length,
          valid: validCount,
          invalid: invalidCount,
          canImport: invalidCount === 0,
        },
      };
    }),

  /**
   * Importa ações em massa (transação atômica)
   */
  import: adminProcedure
    .input(z.object({
      rows: z.array(z.object({
        cpf: z.string(),
        cicloNome: z.string(),
        nomeAcao: z.string(),
        descricaoAcao: z.string(),
        microcompetenciaNome: z.string(),
        prazo: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Validar TODAS as linhas primeiro
      const validationResults: ValidationResult[] = [];
      for (let i = 0; i < input.rows.length; i++) {
        const result = await validateRow(input.rows[i], i + 1);
        validationResults.push(result);
      }

      // 2. Se alguma linha for inválida, abortar TUDO
      const invalidRows = validationResults.filter(r => !r.valid);
      if (invalidRows.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${invalidRows.length} linha(s) com erro. Corrija antes de importar.`,
        });
      }

      // 3. Todas as linhas são válidas, criar ações em transação
      const createdActions: number[] = [];
      
      try {
        for (const result of validationResults) {
          if (!result.data) continue;

          const actionResult = await db.createAction({
            pdiId: result.data.pdiId,
            blocoId: result.data.blocoId,
            macroId: result.data.macroId,
            microId: result.data.microId,
            nome: result.data.nomeAcao,
            descricao: result.data.descricaoAcao,
            prazo: result.data.prazo,
            createdBy: ctx.user!.id,
          });

          createdActions.push(actionResult.insertId);

          // Notificar líder
          const colaborador = await db.getUserById(result.data.colaboradorId);
          if (colaborador?.leaderId) {
            await db.createNotification({
              destinatarioId: colaborador.leaderId,
              tipo: "nova_acao",
              titulo: "Nova ação criada (importação em massa)",
              mensagem: `Nova ação criada para ${colaborador.name}: ${result.data.nomeAcao}`,
              referenciaId: actionResult.insertId,
            });
          }
        }

        return {
          success: true,
          created: createdActions.length,
          actionIds: createdActions,
        };
      } catch (error: any) {
        // Se der erro em qualquer ação, lançar erro
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao criar ações: ${error.message}`,
        });
      }
    }),
});
