import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CSVRow = {
  cpf: string;
  cicloNome: string;
  nomeAcao: string;
  descricaoAcao: string;
  microcompetenciaNome: string;
  prazo: string;
};

type ValidationResult = {
  row: number;
  valid: boolean;
  errors: string[];
  data?: {
    colaboradorNome: string;
    cicloNome: string;
    blocoNome: string;
    macroNome: string;
    microNome: string;
    nomeAcao: string;
    prazo: Date;
  };
};

export default function ImportarAcoes() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const validateMutation = (trpc as any).importActions.validate.useMutation({
    onSuccess: (result: any) => {
      setValidationResults(result.results);
      setShowResults(true);
      
      if (result.summary.canImport) {
        toast.success(`✅ Todas as ${result.summary.total} linhas estão válidas!`);
      } else {
        toast.error(`❌ ${result.summary.invalid} linha(s) com erro. Corrija antes de importar.`);
      }
      setIsValidating(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao validar: ${error.message}`);
      setIsValidating(false);
    },
  });

  const importMutation = (trpc as any).importActions.import.useMutation({
    onSuccess: (result: any) => {
      toast.success(`✅ ${result.created} ações criadas com sucesso!`);
      // Resetar formulário
      setFile(null);
      setCsvData([]);
      setValidationResults([]);
      setShowResults(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validar extensão
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv') {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    setFile(selectedFile);
    setShowResults(false);
    setValidationResults([]);

    // Ler arquivo CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(selectedFile);
  };

  const parseCsv = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      toast.error("Arquivo CSV vazio ou inválido");
      return;
    }

    // Primeira linha é o cabeçalho
    const header = lines[0].split(',').map(h => h.trim());
    
    // Validar cabeçalho
    const expectedHeaders = ['cpf', 'cicloNome', 'nomeAcao', 'descricaoAcao', 'microcompetenciaNome', 'prazo'];
    const hasValidHeader = expectedHeaders.every(h => header.includes(h));
    
    if (!hasValidHeader) {
      toast.error(`Cabeçalho inválido. Esperado: ${expectedHeaders.join(', ')}`);
      return;
    }

    // Parsear linhas de dados
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length !== header.length) {
        toast.error(`Linha ${i + 1} tem número incorreto de colunas`);
        return;
      }

      const row: any = {};
      header.forEach((h, idx) => {
        row[h] = values[idx];
      });

      rows.push(row as CSVRow);
    }

    setCsvData(rows);
    toast.success(`${rows.length} linha(s) carregadas. Clique em "Validar" para verificar.`);
  };

  const handleValidate = () => {
    if (csvData.length === 0) {
      toast.error("Nenhum dado para validar");
      return;
    }

    setIsValidating(true);
    validateMutation.mutate({ rows: csvData });
  };

  const handleImport = () => {
    if (csvData.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }

    const hasErrors = validationResults.some(r => !r.valid);
    if (hasErrors) {
      toast.error("Corrija os erros antes de importar");
      return;
    }

    importMutation.mutate({ rows: csvData });
  };

  const downloadTemplate = () => {
    const template = `cpf,cicloNome,nomeAcao,descricaoAcao,microcompetenciaNome,prazo
123.456.789-00,Ciclo 2026 - 1º Semestre,Curso de Liderança,Realizar curso online de liderança estratégica,Liderança de Equipes,31/03/2026
987.654.321-00,Ciclo 2026 - 1º Semestre,Workshop de Comunicação,Participar de workshop sobre comunicação assertiva,Comunicação Interpessoal,15/04/2026`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_importacao_acoes.csv';
    link.click();
    toast.success("Template baixado com sucesso!");
  };

  const canImport = validationResults.length > 0 && validationResults.every(r => r.valid);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            Importação em Massa de Ações
          </h1>
          <p className="text-muted-foreground mt-1">
            Importe múltiplas ações via arquivo CSV com validação rigorosa
          </p>
        </div>
        <Button onClick={downloadTemplate} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
          <Download className="w-4 h-4 mr-2" />
          Baixar Template
        </Button>
      </div>

      {/* Instruções */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <p><strong>1.</strong> Baixe o template CSV e preencha com os dados das ações</p>
          <p><strong>2.</strong> Faça upload do arquivo preenchido</p>
          <p><strong>3.</strong> Clique em "Validar" para verificar se todas as linhas estão corretas</p>
          <p><strong>4.</strong> Se houver erros, corrija o arquivo e faça novo upload</p>
          <p><strong>5.</strong> Quando todas as linhas estiverem válidas, clique em "Importar"</p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>Importante:</strong> Todas as linhas devem estar 100% corretas para permitir a importação.
          </p>
        </AlertDescription>
      </Alert>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload do Arquivo CSV
          </CardTitle>
          <CardDescription>
            Selecione o arquivo CSV com as ações a serem importadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">Arquivo CSV</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              <span>{file.name}</span>
              <Badge variant="outline">{csvData.length} linhas</Badge>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleValidate}
              disabled={csvData.length === 0 || isValidating}
              className="bg-gradient-to-r from-blue-600 to-orange-500"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Validar
                </>
              )}
            </Button>

            <Button
              onClick={handleImport}
              disabled={!canImport || importMutation.isPending}
              variant={canImport ? "default" : "outline"}
              className={canImport ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados da Validação */}
      {showResults && validationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Resultado da Validação
            </CardTitle>
            <CardDescription>
              {validationResults.filter(r => r.valid).length} de {validationResults.length} linhas válidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Microcompetência</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((result) => (
                    <TableRow key={result.row} className={result.valid ? "bg-green-50" : "bg-red-50"}>
                      <TableCell className="font-medium">{result.row}</TableCell>
                      <TableCell>
                        {result.valid ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.data?.colaboradorNome || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {result.data?.nomeAcao || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {result.data?.microNome || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {result.errors.length > 0 ? (
                          <ul className="text-sm text-red-600 space-y-1">
                            {result.errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-green-600 text-sm">✓ Tudo OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
