import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function MinhasAcoes() {
  const { user } = useAuth();
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
  const [showSolicitarAlteracaoModal, setShowSolicitarAlteracaoModal] = useState(false);
  const [selectedAcao, setSelectedAcao] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  // Filtros
  const [filterCompetencia, setFilterCompetencia] = useState<string>("todos");
  const [filterCiclo, setFilterCiclo] = useState<string>("todos");
  const [filterData, setFilterData] = useState<string>("todos");

  // Query para buscar ações do colaborador
  const { data: acoes, isLoading } = trpc.actions.list.useQuery();

  // Extrair competências e ciclos únicos
  const competenciasUnicas = useMemo(() => {
    if (!acoes) return [];
    const set = new Set<string>();
    acoes.forEach((a: any) => {
      if (a.microCompetencia?.nome) {
        set.add(a.microCompetencia.nome);
      }
    });
    return Array.from(set).sort();
  }, [acoes]);

  const ciclosUnicos = useMemo(() => {
    if (!acoes) return [];
    const set = new Set<string>();
    acoes.forEach((a: any) => {
      if (a.pdi?.ciclo?.nome) {
        set.add(a.pdi.ciclo.nome);
      }
    });
    return Array.from(set).sort();
  }, [acoes]);

  // Filtrar e ordenar ações
  const acoesFiltradasEOrdenadas = useMemo(() => {
    if (!acoes) return [];

    let filtered = acoes.filter((a: any) => {
      // Filtro por competência
      if (filterCompetencia !== "todos" && a.microCompetencia?.nome !== filterCompetencia) {
        return false;
      }

      // Filtro por ciclo
      if (filterCiclo !== "todos" && a.pdi?.ciclo?.nome !== filterCiclo) {
        return false;
      }

      // Filtro por data
      if (filterData !== "todos") {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const prazo = new Date(a.prazo);
        prazo.setHours(0, 0, 0, 0);

        if (filterData === "vencidas") {
          if (prazo >= hoje) return false;
        } else if (filterData === "proximas_7_dias") {
          const em7Dias = new Date(hoje);
          em7Dias.setDate(em7Dias.getDate() + 7);
          if (prazo < hoje || prazo > em7Dias) return false;
        } else if (filterData === "proximas_30_dias") {
          const em30Dias = new Date(hoje);
          em30Dias.setDate(em30Dias.getDate() + 30);
          if (prazo < hoje || prazo > em30Dias) return false;
        } else if (filterData === "futuras") {
          const em30Dias = new Date(hoje);
          em30Dias.setDate(em30Dias.getDate() + 30);
          if (prazo <= em30Dias) return false;
        }
      }

      return true;
    });

    // Ordenar por data (mais próximas primeiro)
    filtered.sort((a: any, b: any) => {
      const dataA = new Date(a.prazo).getTime();
      const dataB = new Date(b.prazo).getTime();
      return dataA - dataB;
    });

    return filtered;
  }, [acoes, filterCompetencia, filterCiclo, filterData]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Você precisa estar autenticado</p>
      </div>
    );
  }

  const handleEnviarEvidencia = (acao: any) => {
    setSelectedAcao(acao);
    setShowEvidenciaModal(true);
  };

  const handleSolicitarAlteracao = (acao: any) => {
    setSelectedAcao(acao);
    setSelectedFields([]);
    setShowSolicitarAlteracaoModal(true);
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const formatarDescricao = (texto: string) => {
    // Quebrar em linhas onde tem ponto seguido de espaço
    return texto.split(". ").map((parte, idx) => (
      <div key={idx}>
        {parte}
        {idx < texto.split(". ").length - 1 && "."}
      </div>
    ));
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any; icon: any }> = {
      "nao_iniciada": { label: "Não Iniciada", variant: "secondary", icon: AlertCircle },
      "em_andamento": { label: "Em Andamento", variant: "default", icon: Clock },
      "concluida": { label: "Concluída", variant: "default", icon: CheckCircle },
      "pendente_aprovacao": { label: "Pendente Aprovação", variant: "outline", icon: AlertCircle },
    };

    const config = statusMap[status] || { label: status, variant: "secondary", icon: FileText };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando ações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minhas Ações</h1>
        <p className="text-muted-foreground mt-2">
          Gerenciar suas ações de desenvolvimento
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por Data */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Select value={filterData} onValueChange={setFilterData}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="vencidas">Vencidas</SelectItem>
                  <SelectItem value="proximas_7_dias">Próximas 7 dias</SelectItem>
                  <SelectItem value="proximas_30_dias">Próximas 30 dias</SelectItem>
                  <SelectItem value="futuras">Futuras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Competência */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Competência</label>
              <Select value={filterCompetencia} onValueChange={setFilterCompetencia}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {competenciasUnicas.map((comp) => (
                    <SelectItem key={comp} value={comp}>
                      {comp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Ciclo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ciclo</label>
              <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ciclosUnicos.map((ciclo) => (
                    <SelectItem key={ciclo} value={ciclo}>
                      {ciclo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      {acoesFiltradasEOrdenadas && acoesFiltradasEOrdenadas.length > 0 ? (
        <div className="grid gap-4">
          {acoesFiltradasEOrdenadas.map((acao: any) => (
            <Card key={acao.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{acao.nome}</CardTitle>
                    <CardDescription className="mt-2">
                      {acao.descricao && formatarDescricao(acao.descricao)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(acao.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Prazo</p>
                    <p className="font-medium">
                      {new Date(acao.prazo).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {acao.microCompetencia && (
                    <div>
                      <p className="text-muted-foreground">Competência</p>
                      <p className="font-medium">{acao.microCompetencia.nome}</p>
                    </div>
                  )}
                  {acao.pdi?.ciclo && (
                    <div>
                      <p className="text-muted-foreground">Ciclo</p>
                      <p className="font-medium">{acao.pdi.ciclo.nome}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnviarEvidencia(acao)}
                    disabled={acao.status === "concluida"}
                  >
                    Enviar Evidência
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSolicitarAlteracao(acao)}
                  >
                    Solicitar Alteração
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {acoes && acoes.length > 0
                ? "Nenhuma ação encontrada com os filtros selecionados"
                : "Nenhuma ação atribuída"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Enviar Evidência */}
      <Dialog open={showEvidenciaModal} onOpenChange={setShowEvidenciaModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Evidência</DialogTitle>
            <DialogDescription>
              Anexe o comprovante de conclusão da ação: {selectedAcao?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição da Evidência</label>
              <textarea
                className="w-full min-h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva o que foi realizado e como a ação foi concluída..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Anexar Arquivo</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar arquivo ou arraste aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: PDF, DOC, DOCX, JPG, PNG
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEvidenciaModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-orange-500"
                onClick={() => {
                  // TODO: Implementar envio de evidência
                  setShowEvidenciaModal(false);
                }}
              >
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Solicitar Alteração */}
      <Dialog open={showSolicitarAlteracaoModal} onOpenChange={setShowSolicitarAlteracaoModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Alteração</DialogTitle>
            <DialogDescription>
              Selecione qual campo deseja alterar e descreva as mudanças desejadas
            </DialogDescription>
          </DialogHeader>

          {selectedAcao && (
            <div className="space-y-6 py-4">
              {/* Informações Atuais da Ação */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-sm text-foreground">
                  Informações Atuais da Ação
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Nome
                    </label>
                    <p className="text-sm text-foreground">{selectedAcao.nome}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Prazo
                    </label>
                    <p className="text-sm text-foreground">
                      {new Date(selectedAcao.prazo).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {selectedAcao.descricao && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Descrição
                    </label>
                    <p className="text-sm text-foreground">
                      {formatarDescricao(selectedAcao.descricao)}
                    </p>
                  </div>
                )}

                {selectedAcao.microCompetencia && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Competência
                    </label>
                    <p className="text-sm text-foreground">
                      {selectedAcao.microCompetencia.nome}
                    </p>
                  </div>
                )}
              </div>

              {/* Seleção de Campos para Alterar */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-foreground">
                  Qual campo deseja alterar?
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={selectedFields.includes("nome")}
                      onChange={() => toggleField("nome")}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Nome da Ação</p>
                      <p className="text-xs text-muted-foreground">
                        Alterar o nome/título da ação
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={selectedFields.includes("descricao")}
                      onChange={() => toggleField("descricao")}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Descrição</p>
                      <p className="text-xs text-muted-foreground">
                        Alterar a descrição ou detalhes da ação
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={selectedFields.includes("prazo")}
                      onChange={() => toggleField("prazo")}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Prazo</p>
                      <p className="text-xs text-muted-foreground">
                        Alterar a data de conclusão
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={selectedFields.includes("competencia")}
                      onChange={() => toggleField("competencia")}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Competência</p>
                      <p className="text-xs text-muted-foreground">
                        Alterar a competência associada
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={selectedFields.includes("outro")}
                      onChange={() => toggleField("outro")}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Outro</p>
                      <p className="text-xs text-muted-foreground">
                        Outro motivo não listado acima
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Descrição Detalhada */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Descreva as alterações solicitadas *
                </label>
                <textarea
                  className="w-full min-h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explique detalhadamente o que deseja alterar e por quê..."
                />
              </div>

              {/* Botões */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowSolicitarAlteracaoModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-gradient-to-r from-blue-600 to-orange-500"
                  onClick={() => {
                    // TODO: Implementar solicitação de alteração
                    setShowSolicitarAlteracaoModal(false);
                  }}
                >
                  Solicitar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
