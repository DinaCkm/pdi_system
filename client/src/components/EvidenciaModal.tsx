import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";

interface EvidenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: number;
  actionNome: string;
  onSuccess: () => void;
}

export function EvidenciaModal({ open, onOpenChange, actionId, actionNome, onSuccess }: EvidenciaModalProps) {
  const [textoEvidencia, setTextoEvidencia] = useState("");
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const createEvidenceMutation = trpc.evidences.create.useMutation({
    onSuccess: (result) => {
      // Após salvar no banco, abre o email com máscara pré-preenchida
      const evidenceIdFormatted = `EV-${String(result.evidenceId).padStart(6, '0')}`;
      const adminEmail = "relacionamento@ckmtalents.net";
      const assunto = encodeURIComponent(`[${evidenceIdFormatted}] ${actionNome} - ${user?.name || 'Colaborador'}`);
      const corpo = encodeURIComponent(
        `ID: ${evidenceIdFormatted}\nCOLABORADOR: ${user?.name || 'Colaborador'}\nAÇÃO: ${actionNome}\n\n[ANEXE SEUS ARQUIVOS ABAIXO]`
      );
      
      window.location.href = `mailto:${adminEmail}?subject=${assunto}&body=${corpo}`;
      
      toast.success("Evidência registrada! Seu cliente de email será aberto com a máscara pré-preenchida.");
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
        onSuccess();
      }, 100);
    },
    onError: (error) => {
      toast.error(`Erro ao registrar evidência: ${error.message}`);
      setUploading(false);
    },
  });

  const resetForm = () => {
    setTextoEvidencia("");
    setUploading(false);
  };

  useEffect(() => {
    if (open) {
      setTextoEvidencia("");
      setUploading(false);
    }
  }, [actionId, open]);

  const handleSubmit = async () => {
    if (!textoEvidencia.trim()) {
      toast.error("Por favor, descreva a evidência antes de enviar");
      return;
    }

    setUploading(true);
    try {
      // Envia apenas a descrição, sem arquivos (fluxo manual por email)
      await createEvidenceMutation.mutateAsync({
        actionId,
        descricao: textoEvidencia.trim(),
        files: [],
      });
    } catch (error) {
      console.error(error);
      toast.error("Falha ao registrar evidência");
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold">Enviar Evidência por Email</h2>
          <p className="text-gray-600 text-sm mt-1">
            Ação: <strong>{actionNome}</strong>
          </p>
        </div>

        <div className="space-y-6">
          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Como funciona:</p>
                <ol className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-decimal">
                  <li>Descreva sua evidência abaixo</li>
                  <li>Clique em "Abrir Email"</li>
                  <li>Seu cliente de email abrirá com a máscara pré-preenchida</li>
                  <li>Anexe seus comprovantes e envie</li>
                  <li>O administrador analisará e aprovará</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium block mb-2">Descrição da Evidência *</label>
            <textarea
              placeholder="Descreva detalhadamente como você cumpriu esta ação..."
              value={textoEvidencia}
              onChange={(e) => setTextoEvidencia(e.target.value)}
              rows={6}
              disabled={uploading}
              className="w-full p-2 border rounded bg-white text-black disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Seja específico e detalhado. O administrador usará esta descrição para avaliar sua evidência.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !textoEvidencia.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Abrir Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
