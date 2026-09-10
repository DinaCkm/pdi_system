import { useEffect, useMemo, useState } from "react";
import { Settings2, History, RotateCcw, Save, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STORAGE_KEY = "piloto-utic-eixos-admin-v1";
const HISTORY_KEY = "piloto-utic-eixos-admin-history-v1";

type StatusEixo = "ESSENCIAL" | "TRANSVERSAL" | "NAO_APLICAVEL";

type EixoConfig = {
  eixo: string;
  status: StatusEixo;
  anterior: number | null;
};

type EmpregadoConfig = {
  nome: string;
  cargo: string;
  funcao: string;
  eixos: EixoConfig[];
};

type HistoricoItem = {
  id: string;
  empregado: string;
  eixo: string;
  anterior: StatusEixo;
  novo: StatusEixo;
  motivo: string;
  observacao: string;
  data: string;
};

const MOTIVOS = [
  "Recurso do empregado",
  "Mudança de atividade",
  "Mudança de função",
  "Correção cadastral",
  "Decisão da UGP",
];

const STATUS_LABEL: Record<StatusEixo, string> = {
  ESSENCIAL: "Essencial",
  TRANSVERSAL: "Transversal",
  NAO_APLICAVEL: "Não aplicável à atuação atual",
};

const PILOTO_UTIC_INICIAL: EmpregadoConfig[] = [
  {
    nome: "Alorran de Freitas Barbosa",
    cargo: "Gerente Interino",
    funcao: "Gestão de contratos de TI, implantação de soluções, telefonia, análise de dados, inovação e gestão da unidade.",
    eixos: [
      { eixo: "Governança e Gestão de TI", status: "ESSENCIAL", anterior: 62.5 },
      { eixo: "Infraestrutura de TI", status: "ESSENCIAL", anterior: 55.6 },
      { eixo: "Segurança da Informação", status: "ESSENCIAL", anterior: 50 },
      { eixo: "Gestão de Incidentes e Continuidade", status: "NAO_APLICAVEL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", status: "ESSENCIAL", anterior: 60 },
      { eixo: "Dados, BI e Inteligência Artificial", status: "ESSENCIAL", anterior: null },
      { eixo: "Suporte, Atendimento e Service Desk", status: "TRANSVERSAL", anterior: 83.3 },
      { eixo: "Liderança e Competências Transversais", status: "ESSENCIAL", anterior: 20 },
    ],
  },
  {
    nome: "Daniel Caio Lemos Penno",
    cargo: "Assistente II",
    funcao: "Atuação técnico-operacional em sistemas corporativos, suporte, fluxos, SQL e infraestrutura.",
    eixos: [
      { eixo: "Governança e Gestão de TI", status: "TRANSVERSAL", anterior: 37.5 },
      { eixo: "Infraestrutura de TI", status: "ESSENCIAL", anterior: 70 },
      { eixo: "Segurança da Informação", status: "TRANSVERSAL", anterior: 66.7 },
      { eixo: "Gestão de Incidentes e Continuidade", status: "NAO_APLICAVEL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", status: "ESSENCIAL", anterior: 60 },
      { eixo: "Dados, BI e Inteligência Artificial", status: "ESSENCIAL", anterior: null },
      { eixo: "Suporte, Atendimento e Service Desk", status: "ESSENCIAL", anterior: 66.7 },
      { eixo: "Liderança e Competências Transversais", status: "TRANSVERSAL", anterior: 75 },
    ],
  },
  {
    nome: "Gabriel Borges Araújo",
    cargo: "Assistente II",
    funcao: "Suporte técnico, manutenção, configuração de softwares, rede e registros técnicos.",
    eixos: [
      { eixo: "Governança e Gestão de TI", status: "TRANSVERSAL", anterior: 62 },
      { eixo: "Infraestrutura de TI", status: "ESSENCIAL", anterior: 70 },
      { eixo: "Segurança da Informação", status: "TRANSVERSAL", anterior: 67 },
      { eixo: "Gestão de Incidentes e Continuidade", status: "NAO_APLICAVEL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", status: "ESSENCIAL", anterior: 60 },
      { eixo: "Dados, BI e Inteligência Artificial", status: "TRANSVERSAL", anterior: null },
      { eixo: "Suporte, Atendimento e Service Desk", status: "ESSENCIAL", anterior: 80 },
      { eixo: "Liderança e Competências Transversais", status: "TRANSVERSAL", anterior: 75 },
    ],
  },
  {
    nome: "Jader Lincoln do Nascimento",
    cargo: "Analista Técnico II",
    funcao: "Infraestrutura de TI e segurança da informação, incluindo servidores, redes, data center, backups e continuidade.",
    eixos: [
      { eixo: "Governança e Gestão de TI", status: "ESSENCIAL", anterior: 50 },
      { eixo: "Infraestrutura de TI", status: "ESSENCIAL", anterior: 60 },
      { eixo: "Segurança da Informação", status: "ESSENCIAL", anterior: 55 },
      { eixo: "Gestão de Incidentes e Continuidade", status: "ESSENCIAL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", status: "TRANSVERSAL", anterior: 60 },
      { eixo: "Dados, BI e Inteligência Artificial", status: "TRANSVERSAL", anterior: null },
      { eixo: "Suporte, Atendimento e Service Desk", status: "ESSENCIAL", anterior: 65 },
      { eixo: "Liderança e Competências Transversais", status: "TRANSVERSAL", anterior: 75 },
    ],
  },
  {
    nome: "Leonardo Campelo Leite Guedes",
    cargo: "Assistente II - Gerente",
    funcao: "Suporte a usuários, manutenção de computadores, configuração de softwares e apoio à infraestrutura.",
    eixos: [
      { eixo: "Governança e Gestão de TI", status: "TRANSVERSAL", anterior: 65 },
      { eixo: "Infraestrutura de TI", status: "ESSENCIAL", anterior: 75 },
      { eixo: "Segurança da Informação", status: "TRANSVERSAL", anterior: 70 },
      { eixo: "Gestão de Incidentes e Continuidade", status: "NAO_APLICAVEL", anterior: null },
      { eixo: "Sistemas Corporativos, Processos e Automação", status: "ESSENCIAL", anterior: 67 },
      { eixo: "Dados, BI e Inteligência Artificial", status: "TRANSVERSAL", anterior: null },
      { eixo: "Suporte, Atendimento e Service Desk", status: "ESSENCIAL", anterior: 85 },
      { eixo: "Liderança e Competências Transversais", status: "TRANSVERSAL", anterior: 70 },
    ],
  },
];

function carregarConfiguracao(): EmpregadoConfig[] {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    return salvo ? JSON.parse(salvo) : PILOTO_UTIC_INICIAL;
  } catch {
    return PILOTO_UTIC_INICIAL;
  }
}

