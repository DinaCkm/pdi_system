import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";

interface CompetenciaImportacao {
  blocoNome: string;
  blocoDescricao?: string;
  macroNome: string;
  macroDescricao?: string;
  microNome: string;
  microDescricao?: string;
}

interface ResultadoImportacao {
  sucesso: number;
  erros: { linha: number; erro: string }[];
}

export function ImportarCompetencias() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dados, setDados] = useState<CompetenciaImportacao[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [errosValidacao, setErrosValidacao] = useState<{ linha: number; erro: string }[]>([]);
  const [showErroDialog, setShowErroDialog] = useState(false);

  const importarMutation = trpc.competencias.importarEmLote.useMutation({
    onSuccess: (result) => {
      setResultado(result);
      setArquivo(null);
      setDados([]);
      
      // Se houver erros, mostrar AlertDialog de erros
      if (result.erros.length > 0) {
        // Não mostrar toast, apenas o AlertDialog
      } else {
        // Se foi 100% sucesso, mostrar toast
        toast.success(`Importação concluída com sucesso: ${result.sucesso} competências criadas`);
      }
    },
    onError: (e: any) => {
      toast.error(`Erro na importação: ${e.message}`);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar extensão
    const extensao = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(extensao || "")) {
      toast.error("Apenas arquivos Excel (.xlsx, .xls) ou CSV são permitidos");
      return;
    }

    setArquivo(file);

    // Ler arquivo
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let dados: CompetenciaImportacao[] = [];
        const arrayBuffer = event.target?.result as ArrayBuffer;

        if (extensao === "csv") {
          // Processar CSV
          const text = new TextDecoder().decode(arrayBuffer);
          const linhas = text.trim().split("\n");
          const cabecalho = linhas[0].split(",").map(h => h.trim().toLowerCase());

          dados = linhas.slice(1).map((linha: string) => {
            const valores = linha.split(",").map(v => v.trim());
            return {
              blocoNome: valores[cabecalho.indexOf("bloconome")] || "",
              blocoDescricao: valores[cabecalho.indexOf("blocodescricao")] || "",
              macroNome: valores[cabecalho.indexOf("macronome")] || "",
              macroDescricao: valores[cabecalho.indexOf("macrodescricao")] || "",
              microNome: valores[cabecalho.indexOf("micronome")] || "",
              microDescricao: valores[cabecalho.indexOf("microdescricao")] || "",
            };
          });
        } else {
          // Processar Excel
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

          if (jsonData.length > 0) {
            const cabecalho = (jsonData[0] as string[]).map(h => h.toLowerCase());

            dados = jsonData.slice(1).map((linha: any[]) => ({
              blocoNome: linha[cabecalho.indexOf("bloconome")] || "",
              blocoDescricao: linha[cabecalho.indexOf("blocodescricao")] || "",
              macroNome: linha[cabecalho.indexOf("macronome")] || "",
              macroDescricao: linha[cabecalho.indexOf("macrodescricao")] || "",
              microNome: linha[cabecalho.indexOf("micronome")] || "",
              microDescricao: linha[cabecalho.indexOf("microdescricao")] || "",
            }));
          }
        }

        // Validar dados
        const erros: { linha: number; erro: string }[] = [];
        dados.forEach((d, idx) => {
          if (!d.blocoNome?.trim()) erros.push({ linha: idx + 2, erro: "Bloco nome obrigatório" });
          if (!d.macroNome?.trim()) erros.push({ linha: idx + 2, erro: "Macro nome obrigatório" });
          if (!d.microNome?.trim()) erros.push({ linha: idx + 2, erro: "Micro nome obrigatório" });
        });

        if (erros.length > 0) {
          setErrosValidacao(erros);
          setShowErroDialog(true);
          setDados([]);
          return;
        }

        setDados(dados);
        setShowPreview(true);
      } catch (erro: any) {
        toast.error(`Erro ao ler arquivo: ${erro.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportar = () => {
    if (dados.length === 0) {
      toast.error("Nenhum dado para importar");
      return;
    }

    importarMutation.mutate({ competencias: dados });
    setShowConfirm(false);
  };

  // Mostrar AlertDialog se houver erros na importação
  const mostrarErrosImportacao = resultado && resultado.erros.length > 0;

  return (
    <>
      {/* AlertDialog para Erros de Validação */}
      <AlertDialog open={showErroDialog} onOpenChange={setShowErroDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              ❌ UPLOAD NÃO REALIZADO
            </AlertDialogTitle>
            <AlertDialogDescription className="text-red-700 font-semibold">
              {errosValidacao.length} erro(s) encontrado(s) no arquivo
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 bg-red-50 p-4 rounded-lg max-h-64 overflow-y-auto">
            {errosValidacao.map((e, idx) => (
              <div key={idx} className="text-sm text-red-800 border-l-2 border-red-400 pl-3">
                <strong>Linha {e.linha}:</strong> {e.erro}
              </div>
            ))}
          </div>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700">
            Voltar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog para Erros de Importação */}
      <AlertDialog open={mostrarErrosImportacao} onOpenChange={() => setResultado(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              ⚠️ IMPORTAÇÃO NÃO REALIZADA - {resultado?.erros.length} ERRO(S)
            </AlertDialogTitle>
            <AlertDialogDescription className="text-red-700 font-semibold">
              {resultado?.sucesso} competência(s) foram criadas, mas {resultado?.erros.length} linha(s) falharam. A importação não foi concluída com sucesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 bg-red-50 p-4 rounded-lg max-h-64 overflow-y-auto">
            {resultado?.erros.map((e, idx) => (
              <div key={idx} className="text-sm text-red-800 border-l-2 border-red-400 pl-3">
                <strong>Linha {e.linha}:</strong> {e.erro}
              </div>
            ))}
          </div>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700">
            Fechar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        {/* Card de Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Competências em Lote
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione arquivo Excel ou CSV</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-sm text-gray-600">
                Formato esperado: BlocoNome, BlocoDescricao, MacroNome, MacroDescricao, MicroNome, MicroDescricao
              </p>
            </div>

            {dados.length > 0 && (
              <div className="space-y-2">
                <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {dados.length} competência(s) pronta(s) para importar
                    </p>
                    <p className="text-sm text-blue-700">
                      Clique em "Visualizar" para revisar os dados antes de importar
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setShowPreview(true)} variant="outline">
                    Visualizar
                  </Button>
                  <Button
                    onClick={() => setShowConfirm(true)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={importarMutation.isPending}
                  >
                    {importarMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      "Importar Agora"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {resultado && resultado.erros.length === 0 && resultado.sucesso > 0 && (
              <div className="bg-green-50 p-3 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">
                    Importação realizada com sucesso!
                  </p>
                  <p className="text-sm text-green-700">
                    {resultado.sucesso} competência(s) foram criadas
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Modal */}
        <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
          <AlertDialogContent className="max-w-4xl max-h-96 overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Preview dos Dados</AlertDialogTitle>
              <AlertDialogDescription>
                Revise os dados antes de importar
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Bloco</th>
                    <th className="text-left p-2">Macro</th>
                    <th className="text-left p-2">Micro</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{d.blocoNome}</td>
                      <td className="p-2">{d.macroNome}</td>
                      <td className="p-2">{d.microNome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmação de Importação */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja importar {dados.length} competência(s)? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleImportar}
                className="bg-green-600 hover:bg-green-700"
              >
                Importar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
