import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, User, Calendar, Building, Target, CheckCircle2, Clock, FileText, Edit2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function PDIDetalhes() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  const pdiId = parseInt(id || "0");
  
  // Buscar dados do PDI
  const { data: pdi, isLoading: isLoadingPDI, error: pdiError } = trpc.pdis.getById.useQuery(
    { id: pdiId },
    { enabled: pdiId > 0 }
  );
  
  // Buscar ações do PDI
  const { data: acoes = [], isLoading: isLoadingAcoes } = trpc.actions.listByPDI.useQuery(
    { pdiId },
    { enabled: pdiId > 0 }
  );

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
          onClick={() => navigate("/pdis")}
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