function carregarHistorico(): HistoricoItem[] {
  try {
    const salvo = localStorage.getItem(HISTORY_KEY);
    return salvo ? JSON.parse(salvo) : [];
  } catch {
    return [];
  }
}

export default function AdminEixosTecnicos() {
  const [dados, setDados] = useState<EmpregadoConfig[]>(carregarConfiguracao);
  const [historico, setHistorico] = useState<HistoricoItem[]>(carregarHistorico);
  const [empregadoSelecionado, setEmpregadoSelecionado] = useState(dados[0]?.nome ?? "");
  const [edicoes, setEdicoes] = useState<Record<string, StatusEixo>>({});
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [observacao, setObservacao] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  const empregado = useMemo(
    () => dados.find((item) => item.nome === empregadoSelecionado) ?? dados[0],
    [dados, empregadoSelecionado],
  );

  useEffect(() => {
    setEdicoes({});
    setMensagem(null);
  }, [empregadoSelecionado]);

  if (!empregado) return null;

  const statusAtual = (eixo: EixoConfig) => edicoes[eixo.eixo] ?? eixo.status;
  const temAlteracao = Object.keys(edicoes).length > 0;

  const salvar = () => {
    if (!temAlteracao) return;

    const novosHistoricos: HistoricoItem[] = [];
    const novosDados = dados.map((pessoa) => {
      if (pessoa.nome !== empregado.nome) return pessoa;
      return {
        ...pessoa,
        eixos: pessoa.eixos.map((eixo) => {
          const novo = edicoes[eixo.eixo];
          if (!novo || novo === eixo.status) return eixo;
          novosHistoricos.push({
            id: `${Date.now()}-${eixo.eixo}`,
            empregado: pessoa.nome,
            eixo: eixo.eixo,
            anterior: eixo.status,
            novo,
            motivo,
            observacao,
            data: new Date().toISOString(),
          });
          return { ...eixo, status: novo };
        }),
      };
    });

    const novoHistorico = [...novosHistoricos, ...historico];
    setDados(novosDados);
    setHistorico(novoHistorico);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novosDados));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(novoHistorico));
    setEdicoes({});
    setObservacao("");
    setMensagem("Alteração aplicada no piloto. A leitura comparativa foi atualizada sem apagar o histórico anterior.");
  };

  const restaurar = () => {
    setDados(PILOTO_UTIC_INICIAL);
    setHistorico([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    setEdicoes({});
    setMensagem("Piloto restaurado para a configuração inicial da UTIC.");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Administração dos Eixos Técnicos</h1>
        </div>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Página administrativa para ajustar a lista de conhecimentos aplicáveis a cada empregado sem alterar a fotografia histórica das avaliações anteriores.
        </p>
        <Badge variant="outline">Piloto UTIC</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Empregado</CardTitle>
          <CardDescription>Selecione o empregado para consultar e administrar os eixos de conhecimento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            value={empregadoSelecionado}
            onChange={(event) => setEmpregadoSelecionado(event.target.value)}
            className="h-10 w-full max-w-xl rounded-md border bg-background px-3 text-sm"
          >
            {dados.map((item) => (
              <option key={item.nome} value={item.nome}>{item.nome}</option>
            ))}
          </select>
          <div className="rounded-md border bg-muted/30 p-3 text-sm max-w-4xl">
            <p className="font-medium">{empregado.cargo}</p>
            <p className="mt-1 text-muted-foreground">{empregado.funcao}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eixos de conhecimento</CardTitle>
          <CardDescription>
            A avaliação anterior permanece congelada. A alteração abaixo muda somente a aplicabilidade atual e a forma como a próxima comparação será interpretada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Eixo de conhecimento</th>
                  <th className="px-4 py-3 font-medium">Resultado anterior</th>
                  <th className="px-4 py-3 font-medium">Situação atual</th>
                  <th className="px-4 py-3 font-medium">Como ficará na comparação</th>
                </tr>
              </thead>
              <tbody>
                {empregado.eixos.map((eixo) => {
                  const atual = statusAtual(eixo);
                  let leitura = "Aguardando nova avaliação";
                  if (atual === "NAO_APLICAVEL" && eixo.anterior !== null) leitura = "Sem correspondente na avaliação atual";
                  if (atual !== "NAO_APLICAVEL" && eixo.anterior === null) leitura = "Novo eixo — nova linha de base";
                  if (atual === "NAO_APLICAVEL" && eixo.anterior === null) leitura = "Não participa do cálculo atual";

                  return (
                    <tr key={eixo.eixo} className="border-b last:border-0 align-top">
                      <td className="px-4 py-3 font-medium">{eixo.eixo}</td>
                      <td className="px-4 py-3">
                        {eixo.anterior === null ? "—" : `${eixo.anterior.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={atual}
                          onChange={(event) => setEdicoes((current) => ({ ...current, [eixo.eixo]: event.target.value as StatusEixo }))}
                          className="h-9 min-w-[230px] rounded-md border bg-background px-2 text-sm"
                        >
                          <option value="ESSENCIAL">Essencial</option>
                          <option value="TRANSVERSAL">Transversal</option>
                          <option value="NAO_APLICAVEL">Não aplicável à atuação atual</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={leitura.startsWith("Sem correspondente") ? "outline" : "secondary"}>{leitura}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da alteração</label>
              <select value={motivo} onChange={(event) => setMotivo(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                {MOTIVOS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observação</label>
              <input
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                placeholder="Ex.: recurso deferido; atividade não é mais executada pelo empregado"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={salvar} disabled={!temAlteracao}>
              <Save className="mr-2 h-4 w-4" /> Aplicar alteração e recalcular leitura
            </Button>
            <Button variant="outline" onClick={restaurar}>
              <RotateCcw className="mr-2 h-4 w-4" /> Restaurar piloto
            </Button>
          </div>

          {mensagem && <div className="rounded-md border bg-muted/30 p-3 text-sm">{mensagem}</div>}

          <div className="flex gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Regra preservada no piloto</p>
              <p className="mt-1">
                Retirar um eixo não apaga o resultado histórico. Se havia resultado anterior, ele permanece registrado e passa a aparecer como “Sem correspondente na avaliação atual”. Incluir um eixo sem resultado anterior cria uma nova linha de base quando a próxima avaliação for realizada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Histórico das alterações do piloto</CardTitle>
          </div>
          <CardDescription>Cada ajuste fica registrado para auditoria da regra aplicada.</CardDescription>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteração realizada neste piloto.</p>
          ) : (
            <div className="space-y-3">
              {historico.slice(0, 20).map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{item.empregado} — {item.eixo}</p>
                  <p className="mt-1 text-muted-foreground">
                    {STATUS_LABEL[item.anterior]} → {STATUS_LABEL[item.novo]} · {item.motivo}
                  </p>
                  {item.observacao && <p className="mt-1">{item.observacao}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(item.data).toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
