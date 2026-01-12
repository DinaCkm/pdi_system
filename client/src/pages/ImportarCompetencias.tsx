import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ParsedCompetencia {
  modulo: string;
  macro: string;
  micro: string;
}

export default function ImportarCompetencias() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCompetencia[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const importMutation = trpc.competencias.importBulk.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      setImportResult(null);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Pular cabeçalho
        const dataLines = lines.slice(1);
        
        const parsed: ParsedCompetencia[] = dataLines.map(line => {
          const [modulo, macro, micro] = line.split(',').map(s => s.trim());
          return { modulo, macro, micro };
        }).filter(item => item.modulo && item.macro && item.micro);
        
        setParsedData(parsed);
        toast.success(`${parsed.length} competências encontradas no arquivo`);
      } catch (error) {
        toast.error("Erro ao processar arquivo CSV");
        console.error(error);
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }

    try {
      const result = await importMutation.mutateAsync({
        competencias: parsedData
      });
      
      setImportResult(result);
      toast.success(`Importação concluída com sucesso!`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar competências");
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Importar Competências em Massa</CardTitle>
          <CardDescription>
            Faça upload de um arquivo CSV com as competências no formato: Módulo, Macrocompetência, Microcompetência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload de Arquivo */}
          <div className="space-y-3">
            <label className="block">
              <div className="flex items-center justify-center w-full h-32 px-4 transition bg-background border-2 border-dashed rounded-lg appearance-none cursor-pointer hover:border-primary focus:outline-none">
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">
                    {file ? file.name : "Clique para selecionar arquivo CSV"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Formato: CSV com colunas Módulo, Macrocompetência, Microcompetência
                  </span>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </label>
          </div>

          {/* Preview dos Dados */}
          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Processando arquivo...</span>
            </div>
          )}

          {parsedData.length > 0 && !importResult && (
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>{parsedData.length} competências</strong> prontas para importação.
                  <br />
                  <span className="text-sm text-muted-foreground">
                    O sistema criará automaticamente os Blocos, Macros e Micros na hierarquia correta.
                    Itens duplicados serão ignorados.
                  </span>
                </AlertDescription>
              </Alert>

              {/* Amostra dos Dados */}
              <div className="border rounded-lg p-4 bg-muted/30 max-h-60 overflow-y-auto">
                <p className="text-sm font-medium mb-3">Preview (primeiras 10 linhas):</p>
                <div className="space-y-2 text-sm">
                  {parsedData.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="flex gap-2 text-xs">
                      <span className="text-muted-foreground w-8">{idx + 1}.</span>
                      <span className="font-medium text-blue-600">{item.modulo}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium text-purple-600">{item.macro}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium text-orange-600">{item.micro}</span>
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <p className="text-xs text-muted-foreground pt-2">
                      ... e mais {parsedData.length - 10} competências
                    </p>
                  )}
                </div>
              </div>

              {/* Botão de Importar */}
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:opacity-90"
                size="lg"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Importar {parsedData.length} Competências
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Resultado da Importação */}
          {importResult && (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription>
                  <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    ✅ Importação concluída com sucesso!
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-green-700 dark:text-green-300 font-medium">Criados:</p>
                      <p className="text-green-900 dark:text-green-100">
                        {importResult.created.blocos} Blocos<br />
                        {importResult.created.macros} Macros<br />
                        {importResult.created.micros} Micros
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700 dark:text-green-300 font-medium">Ignorados (já existiam):</p>
                      <p className="text-green-900 dark:text-green-100">
                        {importResult.skipped.blocos} Blocos<br />
                        {importResult.skipped.macros} Macros<br />
                        {importResult.skipped.micros} Micros
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700 dark:text-green-300 font-medium">Total processado:</p>
                      <p className="text-green-900 dark:text-green-100 text-2xl font-bold">
                        {importResult.total}
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setParsedData([]);
                  setImportResult(null);
                }}
                className="w-full"
              >
                Importar Outro Arquivo
              </Button>
            </div>
          )}

          {/* Instruções */}
          {!file && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Formato do arquivo CSV:</p>
                <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-x-auto">
{`Módulo,Macrocompetência,Microcompetência
Competências Comportamentais,Ética e Integridade,Transparência
Liderança e Gestão,Liderança de Pessoas,Desenvolvimento de equipes`}
                </pre>
                <p className="text-sm mt-3 text-muted-foreground">
                  • A primeira linha (cabeçalho) será ignorada<br />
                  • Use vírgula como separador<br />
                  • Competências duplicadas serão automaticamente ignoradas
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
