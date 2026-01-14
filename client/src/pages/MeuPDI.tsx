import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Target, Calendar, CheckCircle2, List, User, UserCheck, TrendingUp, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";

export default function MeuPDI() {
  const { data: pdis, isLoading } = trpc.pdis.myPDIs.useQuery();
  const { data: ciclos } = trpc.ciclos.list.useQuery();
  const [selectedPDI, setSelectedPDI] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [, setLocation] = useLocation();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string, className?: string }> = {
      em_andamento: { variant: "default", label: "Em Andamento", className: "bg-blue-500 text-white" },
      concluido: { variant: "outline", label: "Concluído", className: "bg-green-50 text-green-700 border-green-300" },
      cancelado: { variant: "destructive", label: "Cancelado" },
    };
    const config = variants[status] || variants.em_andamento;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const handleView = (pdi: any) => {
    setSelectedPDI(pdi);
    setShowViewModal(true);
  };

  const handleViewActions = (pdiId: number) => {
    setLocation(`/acoes?pdiId=${pdiId}`);
  };

  const handleEnviarEvidencia = (pdiId: number) => {
    // TODO: Implementar modal de envio de evidências
    setLocation(`/acoes?pdiId=${pdiId}`);
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
          Meu PDI
        </h1>
        <p className="text-muted-foreground">
          Visualize e acompanhe seu Plano de Desenvolvimento Individual
        </p>
      </div>

      {!pdis || pdis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum PDI encontrado</p>
            <p className="text-sm text-muted-foreground mt-2">
              Você ainda não possui um PDI cadastrado. Entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pdis.map((pdi: any) => (
            <Card key={pdi.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{pdi.titulo}</CardTitle>
                    <CardDescription className="mt-1">
                      {pdi.ciclo ? pdi.ciclo.nome : "Sem ciclo"}
                    </CardDescription>
                  </div>
                  {getStatusBadge(pdi.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pdi.objetivoGeral && (
                    <div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pdi.objetivoGeral}
                      </p>
                    </div>
                  )}

                  {/* Nome do Empregado */}
                  {pdi.colaborador && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Empregado:</span> {pdi.colaborador.name}
                      </span>
                    </div>
                  )}

                  {/* Nome do Líder */}
                  {pdi.lider && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        <span className="font-medium">Líder:</span> {pdi.lider.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {pdi.ciclo ? (
                      <span>
                        {new Date(pdi.ciclo.dataInicio).toLocaleDateString("pt-BR")} -{" "}
                        {new Date(pdi.ciclo.dataFim).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span>Sem período definido</span>
                    )}
                  </div>

                  {/* Barra de Progresso */}
                  {pdi.progressPercentage !== undefined && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">Progresso:</span>
                        </div>
                        <span className="font-bold text-primary">{pdi.progressPercentage}%</span>
                      </div>
                      <Progress value={pdi.progressPercentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{pdi.completedCount || 0} concluídas</span>
                        <span>{pdi.actionCount || 0} total</span>
                      </div>
                    </div>
                  )}

                  {/* Card de Número de Ações */}
                  {pdi.actionCount !== undefined && (
                    <div className="bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <List className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Ações</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">{pdi.actionCount}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleView(pdi)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-orange-500"
                      onClick={() => handleViewActions(pdi.id)}
                    >
                      <List className="h-4 w-4 mr-2" />
                      Ações
                    </Button>
                  </div>


                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Visualização */}
      {showViewModal && selectedPDI && (
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPDI.titulo}</DialogTitle>
              <DialogDescription>
                Detalhes do Plano de Desenvolvimento Individual
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div>{getStatusBadge(selectedPDI.status)}</div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Ciclo</p>
                  <p className="text-sm">
                    {selectedPDI.ciclo ? selectedPDI.ciclo.nome : "Sem ciclo"}
                  </p>
                </div>
              </div>

              {/* Informações do Empregado e Líder */}
              <div className="grid grid-cols-2 gap-4">
                {selectedPDI.colaborador && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Empregado</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{selectedPDI.colaborador.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedPDI.colaborador.email}</p>
                  </div>
                )}

                {selectedPDI.lider && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Líder</p>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{selectedPDI.lider.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedPDI.lider.email}</p>
                  </div>
                )}
              </div>

              {selectedPDI.ciclo && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Período</p>
                  <p className="text-sm">
                    {new Date(selectedPDI.ciclo.dataInicio).toLocaleDateString("pt-BR")} até{" "}
                    {new Date(selectedPDI.ciclo.dataFim).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

              {selectedPDI.objetivoGeral && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Objetivo Geral</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedPDI.objetivoGeral}</p>
                </div>
              )}

              {/* Estatísticas de Progresso */}
              {selectedPDI.progressPercentage !== undefined && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Progresso das Ações</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Progresso Geral</span>
                      <span className="text-sm font-bold text-primary">{selectedPDI.progressPercentage}%</span>
                    </div>
                    <Progress value={selectedPDI.progressPercentage} className="h-3" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-700">{selectedPDI.completedCount || 0}</p>
                        <p className="text-xs text-green-600">Concluídas</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-700">{selectedPDI.inProgressCount || 0}</p>
                        <p className="text-xs text-blue-600">Em Andamento</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-orange-700">{selectedPDI.pendingCount || 0}</p>
                        <p className="text-xs text-orange-600">Pendentes</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowViewModal(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    setShowViewModal(false);
                    handleViewActions(selectedPDI.id);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-orange-500"
                >
                  <List className="h-4 w-4 mr-2" />
                  Ver Ações
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
