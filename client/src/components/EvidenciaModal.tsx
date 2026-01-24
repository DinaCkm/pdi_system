// FORCE REBUILD: 2026-01-23T02:30:00Z - 3 TRAVAS DE SEGURANÇA
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
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const { user } = useAuth();
  
  // 🔍 DEBUG: Verificar se os dados estão sendo recebidos
  useEffect(() => {
    console.log('[EvidenciaModal] Props recebidas:', {
      actionId,
      actionNome,
      macrocompetencia,
      descricao,
      prazo,
    });
  }, [actionId, actionNome, macrocompetencia, descricao, prazo]);

  const createEvidenceMutation = trpc.evidences.create.useMutation({
    onSuccess: (result) => {
      // ✅ TRAVA 1: ALERTA VERDE DE SUCESSO
      toast.success("✅ SUCESSO: Registro salvo! Agora clique no botão abaixo para enviar o e-mail.", {
        duration: 5000,
        style: {
          background: "#10b981",
          color: "#ffffff",
          border: "2px solid #059669",
          fontSize: "14px",
          fontWeight: "bold",
        },
      });

      setRegistrada(true);
      setEvidenceId(result.evidenceId);
      setUploading(false);
    },
    onError: (error) => {
      // ✅ TRAVA 1: ALERTA VERMELHO DE ERRO
      toast.error("❌ ERRO: O sistema não conseguiu registrar sua intenção. Tente novamente.", {
        duration: 5000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          border: "2px solid #dc2626",
          fontSize: "14px",
          fontWeight: "bold",
        },
      });

      console.error("[EvidenciaModal] Erro ao registrar evidência:", error);
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
      // 🛑 MATA O UNDEFINED - Envia APENAS files: [] (array vazio obrigatório)
      console.log('[EvidenciaModal] Enviando evidência com files: []');
      await createEvidenceMutation.mutateAsync({
        actionId,
        descricao: textoEvidencia.trim(),
        files: [], // 🛑 Array vazio obrigatório - sem undefined
      });
    } catch (error) {
      console.error('[EvidenciaModal] Erro ao registrar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      // 📢 FEEDBACK VISUAL - Alerta vermelho de erro
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
    }
  };

  const handleCopyField = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${fieldName} copiado!`);
  };

  const handleOpenEmail = () => {
    if (!evidenceId) {
      toast.error("Erro: ID da evidência não encontrado.");
      return;
    }
    
    try {
      const evidenceIdFormatted = `EV-${String(evidenceId).padStart(6, '0')}`;
      const adminEmail = "relacionamento@ckmtalents.net";
      const assunto = encodeURIComponent(`[${evidenceIdFormatted}] ${actionNome} - ${user?.name || 'Colaborador'}`);
      const dataFormatada = prazo 
        ? new Date(prazo).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' })
        : new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      
      const corpo = encodeURIComponent(
        `ID: ${evidenceIdFormatted}\n\nCompetência: ${macrocompetencia || 'N/A'}\n\nDescrição: ${descricao || 'N/A'}\n\nData de Conclusão: ${dataFormatada}\n\nSeguem anexas as evidências.`
      );
      const mailtoLink = `mailto:${adminEmail}?subject=${assunto}&body=${corpo}`;
      
      // 💻 LOG NO CONSOLE
      console.log('[EvidenciaModal] Iniciando tentativa de mailto...');
      console.log('[EvidenciaModal] Link mailto:', mailtoLink);
      
      // 📢 FEEDBACK VISUAL - Alerta de sucesso
      toast.success(`✅ Registro ${evidenceIdFormatted} salvo! Abrindo e-mail...`, {
        duration: 3000,
        style: {
          background: "#10b981",
          color: "#ffffff",
          border: "2px solid #059669",
          fontSize: "14px",
          fontWeight: "bold",
        },
      });
      
      // Abre o email
      window.location.href = mailtoLink;
    } catch (error) {
      // 📢 FEEDBACK VISUAL - Alerta de erro
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[EvidenciaModal] Erro ao abrir email:', error);
      toast.error(`Erro ao abrir e-mail: ${errorMessage}`, {
        duration: 5000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          border: "2px solid #dc2626",
          fontSize: "14px",
          fontWeight: "bold",
        },
      });
    }
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
                    <li>Um alerta verde confirmará o sucesso</li>
                    <li>Clique no botão para abrir seu cliente de email</li>
                    <li>Anexe seus comprovantes e envie</li>
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
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center shadow-md">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-green-900 mb-3">✅ Evidência Registrada!</h3>
              <p className="text-sm text-green-800 mb-4">
                ID: <strong className="text-2xl font-bold text-green-700">EV-{String(evidenceId).padStart(6, '0')}</strong>
              </p>
              <p className="text-sm text-green-800 font-medium leading-relaxed">
                Seu ID foi salvo no sistema. Agora clique no botão abaixo para enviar o e-mail, se não funcionar envie o email manual com os dados abaixo e não esqueça o anexo.
              </p>
            </div>

            {/* ✅ TRAVA 2: BOTÃO FÍSICO GRANDE E DESTACADO */}
            <div className="flex justify-center">
              <button
                onClick={handleOpenEmail}
                className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-3 font-bold text-lg shadow-lg border-2 border-green-700 transition-all hover:scale-105 cursor-pointer"
              >
                <Mail className="h-6 w-6" />
                CLIQUE AQUI PARA ABRIR O SEU GMAIL/OUTLOOK
                <ExternalLink className="h-5 w-5" />
              </button>
            </div>

            {/* Dados para Cópia Manual */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
              <p className="text-sm font-medium text-gray-900">Se o e-mail não abrir, copie os dados abaixo:</p>

              {/* Enviar Para */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Enviar para:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value="relacionamento@ckmtalents.net"
                    className="text-sm bg-white p-2 rounded flex-1 border border-gray-300 font-mono"
                  />
                  <button
                    onClick={() => handleCopyField("relacionamento@ckmtalents.net", "Email")}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                    title="Copiar email"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Assunto */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Assunto:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`[EV-${String(evidenceId).padStart(6, '0')}] ${actionNome} - ${user?.name || 'Colaborador'}`}
                    className="text-sm bg-white p-2 rounded flex-1 border border-gray-300 font-mono"
                  />
                  <button
                    onClick={() => handleCopyField(`[EV-${String(evidenceId).padStart(6, '0')}] ${actionNome} - ${user?.name || 'Colaborador'}`, "Assunto")}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                    title="Copiar assunto"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Corpo */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Corpo do email:</label>
                <div className="flex gap-2">
                  <textarea
                    readOnly
                    value={`ID: EV-${String(evidenceId).padStart(6, '0')}. Seguem anexas as evidências.`}
                    rows={2}
                    className="text-sm bg-white p-2 rounded flex-1 border border-gray-300 font-mono resize-none"
                  />
                  <button
                    onClick={() => handleCopyField(`ID: EV-${String(evidenceId).padStart(6, '0')}. Seguem anexas as evidências.`, "Corpo")}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 self-start"
                    title="Copiar corpo"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Termo de Ciência */}
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <p className="text-sm text-orange-900 italic font-medium leading-relaxed">
                ⚠️ O EMPREGADO ESTÁ CIENTE QUE A CONFIRMAÇÃO DO ENVIO DESTA EVIDÊNCIA SÓ SERÁ REGISTRADO QUANDO O EMAIL FOR ENVIADO CONFORME INSTRUÇÕES ACIMA.
              </p>
            </div>

            {/* Instruções Finais */}
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-2">Próximos passos:</p>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Clique no botão verde acima para abrir seu email</li>
                    <li>Se não abrir, copie os dados acima manualmente</li>
                    <li>Anexe seus comprovantes</li>
                    <li>Envie para o administrador</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={() => {
              if (registrada) {
                setShowConfirmationPopup(true);
              } else {
                resetForm();
                onOpenChange(false);
              }
            }}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Fechar
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

        {/* Popup de Confirmacao ao Fechar */}
        {showConfirmationPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmacao Importante</h3>
                <p className="text-sm text-gray-700 italic font-medium leading-relaxed mb-6">
                  O EMPREGADO ESTA CIENTE QUE A CONFIRMACAO DO ENVIO DESTA EVIDENCIA SO SERA REGISTRADO QUANDO O EMAIL FOR ENVIADO CONFORME INSTRUCOES ACIMA.
                </p>
                <button
                  onClick={() => {
                    setShowConfirmationPopup(false);
                    resetForm();
                    onOpenChange(false);
                  }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
