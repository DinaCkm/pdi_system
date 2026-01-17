import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContentNoPortal,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function HistoricoAlteracoes() {
  const { user } = useAuth();
  const [selectedAcaoId, setSelectedAcaoId] = useState<number | null>(null);
  const [expandedHistoricos, setExpandedHistoricos] = useState<Set<number>>(new Set());

  // Query para buscar ações do colaborador
  const { data: acoes, isLoading: isLoadingAcoes } = trpc.actions.myActions.useQuery();

  // Query para buscar histórico de alterações da ação selecionada
  // @ts-ignore
  const { data: historico, isLoading: isLoadingHistorico } = trpc.actions.getAlterationHistory.useQuery(
    { actionId: selectedAcaoId || 0 },
    { enabled: selectedAcaoId !== null }
  );

  const toggleExpandHistorico = (id: number) => {
    const newSet = new Set(expandedHistoricos);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedHistoricos(newSet);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "aprovada":
        return "bg-green-100 text-green-800";
      case "reprovada":
        return "bg-red-100 text-red-800";
      case "pendente":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCampoLabel = (campo: string) => {
    const labels: Record<string, string> = {
      nome: "Nome",
      descricao: "Descrição",
      prazo: "Prazo",
      status: "Status",
      resultado: "Resultado",
      competencia: "Competência",
      micro: "Micro Competência",
      evidencia: "Evidência",
    };
    return labels[campo] || campo;
  };

  if (isLoadingAcoes) {
    return <div className="p-8 text-center">Carregando ações...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Histórico de Alterações</h1>
        <p className="text-gray-600 mt-2">Consulte o histórico de alterações realizadas nas suas ações</p>
      </div>

      {/* Seletor de Ação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selecione uma Ação</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedAcaoId ? String(selectedAcaoId) : ""}
            onValueChange={(value) => {
              setSelectedAcaoId(value ? Number(value) : null);
              setExpandedHistoricos(new Set());
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma ação para visualizar o histórico" />
            </SelectTrigger>
            <SelectContentNoPortal sideOffset={4} position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
              {acoes?.map((acao: any) => (
                <SelectItem key={acao.id} value={String(acao.id)}>
                  {acao.nome}
                </SelectItem>
              ))}
            </SelectContentNoPortal>
          </Select>
        </CardContent>
      </Card>

      {/* Histórico de Alterações */}
      {selectedAcaoId && (
        <div className="space-y-4">
          {isLoadingHistorico ? (
            <Card className="text-center py-12">
              <p className="text-gray-600">Carregando histórico...</p>
            </Card>
          ) : historico && historico.length > 0 ? (
            historico.map((item: any, index: number) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <div
                  className="p-6 cursor-pointer flex items-start justify-between"
                  onClick={() => toggleExpandHistorico(item.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {getCampoLabel(item.campo)} alterado
                      </h3>
                      <Badge className={getStatusBadgeColor("alterado")}>
                        {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Alterado por: <strong>{item.alteradorNome || "Admin"}</strong>
                    </p>
                  </div>
                  <div className="ml-4">
                    {expandedHistoricos.has(item.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Detalhes da Alteração */}
                {expandedHistoricos.has(item.id) && (
                  <div className="border-t px-6 py-4 bg-gray-50">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Valor Anterior:</p>
                        <p className="text-sm text-gray-900 mt-1 p-3 bg-white rounded border border-gray-200">
                          {item.valorAnterior || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Novo Valor:</p>
                        <p className="text-sm text-gray-900 mt-1 p-3 bg-white rounded border border-gray-200">
                          {item.valorNovo || "—"}
                        </p>
                      </div>
                      {item.motivoAlteracao && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Motivo:</p>
                          <p className="text-sm text-gray-900 mt-1 p-3 bg-white rounded border border-gray-200">
                            {item.motivoAlteracao}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))
          ) : (
            <Card className="text-center py-12">
              <p className="text-gray-600">Nenhuma alteração encontrada para esta ação</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
