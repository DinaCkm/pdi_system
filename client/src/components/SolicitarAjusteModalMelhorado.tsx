import { useState } from "react";
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
import { AlertCircle, CheckCircle2 } from "lucide-react";
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
}

export function SolicitarAjusteModalMelhorado({
  open,
  onOpenChange,
  actionId,
  actionTitle,
  currentData,
  hasPendingRequest,
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

  const createMutation = trpc.adjustmentRequests.create.useMutation();

  const handleSubmit = async () => {
    if (justificativa.trim().length < 10) {
      toast.error("Justificativa deve ter no mínimo 10 caracteres");
      return;
    }

    const changedFields = [];
    if (titulo !== currentData.titulo) changedFields.push("Título");
    if (descricao !== currentData.descricao) changedFields.push("Descrição");
    if (prazo !== currentData.prazo) changedFields.push("Prazo");
    if (macroCompetencia !== currentData.macroCompetencia)
      changedFields.push("Macro Competência");

    if (changedFields.length === 0) {
      toast.error("Nenhum campo foi alterado");
      return;
    }

    setIsLoading(true);

    try {
      await createMutation.mutateAsync({
        actionId,
        fieldsToAdjust: changedFields.join(", "),
        justification: justificativa,
        proposedChanges: {
          titulo: titulo !== currentData.titulo ? titulo : undefined,
          descricao: descricao !== currentData.descricao ? descricao : undefined,
          prazo: prazo !== currentData.prazo ? prazo : undefined,
          macroCompetencia:
            macroCompetencia !== currentData.macroCompetencia
              ? macroCompetencia
              : undefined,
        },
      });

      setSuccess(true);
      toast.success("Solicitação de ajuste enviada com sucesso!");

      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setTitulo("");
        setDescricao("");
        setPrazo("");
        setMacroCompetencia("");
        setJustificativa("");
      }, 2000);
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      toast.error("Erro ao enviar solicitação de ajuste");
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
              {titulo !== currentData.titulo && (
                <p className="text-xs text-blue-600 mt-1">
                  ✓ Campo será alterado
                </p>
              )}
            </div>

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
              {descricao !== currentData.descricao && (
                <p className="text-xs text-blue-600 mt-1">
                  ✓ Campo será alterado
                </p>
              )}
            </div>

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
              {prazo !== currentData.prazo && (
                <p className="text-xs text-blue-600 mt-1">
                  ✓ Campo será alterado
                </p>
              )}
            </div>

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
              {macroCompetencia !== currentData.macroCompetencia && (
                <p className="text-xs text-blue-600 mt-1">
                  ✓ Campo será alterado
                </p>
              )}
            </div>

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
