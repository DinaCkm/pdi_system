import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { macroRelacionadaDaAD } from "../../../shared/competenciasAdRelacionamento";
import {
  conceitoComportamentalLabel,
  conceitoConhecimentoLabel,
  engajamentoDesenvolvimentoLabel,
} from "../../../shared/evolucaoDomain";
import { ChevronDown, ChevronUp, Lock, Sparkles, ShieldCheck, Target, TrendingUp, Unlock } from "lucide-react";

const relacaoLabel: Record<string, string> = {
  ESSENCIAL: "Essencial",
  TRANSVERSAL: "Transversal",
  NAO_ESSENCIAL: "Não essencial",
};

const evolucaoLabel: Record<string, string> = {
  EVOLUCAO: "Evolução",
  ESTABILIDADE: "Estabilidade",
  REDUCAO: "Redução",
  SEM_COMPARACAO: "Sem comparação",
};

const evolucaoConceitualLabel: Record<string, string> = {
  EVOLUCAO: "Desenvolvimento relevante",
  CONSOLIDACAO: "Conhecimento mantido",
  OPORTUNIDADE_DESENVOLVIMENTO: "Oportunidade de desenvolvimento",
  SEM_COMPARACAO: "Sem comparação",
};


type ItemVisual = {
  nome: string;
  tipo: "Técnica" | "Comportamental";
  intensidade: number;
  motivo?: string;
};

const ECO = {
  roxo: "#5E2B8A",
  roxoClaro: "#7650A5",
  azul: "#4E7CCF",
  turquesa: "#2FC7D8",
};

function limitar(valor: number, minimo = 12, maximo = 100) {
  return Math.max(minimo, Math.min(maximo, Number.isFinite(valor) ? valor : minimo));
}

