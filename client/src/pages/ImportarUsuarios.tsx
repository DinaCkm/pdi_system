import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: string[];
  departamentosCreated: number;
  lidersCreated: number;
  colaboradoresCreated: number;
}

export default function ImportarUsuarios() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = trpc.users.importBulk.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const processExcel = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsBinaryString(file);
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      // Processar Excel
      const rawData = await processExcel(file);
      
      // Transformar dados para o formato esperado
      const users = rawData.map((row: any) => {
        // Limpar CPF (remover pontos e traços)
        const cpf = String(row.CPF || '').replace(/\D/g, '');
        
        // Normalizar perfil
        let role: "admin" | "lider" | "colaborador" = "colaborador";
        const perfilUpper = String(row.PERFIL || '').toUpperCase();
        if (perfilUpper === 'LIDER') {
          role = 'lider';
        } else if (perfilUpper === 'ADMIN' || perfilUpper === 'ADMINISTRADOR') {
          role = 'admin';
        }

        return {
          name: String(row.Colaborador || '').trim(),
          email: row.email ? String(row.email).trim() : undefined,
          cpf: cpf,
          cargo: String(row['FUNÇÃO'] || row.FUNCAO || '').trim(),
          role: role,
          departamento: String(row.Departamento || '').trim(),
        };
      });

      // Filtrar linhas inválidas
      const validUsers = users.filter(u => u.name && u.cpf && u.departamento);

      if (validUsers.length === 0) {
        throw new Error('Nenhum usuário válido encontrado no arquivo');
      }

      // Chamar API de importação
      const importResult = await importMutation.mutateAsync({ users: validUsers });
      setResult(importResult);
      
    } catch (error: any) {
      setResult({
        success: 0,
        errors: [error.message || 'Erro desconhecido ao importar'],
        departamentosCreated: 0,
        lidersCreated: 0,
        colaboradoresCreated: 0,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              Importação em Massa de Usuários
            </CardTitle>
            <CardDescription>
              Faça upload de um arquivo Excel (.xlsx) com os dados dos colaboradores para importação em massa.
              O sistema criará automaticamente os departamentos e estabelecerá a hierarquia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instruções */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Formato esperado do arquivo Excel:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Colaborador:</strong> Nome completo</li>
                  <li><strong>Departamento:</strong> Nome do departamento</li>
                  <li><strong>CPF:</strong> CPF do colaborador (com ou sem formatação)</li>
                  <li><strong>FUNÇÃO:</strong> Cargo do colaborador</li>
                  <li><strong>PERFIL:</strong> LIDER ou COLABORADOR</li>
                  <li><strong>email:</strong> Email do colaborador (opcional)</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar Arquivo
                </label>
                {file && (
                  <span className="text-sm text-muted-foreground">
                    {file.name}
                  </span>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={!file || importing}
                className="w-full"
                size="lg"
              >
                {importing ? 'Importando...' : 'Importar Usuários'}
              </Button>
            </div>

            {/* Resultado */}
            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{result.success}</div>
                        <div className="text-xs text-muted-foreground">Usuários criados</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{result.departamentosCreated}</div>
                        <div className="text-xs text-muted-foreground">Departamentos</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{result.lidersCreated}</div>
                        <div className="text-xs text-muted-foreground">Líderes</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{result.colaboradoresCreated}</div>
                        <div className="text-xs text-muted-foreground">Colaboradores</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {result.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Erros encontrados ({result.errors.length}):</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {result.errors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {result.errors.length === 0 && result.success > 0 && (
                  <Alert className="border-green-600 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Importação concluída com sucesso!</strong>
                      <p className="mt-1">
                        Todos os usuários foram importados, departamentos criados e hierarquia estabelecida.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
