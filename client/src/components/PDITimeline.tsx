import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

interface Acao {
  id: number;
  nome: string;
  descricao: string;
  prazo: Date;
  status: string;
  microCompetenciaNome?: string;
  responsavelProximaEtapa?: string;
}

interface PDITimelineProps {
  acoes: Acao[];
  usuarioRole?: "admin" | "lider" | "colaborador";
}

export function PDITimeline({ acoes, usuarioRole = "colaborador" }: PDITimelineProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluida":
        return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
      case "em_andamento":
      case "evidencia_enviada":
        return <Clock className="w-6 h-6 text-blue-500" />;
      case "reprovada_lider":
      case "evidencia_reprovada":
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Circle className="w-6 h-6 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluida":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "em_andamento":
      case "evidencia_enviada":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "reprovada_lider":
      case "evidencia_reprovada":
        return "bg-red-50 text-red-700 border-red-200";
      case "pendente_aprovacao_lider":
      case "aguardando_avaliacao":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      pendente_aprovacao_lider: "Aguardando Aprovação do Líder",
      aprovada_lider: "Aprovada pelo Líder",
      reprovada_lider: "Reprovada pelo Líder",
      em_andamento: "Em Andamento",
      em_discussao: "Em Discussão",
      evidencia_enviada: "Evidência Enviada",
      evidencia_aprovada: "Evidência Aprovada",
      evidencia_reprovada: "Evidência Reprovada",
      correcao_solicitada: "Correção Solicitada",
      concluida: "Concluída",
      vencida: "Vencida",
      cancelada: "Cancelada",
    };
    return statusLabels[status] || status.toUpperCase();
  };

  const getResponsavelProximaEtapa = (status: string, usuarioRole: string) => {
    switch (status) {
      case "pendente_aprovacao_lider":
        return "Aguardando validação do Líder";
      case "aprovada_lider":
        return "Aguardando execução do Colaborador";
      case "em_andamento":
        return "Aguardando envio de evidência";
      case "evidencia_enviada":
        return "Aguardando validação de Dina (Admin)";
      case "evidencia_reprovada":
        return "Aguardando reenvio de evidência";
      case "concluida":
        return "Ação concluída com sucesso";
      default:
        return "";
    }
  };

  const formatarData = (data: Date) => {
    if (typeof data === "string") {
      data = new Date(data);
    }
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="w-full">
      {/* Timeline Container */}
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {acoes.map((acao, index) => (
          <div
            key={acao.id}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
          >
            {/* Status Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              {getStatusIcon(acao.status)}
            </div>

            {/* Card de Conteúdo */}
            <div className="w-[calc(100%-4rem)] md:w-[45%] p-4 rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <time className="font-mono text-sm font-bold text-slate-500">
                  {formatarData(acao.prazo)}
                </time>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusColor(
                    acao.status
                  )}`}
                >
                  {getStatusLabel(acao.status)}
                </span>
              </div>

              {/* Título da Ação */}
              <div className="text-slate-900 font-bold text-base mb-1">
                {acao.nome}
              </div>

              {/* Micro Competência */}
              {acao.microCompetenciaNome && (
                <div className="text-slate-600 text-sm font-medium mb-2">
                  📚 {acao.microCompetenciaNome}
                </div>
              )}

              {/* Descrição */}
              <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                {acao.descricao}
              </p>

              {/* Responsável pela Próxima Etapa */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium">
                  {getResponsavelProximaEtapa(acao.status, usuarioRole || "colaborador")}
                </p>
              </div>

              {/* Status Específico para Colaborador */}
              {usuarioRole === "colaborador" && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {acao.status === "pendente_aprovacao_lider" && (
                    <p className="text-xs text-yellow-600 font-medium">
                      ⏳ Aguardando aprovação do seu líder
                    </p>
                  )}
                  {acao.status === "aprovada_lider" && (
                    <p className="text-xs text-blue-600 font-medium">
                      ✓ Você pode começar a executar esta ação
                    </p>
                  )}
                  {acao.status === "em_andamento" && (
                    <p className="text-xs text-blue-600 font-medium">
                      ⚡ Você está executando esta ação
                    </p>
                  )}
                  {acao.status === "evidencia_enviada" && (
                    <p className="text-xs text-blue-600 font-medium">
                      📤 Sua evidência foi enviada para validação
                    </p>
                  )}
                  {acao.status === "evidencia_reprovada" && (
                    <p className="text-xs text-red-600 font-medium">
                      ❌ Sua evidência foi reprovada. Envie novamente.
                    </p>
                  )}
                  {acao.status === "concluida" && (
                    <p className="text-xs text-emerald-600 font-medium">
                      ✅ Ação concluída com sucesso!
                    </p>
                  )}
                </div>
              )}

              {/* Status Específico para Líder */}
              {usuarioRole === "lider" && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {acao.status === "pendente_aprovacao_lider" && (
                    <p className="text-xs text-yellow-600 font-medium">
                      ⏳ Você precisa aprovar esta ação
                    </p>
                  )}
                  {acao.status === "em_andamento" && (
                    <p className="text-xs text-blue-600 font-medium">
                      ⚡ Seu colaborador está executando
                    </p>
                  )}
                  {acao.status === "evidencia_enviada" && (
                    <p className="text-xs text-blue-600 font-medium">
                      📤 Evidência enviada, aguardando validação de Dina
                    </p>
                  )}
                </div>
              )}

              {/* Status Específico para Admin */}
              {usuarioRole === "admin" && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {acao.status === "evidencia_enviada" && (
                    <p className="text-xs text-yellow-600 font-medium">
                      ⏳ Você precisa validar esta evidência
                    </p>
                  )}
                  {acao.status === "concluida" && (
                    <p className="text-xs text-emerald-600 font-medium">
                      ✅ Validada e concluída
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {acoes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Circle className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma ação adicionada</p>
          <p className="text-slate-400 text-sm">
            As ações do PDI aparecerão aqui quando forem criadas
          </p>
        </div>
      )}
    </div>
  );
}
