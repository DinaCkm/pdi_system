import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface SolicitarAjusteModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionId: number;
  actionTitle: string;
  onSuccess?: () => void;
}

export function SolicitarAjusteModal({
  isOpen,
  onClose,
  actionId,
  actionTitle,
  onSuccess,
}: SolicitarAjusteModalProps) {
  // Obter tipo de solicitante do contexto (padrão: colaborador)
  const [justificativa, setJustificativa] = useState("");
  const [camposAjustar, setCamposAjustar] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.adjustmentRequests.create.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setJustificativa("");
      setCamposAjustar("");
      setTimeout(() => {
        onClose();
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || "Erro ao criar solicitação");
    },
  });

  const handleSubmit = async () => {
    if (!justificativa.trim() || !camposAjustar.trim()) {
      setError("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createMutation.mutateAsync({
        actionId,
        justificativa,
        camposAjustar,
        tipoSolicitante: "colaborador", // Padrão: colaborador
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setJustificativa("");
      setCamposAjustar("");
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Alteração</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-lg font-semibold text-green-700">
              Solicitação enviada com sucesso!
            </p>
            <p className="text-sm text-gray-600">
              O administrador analisará sua solicitação em breve.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Ação: <span className="font-semibold">{actionTitle}</span>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Campos a Ajustar *
              </label>
              <Input
                placeholder="Ex: Prazo, Descrição, Título..."
                value={camposAjustar}
                onChange={(e) => setCamposAjustar(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Indique quais campos você gostaria de alterar
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Justificativa *
              </label>
              <Textarea
                placeholder="Explique por que você precisa fazer essa alteração..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                disabled={isSubmitting}
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 10 caracteres
              </p>
            </div>

            {error && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <strong>Nota:</strong> Sua solicitação será analisada pelo administrador. Você receberá uma notificação quando ela for avaliada.
              </p>
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !justificativa.trim() || !camposAjustar.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
