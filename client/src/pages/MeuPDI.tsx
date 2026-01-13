import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Target, Calendar, CheckCircle2, List } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";

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

                  {pdi.actionCount !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {pdi.actionCount} {pdi.actionCount === 1 ? "ação" : "ações"}
                      </span>
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
          <DialogContent className="max-w-2xl">
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

              {selectedPDI.actionCount !== undefined && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Ações</p>
                  <p className="text-sm">
                    {selectedPDI.actionCount} {selectedPDI.actionCount === 1 ? "ação cadastrada" : "ações cadastradas"}
                  </p>
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
