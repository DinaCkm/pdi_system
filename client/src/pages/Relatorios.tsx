import { useState, useRef } from "react";
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
  Loader2,
  Shield,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Users,
  Target,
  ListTodo,
  FileText
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function Relatorios() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [exportingReport, setExportingReport] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Mutation para restaurar backup
  const restoreBackup = trpc.backup.restore.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.warning(data.message);
      }
      setIsRestoring(false);
      setShowRestoreDialog(false);
      setRestoreFile(null);
    },
    onError: (error) => {
      toast.error(`Erro ao restaurar backup: ${error.message}`);
      setIsRestoring(false);
    }
  });

  // Mutation para exportar relatórios
  const exportReport = trpc.backup.exportReport.useMutation({
    onSuccess: (data) => {
      // Criar blob e fazer download
      const blob = new Blob([data.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Relatório exportado: ${data.filename}`);
      setExportingReport(null);
    },
    onError: (error) => {
      toast.error(`Erro ao exportar relatório: ${error.message}`);
      setExportingReport(null);
    }
  });

  const handleGenerateBackup = () => {
    setIsGenerating(true);
    generateBackup.mutate();
  };

  const handleDownload = (backup: any) => {
    window.open(backup.fileUrl, '_blank');
    if (!backup.downloadedAt) {
      markDownloaded.mutate({ id: backup.id });
    }
  };

  const handleRestoreClick = () => {
    setShowRestoreDialog(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.sql')) {
        toast.error('Por favor, selecione um arquivo .sql');
        return;
      }
      setRestoreFile(file);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreFile) return;
    
    setIsRestoring(true);
    const content = await restoreFile.text();
    restoreBackup.mutate({ sqlContent: content });
  };

  const handleExportReport = (type: string) => {
    setExportingReport(type);
    exportReport.mutate({ type });
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

  const notDownloadedCount = backups?.filter((b: any) => !b.downloadedAt && b.status === 'concluido').length || 0;

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios e Backup</h1>
            <p className="text-gray-500">Gerencie backups e exporte relatórios do sistema</p>
          </div>
        </div>

        <Tabs defaultValue="backup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Backup do Sistema
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Tab de Backup */}
          <TabsContent value="backup" className="space-y-6">
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
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Backup do Banco de Dados</CardTitle>
                      <CardDescription>
                        Gere e restaure backups completos do sistema
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleRestoreClick}
                      variant="outline"
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Restaurar Backup
                    </Button>
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

                {/* Info sobre Backup Automático */}
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Backup Automático</h4>
                      <p className="text-sm text-green-700 mt-1">
                        O sistema gera backups automaticamente toda <strong>segunda-feira às 03:00</strong>.
                        Você receberá uma notificação quando o backup estiver disponível para download.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabela de Backups */}
                <div className="border rounded-lg overflow-x-auto">
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
                            <TableCell className="font-mono text-sm max-w-[200px] truncate">{backup.filename}</TableCell>
                            <TableCell>{backup.totalRecords?.toLocaleString() || 0}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <HardDrive className="h-4 w-4 text-gray-400" />
                                {formatFileSize(backup.fileSize || 0)}
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
                              {backup.status === 'concluido' && backup.fileUrl && (
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
          </TabsContent>

          {/* Tab de Relatórios */}
          <TabsContent value="relatorios" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Exportar Relatório Geral</CardTitle>
                    <CardDescription>
                      Exporte todos os dados do sistema em formato Excel (CSV)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-w-xl mx-auto">
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="p-4 bg-blue-100 rounded-full mb-4">
                          <FileSpreadsheet className="h-12 w-12 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-xl mb-2">Relatório Geral Completo</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Exporta todos os dados do sistema em um único arquivo CSV com todas as colunas:
                        </p>
                        <div className="text-left text-xs text-gray-500 mb-4 bg-white p-3 rounded-lg w-full">
                          <p className="font-medium text-gray-700 mb-1">Colunas incluídas:</p>
                          <p>Usuário (ID, Nome, Email, CPF, Cargo, Perfil, Status) • Departamento • Líder • PDI (ID, Título, Status) • Ciclo • Ação (ID, Título, Status, Prazo) • Competência Macro</p>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                          💡 Dica: Abra o arquivo no Excel e use filtros para visualizar os dados como preferir
                        </p>
                        <Button 
                          onClick={() => handleExportReport('geral')}
                          disabled={exportingReport === 'geral'}
                          className="w-full"
                          size="lg"
                        >
                          {exportingReport === 'geral' ? (
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-5 w-5 mr-2" />
                          )}
                          Baixar Relatório Geral (CSV)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Restauração */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Restaurar Backup
              </DialogTitle>
              <DialogDescription>
                <div className="space-y-3 mt-2">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium text-sm">
                      ⚠️ ATENÇÃO: Esta ação irá substituir TODOS os dados atuais do sistema!
                    </p>
                    <p className="text-red-600 text-xs mt-1">
                      Certifique-se de ter um backup atual antes de prosseguir.
                    </p>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Selecione um arquivo .sql de backup para restaurar os dados do sistema.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <input
                type="file"
                accept=".sql"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                {restoreFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">{restoreFile.name}</span>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <Upload className="h-8 w-8 mx-auto mb-2" />
                    <p>Clique para selecionar o arquivo .sql</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRestoreDialog(false);
                  setRestoreFile(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleRestoreConfirm}
                disabled={!restoreFile || isRestoring}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restaurando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Restaurar Dados
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
