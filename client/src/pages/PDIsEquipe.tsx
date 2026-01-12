import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Target, User, Calendar, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function PDIsEquipe() {
  const { data: pdis, isLoading } = trpc.pdis.teamPDIs.useQuery();
  const [selectedPDI, setSelectedPDI] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            PDIs da Equipe
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize os Planos de Desenvolvimento Individual dos seus subordinados
          </p>
        </div>
      </div>

      {/* Lista de PDIs */}
      {!pdis || pdis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum PDI encontrado para sua equipe.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdis.map((pdi: any) => (
            <Card key={pdi.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{pdi.titulo}</CardTitle>
                  {getStatusBadge(pdi.status)}
                </div>
                <CardDescription className="line-clamp-2">
                  {pdi.descricao || "Sem descrição"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Colaborador */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Colaborador:</span>
                  <span className="text-muted-foreground">{pdi.colaborador?.name || "-"}</span>
                </div>

                {/* Ciclo */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Ciclo:</span>
                  <span className="text-muted-foreground">{pdi.ciclo?.nome || "-"}</span>
                </div>

                {/* Contador de Ações */}
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Ações:</span>
                  <span className="text-muted-foreground">{pdi.actionCount || 0} vinculadas</span>
                </div>

                {/* Botão Visualizar */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleView(pdi)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Visualização */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do PDI</DialogTitle>
            <DialogDescription>
              Informações completas do Plano de Desenvolvimento Individual
            </DialogDescription>
          </DialogHeader>

          {selectedPDI && (
            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="text-sm font-medium">Título</label>
                <p className="text-sm text-muted-foreground mt-1">{selectedPDI.titulo}</p>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <p className="text-sm text-muted-foreground mt-1">{selectedPDI.descricao || "Sem descrição"}</p>
              </div>

              {/* Colaborador */}
              <div>
                <label className="text-sm font-medium">Colaborador</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedPDI.colaborador?.name} ({selectedPDI.colaborador?.email})
                </p>
              </div>

              {/* Ciclo */}
              <div>
                <label className="text-sm font-medium">Ciclo</label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedPDI.ciclo?.nome} ({new Date(selectedPDI.ciclo?.dataInicio).toLocaleDateString()} - {new Date(selectedPDI.ciclo?.dataFim).toLocaleDateString()})
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium">Status</label>
                <div className="mt-1">
                  {getStatusBadge(selectedPDI.status)}
                </div>
              </div>

              {/* Contador de Ações */}
              <div>
                <label className="text-sm font-medium">Ações Vinculadas</label>
                <p className="text-sm text-muted-foreground mt-1">{selectedPDI.actionCount || 0} ações</p>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Criado em</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedPDI.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Atualizado em</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedPDI.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