function normalizarClassificacao(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function classificacaoEssencial(valor: unknown) {
  return normalizarClassificacao(valor) === "ESSENCIAL";
}

function classificacaoForaDoEssencial(valor: unknown) {
  const normalizado = normalizarClassificacao(valor);
  return ["TRANSVERSAL", "NAO_ESSENCIAL", "NAO_APLICAVEL"].includes(normalizado);
}

function corSinalUmanni(sinal: string | null | undefined) {
  if (sinal === "VERDE") return "bg-emerald-500";
  if (sinal === "AMARELO") return "bg-amber-400";
  if (sinal === "LARANJA") return "bg-orange-500";
  return "bg-slate-300";
}

function conceitoVisual(percentual: number | null | undefined) {
  if (percentual === null || percentual === undefined || !Number.isFinite(Number(percentual))) return null;
  const valor = Math.max(0, Math.min(100, Number(percentual)));
  if (valor >= 90) return "Referência";
  if (valor >= 85) return "Conhecimento Avançado";
  if (valor >= 75) return "Conhecimento Consolidado";
  if (valor >= 65) return "Conhecimento Aplicado";
  return "Em Desenvolvimento";
}

function normalizarNivel(valor: number | null | undefined, minimo: number | null | undefined, maximo: number | null | undefined) {
  if (valor === null || valor === undefined || minimo === null || minimo === undefined || maximo === null || maximo === undefined) return null;
  const amplitude = Number(maximo) - Number(minimo);
  if (!Number.isFinite(amplitude) || amplitude <= 0) return null;
  return ((Number(valor) - Number(minimo)) / amplitude) * 100;
}

function GraficoVisual({
  titulo,
  descricao,
  itens,
  accent,
  icon: Icon,
  vazio,
}: {
  titulo: string;
  descricao: string;
  itens: ItemVisual[];
  accent: string;
  icon: any;
  vazio: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${accent}16`, color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{titulo}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{descricao}</p>
        </div>
      </div>
      {itens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500">{vazio}</div>
      ) : (
        <div className="space-y-4">
          {itens.map((item, indice) => (
            <div key={`${item.tipo}:${item.nome}:${indice}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-slate-800" title={item.nome}>{item.nome}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.tipo}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${limitar(item.intensidade)}%`,
                    background: `linear-gradient(90deg, ${accent}, ${ECO.turquesa})`,
                  }}
                  aria-label={`${item.nome}: intensidade visual`}
                />
              </div>
              {item.motivo && <p className="text-[11px] leading-4 text-slate-500">{item.motivo}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Bloco1CompetenciasFuncao() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const role = String(user?.role ?? "");
  const isAdmin = role === "admin" || role === "Administrador";
  const isGerente = role === "gerente";
  const isLider = role === "lider";
  const isColaborador = role === "colaborador";
  const podeVerNumeroOriginalComportamental = isAdmin || isGerente || isLider;
  const podeSelecionarEmpregado = !isColaborador;
  const podeEditarClassificacao = isAdmin;
  const podeCriarAcao = isAdmin || isLider;
  const [colaboradorId, setColaboradorId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("colaboradorId") || "";
  });
  const [busca, setBusca] = useState("");
  const [eixoAberto, setEixoAberto] = useState<number | null>(null);
  const [calculoAberto, setCalculoAberto] = useState<number | null>(null);
  const [comportamentalAberta, setComportamentalAberta] = useState<number | null>(null);
  const [statusEdicao, setStatusEdicao] = useState<"CLASSIFICADO" | "PENDENTE">("CLASSIFICADO");
  const [relacaoEdicao, setRelacaoEdicao] = useState<"ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL" | "">("");
  const [justificativaEdicao, setJustificativaEdicao] = useState("");
  const [motivoEdicao, setMotivoEdicao] = useState("Revisão da classificação do eixo técnico");
  const [mensagemEdicao, setMensagemEdicao] = useState("");
  const [sinteseAberta, setSinteseAberta] = useState(true);

  const empregados = trpc.bloco1CompetenciasFuncao.empregados.useQuery(undefined, {
    enabled: Boolean(user),
  });
  const pdisAdmin = trpc.pdis.list.useQuery(undefined, { enabled: Boolean(user && (isAdmin || isGerente)) });
  const pdisEquipe = trpc.pdis.teamPDIs.useQuery(undefined, { enabled: Boolean(user && isLider) });
  const pdisMeus = trpc.pdis.myPDIs.useQuery(undefined, { enabled: Boolean(user && (isColaborador || isLider)) });
  const liberacao = trpc.bloco1CompetenciasFuncao.statusLiberacaoEvolucao.useQuery(undefined, {
    enabled: Boolean(user && (isColaborador || isAdmin)),
  });
  const bloqueadoParaEmpregado = isColaborador && liberacao.data?.liberado !== true;
  const definirLiberacao = trpc.bloco1CompetenciasFuncao.definirLiberacaoEvolucao.useMutation({
    onSuccess: () => liberacao.refetch(),
  });
  const mapa = trpc.bloco1CompetenciasFuncao.mapaIndividual.useQuery(
    { colaboradorId: Number(colaboradorId || 0) },
    {
      enabled: Boolean(colaboradorId) && !bloqueadoParaEmpregado,
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    },
  );

  useEffect(() => {
    if (isColaborador && user?.id) {
      setColaboradorId(String(user.id));
    }
  }, [isColaborador, user?.id]);

  useEffect(() => {
    if (!podeSelecionarEmpregado || !colaboradorId || !empregados.data) return;
    const permitido = (empregados.data as any[]).some((item: any) => Number(item.id) === Number(colaboradorId));
    if (!permitido) setColaboradorId("");
  }, [podeSelecionarEmpregado, colaboradorId, empregados.data]);

  const salvarEixoMutation = (trpc as any).questionarioAtividades.salvarEixosTecnicos.useMutation({
    onSuccess: async () => {
      await mapa.refetch();
      setMensagemEdicao("Classificação e justificativa atualizadas com histórico preservado.");
    },
    onError: (error: any) => {
      setMensagemEdicao(error?.message || "Não foi possível salvar a alteração.");
    },
  });

  const abrirJustificativa = (item: any) => {
    const id = Number(item.eixoRegistroId);
    if (eixoAberto === id) {
      setEixoAberto(null);
      setMensagemEdicao("");
      return;
    }
    setEixoAberto(id);
    setStatusEdicao(item.statusClassificacao === "PENDENTE" ? "PENDENTE" : "CLASSIFICADO");
    setRelacaoEdicao(item.classificacao || "");
    setJustificativaEdicao(item.justificativa || "");
    setMotivoEdicao("Revisão da classificação do eixo técnico");
    setMensagemEdicao("");
  };

  const salvarJustificativa = async (item: any) => {
    const tecnico = mapa.data?.tecnico;
    if (!tecnico?.questionarioId || !tecnico?.provaHistoricaId || !tecnico?.origemProvaChave || !tecnico?.anoQuestionario) {
      setMensagemEdicao("Registro histórico regional ainda não está completo para este empregado.");
      return;
    }
    if (statusEdicao === "CLASSIFICADO" && !relacaoEdicao) {
      setMensagemEdicao("Selecione Essencial, Transversal ou Não essencial.");
      return;
    }
    if (statusEdicao === "CLASSIFICADO" && justificativaEdicao.trim().length < 3) {
      setMensagemEdicao("Informe a justificativa com base no Questionário de Atividades/Função.");
      return;
    }

    const eixos = tecnico.competencias.map((eixo: any) => ({
      eixoChave: String(eixo.eixoChave || eixo.eixoId),
      eixoNome: String(eixo.eixoNome),
      classificacao:
        Number(eixo.eixoRegistroId) === Number(item.eixoRegistroId)
          ? (statusEdicao === "PENDENTE" ? null : relacaoEdicao)
          : (eixo.statusClassificacao === "PENDENTE" ? null : eixo.classificacao),
      justificativa:
        Number(eixo.eixoRegistroId) === Number(item.eixoRegistroId)
          ? (justificativaEdicao.trim() || null)
          : (eixo.justificativa || null),
    }));

    await salvarEixoMutation.mutateAsync({
      colaboradorId: Number(colaboradorId),
      ano: Number(tecnico.anoQuestionario),
      provaId: Number(tecnico.provaHistoricaId),
      aplicacaoId: null,
      origemProvaChave: String(tecnico.origemProvaChave),
      motivoAlteracao: motivoEdicao.trim(),
      eixos,
    });
  };

  const empregadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const dados = empregados.data ?? [];
    if (!termo) return dados;
    return dados.filter((u: any) =>
      [u.nome, u.cargo, u.funcaoNome, u.departamentoNome]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [empregados.data, busca]);

  const pdisDisponiveis = useMemo(() => {
    const todos = [
      ...((pdisAdmin.data ?? []) as any[]),
      ...((pdisEquipe.data ?? []) as any[]),
      ...((pdisMeus.data ?? []) as any[]),
    ];
    const unicos = new Map<number, any>();
    for (const pdi of todos) {
      const id = Number(pdi.id ?? pdi.pdiId);
      if (id) unicos.set(id, pdi);
    }
    return Array.from(unicos.values());
  }, [pdisAdmin.data, pdisEquipe.data, pdisMeus.data]);

  const pdiDoEmpregado = useMemo(() => {
    if (!colaboradorId) return null;
    return pdisDisponiveis.find(
      (pdi: any) => Number(pdi.colaboradorId) === Number(colaboradorId),
    ) ?? null;
  }, [pdisDisponiveis, colaboradorId]);

  const abrirBiblioteca = (
    eixo: string,
    tipoCompetencia: "TECNICA" | "COMPORTAMENTAL",
    macroRelacionada?: string | null,
  ) => {
    const params = new URLSearchParams();
    const pdiId = pdiDoEmpregado?.pdiId ?? pdiDoEmpregado?.id;
    if (pdiId) params.set("pdiId", String(pdiId));
    if (eixo) params.set("eixo", eixo);
    params.set("tipoCompetencia", tipoCompetencia);
    if (macroRelacionada) params.set("macroRelacionada", macroRelacionada);
    params.set("origem", "evolucao_individual");
    params.set("modo", "biblioteca");
    navigate(`/acoes/nova?${params.toString()}`);
  };

  const sintese = useMemo(() => {
    const tecnicas = (mapa.data?.tecnico?.competencias ?? []) as any[];
    const comportamentais = (mapa.data?.comportamental?.competencias ?? []) as any[];

    const forca: ItemVisual[] = [];
    const mantidas: ItemVisual[] = [];
    const potencialidades: ItemVisual[] = [];
    const focos: ItemVisual[] = [];

    for (const item of tecnicas) {
      const anterior = item.percentualAnterior === null || item.percentualAnterior === undefined ? null : Number(item.percentualAnterior);
      const atual = item.percentualAtual === null || item.percentualAtual === undefined ? null : Number(item.percentualAtual);
      const delta = anterior !== null && atual !== null ? atual - anterior : null;

      if (delta !== null && delta >= 10) {
        forca.push({ nome: item.eixoNome, tipo: "Técnica", intensidade: delta });
      } else if (delta !== null && delta > 0 && delta < 10) {
        mantidas.push({ nome: item.eixoNome, tipo: "Técnica", intensidade: atual ?? 50 });
      }

      const nivelPotencial = atual ?? anterior;
      if (classificacaoForaDoEssencial(item.classificacao) && nivelPotencial !== null && nivelPotencial > 0) {
        const conceito = atual !== null
          ? (item.conceitoAtual ? conceitoConhecimentoLabel[item.conceitoAtual as keyof typeof conceitoConhecimentoLabel] : conceitoVisual(atual))
          : (item.conceitoAnterior ? conceitoConhecimentoLabel[item.conceitoAnterior as keyof typeof conceitoConhecimentoLabel] : conceitoVisual(anterior));
        const relacao = relacaoLabel[item.classificacao] || "Conhecimento adicional";
        potencialidades.push({
          nome: item.eixoNome,
          tipo: "Técnica",
          intensidade: nivelPotencial,
          motivo: `${conceito || "Conhecimento demonstrado"} · ${relacao}`,
        });
      }

      const essencial = classificacaoEssencial(item.classificacao);
      const nivelAtualBaixo = item.conceitoAtual === "EM_DESENVOLVIMENTO" || item.conceitoAtual === "CONHECIMENTO_APLICADO";
      const houveQuedaConceitual = item.evolucaoConceitual === "OPORTUNIDADE_DESENVOLVIMENTO";

      if (essencial && atual !== null && nivelAtualBaixo) {
        focos.push({
          nome: item.eixoNome,
          tipo: "Técnica",
          intensidade: Math.max(12, 100 - atual),
          motivo: "Conhecimento essencial ainda em desenvolvimento; recomenda-se continuidade no próximo PDI.",
        });
      } else if (essencial && atual !== null && houveQuedaConceitual) {
        focos.push({
          nome: item.eixoNome,
          tipo: "Técnica",
          intensidade: Math.max(12, Math.abs(delta ?? 0)),
          motivo: "Houve redução suficiente para alterar o nível de conhecimento entre os ciclos.",
        });
      } else if (essencial && item.novaCompetencia && atual === null) {
        focos.push({
          nome: item.eixoNome,
          tipo: "Técnica",
          intensidade: 50,
          motivo: "Conhecimento essencial novo ainda sem leitura atual disponível.",
        });
      }
    }

    for (const item of comportamentais) {
      const anterior = item.resultadoAnterior === null || item.resultadoAnterior === undefined ? null : Number(item.resultadoAnterior);
      const atual = item.resultadoAtual === null || item.resultadoAtual === undefined ? null : Number(item.resultadoAtual);

      // A Avaliação de Desempenho utiliza escala 0–3.
      // A normalização é apenas interna para aplicar o limiar visual de 10%;
      // as notas continuam aparecendo somente na tabela de comparação.
      const anteriorNorm = anterior !== null && anterior >= 0 && anterior <= 3
        ? normalizarNivel(anterior, 0, 3)
        : normalizarNivel(anterior, item.escalaMinAnterior, item.escalaMaxAnterior);
      const atualNorm = atual !== null && atual >= 0 && atual <= 3
        ? normalizarNivel(atual, 0, 3)
        : normalizarNivel(atual, item.escalaMinAtual, item.escalaMaxAtual);
      const deltaNorm = anteriorNorm !== null && atualNorm !== null ? atualNorm - anteriorNorm : null;
      const semHistoricoComparavel = atualNorm !== null && anteriorNorm === null;

      if (deltaNorm !== null && deltaNorm >= 10) {
        forca.push({ nome: item.competenciaNome, tipo: "Comportamental", intensidade: deltaNorm });
      } else if (deltaNorm !== null && deltaNorm > 0 && deltaNorm < 10) {
        mantidas.push({ nome: item.competenciaNome, tipo: "Comportamental", intensidade: atualNorm ?? 50 });
      }

      if (classificacaoForaDoEssencial(item.classificacao) && atualNorm !== null && atualNorm > 0) {
        potencialidades.push({
          nome: item.competenciaNome,
          tipo: "Comportamental",
          intensidade: atualNorm,
          motivo: conceitoVisual(atualNorm) || "Competência adicional demonstrada",
        });
      }

      const conceitoAnteriorComportamental = conceitoVisual(anteriorNorm);
      const conceitoAtualComportamental = conceitoVisual(atualNorm);
      const nivelComportamentalBaixo = atualNorm !== null && atualNorm < 75;
      const quedaConceitualComportamental =
        anteriorNorm !== null &&
        atualNorm !== null &&
        conceitoAnteriorComportamental !== null &&
        conceitoAtualComportamental !== null &&
        deltaNorm !== null &&
        deltaNorm < 0 &&
        conceitoAnteriorComportamental !== conceitoAtualComportamental;

      if (nivelComportamentalBaixo) {
        focos.push({
          nome: item.competenciaNome,
          tipo: "Comportamental",
          intensidade: Math.max(12, 100 - (atualNorm ?? 0)),
          motivo: "Nível atual indica oportunidade de desenvolvimento no próximo PDI.",
        });
      } else if (quedaConceitualComportamental) {
        focos.push({
          nome: item.competenciaNome,
          tipo: "Comportamental",
          intensidade: Math.max(12, Math.abs(deltaNorm ?? 0)),
          motivo: "Houve redução suficiente para alterar o nível observado entre os ciclos.",
        });
      }
    }

    const ordem = (a: ItemVisual, b: ItemVisual) => b.intensidade - a.intensidade || a.nome.localeCompare(b.nome, "pt-BR");
    return {
      forca: forca.sort(ordem),
      mantidas: mantidas.sort(ordem),
      potencialidades: potencialidades.sort(ordem),
      focos: focos.sort(ordem),
    };
  }, [mapa.data]);

  if (bloqueadoParaEmpregado) {
    return (
      <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
        <h1 className="text-3xl font-bold">Minha Evolução</h1>
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <Lock className="h-5 w-5" />
              {liberacao.isLoading ? "Verificando acesso..." : "Ainda não liberada"}
            </CardTitle>
            {!liberacao.isLoading && (
              <CardDescription>
                A sua evolução está em preparação e será liberada pela coordenação do programa.
                Você será avisado quando estiver disponível.
              </CardDescription>
            )}
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">{isColaborador ? "Minha Evolução" : "Evolução Individual"}</h1>
        <p className="text-muted-foreground max-w-4xl">
          A análise é individual. O objetivo é acompanhar se houve desenvolvimento das competências
          técnicas e comportamentais após as ações do PDI.
        </p>
      </div>

      {isAdmin && (
        <Card className={liberacao.data?.liberado ? "border-emerald-300" : "border-amber-300"}>
          <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              {liberacao.data?.liberado ? (
                <Unlock className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <Lock className="mt-0.5 h-5 w-5 text-amber-600" />
              )}
              <div>
                <p className="font-semibold">
                  {liberacao.data?.liberado
                    ? "\"Minha Evolução\" está LIBERADA para os empregados"
                    : "\"Minha Evolução\" está BLOQUEADA para os empregados"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Vale para o perfil colaborador. Líderes, gerentes e administradores continuam acessando normalmente.
                  {liberacao.data?.atualizadoEm
                    ? ` Última alteração: ${new Date(liberacao.data.atualizadoEm).toLocaleString("pt-BR")}.`
                    : ""}
                </p>
              </div>
            </div>
            <Button
              variant={liberacao.data?.liberado ? "outline" : "default"}
              disabled={liberacao.isLoading || definirLiberacao.isPending}
              onClick={() => {
                const liberar = !liberacao.data?.liberado;
                const ok = window.confirm(
                  liberar
                    ? "Liberar a tela \"Minha Evolução\" para TODOS os empregados agora?"
                    : "Bloquear a tela \"Minha Evolução\" para os empregados?",
                );
                if (ok) definirLiberacao.mutate({ liberado: liberar });
              }}
            >
              {definirLiberacao.isPending
                ? "Salvando..."
                : liberacao.data?.liberado
                  ? "Bloquear para empregados"
                  : "Liberar para empregados"}
            </Button>
          </CardContent>
        </Card>
      )}

      {podeSelecionarEmpregado && (
      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar empregado</CardTitle>
          <CardDescription>
            A função organizacional é contexto da análise, mas não determina sozinha as competências da pessoa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por empregado, função, cargo ou unidade..."
          />
          <Select value={colaboradorId} onValueChange={setColaboradorId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o empregado" />
            </SelectTrigger>
            <SelectContent>
              {empregadosFiltrados.map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.nome} — {u.funcaoNome || u.cargo || "Sem função"} — {u.departamentoNome || "Sem unidade"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      )}

      {colaboradorId && mapa.isLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Carregando histórico técnico e Avaliação de Desempenho do empregado selecionado...
          </CardContent>
        </Card>
      )}

      {colaboradorId && mapa.error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle>Não foi possível carregar a evolução individual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-red-800">{mapa.error.message}</p>
            <Button size="sm" variant="outline" onClick={() => mapa.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {mapa.data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{mapa.data.empregado.nome}</CardTitle>
              <CardDescription>
                Função: {mapa.data.empregado.funcaoNome || "Não vinculada"} · Cargo: {mapa.data.empregado.cargo || "—"} ·
                Unidade: {mapa.data.empregado.departamentoNome || "—"}
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="overflow-hidden rounded-3xl border border-violet-200/80 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setSinteseAberta((valor) => !valor)}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-white md:px-7"
              style={{ background: `linear-gradient(105deg, ${ECO.roxo} 0%, ${ECO.azul} 55%, ${ECO.turquesa} 100%)` }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="text-lg font-semibold md:text-xl">Síntese Visual da Evolução</h2>
                </div>
                <p className="mt-1 max-w-4xl text-sm text-white/85">
                  Uma leitura visual das evoluções relevantes, crescimentos positivos, potencialidades e pontos de foco para o próximo PDI.
                </p>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
                {sinteseAberta ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </button>

            {sinteseAberta && (
              <div className="bg-gradient-to-b from-[#F8F6FC] via-white to-[#F2FBFC] p-4 md:p-7">
                <div className="mb-5 rounded-2xl border border-violet-100 bg-white/80 p-4 text-sm text-slate-600">
                  <strong className="text-slate-800">Como ler:</strong> os gráficos não apresentam notas ou percentuais. “Força da Evolução” destaca crescimentos relevantes. “Potencialidades” mostra conhecimentos demonstrados além dos Essenciais, mesmo quando não houve evolução entre ciclos. “Pontos de Foco” considera necessidades reais de desenvolvimento: conhecimento Essencial ainda não consolidado ou redução suficiente para mudar de nível. Manter um conhecimento já consolidado, avançado ou de referência não gera foco automaticamente.
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <GraficoVisual
                    titulo="Força da Evolução"
                    descricao="Competências que apresentaram crescimento relevante entre as avaliações."
                    itens={sintese.forca}
                    accent={ECO.roxo}
                    icon={TrendingUp}
                    vazio="Ainda não há evolução relevante comparável para destacar."
                  />
                  <GraficoVisual
                    titulo="Potencialidades"
                    descricao="Conhecimentos demonstrados além daqueles Essenciais para a função atual. Podem estar em desenvolvimento ou já consolidados."
                    itens={sintese.potencialidades}
                    accent={ECO.turquesa}
                    icon={Sparkles}
                    vazio="Ainda não há conhecimentos adicionais disponíveis para esta leitura."
                  />
                  <GraficoVisual
                    titulo="Crescimento Positivo"
                    descricao="Competências que cresceram positivamente, mas abaixo do limiar de 10% usado para destacar a Força da Evolução."
                    itens={sintese.mantidas}
                    accent={ECO.azul}
                    icon={ShieldCheck}
                    vazio="Ainda não há crescimentos positivos abaixo do limiar de destaque."
                  />
                  <GraficoVisual
                    titulo="Pontos de Foco para o Próximo PDI"
                    descricao="Conhecimentos e competências que ainda precisam ser fortalecidos ou que apresentaram uma redução relevante de nível."
                    itens={sintese.focos}
                    accent={ECO.roxoClaro}
                    icon={Target}
                    vazio="Nenhuma necessidade prioritária de desenvolvimento foi identificada nesta leitura."
                  />
                </div>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>2. Competências Técnicas</CardTitle>
              <CardDescription>
                A leitura apresenta níveis de conhecimento por ciclo. Nos conhecimentos Essenciais, o Ciclo 2026 também reconhece o engajamento nas ações do PDI, preservando separadamente o indicador técnico original.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mapa.data.tecnico.alerta && (
                <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
                  ⚠ {mapa.data.tecnico.alerta}
                </div>
              )}
              {mapa.data.comportamental.erroCarregamento && (
                <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  Os dados técnicos foram carregados, mas houve falha ao consultar a Avaliação de Desempenho: {mapa.data.comportamental.erroCarregamento}
                </div>
              )}
              {mapa.data.tecnico.desenvolvimentoPdi && (
                <div className="mb-4 rounded-xl border bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Engajamento no Desenvolvimento</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        A execução do PDI contribui para a leitura integrada somente dos conhecimentos classificados como Essenciais. Conhecimentos Transversais e Não Essenciais não recebem calibragem pelo PDI.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {engajamentoDesenvolvimentoLabel[
                        mapa.data.tecnico.desenvolvimentoPdi.engajamento as keyof typeof engajamentoDesenvolvimentoLabel
                      ] || "Sem base suficiente"}
                    </Badge>
                  </div>
                </div>
              )}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Eixo / competência técnica</TableHead>
                      <TableHead>Classificação individual</TableHead>
                      <TableHead>Ciclo 2025</TableHead>
                      <TableHead>Ciclo 2026</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Próxima ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapa.data.tecnico.competencias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum resultado técnico histórico foi localizado para este empregado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mapa.data.tecnico.competencias.map((item: any) => (
                        <>
                        <TableRow key={item.eixoRegistroId}>
                          <TableCell className="font-medium">{item.eixoNome}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={item.statusClassificacao === "PENDENTE" ? "secondary" : item.classificacao === "ESSENCIAL" ? "default" : "outline"}>
                                {item.statusClassificacao === "PENDENTE"
                                  ? "Pendente"
                                  : relacaoLabel[item.classificacao] || item.classificacao || "Sem classificação"}
                              </Badge>
                              {podeEditarClassificacao && item.editavelClassificacao !== false && (
                                <Button size="sm" variant="ghost" onClick={() => abrirJustificativa(item)}>
                                  {eixoAberto === Number(item.eixoRegistroId) ? "Fechar" : "Ver / editar justificativa"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.conceitoAnterior
                              ? conceitoConhecimentoLabel[item.conceitoAnterior as keyof typeof conceitoConhecimentoLabel]
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div>
                                {item.conceitoAtual
                                  ? conceitoConhecimentoLabel[item.conceitoAtual as keyof typeof conceitoConhecimentoLabel]
                                  : "—"}
                              </div>
                              {isAdmin && item.percentualAtual !== null && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-auto px-0 py-0 text-xs text-blue-700 hover:bg-transparent hover:text-blue-900"
                                  onClick={() =>
                                    setCalculoAberto(
                                      calculoAberto === Number(item.eixoRegistroId)
                                        ? null
                                        : Number(item.eixoRegistroId),
                                    )
                                  }
                                >
                                  {calculoAberto === Number(item.eixoRegistroId)
                                    ? "Fechar composição"
                                    : "Entender cálculo"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.evolucaoConceitual === "EVOLUCAO"
                                  ? "default"
                                  : item.evolucaoConceitual === "SEM_COMPARACAO"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {evolucaoConceitualLabel[item.evolucaoConceitual] || "Sem comparação"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {podeCriarAcao ? (
                              <Button size="sm" variant="outline" onClick={() => abrirBiblioteca(item.eixoNome, "TECNICA")}>
                                Criar ação no PDI
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Visualização</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {isAdmin && calculoAberto === Number(item.eixoRegistroId) && (
                          <TableRow key={`${item.eixoRegistroId}-calculo`}>
                            <TableCell colSpan={6} className="bg-blue-50/40">
                              <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ciclo 2025 — indicador técnico preservado</p>
                                  <p className="mt-1 text-lg font-semibold">
                                    {item.percentualAnterior === null ? "Sem referência" : `${Number(item.percentualAnterior).toFixed(1)}%`}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ciclo 2026 — indicador técnico preservado</p>
                                  <p className="mt-1 text-lg font-semibold">
                                    {item.percentualAtual === null ? "Sem referência" : `${Number(item.percentualAtual).toFixed(1)}%`}
                                  </p>
                                  {item.totalQuestoes !== null && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {item.totalQuestoes} item(ns) considerado(s); {item.acertos ?? 0} resposta(s) demonstraram domínio.
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Engajamento no PDI</p>
                                  <p className="mt-1 text-lg font-semibold">
                                    {mapa.data.tecnico.desenvolvimentoPdi?.percentualConclusao === null
                                      ? "Sem base"
                                      : `${Number(mapa.data.tecnico.desenvolvimentoPdi?.percentualConclusao ?? 0).toFixed(1)}%`}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {mapa.data.tecnico.desenvolvimentoPdi?.acoesConcluidas ?? 0} de {mapa.data.tecnico.desenvolvimentoPdi?.totalAcoes ?? 0} ações concluídas.
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nível integrado</p>
                                  <p className="mt-1 text-lg font-semibold">
                                    {item.percentualIntegrado === null ? "Sem referência" : `${Number(item.percentualIntegrado).toFixed(1)}%`}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {item.classificacao === "ESSENCIAL"
                                      ? `Calibragem aplicada: +${Number(item.fatorCalibragemPdi ?? 0).toFixed(0)}%. O indicador técnico original permanece inalterado.`
                                      : "Sem calibragem: este conhecimento não está classificado como Essencial."}
                                  </p>
                                  <p className="mt-2 rounded-md border border-blue-100 bg-white/70 p-2 text-xs leading-5 text-slate-600">
                                    <strong>Importante:</strong> o engajamento no PDI calibra somente os conhecimentos classificados como Essenciais. Conhecimentos Transversais e Não Essenciais preservam o indicador técnico original, sem calibragem pelo PDI.
                                  </p>
                                  <p className="mt-2 text-sm font-medium">
                                    {item.conceitoAtual
                                      ? conceitoConhecimentoLabel[item.conceitoAtual as keyof typeof conceitoConhecimentoLabel]
                                      : "Sem conceito"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        {eixoAberto === Number(item.eixoRegistroId) && (
                          <TableRow key={`${item.eixoRegistroId}-justificativa`}>
                            <TableCell colSpan={6} className="bg-muted/20">
                              <div className="grid gap-4 p-3 md:grid-cols-2">
                                <label className="space-y-2 text-sm font-medium">
                                  Situação da análise
                                  <select
                                    value={statusEdicao}
                                    onChange={(event) => {
                                      const valor = event.target.value as "CLASSIFICADO" | "PENDENTE";
                                      setStatusEdicao(valor);
                                      if (valor === "PENDENTE") setRelacaoEdicao("");
                                    }}
                                    className="h-10 w-full rounded-md border bg-background px-3 font-normal"
                                  >
                                    <option value="CLASSIFICADO">Classificado</option>
                                    <option value="PENDENTE">Pendente de análise</option>
                                  </select>
                                </label>
                                <label className="space-y-2 text-sm font-medium">
                                  Classificação
                                  <select
                                    value={relacaoEdicao}
                                    disabled={statusEdicao === "PENDENTE"}
                                    onChange={(event) => setRelacaoEdicao(event.target.value as any)}
                                    className="h-10 w-full rounded-md border bg-background px-3 font-normal"
                                  >
                                    <option value="">Selecione</option>
                                    <option value="ESSENCIAL">Essencial</option>
                                    <option value="TRANSVERSAL">Transversal</option>
                                    <option value="NAO_ESSENCIAL">Não essencial</option>
                                  </select>
                                </label>
                                <label className="space-y-2 text-sm font-medium md:col-span-2">
                                  Justificativa da classificação
                                  <textarea
                                    value={justificativaEdicao}
                                    onChange={(event) => setJustificativaEdicao(event.target.value)}
                                    rows={4}
                                    className="w-full rounded-md border bg-background p-3 font-normal"
                                    placeholder="Explique por que este eixo é Essencial, Transversal ou Não essencial para este empregado."
                                  />
                                </label>
                                <label className="space-y-2 text-sm font-medium md:col-span-2">
                                  Motivo da alteração
                                  <Input value={motivoEdicao} onChange={(event) => setMotivoEdicao(event.target.value)} />
                                </label>
                                <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                                  <Button
                                    size="sm"
                                    onClick={() => salvarJustificativa(item)}
                                    disabled={salvarEixoMutation.isPending}
                                  >
                                    {salvarEixoMutation.isPending ? "Salvando..." : "Salvar classificação e justificativa"}
                                  </Button>
                                  {mensagemEdicao && <span className="text-sm text-muted-foreground">{mensagemEdicao}</span>}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-slate-50/60">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <CardTitle>3. Competências Comportamentais — Evolução entre Ciclos</CardTitle>
                  <CardDescription className="mt-2 max-w-4xl leading-5">
                    Os resultados vêm da Avaliação de Desempenho da Umanni, na escala original de 0 a 3.
                    A tela traduz esse resultado para uma leitura conceitual, sem alterar o valor oficial.
                    O DISC não participa desta comparação.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit shrink-0 bg-white">Fonte: Umanni</Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6">
              {mapa.data.comportamental.competencias.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado de Avaliação de Desempenho comportamental foi localizado para este empregado.
                </div>
              ) : (
                <div className="space-y-3">
                  {mapa.data.comportamental.competencias.map((item: any) => {
                    const macroRelacionada = macroRelacionadaDaAD(item.competenciaNome);
                    return (
                      <div
                        key={item.competenciaMacroId}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(240px,1.6fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(190px,0.9fr)_auto] xl:items-center">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-5 text-slate-900">
                              {item.competenciaNome || "—"}
                            </p>
                            {macroRelacionada ? (
                              <p className="mt-1 text-xs leading-4 text-muted-foreground">
                                Macrocompetência para ações: {macroRelacionada}
                              </p>
                            ) : null}
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ciclo anterior</p>
                            <div className="mt-2 flex min-w-0 items-start gap-2">
                              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${corSinalUmanni(item.sinalAnterior)}`} aria-hidden />
                              <div className="min-w-0">
                                <p className="text-sm font-medium leading-5 text-slate-800">
                                  {item.conceitoAnterior
                                    ? conceitoComportamentalLabel[item.conceitoAnterior as keyof typeof conceitoComportamentalLabel]
                                    : "Sem referência"}
                                </p>
                                {item.periodoAnterior && <p className="mt-1 text-xs text-muted-foreground">{item.periodoAnterior}</p>}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ciclo atual</p>
                            <div className="mt-2 flex min-w-0 items-start gap-2">
                              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${corSinalUmanni(item.sinalAtual)}`} aria-hidden />
                              <div className="min-w-0">
                                <p className="text-sm font-medium leading-5 text-slate-800">
                                  {item.conceitoAtual
                                    ? conceitoComportamentalLabel[item.conceitoAtual as keyof typeof conceitoComportamentalLabel]
                                    : "Sem referência"}
                                </p>
                                {item.periodoAtual && <p className="mt-1 text-xs text-muted-foreground">{item.periodoAtual}</p>}
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Evolução</p>
                            <Badge
                              className="mt-2 whitespace-normal text-left leading-4"
                              variant={
                                item.evolucaoConceitual === "EVOLUCAO"
                                  ? "default"
                                  : item.evolucaoConceitual === "SEM_COMPARACAO"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {evolucaoConceitualLabel[item.evolucaoConceitual] || "Sem comparação"}
                            </Badge>
                            {!item.comparavel && item.motivo ? (
                              <p className="mt-2 text-xs leading-4 text-muted-foreground">{item.motivo}</p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2 xl:flex-col xl:items-stretch">
                            <Button
                              size="sm"
                              variant="outline"
                              className="whitespace-nowrap"
                              onClick={() => setComportamentalAberta(Number(item.competenciaMacroId))}
                            >
                              {isColaborador ? "Como foi obtido" : "Entender resultado"}
                            </Button>
                            {podeCriarAcao ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="whitespace-nowrap"
                                onClick={() => abrirBiblioteca(
                                  item.competenciaNome || "",
                                  "COMPORTAMENTAL",
                                  macroRelacionada,
                                )}
                              >
                                Criar ação no PDI
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                A criação de nova ação permanece disponível em qualquer resultado de evolução.
              </p>
            </CardContent>
          </Card>

          <Dialog
            open={comportamentalAberta !== null}
            onOpenChange={(aberto) => {
              if (!aberto) setComportamentalAberta(null);
            }}
          >
            <DialogContent className="max-h-[88vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto p-0">
              {(() => {
                const item = mapa.data.comportamental.competencias.find(
                  (competencia: any) => Number(competencia.competenciaMacroId) === Number(comportamentalAberta),
                );
                if (!item) return null;

                return (
                  <>
                    <DialogHeader className="border-b bg-slate-50 px-5 py-5 text-left md:px-7">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-white">Avaliação de Desempenho — Umanni</Badge>
                        <Badge variant="outline" className="bg-white">Escala 0 a 3</Badge>
                      </div>
                      <DialogTitle className="pt-2 text-xl leading-7">{item.competenciaNome || "Competência comportamental"}</DialogTitle>
                      <DialogDescription className="max-w-3xl leading-5">
                        O PDI-System preserva o resultado original recebido da Umanni e apenas o traduz para uma leitura conceitual.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 px-5 py-5 md:px-7 md:py-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ciclo anterior</p>
                          <div className="mt-3 flex items-start gap-3">
                            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${corSinalUmanni(item.sinalAnterior)}`} aria-hidden />
                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.conceitoAnterior
                                  ? conceitoComportamentalLabel[item.conceitoAnterior as keyof typeof conceitoComportamentalLabel]
                                  : "Sem referência"}
                              </p>
                              {item.periodoAnterior && <p className="mt-1 text-xs text-muted-foreground">{item.periodoAnterior}</p>}
                            </div>
                          </div>
                          {podeVerNumeroOriginalComportamental && (
                            <div className="mt-4 rounded-xl bg-slate-50 p-3">
                              <p className="text-xs text-muted-foreground">Resultado original Umanni</p>
                              <p className="mt-1 text-2xl font-semibold text-slate-900">
                                {item.resultadoAnterior === null ? "—" : Number(item.resultadoAnterior).toFixed(2)}
                              </p>
                              {item.percentualAnterior !== null && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {Number(item.percentualAnterior).toFixed(1)}% da escala
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ciclo atual</p>
                          <div className="mt-3 flex items-start gap-3">
                            <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${corSinalUmanni(item.sinalAtual)}`} aria-hidden />
                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.conceitoAtual
                                  ? conceitoComportamentalLabel[item.conceitoAtual as keyof typeof conceitoComportamentalLabel]
                                  : "Sem referência"}
                              </p>
                              {item.periodoAtual && <p className="mt-1 text-xs text-muted-foreground">{item.periodoAtual}</p>}
                            </div>
                          </div>
                          {podeVerNumeroOriginalComportamental && (
                            <div className="mt-4 rounded-xl bg-slate-50 p-3">
                              <p className="text-xs text-muted-foreground">Resultado original Umanni</p>
                              <p className="mt-1 text-2xl font-semibold text-slate-900">
                                {item.resultadoAtual === null ? "—" : Number(item.resultadoAtual).toFixed(2)}
                              </p>
                              {item.percentualAtual !== null && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {Number(item.percentualAtual).toFixed(1)}% da escala
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-slate-50 p-4 md:p-5">
                        <p className="text-sm font-semibold text-slate-900">Como o conceito é obtido</p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                          O resultado oficial da Umanni é posicionado na escala de 0 a 3.
                          Para a leitura visual, a posição é convertida em percentual pela fórmula
                          <strong> resultado ÷ 3 × 100</strong>. Esse percentual serve somente para
                          identificar o conceito e não altera o resultado original da avaliação.
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-900">Régua conceitual</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          {[
                            ["Em Desenvolvimento", "Abaixo de 65%"],
                            ["Conhecimento Aplicado", "65% a 74,9%"],
                            ["Conhecimento Consolidado", "75% a 84,9%"],
                            ["Conhecimento Avançado", "85% a 89,9%"],
                            ["Referência", "90% ou mais"],
                          ].map(([titulo, faixa]) => (
                            <div key={titulo} className="rounded-xl border bg-white p-3">
                              <p className="text-xs font-semibold leading-4 text-slate-800">{titulo}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">{faixa}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-white p-4 md:p-5">
                        <p className="text-sm font-semibold text-slate-900">Sinalização visual da Umanni</p>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-600">
                          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-500" /> Laranja: abaixo de 50%</span>
                          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" /> Amarelo: 50% a 69,9%</span>
                          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Verde: 70% ou mais</span>
                        </div>
                      </div>

                      {!podeVerNumeroOriginalComportamental && (
                        <p className="text-xs leading-5 text-muted-foreground">
                          Na visão do empregado, o número original não é exibido. Ele permanece preservado para consulta administrativa e gerencial.
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader>
              <CardTitle>Regra metodológica aplicada</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Conhecimentos técnicos:</strong> o Ciclo 2025 preserva a referência histórica. O Ciclo 2026 apresenta o nível de conhecimento integrado. Nos eixos Essenciais, o engajamento no PDI pode calibrar o indicador em até 10%, sem alterar a medição técnica original.</p>
              <p><strong>Competências comportamentais:</strong> o resultado vem da Avaliação de Desempenho da Umanni, preservado na escala original de 0 a 3. O PDI-System converte apenas a posição na escala para os conceitos Em Desenvolvimento, Conhecimento Aplicado, Conhecimento Consolidado, Conhecimento Avançado e Referência, sem recalcular o resultado oficial.</p>
              <p><strong>Sinalização Umanni:</strong> os relatórios enviados utilizam luzes/barras por faixa. A leitura visual reproduz essa lógica: laranja abaixo de 50% da escala, amarelo de 50% até antes de 70% e verde a partir de 70%. O empregado pode abrir a explicação da conversão; os números originais da Umanni ficam visíveis para administrador, gerente e líder.</p>
              <p><strong>Leitura:</strong> a interface prioriza conceitos de conhecimento e desenvolvimento. Percentuais e memória de cálculo ficam disponíveis somente ao administrador.</p>
              <p><strong>Potencialidades:</strong> conhecimentos fora do grupo Essencial aparecem quando há conhecimento demonstrado, independentemente de ter havido crescimento entre ciclos.</p>
              <p><strong>Pontos de Foco:</strong> estabilidade, por si só, não gera foco. Nos conhecimentos técnicos, entram os Essenciais ainda em desenvolvimento ou que tenham sofrido queda suficiente para mudar de nível. Nas competências comportamentais, o foco considera nível atual que ainda exige desenvolvimento ou queda conceitual relevante.</p>
              <p><strong>DISC:</strong> não participa do cálculo atual; fica reservado para funcionalidade futura.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
