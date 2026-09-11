import { useMemo, useState } from "react";
import { ClipboardCheck, FileUp, ListChecks, PlayCircle, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const EMAIL_TESTE_UTIC = "teste.utic@ckmtalents.net";

const statusLabel: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_CONFERENCIA: "Em conferência",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

const tipoLabel: Record<string, string> = {
  DESEMPENHO: "Avaliação de Desempenho",
  TECNICA: "Avaliação Técnica",
};

type AvaliacaoListItem = {
  id: number;
  cicloId: number;
  cicloNome: string | null;
  tipo: string;
  titulo: string;
  departamentoNome: string | null;
  dataReferencia: string;
  status: string;
};

type RelacaoEixo = "ESSENCIAL" | "TRANSVERSAL" | "NAO_APLICAVEL";

type LinhaBaseUtic = {
  eixo: string;
  relacao: RelacaoEixo;
  anterior: number | null;
};

type EmpregadoUtic = {
  nome: string;
  cargo: string;
  funcao: string;
  eixos: LinhaBaseUtic[];
};

const PILOTO_UTIC: EmpregadoUtic[] = [
  {
    nome: "Alorran de Freitas Barbosa",
    cargo: "Gerente Interino",
    funcao:
      "Gestão de contratos de TI, implantação de soluções, telefonia, análise de dados, inovação e gestão da unidade.",
    eixos: [
      { eixo: "Governança e Gestão de TI", relacao: "ESSENCIAL", anterior: 62.5 },
      { eixo: "Infraestrutura de TI", relacao: "ESSENCIAL", anterior: 55.6 },
      { eixo: "Segurança da Informação", relacao: "ESSENCIAL", anterior: 50 },
      { eixo: "Gestão de Incidentes e Continuidade", relacao: "NAO_APLICAVEL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", relacao: "ESSENCIAL", anterior: 60 },
      { eixo: "Dados, BI e Inteligência Artificial", relacao: "ESSENCIAL", anterior: null },
      { eixo: "Suporte, Atendimento e Service Desk", relacao: "TRANSVERSAL", anterior: 83.3 },
      { eixo: "Liderança e Competências Transversais", relacao: "ESSENCIAL", anterior: 20 },
    ],
  },
  {
    nome: "Daniel Caio Lemos Penno",
    cargo: "Assistente II",
    funcao:
      "Atuação técnico-operacional em sistemas corporativos, suporte, fluxos, SQL e infraestrutura.",
    eixos: [
      { eixo: "Governança e Gestão de TI", relacao: "TRANSVERSAL", anterior: 60 },
      { eixo: "Infraestrutura de TI", relacao: "ESSENCIAL", anterior: 63 },
      { eixo: "Segurança da Informação", relacao: "TRANSVERSAL", anterior: 58 },
      { eixo: "Gestão de Incidentes e Continuidade", relacao: "NAO_APLICAVEL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", relacao: "ESSENCIAL", anterior: 70 },
      { eixo: "Dados, BI e Inteligência Artificial", relacao: "ESSENCIAL", anterior: 55 },
      { eixo: "Suporte, Atendimento e Service Desk", relacao: "ESSENCIAL", anterior: 65 },
      { eixo: "Liderança e Competências Transversais", relacao: "TRANSVERSAL", anterior: 50 },
    ],
  },
  {
    nome: "Gabriel Borges Araújo",
    cargo: "Assistente II",
    funcao:
      "Suporte técnico, manutenção, configuração de softwares, rede e registros técnicos.",
    eixos: [
      { eixo: "Governança e Gestão de TI", relacao: "TRANSVERSAL", anterior: 62 },
      { eixo: "Infraestrutura de TI", relacao: "ESSENCIAL", anterior: 70 },
      { eixo: "Segurança da Informação", relacao: "TRANSVERSAL", anterior: 67 },
      { eixo: "Gestão de Incidentes e Continuidade", relacao: "NAO_APLICAVEL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", relacao: "ESSENCIAL", anterior: 60 },
      { eixo: "Dados, BI e Inteligência Artificial", relacao: "TRANSVERSAL", anterior: null },
      { eixo: "Suporte, Atendimento e Service Desk", relacao: "ESSENCIAL", anterior: 80 },
      { eixo: "Liderança e Competências Transversais", relacao: "TRANSVERSAL", anterior: 75 },
    ],
  },
  {
    nome: "Jader Lincoln do Nascimento",
    cargo: "Analista Técnico II",
    funcao:
      "Infraestrutura de TI e segurança da informação, incluindo servidores, redes, data center, backups e continuidade.",
    eixos: [
      { eixo: "Governança e Gestão de TI", relacao: "ESSENCIAL", anterior: 50 },
      { eixo: "Infraestrutura de TI", relacao: "ESSENCIAL", anterior: 60 },
      { eixo: "Segurança da Informação", relacao: "ESSENCIAL", anterior: 55 },
      { eixo: "Gestão de Incidentes e Continuidade", relacao: "ESSENCIAL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", relacao: "TRANSVERSAL", anterior: 60 },
      { eixo: "Dados, BI e Inteligência Artificial", relacao: "TRANSVERSAL", anterior: null },
      { eixo: "Suporte, Atendimento e Service Desk", relacao: "ESSENCIAL", anterior: 65 },
      { eixo: "Liderança e Competências Transversais", relacao: "TRANSVERSAL", anterior: 75 },
    ],
  },
  {
    nome: "Leonardo Campelo Leite Guedes",
    cargo: "Assistente II - Gerente",
    funcao:
      "Suporte a usuários, manutenção de computadores, configuração de softwares e apoio à infraestrutura.",
    eixos: [
      { eixo: "Governança e Gestão de TI", relacao: "TRANSVERSAL", anterior: 65 },
      { eixo: "Infraestrutura de TI", relacao: "ESSENCIAL", anterior: 75 },
      { eixo: "Segurança da Informação", relacao: "TRANSVERSAL", anterior: 70 },
      { eixo: "Gestão de Incidentes e Continuidade", relacao: "NAO_APLICAVEL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", relacao: "ESSENCIAL", anterior: 67 },
      { eixo: "Dados, BI e Inteligência Artificial", relacao: "TRANSVERSAL", anterior: null },
      { eixo: "Suporte, Atendimento e Service Desk", relacao: "ESSENCIAL", anterior: 85 },
      { eixo: "Liderança e Competências Transversais", relacao: "TRANSVERSAL", anterior: 70 },
    ],
  },
];

const relacaoLabel: Record<RelacaoEixo, string> = {
  ESSENCIAL: "ESSENCIAL",
  TRANSVERSAL: "TRANSVERSAL",
  NAO_APLICAVEL: "NÃO APLICÁVEL À ATUAÇÃO ATUAL",
};

function relacaoVariant(relacao: RelacaoEixo): "default" | "secondary" | "outline" {
  if (relacao === "ESSENCIAL") return "default";
  if (relacao === "TRANSVERSAL") return "secondary";
  return "outline";
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return "—";
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default function Avaliacoes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isTesteUtic = user?.email === EMAIL_TESTE_UTIC;
  const danielBase = PILOTO_UTIC.find((item) => item.nome === "Daniel Caio Lemos Penno") ?? PILOTO_UTIC[0];

  const avaliacoesApi = (trpc as any).avaliacoes;
  const avaliacoesQuery = avaliacoesApi.listar.useQuery(undefined, {
    refetchOnWindowFocus: false,
  }) as {
    isLoading: boolean;
    isError: boolean;
    data?: AvaliacaoListItem[];
  };

  const [empregadoSelecionado, setEmpregadoSelecionado] = useState(
    PILOTO_UTIC[0].nome,
  );

  const empregado = useMemo(() => {
    if (isTesteUtic) {
      return {
        ...danielBase,
        nome: "Daniel Caio Lemos Penno [TESTE UTIC]",
      };
    }
    return PILOTO_UTIC.find((item) => item.nome === empregadoSelecionado) ?? PILOTO_UTIC[0];
  }, [danielBase, empregadoSelecionado, isTesteUtic]);

  const eixosComLinhaBase = empregado.eixos.filter((item) => item.anterior !== null).length;
  const essenciais = empregado.eixos.filter((item) => item.relacao === "ESSENCIAL").length;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Avaliações</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Área destinada às novas medições que serão utilizadas posteriormente
          para analisar o desenvolvimento das competências trabalhadas no PDI.
        </p>
        <Badge variant="outline">Base conectada ao banco de dados</Badge>
      </div>

      <Card className="border-blue-200">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <CardTitle>Piloto UTIC — Linha de Base de Evolução Técnica</CardTitle>
              </div>
              <CardDescription className="mt-2 max-w-3xl">
                Visualização de como o sistema deverá guardar a avaliação anterior por eixo e, após a nova aplicação, calcular a evolução do conhecimento técnico.
              </CardDescription>
            </div>
            <Badge variant="outline">Protótipo para validação</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <label htmlFor="empregado-utic" className="text-sm font-medium">
                Empregado
              </label>
              {isTesteUtic ? (
                <div className="rounded-md border-2 border-blue-300 bg-blue-50 p-4">
                  <p className="font-semibold text-blue-950">Daniel Caio Lemos Penno [TESTE UTIC]</p>
                  <p className="mt-1 text-sm text-blue-900">Perfil de teste espelhado do empregado real para validar a comparação da nova avaliação.</p>
                </div>
              ) : (
                <select
                  id="empregado-utic"
                  value={empregadoSelecionado}
                  onChange={(event) => setEmpregadoSelecionado(event.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {PILOTO_UTIC.map((item) => (
                    <option key={item.nome} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              )}
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{empregado.cargo}</p>
                <p className="mt-1 text-muted-foreground">{empregado.funcao}</p>
              </div>
              {isTesteUtic && (
                <Button className="mt-2 font-semibold" onClick={() => setLocation("/avaliacoes/utic/prova-segura")}>
                  <PlayCircle className="mr-2 h-5 w-5" />
                  INICIAR AVALIAÇÃO TÉCNICA UTIC
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Eixos essenciais</p>
                <p className="mt-1 text-2xl font-semibold">{essenciais}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Eixos com linha de base histórica</p>
                <p className="mt-1 text-2xl font-semibold">{eixosComLinhaBase}/8</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avaliação anterior</p>
              <p className="mt-2 font-semibold">Linha de base histórica</p>
              <p className="mt-1 text-sm text-muted-foreground">Percentuais já conhecidos por eixo para servir de referência comparativa.</p>
            </div>
            <div className="rounded-md border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nova avaliação</p>
              <p className="mt-2 font-semibold">Aguardando aplicação</p>
              <p className="mt-1 text-sm text-muted-foreground">O sistema calculará os acertos da nova prova agrupados nos mesmos eixos.</p>
            </div>
            <div className="rounded-md border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evolução</p>
              <p className="mt-2 font-semibold">Aguardando nova medição</p>
              <p className="mt-1 text-sm text-muted-foreground">Evolução = performance atual no eixo − performance histórica no mesmo eixo.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Eixo de conhecimento</th>
                  <th className="px-4 py-3 font-medium">Relação com o empregado</th>
                  <th className="px-4 py-3 font-medium">Avaliação anterior</th>
                  <th className="px-4 py-3 font-medium">Nova avaliação</th>
                  <th className="px-4 py-3 font-medium">Evolução</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {empregado.eixos.map((linha) => (
                  <tr key={linha.eixo} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{linha.eixo}</td>
                    <td className="px-4 py-3">
                      <Badge variant={relacaoVariant(linha.relacao)}>{relacaoLabel[linha.relacao]}</Badge>
                    </td>
                    <td className="px-4 py-3">{formatarPercentual(linha.anterior)}</td>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-muted-foreground">—</td>
                    <td className="px-4 py-3">
                      {linha.relacao === "NAO_APLICAVEL" ? (
                        <Badge variant="outline">Não participa do cálculo atual</Badge>
                      ) : linha.anterior === null ? (
                        <Badge variant="outline">Novo eixo — nova linha de base</Badge>
                      ) : (
                        <Badge variant="secondary">Aguardando nova avaliação</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {isTesteUtic
              ? "Para o teste UTIC, o perfil espelha os dados de desenvolvimento do Daniel e utiliza sua linha de base histórica provisória. O resultado da nova prova será comparado eixo a eixo, sem alterar o cadastro do empregado real."
              : "Neste piloto, a classificação dos eixos utiliza as informações históricas disponíveis do empregado. Ajustes excepcionais por recurso, mudança de atividade ou mudança de função serão tratados na página administrativa de eixos técnicos, sem apagar o histórico anterior."}
          </div>
        </CardContent>
      </Card>

      {!isTesteUtic && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileUp className="h-6 w-6 text-blue-600" />
                  <CardTitle>Avaliação de Desempenho</CardTitle>
                </div>
                <CardDescription>Importação da avaliação realizada fora do PDI-System.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Selecionar ciclo e importar o relatório.</p>
                <p>Conferir empregado, competência e resultado antes de salvar.</p>
                <p>Associar competências equivalentes quando os nomes forem diferentes.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ListChecks className="h-6 w-6 text-blue-600" />
                  <CardTitle>Avaliação Técnica</CardTitle>
                </div>
                <CardDescription>Cadastro, publicação e aplicação da nova avaliação técnica.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Criar avaliação por ciclo e departamento/unidade.</p>
                <p>Cadastrar questões e vinculá-las aos eixos técnicos.</p>
                <p>Calcular performance por eixo sem penalizar conhecimentos não essenciais.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-6 w-6 text-blue-600" />
                  <CardTitle>Resultados das Avaliações</CardTitle>
                </div>
                <CardDescription>Acompanhamento das medições antes de entrarem no módulo Evolução.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Acompanhar avaliações concluídas e pendentes.</p>
                <p>Consultar resultados por empregado e eixo técnico.</p>
                <p>Conferir a linha de base antes da comparação de evolução.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Avaliações registradas</CardTitle>
              <CardDescription>Registros armazenados na nova base de Avaliações e Evolução.</CardDescription>
            </CardHeader>
            <CardContent>
              {avaliacoesQuery.isLoading && (
                <p className="text-sm text-muted-foreground">Carregando avaliações...</p>
              )}

              {avaliacoesQuery.isError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  Não foi possível consultar a base de avaliações. Nenhum dado foi alterado.
                </div>
              )}

              {!avaliacoesQuery.isLoading &&
                !avaliacoesQuery.isError &&
                (avaliacoesQuery.data?.length ?? 0) === 0 && (
                  <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                    Nenhuma avaliação cadastrada até o momento. A estrutura está pronta para receber a primeira nova medição.
                  </div>
                )}

              {(avaliacoesQuery.data?.length ?? 0) > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-3 pr-4 font-medium">Avaliação</th>
                        <th className="py-3 pr-4 font-medium">Tipo</th>
                        <th className="py-3 pr-4 font-medium">Ciclo</th>
                        <th className="py-3 pr-4 font-medium">Unidade</th>
                        <th className="py-3 pr-4 font-medium">Data de referência</th>
                        <th className="py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {avaliacoesQuery.data?.map((avaliacao: AvaliacaoListItem) => (
                        <tr key={avaliacao.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{avaliacao.titulo}</td>
                          <td className="py-3 pr-4">{tipoLabel[avaliacao.tipo] ?? avaliacao.tipo}</td>
                          <td className="py-3 pr-4">{avaliacao.cicloNome ?? `Ciclo ${avaliacao.cicloId}`}</td>
                          <td className="py-3 pr-4">{avaliacao.departamentoNome ?? "Todas / não informada"}</td>
                          <td className="py-3 pr-4">{String(avaliacao.dataReferencia)}</td>
                          <td className="py-3">
                            <Badge variant="secondary">{statusLabel[avaliacao.status] ?? avaliacao.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fluxo do módulo</CardTitle>
          <CardDescription>A evolução só será apresentada quando houver nova medição comparável do mesmo eixo de conhecimento.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">Linha de base histórica</Badge>
            <span>→</span>
            <Badge variant="secondary">Nova avaliação</Badge>
            <span>→</span>
            <Badge variant="secondary">Resultado por eixo</Badge>
            <span>→</span>
            <Badge variant="secondary">Evolução técnica</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
