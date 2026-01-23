// FORCE REBUILD: 2026-01-23T02:05:00Z
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle, Copy, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

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
  const [registrada, setRegistrada] = useState(false);
  const [evidenceId, setEvidenceId] = useState<number | null>(null);
  const { user } = useAuth();

  const createEvidenceMutation = trpc.evidences.create.useMutation({
    onSuccess: (result) => {
      // Após salvar no banco, mostra botão para abrir email
      setRegistrada(true);
      setEvidenceId(result.evidenceId);
      setUploading(false);
      toast.success("Evidência registrada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao registrar evidência: ${error.message}`);
      setUploading(false);
    },
  });

  const resetForm = () => {
    setTextoEvidencia("");
    setUploading(false);
    setRegistrada(false);
    setEvidenceId(null);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [actionId, open]);

  const handleSubmit = async () => {
    if (!textoEvidencia.trim()) {
      toast.error("Por favor, descreva a evidência antes de enviar");
      return;
    }

    setUploading(true);
    try {
      // Envia apenas a descrição, com array vazio para evitar erro Zod
      await createEvidenceMutation.mutateAsync({
        actionId,
        descricao: textoEvidencia.trim(),
        files: [], // Array vazio obrigatório
      });
    } catch (error) {
      console.error(error);
      toast.error("Falha ao registrar evidência");
      setUploading(false);
    }
  };

  const handleOpenEmail = () => {
    if (!evidenceId) return;

    const evidenceIdFormatted = `EV-${String(evidenceId).padStart(6, '0')}`;
    const adminEmail = "relacionamento@ckmtalents.net";
    const assunto = encodeURIComponent(`[${evidenceIdFormatted}] ${actionNome} - ${user?.name || 'Colaborador'}`);
    const corpo = encodeURIComponent(
      `ID: ${evidenceIdFormatted}\nCOLABORADOR: ${user?.name || 'Colaborador'}\nAÇÃO: ${actionNome}\n\n[ANEXE SEUS ARQUIVOS ABAIXO]`
    );
    
    window.location.href = `mailto:${adminEmail}?subject=${assunto}&body=${corpo}`;
    
    setTimeout(() => {
      onOpenChange(false);
      resetForm();
      onSuccess();
    }, 500);
  };

  const handleCopySubject = () => {
    if (!evidenceId) return;
    const evidenceIdFormatted = `EV-${String(evidenceId).padStart(6, '0')}`;
    const subject = `[${evidenceIdFormatted}] ${actionNome} - ${user?.name || 'Colaborador'}`;
    navigator.clipboard.writeText(subject);
    toast.success("Assunto copiado para a área de transferência!");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold">Enviar Evidência por Email</h2>
          <p className="text-gray-600 text-sm mt-1">
            Ação: <strong>{actionNome}</strong>
          </p>
        </div>

        {!registrada ? (
          <div className="space-y-6">
            {/* Instruções */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2">
                <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Como funciona:</p>
                  <ol className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-decimal">
                    <li>Descreva sua evidência abaixo</li>
                    <li>Clique em "Registrar Evidência"</li>
                    <li>Clique no botão para abrir seu cliente de email</li>
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
        ) : (
          <div className="space-y-6">
            {/* Sucesso */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-green-900 mb-2">Evidência Registrada!</h3>
              <p className="text-sm text-green-800 mb-4">
                ID: <strong>EV-{String(evidenceId).padStart(6, '0')}</strong>
              </p>
              <p className="text-sm text-green-700">
                Agora clique no botão abaixo para abrir seu cliente de email com a máscara pré-preenchida.
              </p>
            </div>

            {/* Botão Principal - Automático */}
            <div className="flex justify-center">
              <button
                onClick={handleOpenEmail}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-3 font-bold text-lg shadow-lg"
              >
                <Mail className="h-6 w-6" />
                CLIQUE AQUI PARA ABRIR SEU E-MAIL
              </button>
            </div>

            {/* Plano B - Manual */}
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-5">
              <div className="flex gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-yellow-900 mb-3">
                    ⚠️ ATENÇÃO: Se o seu computador por segurança não abrir o e-mail automaticamente, siga os passos abaixo:
                  </p>
                  
                  <div className="space-y-3 text-sm text-yellow-800">
                    <div>
                      <p className="font-medium">Passo 1: Abra o seu e-mail corporativo manualmente</p>
                      <p className="text-xs text-yellow-700 ml-4">(Outlook, Gmail ou outro provedor)</p>
                    </div>
                    
                    <div>
                      <p className="font-medium">Passo 2: Envie para:</p>
                      <p className="text-xs text-yellow-700 ml-4 font-mono bg-yellow-100 p-2 rounded">
                        relacionamento@ckmtalents.net
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-medium mb-2">Passo 3: Copie e cole o Assunto abaixo:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`[EV-${String(evidenceId).padStart(6, '0')}] ${actionNome} - ${user?.name || 'Colaborador'}`}
                          className="text-xs bg-yellow-100 p-2 rounded flex-1 font-mono border border-yellow-300"
                        />
                        <button
                          onClick={handleCopySubject}
                          className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-1"
                          title="Copiar assunto"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
          {!registrada && (
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
                  Registrar Evidência
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
