import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SolicitarAjusteModalMelhoradoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: string;
  actionTitle: string;
  currentData: {
    titulo?: string;
    descricao?: string;
    prazo?: string;
    macroCompetencia?: string;
  };
  hasPendingRequest: boolean;
  onSuccess?: () => void;
}

export function SolicitarAjusteModalMelhorado({
  open,
  onOpenChange,
  actionId,
  actionTitle,
  currentData,
  hasPendingRequest,
  onSuccess,
}: SolicitarAjusteModalMelhoradoProps) {
  const [titulo, setTitulo] = useState(currentData.titulo || "");
  const [descricao, setDescricao] = useState(currentData.descricao || "");
  const [prazo, setPrazo] = useState(currentData.prazo || "");
  const [macroCompetencia, setMacroCompetencia] = useState(
    currentData.macroCompetencia || ""
  );
  const [justificativa, setJustificativa] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Resetar campos quando o modal abre com uma nova ação
  useEffect(() => {
    if (open) {
      setTitulo(currentData.titulo || "");
      setDescricao(currentData.descricao || "");
      setPrazo(currentData.prazo || "");
      setMacroCompetencia(currentData.macroCompetencia || "");
      setJustificativa("");
      setSuccess(false);
    }
  }, [open, actionId, currentData]);

  const createMutation = trpc.adjustmentRequests.create.useMutation();

  const handleSubmit = async () => {
    if (justificativa.trim().length < 10) {
      toast.error("Justificativa deve ter no mínimo 10 caracteres");
      return;
    }

    // Construir objeto com os campos alterados (novos valores)
    const camposAlterados: Record<string, any> = {};
    
    if (titulo !== currentData.titulo) {
      camposAlterados.titulo = titulo;
    }
    if (descricao !== currentData.descricao) {
      camposAlterados.descricao = descricao;
    }
    if (prazo !== currentData.prazo) {
      camposAlterados.prazo = prazo;
    }
    if (macroCompetencia !== currentData.macroCompetencia) {
      camposAlterados.competencia = macroCompetencia;
    }

    if (Object.keys(camposAlterados).length === 0) {
      toast.error("Nenhum campo foi alterado");
      return;
    }

    setIsLoading(true);

    try {
      await createMutation.mutateAsync({
        actionId: parseInt(actionId),
        // camposAjustar agora contém um JSON com os NOVOS valores
        camposAjustar: JSON.stringify(camposAlterados),
        justificativa: justificativa,
        tipoSolicitante: "colaborador",
      });

      setSuccess(true);
      toast.success("✅ Solicitação de ajuste enviada com sucesso!");
      
      // Chamar callback de sucesso para invalidar cache
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setTitulo(currentData.titulo || "");
        setDescricao(currentData.descricao || "");
        setPrazo(currentData.prazo || "");
        setMacroCompetencia(currentData.macroCompetencia || "");
        setJustificativa("");
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao enviar solicitação:", error);
      const errorMessage = error?.message || "Erro ao enviar solicitação de ajuste";
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-center mb-2">
              Solicitação Enviada!
            </h2>
            <p className="text-center text-sm text-gray-600">
              Sua solicitação de ajuste foi enviada com sucesso. O administrador
              analisará e você receberá uma notificação quando for avaliada.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Alteração</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Ação:</strong> {actionTitle}
            </p>
          </div>

          {hasPendingRequest && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Você já possui uma solicitação de ajuste pendente de análise.
                Aguarde a avaliação do administrador antes de enviar uma nova
                solicitação.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 border-t pt-4">
            {/* Título */}
            <div>
              <Label htmlFor="titulo" className="text-sm font-medium">
                Título
              </Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={currentData.titulo || "Novo título da ação"}
                disabled={hasPendingRequest}
                className="mt-1"
              />
              {titulo !== currentData.titulo && titulo && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 line-through">{currentData.titulo || "N/A"}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="text-green-600 font-medium">{titulo}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="descricao" className="text-sm font-medium">
                Descrição
              </Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={currentData.descricao || "Nova descrição da ação"}
                disabled={hasPendingRequest}
                className="mt-1 min-h-[100px]"
              />
              {descricao !== currentData.descricao && descricao && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <p className="text-red-600 line-through mb-1">{currentData.descricao || "N/A"}</p>
                  <p className="text-green-600 font-medium">{descricao}</p>
                </div>
              )}
            </div>

            {/* Prazo */}
            <div>
              <Label htmlFor="prazo" className="text-sm font-medium">
                Prazo
              </Label>
              <Input
                id="prazo"
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                disabled={hasPendingRequest}
                className="mt-1"
              />
              {prazo !== currentData.prazo && prazo && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 line-through">
                      {currentData.prazo ? new Date(currentData.prazo).toLocaleDateString("pt-BR") : "N/A"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="text-green-600 font-medium">
                      {new Date(prazo).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Macro Competência */}
            <div>
              <Label htmlFor="macroCompetencia" className="text-sm font-medium">
                Macro Competência
              </Label>
              <Input
                id="macroCompetencia"
                value={macroCompetencia}
                onChange={(e) => setMacroCompetencia(e.target.value)}
                placeholder={currentData.macroCompetencia || "Nova macro competência"}
                disabled={hasPendingRequest}
                className="mt-1"
              />
              {macroCompetencia !== currentData.macroCompetencia && macroCompetencia && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 line-through">{currentData.macroCompetencia || "N/A"}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="text-green-600 font-medium">{macroCompetencia}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Justificativa */}
            <div>
              <Label htmlFor="justificativa" className="text-sm font-medium">
                Justificativa *
              </Label>
              <Textarea
                id="justificativa"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Explique por que você precisa fazer essa alteração..."
                disabled={hasPendingRequest}
                className="mt-1 min-h-[100px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 10 caracteres
              </p>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Sua solicitação será analisada pelo administrador. Você receberá
              uma notificação quando ela for avaliada.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || hasPendingRequest}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || hasPendingRequest}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
