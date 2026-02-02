import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Download, X } from "lucide-react";
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

// Interface para o novo formato de CSV
interface AcaoCSV {
  cpf: string;
  cicloNome: string;
  macroNome: string;
  microcompetencia: string;
  titulo: string;
  descricao: string;
  prazo: string;
}

interface ErroValidacao {
  linha: number;
  cpf: string;
  erro: string;
}

interface ResultadoImportacao {
  success: boolean;
  identificador: string;
  titulo: string;
  error?: string;
}

export function ImportarAcoes() {
  const [open, setOpen] = useState(false);
  const [acoes, setAcoes] = useState<AcaoCSV[]>([]);
  const [errosValidacao, setErrosValidacao] = useState<ErroValidacao[]>([]);
  const [resultados, setResultados] = useState<ResultadoImportacao[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const importarMutation = trpc.import.acoes.useMutation();

  // Função para parsear CSV com suporte a campos entre aspas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };

  const parseCSV = (text: string): AcaoCSV[] => {
    const linhas = text.split("\n").filter((l) => l.trim());
    const dados: AcaoCSV[] = [];
    const erros: ErroValidacao[] = [];

    // Pular header (linha 1)
    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i];
      const valores = parseCSVLine(linha);

      if (valores.length < 7) {
        erros.push({
          linha: i + 1,
          cpf: valores[0] || 'N/A',
          erro: `Linha incompleta - esperado 7 colunas (cpf, cicloNome, macroNome, microcompetencia, titulo, descricao, prazo), encontrado ${valores.length}`,
        });
        continue;
      }

      const [cpf, cicloNome, macroNome, microcompetencia, titulo, descricao, prazo] = valores;

      // Validar campos obrigatórios
      if (!cpf || !cpf.trim()) {
        erros.push({
          linha: i + 1,
          cpf: 'VAZIO',
          erro: "CPF é obrigatório",
        });
        continue;
      }

      if (!macroNome || !macroNome.trim()) {
        erros.push({
          linha: i + 1,
          cpf: cpf,
          erro: "Competência Macro é obrigatória",
        });
        continue;
      }

      if (!titulo || !titulo.trim()) {
        erros.push({
          linha: i + 1,
          cpf: cpf,
          erro: "Título da ação é obrigatório",
        });
        continue;
      }

      if (!prazo || !prazo.trim()) {
        erros.push({
          linha: i + 1,
          cpf: cpf,
          erro: "Prazo é obrigatório",
        });
        continue;
      }

      dados.push({
        cpf: cpf.trim(),
        cicloNome: cicloNome?.trim() || '',
        macroNome: macroNome.trim(),
        microcompetencia: microcompetencia?.trim() || '',
        titulo: titulo.trim(),
        descricao: descricao?.trim() || '',
        prazo: prazo.trim(),
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

      if (errosValidacao.length > 0) {
        setShowErrorDialog(true);
      }

      if (acoesParseadas.length > 0) {
        setAcoes(acoesParseadas);
        setShowPreview(true);
      }
    };
    reader.readAsText(file);
  };

  const handleImportar = async () => {
    if (acoes.length === 0) {
      toast.error("Carregue um arquivo CSV com dados válidos");
      return;
    }

    // Verificar se há erros de validação
    if (errosValidacao.length > 0) {
      toast.error("Corrija os erros de validação antes de importar");
      setShowErrorDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      const resultado = await importarMutation.mutateAsync({
        acoes: acoes.map(a => ({
          cpf: a.cpf,
          cicloNome: a.cicloNome,
          macroNome: a.macroNome,
          microcompetencia: a.microcompetencia,
          titulo: a.titulo,
          descricao: a.descricao,
          prazo: a.prazo,
        })),
      });

      setResultados(resultado.results || []);
      
      const sucessos = resultado.results?.filter((r: ResultadoImportacao) => r.success).length || 0;
      const falhas = resultado.results?.filter((r: ResultadoImportacao) => !r.success).length || 0;

      if (falhas > 0) {
        setShowResultDialog(true);
        toast.warning(`${sucessos} ação(ões) importada(s), ${falhas} com erro(s)`);
      } else {
        toast.success(`${sucessos} ação(ões) importada(s) com sucesso!`);
        setAcoes([]);
        setErrosValidacao([]);
        setShowPreview(false);
        setOpen(false);
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao importar ações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/templates/template_importacao_acoes.csv', '_blank');
  };

  const resetState = () => {
    setAcoes([]);
    setErrosValidacao([]);
    setResultados([]);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetState();
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar Ações
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar Ações em Lote</DialogTitle>
            <DialogDescription>
              Envie um arquivo CSV com as ações a serem importadas. Baixe o template para ver o formato correto.
            </DialogDescription>
          </DialogHeader>

          {!showPreview ? (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm font-medium mb-2">Selecione um arquivo CSV</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Formato: cpf, cicloNome, macroNome, microcompetencia, titulo, descricao, prazo
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Escolher Arquivo
                  </Button>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="ghost"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Baixar Template
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2 bg-muted/50 p-4 rounded-lg">
                <p className="font-medium text-sm">Campos do CSV:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>cpf</strong> - CPF do colaborador (com ou sem formatação)</li>
                  <li><strong>cicloNome</strong> - Nome do ciclo (ex: 2026/1)</li>
                  <li><strong>macroNome</strong> - Nome EXATO da competência macro cadastrada</li>
                  <li><strong>microcompetencia</strong> - Texto livre (opcional)</li>
                  <li><strong>titulo</strong> - Título da ação</li>
                  <li><strong>descricao</strong> - Descrição detalhada (O que fazer, Como fazer, Evidência)</li>
                  <li><strong>prazo</strong> - Data no formato DD/MM/YYYY</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Preview das Ações</h3>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {acoes.length} válidas
                  </Badge>
                  {errosValidacao.length > 0 && (
                    <Badge variant="destructive">
                      {errosValidacao.length} com erro
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-2">
                  {acoes.map((acao, idx) => (
                    <div key={idx} className="text-sm p-3 border rounded bg-muted/50">
                      <div className="flex justify-between items-start">
                        <p className="font-medium">{acao.titulo}</p>
                        <Badge variant="outline" className="text-xs">{acao.prazo}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        CPF: {acao.cpf} | Ciclo: {acao.cicloNome || 'Mais recente'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Macro: {acao.macroNome}
                      </p>
                      {acao.microcompetencia && (
                        <p className="text-xs text-muted-foreground">
                          Micro: {acao.microcompetencia}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {errosValidacao.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowErrorDialog(true)}
                  className="text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Ver {errosValidacao.length} erro(s)
                </Button>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetState}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleImportar}
                  disabled={isLoading || acoes.length === 0 || errosValidacao.length > 0}
                  className="gap-2"
                >
                  {isLoading ? "Importando..." : `Importar ${acoes.length} ação(ões)`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Erros de Validação */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erros na Validação do CSV
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errosValidacao.length} erro(s) encontrado(s). Corrija o arquivo antes de importar.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="h-80 border rounded-lg p-4">
            <div className="space-y-2">
              {errosValidacao.map((erro, idx) => (
                <div key={idx} className="text-sm p-3 border rounded bg-destructive/5 border-destructive/20">
                  <div className="flex justify-between">
                    <p className="font-medium text-destructive">Linha {erro.linha}</p>
                    <Badge variant="outline" className="text-xs">CPF: {erro.cpf}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{erro.erro}</p>
                </div>
              ))}
            </div>
          </ScrollArea>

          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Resultados da Importação */}
      <AlertDialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Resultado da Importação
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resultados.filter(r => r.success).length} sucesso(s), {resultados.filter(r => !r.success).length} erro(s)
            </AlertDialogDescription>
          </AlertDialogHeader>

          <ScrollArea className="h-80 border rounded-lg p-4">
            <div className="space-y-2">
              {resultados.map((resultado, idx) => (
                <div 
                  key={idx} 
                  className={`text-sm p-3 border rounded ${
                    resultado.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-destructive/5 border-destructive/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{resultado.titulo}</p>
                      <p className="text-xs text-muted-foreground">{resultado.identificador}</p>
                    </div>
                    {resultado.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  {resultado.error && (
                    <p className="text-xs text-destructive mt-1">{resultado.error}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <AlertDialogCancel onClick={() => {
            setShowResultDialog(false);
            resetState();
            setOpen(false);
          }}>
            Fechar
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
