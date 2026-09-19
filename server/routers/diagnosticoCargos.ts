import { adminProcedure, router } from "../_core/customTrpc";
import * as db from "../db";

const MAPA = new Map<string, string>([
  ["ANALISTA REGIONAL", "Analista Técnico I"],
  ["ANALISTA TÉCNICO I", "Analista Técnico I"],
  ["ANALISTA TÉCNICO II", "Analista Técnico III"],
  ["GERENTE DE UNIDADE", "Gerente"],
  ["Analista Técnico I", "Analista Técnico I"],
  ["ASSISTENTE II", "Assistente"],
  ["ASSISTENTE", "Assistente"],
  ["ASSISTENTE REGIONAL", "Assistente"],
  ["GERENTE REGIONAL", "Gerente"],
  ["Analista Técnico II", "Analista Técnico III"],
  ["Gestor do Projeto Evoluir", "Gerente"],
  ["ANALISTA TÉCNICO III", "Analista Técnico III"],
  ["ASSISTENTE I", "Assistente I"],
  ["Analista Regional", "Analista Técnico I"],
  ["Assistente II", "Assistente"],
  ["TESTE", "Teste"],
  ["0140", "Teste"],
  ["Administradora", "Administrador"],
  ["Administradora2", "Administrador"],
  ["Administradora5", "Administrador"],
  ["Analista", "Analista Técnico I"],
  ["Analista de Relacionamento", "Analista Técnico I"],
  ["ANALISTA I", "Analista Técnico I"],
  ["Analista Técnico III", "Analista Técnico III"],
  ["Colaborador", "Administrador"],
  ["Gerente de Unidade", "Gerente"],
  ["Gestor do Projeto Evoluir - Apoio", "Gerente"],
  ["Líder", "Gerente"],
]);

const CONTAGENS_APROVADAS: Record<string, number> = {
  "ANALISTA REGIONAL": 43,
  "ANALISTA TÉCNICO I": 29,
  "ANALISTA TÉCNICO II": 26,
  "GERENTE DE UNIDADE": 11,
  "Analista Técnico I": 9,
  "ASSISTENTE II": 9,
  "ASSISTENTE": 8,
  "ASSISTENTE REGIONAL": 8,
  "GERENTE REGIONAL": 8,
  "Analista Técnico II": 7,
  "Gestor do Projeto Evoluir": 5,
  "ANALISTA TÉCNICO III": 3,
  "ASSISTENTE I": 3,
  "Analista Regional": 2,
  "Assistente II": 2,
  "TESTE": 2,
  "0140": 1,
  "Administradora": 1,
  "Administradora2": 1,
  "Administradora5": 1,
  "Analista": 1,
  "Analista de Relacionamento": 1,
  "ANALISTA I": 1,
  "Analista Técnico III": 1,
  "Colaborador": 1,
  "Gerente de Unidade": 1,
  "Gestor do Projeto Evoluir - Apoio": 1,
  "Líder": 1,
};

const DESTINOS_ESPERADOS: Record<string, number> = {
  "Analista Técnico I": 86,
  "Analista Técnico III": 37,
  "Gerente": 27,
  "Assistente": 27,
  "Administrador": 4,
  "Assistente I": 3,
  "Teste": 3,
};

export const diagnosticoCargosRouter = router({
  dryRun: adminProcedure.query(async () => {
    const users = await db.getAllUsers();

    const contagens = new Map<string, number>();
    for (const user of users) {
      const cargo = String(user.cargo ?? "").trim();
      contagens.set(cargo, (contagens.get(cargo) ?? 0) + 1);
    }

    const divergenciasSnapshot: Array<{ cargo: string; esperado: number; atual: number }> = [];
    for (const [cargo, esperado] of Object.entries(CONTAGENS_APROVADAS)) {
      const atual = contagens.get(cargo) ?? 0;
      if (atual !== esperado) divergenciasSnapshot.push({ cargo, esperado, atual });
    }

    const cargosNaoMapeados = Array.from(contagens.entries())
      .filter(([cargo]) => !MAPA.has(cargo))
      .map(([cargo, quantidade]) => ({ cargo, quantidade }));

    const distribuicaoFinalPrevista: Record<string, number> = {};
    let totalUsuariosMapeados = 0;
    let usuariosQueMudariamCargo = 0;

    for (const [cargo, quantidade] of contagens.entries()) {
      const novo = MAPA.get(cargo);
      if (!novo) continue;
      totalUsuariosMapeados += quantidade;
      if (novo !== cargo) usuariosQueMudariamCargo += quantidade;
      distribuicaoFinalPrevista[novo] = (distribuicaoFinalPrevista[novo] ?? 0) + quantidade;
    }

    const divergenciasDistribuicaoFinal: Array<{ cargo: string; esperado: number; atual: number }> = [];
    for (const [cargo, esperado] of Object.entries(DESTINOS_ESPERADOS)) {
      const atual = distribuicaoFinalPrevista[cargo] ?? 0;
      if (atual !== esperado) divergenciasDistribuicaoFinal.push({ cargo, esperado, atual });
    }

    const destinosNaoPrevistos = Object.entries(distribuicaoFinalPrevista)
      .filter(([cargo]) => !(cargo in DESTINOS_ESPERADOS))
      .map(([cargo, quantidade]) => ({ cargo, quantidade }));

    return {
      modo: "DRY_RUN_SOMENTE_LEITURA",
      geradoEm: new Date().toISOString(),
      totalUsuarios: users.length,
      snapshotAprovado:
        divergenciasSnapshot.length === 0 &&
        cargosNaoMapeados.length === 0 &&
        users.length === 187,
      divergenciasSnapshot,
      cargosNaoMapeados,
      totalUsuariosMapeados,
      usuariosQueMudariamCargo,
      usuariosQuePermaneceriamComMesmoTexto:
        totalUsuariosMapeados - usuariosQueMudariamCargo,
      distribuicaoFinalPrevista,
      distribuicaoFinalConfere:
        divergenciasDistribuicaoFinal.length === 0 &&
        destinosNaoPrevistos.length === 0 &&
        totalUsuariosMapeados === 187,
      divergenciasDistribuicaoFinal,
      destinosNaoPrevistos,
      gravacaoExecutada: false,
    };
  }),
});
