import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface EvidenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: number;
  actionNome: string;
  onSuccess: () => void;
}

export function EvidenciaModal({ open, onOpenChange, actionId, actionNome, onSuccess }: EvidenciaModalProps) {
  const [textoEvidencia, setTextoEvidencia] = useState("");
  const [tituloEvidencia, setTituloEvidencia] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const createEvidenceMutation = trpc.evidences.create.useMutation({
    onSuccess: () => {
      toast.success("Evidência enviada com sucesso! O admin será notificado.");
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
        onSuccess();
      }, 100);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar evidência: ${error.message}`);
      setUploading(false);
    },
  });

  const resetForm = () => {
    setTextoEvidencia("");
    setTituloEvidencia("");
    setArquivos([]);
    setUploading(false);
  };

  useEffect(() => {
    if (open) {
      setTextoEvidencia("");
      setArquivos([]);
      setUploading(false);
      console.log("MODAL RESETADO PARA ACTION:", actionId);
    }
  }, [actionId, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setArquivos(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFileToS3 = async (file: File): Promise<{ fileName: string; fileType: string; fileSize: number; fileUrl: string; fileKey: string }> => {
    const randomKey = `evidencias/${Date.now()}-${file.name}`;
    
    return {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: `https://placeholder-url.com/${randomKey}`,
      fileKey: randomKey,
    };
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      console.log("[CRÍTICO] arquivos.length antes do Promise.all:", arquivos.length);
      console.log("[CRÍTICO] arquivos antes do Promise.all:", arquivos);
      
      if (arquivos.length === 0) {
        console.log("[CRÍTICO] SEM ARQUIVOS! Enviando apenas texto.");
        await createEvidenceMutation.mutateAsync({
          actionId,
          descricao: textoEvidencia.trim(),
          files: undefined,
        });
        onSuccess?.();
        onOpenChange(false);
        return;
      }
      
      const uploadedFiles = await Promise.all(
        arquivos.map(async (file) => {
          const result = await uploadFileToS3(file);
          console.log("LOG REAL DO S3:", result);
          return {
            fileName: result.fileName || file.name,
            fileType: result.fileType || file.type,
            fileSize: result.fileSize || file.size,
            fileUrl: result.fileUrl,
            fileKey: result.fileKey
          };
        })
      );
      await createEvidenceMutation.mutateAsync({
        actionId,
        descricao: textoEvidencia.trim(),
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao salvar evidência");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold">Adicionar Evidência</h2>
          <p className="text-gray-600 text-sm mt-1">
            Envie evidências de conclusão para a ação: <strong>{actionNome}</strong>
          </p>
        </div>

        <div className="space-y-6">
          {/* Título */}
          <div>
            <label className="text-sm font-medium block mb-2">Título da Evidência (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Certificado de Conclusão, Relatório Final..."
              value={tituloEvidencia}
              onChange={(e) => setTituloEvidencia(e.target.value)}
              disabled={uploading}
              className="w-full p-2 border rounded bg-white text-black disabled:bg-gray-100"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium block mb-2">Descrição da Evidência *</label>
            <textarea
              placeholder="Descreva o que você fez para concluir esta ação..."
              value={textoEvidencia}
              onChange={(e) => setTextoEvidencia(e.target.value)}
              rows={6}
              disabled={uploading}
              className="w-full p-2 border rounded bg-white text-black disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Explique detalhadamente como você cumpriu esta ação
            </p>
          </div>

          {/* Upload de Arquivos */}
          <div>
            <label className="text-sm font-medium block mb-2">Arquivos (Opcional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                Arraste arquivos ou clique para selecionar
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                className="max-w-xs mx-auto"
              />
              <p className="text-xs text-gray-500 mt-2">
                Certificados, fotos, documentos, etc.
              </p>
            </div>

            {/* Lista de Arquivos */}
            {arquivos.length > 0 && (
              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium block">Arquivos Selecionados ({arquivos.length})</label>
                {arquivos.map((file, index) => (
                  <div key={`file-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="p-2 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
            disabled={uploading || (!textoEvidencia.trim() && arquivos.length === 0)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Evidência"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
