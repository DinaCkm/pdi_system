import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle, Copy, AlertTriangle, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface EvidenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: number;
  actionNome: string;
  macrocompetencia?: string;
  descricao?: string;
  prazo?: string | Date | null;
  onSuccess: () => void;
}

export function EvidenciaModal({ open, onOpenChange, actionId, actionNome, macrocompetencia, descricao, prazo, onSuccess }: EvidenciaModalProps) {
  const [textoEvidencia, setTextoEvidencia] = useState("");
  const [uploading, setUploading] = useState(false);
  const [registrada, setRegistrada] = useState(false);
  const [evidenceId, setEvidenceId] = useState<number | null>(null);
  const { user } = useAuth();

  const createEvidenceMutation = trpc.evidences.create.useMutation({
    onSuccess: (result) => {
      // ✅ SUCESSO: Card criado no Admin
      console.log('[EvidenciaModal] Evidência criada com sucesso:', result);
      setEvidenceId(result.id);
      setRegistrada(true);
      
      // Toast de sucesso
      toast.success("✅ Evidência registrada no sistema!", {
        duration: 3000,
        style: {
          background: "#10b981",
          color: "#ffffff",
          border: "2px solid #059669",
          fontSize: "14px",
          fontWeight: "bold",
        },
      });
    },
    onError: (error) => {
      // ❌ ERRO: Mostrar mensagem de erro
      console.error('[EvidenciaModal] Erro ao registrar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao registrar: ${errorMessage}`, {
        duration: 5000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          border: "2px solid #dc2626",
          fontSize: "14px",
          fontWeight: "bold",
        },
      });
      setUploading(false);
    },
  });

  const resetForm = () => {
    setTextoEvidencia("");
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
      // 🛑 MATA O UNDEFINED - Envia APENAS files: [] (array vazio obrigatório)
      console.log('[EvidenciaModal] Enviando evidência com files: []');
      await createEvidenceMutation.mutateAsync({
        actionId,
        descricao: textoEvidencia.trim(),
        files: [], // 🛑 Array vazio obrigatório - sem undefined
      });
    } catch (error) {
      console.error('[EvidenciaModal] Erro ao registrar:', error);
      setUploading(false);
    }
  };

  const handleCopyField = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success(`${fieldName} copiado!`, {
          duration: 2000,
          style: {
            background: "#3b82f6",
            color: "#ffffff",
          },
        });
      })
      .catch(() => {
        toast.error("Erro ao copiar");
      });
  };

  const handleOpenEmail = () => {
    if (!evidenceId) return;

    try {
      const evidenceIdFormatted = `EV-${String(evidenceId).padStart(6, '0')}`;
      const adminEmail = "relacionamento@ckmtalents.net";
      const assunto = encodeURIComponent(`[${evidenceIdFormatted}] ${actionNome} - ${user?.name || 'Colaborador'}`);
      const corpo = encodeURIComponent(
        `ID: ${evidenceIdFormatted}\n\nCompetência: ${macrocompetencia || 'N/A'}\n\nDescrição: ${descricao || 'N/A'}\n\nData de Conclusão: ${prazo ? new Date(prazo).toLocaleDateString('pt-BR') : 'N/A'}\n\nSeguem anexas as evidências.`
      );
      const mailtoLink = `mailto:${adminEmail}?subject=${assunto}&body=${corpo}`;
      
      console.log('[EvidenciaModal] Abrindo e-mail...');
      console.log('[EvidenciaModal] Link mailto:', mailtoLink);
      
      window.location.href = mailtoLink;
    } catch (error) {
      console.error('[EvidenciaModal] Erro ao abrir e-mail:', error);
      toast.error("Erro ao abrir e-mail");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <h2 className="text-xl font-bold text-blue-900">Enviar Evidência por Email</h2>
          <p className="text-sm text-blue-700 mt-1">Ação: <strong>{actionNome}</strong></p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!registrada ? (
            <>
              {/* Instruções iniciais */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">Como funciona:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Descreva sua evidência abaixo</li>
                  <li>Clique em "Registrar Evidência"</li>
                  <li>Um alerta verde confirmará o sucesso</li>
                  <li>Clique no botão para abrir seu cliente de email</li>
                  <li>Anexe seus comprovantes e envie</li>
                </ol>
              </div>

              {/* Campo de descrição */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descrição da Evidência *
                </label>
                <textarea
                  value={textoEvidencia}
                  onChange={(e) => setTextoEvidencia(e.target.value)}
                  placeholder="Descreva detalhadamente como você cumpriu esta ação..."
                  className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Seja específico e detalhado. O administrador usará esta descrição para avaliar sua evidência.
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar Evidência"
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Sucesso - Novo fluxo com texto honesto */}
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-2">✅ Evidência Registrada!</h3>
                    <p className="text-sm text-green-800 mb-3">
                      ID: <strong>{`EV-${String(evidenceId).padStart(6, '0')}`}</strong>
                    </p>
                    <p className="text-sm text-green-800">
                      Seu ID foi salvo no sistema. Agora clique no botão abaixo para enviar o e-mail.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botão de envio de email */}
              <button
                onClick={handleOpenEmail}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Mail className="w-5 h-5" />
                CLIQUE AQUI PARA ABRIR O SEU GMAIL/OUTLOOK
                <ExternalLink className="w-4 h-4" />
              </button>

              {/* Texto honesto e funcional */}
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-2">Atenção: a sua evidência será enviada por e-mail.</p>
                    <p className="mb-2">
                      Clique em enviar e-mail e anexe o documento de comprovação. Caso o e-mail não abra, copie os dados e envie o e-mail diretamente do seu provedor de e-mail, mas em hipótese alguma deixe de colar o assunto e todos os demais campos para que possamos localizar sua evidência.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dados para cópia manual (Plano B) */}
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">Se o e-mail não abrir, copie os dados abaixo:</h3>
                
                {/* Para */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Enviar para:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value="relacionamento@ckmtalents.net"
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                    />
                    <button
                      onClick={() => handleCopyField("relacionamento@ckmtalents.net", "Email")}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1"
                      title="Copiar email"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Assunto */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Assunto:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`[EV-${String(evidenceId).padStart(6, '0')}] ${actionNome} - ${user?.name || 'Colaborador'}`}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                    />
                    <button
                      onClick={() => handleCopyField(`[EV-${String(evidenceId).padStart(6, '0')}] ${actionNome} - ${user?.name || 'Colaborador'}`, "Assunto")}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1"
                      title="Copiar assunto"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Corpo */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Corpo do e-mail:</label>
                  <div className="flex gap-2">
                    <textarea
                      value={`ID: EV-${String(evidenceId).padStart(6, '0')}\n\nCompetência: ${macrocompetencia || 'N/A'}\n\nDescrição: ${descricao || 'N/A'}\n\nData de Conclusão: ${prazo ? new Date(prazo).toLocaleDateString('pt-BR') : 'N/A'}\n\nSeguem anexas as evidências.`}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm h-24 resize-none"
                    />
                    <button
                      onClick={() => handleCopyField(`ID: EV-${String(evidenceId).padStart(6, '0')}\n\nCompetência: ${macrocompetencia || 'N/A'}\n\nDescrição: ${descricao || 'N/A'}\n\nData de Conclusão: ${prazo ? new Date(prazo).toLocaleDateString('pt-BR') : 'N/A'}\n\nSeguem anexas as evidências.`, "Corpo")}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1 h-fit"
                      title="Copiar corpo"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Próximos passos */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="font-semibold text-blue-900 mb-2">Próximos passos:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Clique no botão verde acima para abrir seu email</li>
                  <li>Se não abrir, copie os dados acima manualmente</li>
                  <li>Anexe seus comprovantes</li>
                  <li>Envie para o administrador</li>
                </ol>
              </div>

              {/* Botão de fechamento */}
              <button
                onClick={() => onOpenChange(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
