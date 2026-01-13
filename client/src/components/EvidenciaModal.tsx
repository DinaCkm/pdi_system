import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
      resetForm();
      onOpenChange(false);
      onSuccess();
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
    // Simular upload para S3 (você pode implementar upload real aqui)
    // Por enquanto, vamos usar um placeholder
    const randomKey = `evidencias/${Date.now()}-${file.name}`;
    
    // TODO: Implementar upload real para S3
    // const formData = new FormData();
    // formData.append('file', file);
    // const response = await fetch('/api/upload', { method: 'POST', body: formData });
    // const data = await response.json();
    
    return {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: `https://placeholder-url.com/${randomKey}`,
      fileKey: randomKey,
    };
  };

  const handleSubmit = async () => {
    if (!textoEvidencia.trim() && arquivos.length === 0) {
      toast.error("Adicione pelo menos um texto ou arquivo como evidência");
      return;
    }

    setUploading(true);

    try {
      // Upload de arquivos
      const uploadedFiles = [];
      for (const file of arquivos) {
        const uploaded = await uploadFileToS3(file);
        uploadedFiles.push(uploaded);
      }

      // Criar evidência
      await createEvidenceMutation.mutateAsync({
        actionId,
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        texts: textoEvidencia.trim() ? [{
          titulo: tituloEvidencia.trim() || undefined,
          texto: textoEvidencia.trim(),
        }] : undefined,
      });
    } catch (error) {
      console.error("Erro ao enviar evidência:", error);
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Evidência</DialogTitle>
          <DialogDescription>
            Envie evidências de conclusão para a ação: <strong>{actionNome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Texto Descritivo */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Evidência (Opcional)</Label>
            <Input
              id="titulo"
              placeholder="Ex: Certificado de Conclusão, Relatório Final..."
              value={tituloEvidencia}
              onChange={(e) => setTituloEvidencia(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="texto">Descrição da Evidência *</Label>
            <Textarea
              id="texto"
              placeholder="Descreva o que você fez para concluir esta ação..."
              value={textoEvidencia}
              onChange={(e) => setTextoEvidencia(e.target.value)}
              rows={6}
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
              Explique detalhadamente como você cumpriu esta ação
            </p>
          </div>

          {/* Upload de Arquivos */}
          <div className="space-y-2">
            <Label>Arquivos (Opcional)</Label>
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste arquivos ou clique para selecionar
              </p>
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={uploading}
                className="max-w-xs mx-auto"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Certificados, fotos, documentos, etc.
              </p>
            </div>

            {/* Lista de Arquivos */}
            {arquivos.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Arquivos Selecionados ({arquivos.length})</Label>
                {arquivos.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || (!textoEvidencia.trim() && arquivos.length === 0)}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Evidência"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
