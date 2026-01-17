import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AcaoCSV {
  pdiId: number;
  blocoId: number;
  macroId: number;
  microId: number;
  nome: string;
  descricao: string;
  prazo: string;
}

interface ErroValidacao {
  linha: number;
  erro: string;
}

export function ImportarAcoes() {
  const [open, setOpen] = useState(false);
  const [acoes, setAcoes] = useState<AcaoCSV[]>([]);
  const [errosValidacao, setErrosValidacao] = useState<ErroValidacao[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importarMutation = trpc.actions.importarEmLote.useMutation();

  const parseCSV = (text: string): AcaoCSV[] => {
    const linhas = text.split("\n").filter((l) => l.trim());
    const dados: AcaoCSV[] = [];
    const erros: ErroValidacao[] = [];

    // Pular header (linha 1)
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i];
      const valores = linha.split(",").map((v) => v.trim());

      if (valores.length < 7) {
        erros.push({
          linha: i + 1,
          erro: "Linha incompleta - esperado 7 colunas",
        });
        continue;
      }

      const [pdiIdStr, blocoIdStr, macroIdStr, microIdStr, nome, descricao, prazo] = valores;

      // Validar campos obrigatórios
      if (!pdiIdStr || !blocoIdStr || !macroIdStr || !microIdStr || !nome || !descricao || !prazo) {
        erros.push({
          linha: i + 1,
          erro: "Campos obrigatórios vazios",
        });
        continue;
      }

      // Converter para números
      const pdiId = parseInt(pdiIdStr);
      const blocoId = parseInt(blocoIdStr);
      const macroId = parseInt(macroIdStr);
      const microId = parseInt(microIdStr);

      if (isNaN(pdiId) || isNaN(blocoId) || isNaN(macroId) || isNaN(microId)) {
        erros.push({
          linha: i + 1,
          erro: "IDs devem ser números válidos",
        });
        continue;
      }

      dados.push({
        pdiId,
        blocoId,
        macroId,
        microId,
        nome,
        descricao,
        prazo,
      });
    }

    setErrosValidacao(erros);
    return dados;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar extensão
    if (!file.name.endsWith(".csv")) {
      toast.error("Por favor, envie um arquivo CSV");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const acoesParseadas = parseCSV(text);

      if (acoesParseadas.length === 0 && errosValidacao.length > 0) {
        setShowErrorDialog(true);
        return;
      }

      setAcoes(acoesParseadas);
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

  const handleImportar = async () => {
    if (acoes.length === 0) {
      toast.error("Carregue um arquivo CSV com dados válidos");
      return;
    }

    setIsLoading(true);
    try {
      const resultado = await importarMutation.mutateAsync({
        acoes,
      });

      if (resultado.sucesso) {
        toast.success(`${resultado.acoesImportadas} ação(ões) importada(s) com sucesso`);
        setAcoes([]);
        setErrosValidacao([]);
        setShowPreview(false);
        setOpen(false);
      } else if (resultado.temErros) {
        setErrosValidacao(resultado.erros);
        setShowErrorDialog(true);
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao importar ações");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar Ações
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Ações em Lote</DialogTitle>
            <DialogDescription>
              Envie um arquivo CSV com as ações a serem importadas
            </DialogDescription>
          </DialogHeader>

          {!showPreview ? (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm font-medium mb-2">Selecione um arquivo CSV</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Formato esperado: pdiId, blocoId, macroId, microId, nome, descricao, prazo
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Escolher Arquivo
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Exemplo de formato CSV:</p>
                <code className="block bg-muted p-2 rounded">
                  pdiId,blocoId,macroId,microId,nome,descricao,prazo
                </code>
                <code className="block bg-muted p-2 rounded">
                  1,1,1,1,Ação 1,Descrição da ação,2024-03-31
                </code>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Preview das Ações</h3>
                <Badge variant="outline">{acoes.length} ações</Badge>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-2">
                  {acoes.map((acao, idx) => (
                    <div key={idx} className="text-sm p-2 border rounded bg-muted/50">
                      <p className="font-medium">{acao.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        PDI: {acao.pdiId} | Bloco: {acao.blocoId} | Macro: {acao.macroId} | Micro:{" "}
                        {acao.microId}
                      </p>
                      <p className="text-xs text-muted-foreground">Prazo: {acao.prazo}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPreview(false);
                    setAcoes([]);
                    setErrosValidacao([]);
                  }}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleImportar}
                  disabled={isLoading || acoes.length === 0}
                  className="gap-2"
                >
                  {isLoading ? "Importando..." : "Importar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Erros */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              ⚠️ ERROS NA VALIDAÇÃO
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errosValidacao.length} erro(s) encontrado(s) no arquivo
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="h-80 border rounded-lg p-4">
            <div className="space-y-2">
              {errosValidacao.map((erro, idx) => (
                <div key={idx} className="text-sm p-3 border rounded bg-destructive/5">
                  <p className="font-medium text-destructive">Linha {erro.linha}</p>
                  <p className="text-xs text-muted-foreground">{erro.erro}</p>
                </div>
              ))}
            </div>
          </ScrollArea>

          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
