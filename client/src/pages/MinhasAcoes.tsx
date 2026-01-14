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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function MinhasAcoes() {
  const { user } = useAuth();
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
  const [showSolicitarAlteracaoModal, setShowSolicitarAlteracaoModal] = useState(false);
  const [selectedAcao, setSelectedAcao] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [descricaoAlteracao, setDescricaoAlteracao] = useState("");
  const [isSubmittingSolicitacao, setIsSubmittingSolicitacao] = useState(false);
  const [showConfirmacaoLider, setShowConfirmacaoLider] = useState(false);
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null);
  const [evidenciaDescricao, setEvidenciaDescricao] = useState("");
  const [isSubmittingEvidencia, setIsSubmittingEvidencia] = useState(false);

  // Filtros
  const [filterCompetencia, setFilterCompetencia] = useState<string>("todos");
  const [filterCiclo, setFilterCiclo] = useState<string>("todos");
  const [filterData, setFilterData] = useState<string>("todos");

  // Query para buscar ações do colaborador
  const { data: acoes, isLoading } = trpc.actions.list.useQuery();

  // Mutation para solicitar alteração
  const solicitarAjusteMutation = trpc.actions.solicitarAjuste.useMutation({
    onSuccess: () => {
      setShowSolicitarAlteracaoModal(false);
      setSelectedAcao(null);
      setSelectedFields([]);
      setDescricaoAlteracao("");
      alert("Solicitação enviada com sucesso! O administrador analisará em breve.");
    },
    onError: (error) => {
      alert(`Erro ao enviar solicitação: ${error.message}`);
    },
  });

  // Mutation para enviar evidência
  const enviarEvidenciaMutation = trpc.evidences.create.useMutation({
    onSuccess: () => {
      setShowEvidenciaModal(false);
      setSelectedAcao(null);
      setEvidenciaFile(null);
      setEvidenciaDescricao("");
      alert("Evidência enviada com sucesso! O administrador analisará em breve.");
      // Recarregar as ações
      trpc.useUtils().actions.list.invalidate();
    },
    onError: (error) => {
      alert(`Erro ao enviar evidência: ${error.message}`);
    },
  });

  // Extrair competências e ciclos únicos
  const competenciasUnicas = useMemo(() => {
    if (!acoes) return [];
    const competencias = new Set<string>();
    acoes.forEach((acao: any) => {
      if (acao.micro?.nome) competencias.add(acao.micro.nome);
    });
    return Array.from(competencias);
  }, [acoes]);

  const ciclosUnicos = useMemo(() => {
    if (!acoes) return [];
    const ciclos = new Set<string>();
    acoes.forEach((acao: any) => {
      if (acao.pdi?.ciclo) ciclos.add(acao.pdi.ciclo);
    });
    return Array.from(ciclos);
  }, [acoes]);

  // Aplicar filtros e ordenação
  const acoesFiltradas = useMemo(() => {
    if (!acoes) return [];

    let filtered = acoes.filter((acao: any) => {
      // Filtro por competência
      if (filterCompetencia !== "todos" && acao.micro?.nome !== filterCompetencia) {
        return false;
      }

      // Filtro por ciclo
      if (filterCiclo !== "todos" && acao.pdi?.ciclo !== filterCiclo) {
        return false;
      }

      // Filtro por data
      if (filterData !== "todos") {
        const prazo = new Date(acao.prazo);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (filterData === "vencidas") {
          return prazo < hoje;
        } else if (filterData === "proximas7") {
          const em7Dias = new Date(hoje);
          em7Dias.setDate(em7Dias.getDate() + 7);
          return prazo >= hoje && prazo <= em7Dias;
        } else if (filterData === "proximas30") {
          const em30Dias = new Date(hoje);
          em30Dias.setDate(em30Dias.getDate() + 30);
          return prazo >= hoje && prazo <= em30Dias;
        } else if (filterData === "futuras") {
          const em30Dias = new Date(hoje);
          em30Dias.setDate(em30Dias.getDate() + 30);
          return prazo > em30Dias;
        }
      }

      return true;
    });

    // Ordenar por data de vencimento (mais próximas primeiro)
    filtered.sort((a: any, b: any) => {
      return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
    });

    return filtered;
  }, [acoes, filterCompetencia, filterCiclo, filterData]);

  const formatarDescricao = (descricao: string) => {
    return descricao.split(". ").map((parte, idx) => (
      <div key={idx}>
        {parte}
        {idx < descricao.split(". ").length - 1 && "."}
      </div>
    ));
  };

  const handleEnviarEvidencia = async () => {
    if (!evidenciaFile) {
      alert("Por favor, selecione um arquivo");
      return;
    }

    setIsSubmittingEvidencia(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string;
          
          // Enviar evidência com o arquivo em base64
          enviarEvidenciaMutation.mutate({
            actionId: selectedAcao.id,
            files: [{
              fileName: evidenciaFile.name,
              fileType: evidenciaFile.type,
              fileSize: evidenciaFile.size,
              fileUrl: fileContent,
              fileKey: `evidencias/${selectedAcao.id}-${Date.now()}-${evidenciaFile.name}`,
            }],
            texts: evidenciaDescricao ? [{ texto: evidenciaDescricao }] : undefined,
          });
        } catch (error) {
          alert(`Erro ao processar arquivo: ${error}`);
          setIsSubmittingEvidencia(false);
        }
      };
      reader.readAsDataURL(evidenciaFile);
    } catch (error) {
      alert(`Erro ao ler arquivo: ${error}`);
      setIsSubmittingEvidencia(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando ações...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Minhas Ações</h1>
        <p className="text-gray-600 mt-2">Gerenciar suas ações de desenvolvimento</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data</label>
            <Select value={filterData} onValueChange={setFilterData}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="vencidas">Vencidas</SelectItem>
                <SelectItem value="proximas7">Próximas 7 dias</SelectItem>
                <SelectItem value="proximas30">Próximas 30 dias</SelectItem>
                <SelectItem value="futuras">Futuras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Competência</label>
            <Select value={filterCompetencia} onValueChange={setFilterCompetencia}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Ciclo</label>
            <Select value={filterCiclo} onValueChange={setFilterCiclo}>
              <SelectTrigger>
                <SelectValue />
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
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="space-y-4">
        {acoesFiltradas.length === 0 ? (
          <Card className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma ação encontrada com os filtros selecionados</p>
          </Card>
        ) : (
          acoesFiltradas.map((acao: any) => (
            <Card key={acao.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{acao.nome}</CardTitle>
                    <Badge className="mt-2 bg-orange-100 text-orange-800">{acao.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-700 leading-relaxed">
                  {formatarDescricao(acao.descricao)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Prazo:</span>
                    <p className="text-gray-900">
                      {new Date(acao.prazo).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Competência:</span>
                    <p className="text-gray-900">{acao.micro?.nome || "N/A"}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedAcao(acao);
                      setShowEvidenciaModal(true);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Enviar Evidência
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedAcao(acao);
                      setSelectedFields([]);
                      setDescricaoAlteracao("");
                      setShowSolicitarAlteracaoModal(true);
                    }}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Solicitar Alteração
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Enviar Evidência */}
      <Dialog open={showEvidenciaModal} onOpenChange={setShowEvidenciaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Evidência</DialogTitle>
            <DialogDescription>
              Anexe um arquivo como comprovante de conclusão da ação
            </DialogDescription>
          </DialogHeader>
          {selectedAcao && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900">{selectedAcao.nome}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Prazo: {new Date(selectedAcao.prazo).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Arquivo *</label>
                <input
                  type="file"
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  onChange={(e) => setEvidenciaFile(e.target.files?.[0] || null)}
                />
                {evidenciaFile && (
                  <p className="text-sm text-gray-600">Arquivo selecionado: {evidenciaFile.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg min-h-24"
                  placeholder="Descreva brevemente o que foi realizado..."
                  value={evidenciaDescricao}
                  onChange={(e) => setEvidenciaDescricao(e.target.value)}
                />
              </div>

              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-orange-500"
                onClick={handleEnviarEvidencia}
                disabled={isSubmittingEvidencia}
              >
                {isSubmittingEvidencia ? "Enviando..." : "Enviar Evidência"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Solicitar Alteração */}
      <Dialog open={showSolicitarAlteracaoModal} onOpenChange={setShowSolicitarAlteracaoModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Alteração</DialogTitle>
            <DialogDescription>
              Selecione quais campos deseja alterar e descreva as mudanças solicitadas
            </DialogDescription>
          </DialogHeader>
          {selectedAcao && (
            <div className="space-y-6">
              {/* Seção de Campos Atuais */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-blue-900">Campos Atuais da Ação</h3>

                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Nome:</span> {selectedAcao.nome}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Descrição:</span> {selectedAcao.descricao}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Prazo:</span>{" "}
                    {new Date(selectedAcao.prazo).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Competência:</span> {selectedAcao.micro?.nome}
                  </p>
                </div>
              </div>

              {/* Seleção de Campos */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Campos a Alterar *</h3>
                <div className="space-y-2">
                  {[
                    { id: "nome", label: "Nome da Ação" },
                    { id: "descricao", label: "Descrição" },
                    { id: "prazo", label: "Prazo" },
                    { id: "competencia", label: "Competência" },
                    { id: "outro", label: "Outro" },
                  ].map((campo) => (
                    <label key={campo.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(campo.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFields([...selectedFields, campo.id]);
                          } else {
                            setSelectedFields(selectedFields.filter((f) => f !== campo.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{campo.label}</span>
                    </label>
                  ))}
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
                  value={descricaoAlteracao}
                  onChange={(e) => setDescricaoAlteracao(e.target.value)}
                />
              </div>

              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-orange-500"
                onClick={() => {
                  if (!descricaoAlteracao.trim()) {
                    alert("Por favor, descreva as alterações solicitadas");
                    return;
                  }
                  if (selectedFields.length === 0) {
                    alert("Por favor, selecione pelo menos um campo para alterar");
                    return;
                  }
                  // Abrir modal de confirmação
                  setShowConfirmacaoLider(true);
                }}
                disabled={isSubmittingSolicitacao}
              >
                {isSubmittingSolicitacao ? "Enviando..." : "Solicitar"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação - Validação com Líder */}
      <AlertDialog open={showConfirmacaoLider} onOpenChange={setShowConfirmacaoLider}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Validação com Liderança
            </AlertDialogTitle>
            <AlertDialogDescription>
              Antes de enviar sua solicitação de alteração, é importante validar com seu líder direto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 my-4">
            <p className="text-sm text-orange-900 font-medium">
              Você já conversou com seu líder sobre esta alteração?
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, vou conversar primeiro</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmacaoLider(false);
                // Enviar a solicitação
                setIsSubmittingSolicitacao(true);
                const camposAjustar: any = {};
                if (selectedFields.includes("nome")) camposAjustar.nome = selectedAcao.nome;
                if (selectedFields.includes("descricao"))
                  camposAjustar.descricao = selectedAcao.descricao;
                if (selectedFields.includes("prazo")) camposAjustar.prazo = selectedAcao.prazo.toISOString();
                if (selectedFields.includes("competencia")) {
                  camposAjustar.microId = selectedAcao.microCompetenciaId;
                }
                if (selectedFields.includes("outro")) {
                  camposAjustar.outro = "[Alteração solicitada]";
                }

                solicitarAjusteMutation.mutate(
                  {
                    actionId: selectedAcao.id,
                    justificativa: descricaoAlteracao,
                    camposAjustar,
                  },
                  {
                    onSettled: () => setIsSubmittingSolicitacao(false),
                  }
                );
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Sim, já conversei
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
