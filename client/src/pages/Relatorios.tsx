import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HardDrive,
  Calendar,
  User,
  Loader2,
  Shield,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Relatorios() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  // Verificar se é admin
  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Acesso Negado
              </CardTitle>
              <CardDescription>
                Esta página é restrita a administradores.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Query para listar backups
  const { data: backups, isLoading, refetch } = trpc.backup.list.useQuery();

  // Mutation para gerar backup
  const generateBackup = trpc.backup.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Backup gerado com sucesso! ${data.totalRecords} registros exportados.`);
      refetch();
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar backup: ${error.message}`);
      setIsGenerating(false);
    }
  });

  // Mutation para marcar como baixado
  const markDownloaded = trpc.backup.markDownloaded.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const handleGenerateBackup = () => {
    setIsGenerating(true);
    generateBackup.mutate();
  };

  const handleDownload = (backup: any) => {
    // Abrir URL de download
    window.open(backup.fileUrl, '_blank');
    
    // Marcar como baixado se ainda não foi
    if (!backup.downloadedAt) {
      markDownloaded.mutate({ id: backup.id });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluído</Badge>;
      case 'gerando':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Gerando...</Badge>;
      case 'erro':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Contar backups não baixados
  const notDownloadedCount = backups?.filter((b: any) => !b.downloadedAt && b.status === 'concluido').length || 0;

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios e Backup</h1>
            <p className="text-gray-500">Gerencie backups do banco de dados do sistema</p>
          </div>
        </div>

        {/* Card de Alerta de Backups Não Baixados */}
        {notDownloadedCount > 0 && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">
                    Você tem {notDownloadedCount} backup(s) não baixado(s)
                  </p>
                  <p className="text-sm text-amber-600">
                    Recomendamos baixar e armazenar os backups em local seguro.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Principal de Backup */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Backup do Banco de Dados</CardTitle>
                  <CardDescription>
                    Gere backups completos do sistema em formato SQL
                  </CardDescription>
                </div>
              </div>
              <Button 
                onClick={handleGenerateBackup} 
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Backup Agora
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Dicas de Segurança */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Dicas de Segurança</h4>
                  <ul className="text-sm text-blue-700 mt-1 space-y-1">
                    <li>• Faça backup regularmente (recomendado: semanalmente)</li>
                    <li>• Armazene os backups em local seguro (Google Drive, HD externo, etc.)</li>
                    <li>• O arquivo SQL pode ser importado em qualquer MySQL/MariaDB</li>
                    <li>• Mantenha pelo menos os últimos 3 backups</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tabela de Backups */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Baixado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">Carregando backups...</p>
                      </TableCell>
                    </TableRow>
                  ) : backups && backups.length > 0 ? (
                    backups.map((backup: any) => (
                      <TableRow key={backup.id} className={!backup.downloadedAt && backup.status === 'concluido' ? 'bg-amber-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {formatDate(backup.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{backup.filename}</TableCell>
                        <TableCell>{backup.totalRecords.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-4 w-4 text-gray-400" />
                            {formatFileSize(backup.fileSize)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(backup.status)}</TableCell>
                        <TableCell>
                          {backup.downloadedAt ? (
                            <span className="text-green-600 text-sm">
                              {formatDate(backup.downloadedAt)}
                            </span>
                          ) : (
                            <span className="text-amber-600 text-sm font-medium">
                              Não baixado
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {backup.status === 'concluido' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(backup)}
                              className="gap-1"
                            >
                              <Download className="h-4 w-4" />
                              Baixar
                            </Button>
                          )}
                          {backup.status === 'erro' && (
                            <span className="text-red-500 text-sm" title={backup.errorMessage}>
                              {backup.errorMessage?.substring(0, 30)}...
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Database className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">Nenhum backup encontrado</p>
                        <p className="text-sm text-gray-400">Clique em "Gerar Backup Agora" para criar seu primeiro backup</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
