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

  const importarMutation = trpc.competencias.importarEmLote.useMutation({
    onSuccess: (result) => {
      setResultado(result);
      setArquivo(null);
      setDados([]);
      toast.success(`Importação concluída: ${result.sucesso} competências criadas`);
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
      toast.error("Arquivo deve ser Excel (.xlsx, .xls) ou CSV (.csv)");
      return;
    }

    setArquivo(file);
    lerArquivo(file);
  };

  const lerArquivo = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const conteudo = e.target?.result;
        let dados: CompetenciaImportacao[] = [];

        if (file.name.endsWith(".csv")) {
          // Ler CSV
          const texto = conteudo as string;
          const linhas = texto.split("\n").filter((l) => l.trim());
          const cabecalho = linhas[0].split(",").map((h) => h.trim().toLowerCase());

          dados = linhas.slice(1).map((linha) => {
            const valores = linha.split(",").map((v) => v.trim());
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
          // Ler Excel
          const workbook = XLSX.read(conteudo, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
          }) as any[];

          if (jsonData.length < 2) {
            toast.error("Arquivo vazio ou sem dados");
            return;
          }

          const cabecalho = (jsonData[0] as string[]).map((h) =>
            h.toLowerCase().replace(/\s+/g, "")
          );

          dados = jsonData.slice(1).map((linha: any[]) => ({
            blocoNome: linha[cabecalho.indexOf("bloconome")] || "",
            blocoDescricao: linha[cabecalho.indexOf("blocodescricao")] || "",
            macroNome: linha[cabecalho.indexOf("macronome")] || "",
            macroDescricao: linha[cabecalho.indexOf("macrodescricao")] || "",
            microNome: linha[cabecalho.indexOf("micronome")] || "",
            microDescricao: linha[cabecalho.indexOf("microdescricao")] || "",
          }));
        }

        // Validar dados
        const erros: { linha: number; erro: string }[] = [];
        dados.forEach((d, idx) => {
          if (!d.blocoNome?.trim()) erros.push({ linha: idx + 2, erro: "Bloco nome obrigatório" });
          if (!d.macroNome?.trim()) erros.push({ linha: idx + 2, erro: "Macro nome obrigatório" });
          if (!d.microNome?.trim()) erros.push({ linha: idx + 2, erro: "Micro nome obrigatório" });
        });

        if (erros.length > 0) {
          toast.error(`${erros.length} erro(s) encontrado(s)`);
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

  return (
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
        </CardContent>
      </Card>

      {/* Card de Resultado */}
      {resultado && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="w-5 h-5" />
              Importação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-green-800">
              ✓ {resultado.sucesso} competência(s) importada(s) com sucesso
            </p>
            {resultado.erros.length > 0 && (
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="font-medium text-red-900 mb-2">
                  ✗ {resultado.erros.length} erro(s):
                </p>
                <ul className="text-sm text-red-800 space-y-1">
                  {resultado.erros.slice(0, 5).map((e, idx) => (
                    <li key={idx}>
                      Linha {e.linha}: {e.erro}
                    </li>
                  ))}
                  {resultado.erros.length > 5 && (
                    <li>... e mais {resultado.erros.length - 5} erro(s)</li>
                  )}
                </ul>
              </div>
            )}
            <Button
              onClick={() => setResultado(null)}
              variant="outline"
              className="w-full"
            >
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Visualização */}
      <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
        <AlertDialogContent className="max-w-2xl max-h-96 overflow-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Visualizar Dados</AlertDialogTitle>
            <AlertDialogDescription>
              Revise os dados antes de importar. Mostrando até 10 itens.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Bloco</th>
                  <th className="border p-2 text-left">Macro</th>
                  <th className="border p-2 text-left">Micro</th>
                </tr>
              </thead>
              <tbody>
                {dados.slice(0, 10).map((d, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border p-2 text-xs">{d.blocoNome}</td>
                    <td className="border p-2 text-xs">{d.macroNome}</td>
                    <td className="border p-2 text-xs">{d.microNome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dados.length > 10 && (
            <p className="text-sm text-gray-600">
              ... e mais {dados.length - 10} item(ns)
            </p>
          )}

          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Importação</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a importar {dados.length} competência(s). Esta ação não pode ser desfeita.
              Deseja continuar?
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
  );
}
