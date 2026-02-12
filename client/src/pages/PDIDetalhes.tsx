import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, User, Calendar, Building, Target, CheckCircle2, Clock, FileText, Edit2, Loader2, Upload, X, FileDown, Save } from "lucide-react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PDIDetalhes() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  const pdiId = parseInt(id || "0");
  
  // Estados para edição do relatório
  const [isEditingRelatorio, setIsEditingRelatorio] = useState(false);
  const [relatorioTexto, setRelatorioTexto] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  
  const utils = trpc.useUtils();
  
  // Buscar dados do PDI
  const { data: pdi, isLoading: isLoadingPDI, error: pdiError } = trpc.pdis.getById.useQuery(
    { id: pdiId },
    { enabled: pdiId > 0 }
  );
  
  // Buscar ações do PDI
  const { data: acoes = [], isLoading: isLoadingAcoes } = trpc.actions.list.useQuery(
    { pdiId },
    { enabled: pdiId > 0 }
  );
  
  // Mutations para relatório
  const updatePDIMutation = trpc.pdis.update.useMutation({
    onSuccess: () => {
      toast.success("Relatório de análise salvo com sucesso!");
      setIsEditingRelatorio(false);
      utils.pdis.getById.invalidate({ id: pdiId });
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar relatório"),
  });
  
  const uploadArquivoMutation = trpc.pdis.uploadRelatorioArquivo.useMutation({
    onSuccess: () => {
      toast.success("Arquivo do relatório enviado com sucesso!");
      setIsUploadingFile(false);
      utils.pdis.getById.invalidate({ id: pdiId });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao enviar arquivo");
      setIsUploadingFile(false);
    },
  });
  
  const removeArquivoMutation = trpc.pdis.removeRelatorioArquivo.useMutation({
    onSuccess: () => {
      toast.success("Arquivo removido com sucesso!");
      utils.pdis.getById.invalidate({ id: pdiId });
    },
    onError: (err: any) => toast.error(err.message || "Erro ao remover arquivo"),
  });
  
  const handleSaveRelatorio = () => {
    updatePDIMutation.mutate({
      id: pdiId,
      relatorioAnalise: relatorioTexto || null,
    });
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Limitar a 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }
    
    setIsUploadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadArquivoMutation.mutate({
        pdiId,
        fileName: file.name,
        fileType: file.type,
        fileBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  };
  
  const handleStartEditRelatorio = () => {
    setRelatorioTexto(pdi?.relatorioAnalise || "");
    setIsEditingRelatorio(true);
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "rascunho":
        return "bg-gray-100 text-gray-800";
      case "aguardando_aprovacao":
        return "bg-yellow-100 text-yellow-800";
      case "ativo":
      case "em_andamento":
        return "bg-blue-100 text-blue-800";
      case "concluido":
        return "bg-green-100 text-green-800";
      case "cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Função para obter label do status
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      rascunho: "Rascunho",
      aguardando_aprovacao: "Aguardando Aprovação",
      ativo: "Em Andamento",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
      cancelado: "Cancelado",
      pendente: "Pendente",
      em_progresso: "Em Progresso",
    };
    return labels[status] || status;
  };

  // Função para obter cor do status da ação
  const getAcaoStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-yellow-100 text-yellow-800";
      case "em_progresso":
        return "bg-blue-100 text-blue-800";
      case "concluida":
        return "bg-green-100 text-green-800";
      case "cancelada":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoadingPDI) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2">Carregando PDI...</span>
      </div>
    );
  }

  if (pdiError || !pdi) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 text-lg mb-4">PDI não encontrado</div>
        <button
          onClick={() => navigate("/pdis")}
          className="flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para lista de PDIs
        </button>
      </div>
    );
  }

  // Calcular progresso
  const totalAcoes = acoes.length;
  const acoesConcluidas = acoes.filter((a: any) => a.status === "concluida").length;
  const progresso = totalAcoes > 0 ? Math.round((acoesConcluidas / totalAcoes) * 100) : 0;

  return (
    <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-4">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            if (user?.role === "admin" || user?.role === "gerente") {
              navigate("/pdis");
            } else if (user?.role === "lider") {
              navigate("/pdis-equipe");
            } else {
              navigate("/meu-pdi");
            }
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">
            {pdi.titulo || "PDI sem título"}
          </h1>
          <p className="text-sm text-gray-500">
            ID: #{String(pdi.id).padStart(5, "0")}
          </p>
        </div>
        {user?.role === "admin" && (
          <button
            onClick={() => toast.info("Use o botão Editar na tabela de PDIs")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit2 className="w-4 h-4" />
            Editar PDI
          </button>
        )}
      </div>

      {/* Cards de Informações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Colaborador */}
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Colaborador</p>
              <p className="font-semibold text-gray-800">{pdi.colaboradorNome || "—"}</p>
            </div>
          </div>
        </div>

        {/* Líder */}
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Líder</p>
              <p className="font-semibold text-gray-800">{pdi.liderNome || "—"}</p>
            </div>
          </div>
        </div>

        {/* Departamento */}
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Departamento</p>
              <p className="font-semibold text-gray-800">{pdi.departamentoNome || "—"}</p>
            </div>
          </div>
        </div>

        {/* Ciclo */}
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ciclo</p>
              <p className="font-semibold text-gray-800">{pdi.cicloNome || "—"}</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(pdi.status)}`}>
                {getStatusLabel(pdi.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Objetivo Geral */}
      {pdi.objetivoGeral && (
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Objetivo Geral
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap">{pdi.objetivoGeral}</p>
        </div>
      )}

      {/* Relatório de Análise do Colaborador */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Relatório de Análise do Colaborador
          </h2>
          {user?.role === "admin" && !isEditingRelatorio && (
            <button
              onClick={handleStartEditRelatorio}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {pdi.relatorioAnalise ? "Editar" : "Adicionar"}
            </button>
          )}
        </div>
        
        <div className="p-4">
          {isEditingRelatorio ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Insira o relatório/análise que originou este PDI. Suporta formatação Markdown (negrito com **, tabelas com |, listas com -).
              </p>
              <textarea
                value={relatorioTexto}
                onChange={(e) => setRelatorioTexto(e.target.value)}
                rows={10}
                placeholder={"Ex:\n**Avaliação de Desempenho 2025**\n\nO colaborador apresentou...\n\n| Competência | Nota |\n|---|---|\n| Liderança | 3.5 |"}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none resize-y overflow-auto font-mono text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditingRelatorio(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveRelatorio}
                  disabled={updatePDIMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                >
                  {updatePDIMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Relatório
                </button>
              </div>
            </div>
          ) : pdi.relatorioAnalise ? (
            <div className="prose prose-sm max-w-none text-gray-700 overflow-auto max-h-[400px]">
              <Streamdown>{pdi.relatorioAnalise}</Streamdown>
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm">
              Nenhum relatório de análise adicionado a este PDI.
              {user?.role === "admin" && " Clique em \"Adicionar\" para inserir."}
            </p>
          )}
        </div>
        
        {/* Seção de Arquivo Anexado */}
        <div className="px-4 pb-4 border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <FileDown className="w-4 h-4" />
              Arquivo Anexado (Opcional)
            </p>
          </div>
          
          {pdi.relatorioArquivoUrl ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <FileDown className="w-5 h-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 truncate">{pdi.relatorioArquivoNome || "Arquivo"}</p>
              </div>
              <a
                href={pdi.relatorioArquivoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Baixar
              </a>
              {user?.role === "admin" && (
                <button
                  onClick={() => removeArquivoMutation.mutate({ pdiId })}
                  disabled={removeArquivoMutation.isPending}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  title="Remover arquivo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div>
              {user?.role === "admin" ? (
                <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {isUploadingFile ? "Enviando..." : "Clique para anexar PDF, DOC ou imagem (máx. 10MB)"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingFile}
                  />
                  {isUploadingFile && <Loader2 className="w-4 h-4 animate-spin text-amber-600" />}
                </label>
              ) : (
                <p className="text-sm text-gray-400 italic">Nenhum arquivo anexado.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progresso */}
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Progresso do PDI</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-blue-600 to-orange-500 h-4 rounded-full transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
          <span className="text-2xl font-bold text-gray-800">{progresso}%</span>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {acoesConcluidas} de {totalAcoes} ações concluídas
        </div>
      </div>

      {/* Validação do Líder */}
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Validação do Líder</h2>
        {pdi.validadoEm ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span>PDI validado pelo líder em {new Date(pdi.validadoEm).toLocaleDateString("pt-BR")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="w-5 h-5" />
            <span>Aguardando validação do líder</span>
          </div>
        )}
      </div>

      {/* Lista de Ações */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Ações de Desenvolvimento ({totalAcoes})
          </h2>
        </div>
        
        {isLoadingAcoes ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <span className="text-gray-500 mt-2">Carregando ações...</span>
          </div>
        ) : acoes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma ação cadastrada para este PDI
          </div>
        ) : (
          <div className="divide-y">
            {acoes.map((acao: any) => (
              <div
                key={acao.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/acoes/${acao.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{acao.titulo || "Ação sem título"}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {acao.competenciaMacroNome && (
                        <span className="mr-3">📚 {acao.competenciaMacroNome}</span>
                      )}
                      {acao.prazo && (
                        <span>📅 Prazo: {new Date(acao.prazo).toLocaleDateString("pt-BR")}</span>
                      )}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getAcaoStatusColor(acao.status)}`}>
                    {getStatusLabel(acao.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
