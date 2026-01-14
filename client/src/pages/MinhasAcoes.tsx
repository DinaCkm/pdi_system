import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Upload, MessageSquare, Calendar, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";

export default function MinhasAcoes() {
  const { user } = useAuth();
  const { data: acoes, isLoading } = trpc.actions.list.useQuery();
  const [selectedAcao, setSelectedAcao] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEvidenciaModal, setShowEvidenciaModal] = useState(false);
  const [showSolicitarAlteracaoModal, setShowSolicitarAlteracaoModal] = useState(false);

  // Filtrar apenas as ações do colaborador logado
  const minhasAcoes = acoes?.filter((acao: any) => acao.pdi?.colaboradorId === user?.id) || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className?: string }> = {
      pendente_aprovacao: { variant: "default", label: "Pendente Aprovação", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      em_andamento: { variant: "default", label: "Em Andamento", className: "bg-blue-100 text-blue-800 border-blue-300" },
      concluida: { variant: "outline", label: "Concluída", className: "bg-green-50 text-green-700 border-green-300" },
      cancelada: { variant: "destructive", label: "Cancelada" },
    };
    const config = variants[status] || variants.em_andamento;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const handleView = (acao: any) => {
    setSelectedAcao(acao);
    setShowViewModal(true);
  };

  const handleEnviarEvidencia = (acao: any) => {
    setSelectedAcao(acao);
    setShowEvidenciaModal(true);
  };

  const handleSolicitarAlteracao = (acao: any) => {
    setSelectedAcao(acao);
    setShowSolicitarAlteracaoModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
          Minhas Ações
        </h1>
        <p className="text-muted-foreground">
          Acompanhe e gerencie suas ações de desenvolvimento
        </p>
      </div>

      {minhasAcoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma ação encontrada</p>
            <p className="text-sm text-muted-foreground mt-2">
              Você não possui ações atribuídas no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {minhasAcoes.map((acao: any) => (
            <Card key={acao.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{acao.nome}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {acao.descricao || "Sem descrição"}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(acao.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Competência */}
                {acao.microCompetencia && (
                  <div className="text-sm border-b pb-2">
                    <span className="font-semibold text-foreground">Competência:</span>
                    <p className="text-muted-foreground text-xs">{acao.microCompetencia.nome}</p>
                  </div>
                )}

                {/* Prazo */}
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Prazo: {new Date(acao.prazo).toLocaleDateString("pt-BR")}</span>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleView(acao)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>

                  {/* Botão Enviar Evidência - Disponível para ações em andamento ou pendentes */}
                  {(acao.status === "em_andamento" || acao.status === "pendente_aprovacao") && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
                      onClick={() => handleEnviarEvidencia(acao)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Enviar Evidência
                    </Button>
                  )}

                  {/* Botão Solicitar Alteração - Sempre disponível */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                    onClick={() => handleSolicitarAlteracao(acao)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Solicitar Alteração
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Visualização */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAcao?.nome}</DialogTitle>
            <DialogDescription>
              Detalhes da ação de desenvolvimento
            </DialogDescription>
          </DialogHeader>

          {selectedAcao && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div>{getStatusBadge(selectedAcao.status)}</div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Prazo</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedAcao.prazo).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              {selectedAcao.descricao && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                  <p className="text-sm">{selectedAcao.descricao}</p>
                </div>
              )}

              {selectedAcao.microCompetencia && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Competência</p>
                  <p className="text-sm">{selectedAcao.microCompetencia.nome}</p>
                </div>
              )}

              {selectedAcao.pdi && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">PDI</p>
                  <p className="text-sm">{selectedAcao.pdi.titulo}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Enviar Evidência */}
      <Dialog open={showEvidenciaModal} onOpenChange={setShowEvidenciaModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Evidência</DialogTitle>
            <DialogDescription>
              Anexe um arquivo como comprovante de conclusão da ação: {selectedAcao?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Clique para selecionar ou arraste um arquivo
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
              </p>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.png"
              />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Solicitar Alteração</DialogTitle>
            <DialogDescription>
              Descreva as alterações que você gostaria de fazer na ação: {selectedAcao?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da Alteração</label>
              <textarea
                className="w-full min-h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva o motivo e as alterações solicitadas..."
              />
            </div>

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
        </DialogContent>
      </Dialog>
    </div>
  );
}
