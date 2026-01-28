import { useState, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Download, Users, FileText, Target, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

type UserRow = {
  name: string;
  email: string;
  cpf: string;
  cargo?: string;
  departamentoNome?: string;
  leaderEmail?: string;
  role: 'admin' | 'lider' | 'colaborador';
};

type AcaoRow = {
  userEmail: string;
  titulo: string;
  descricao?: string;
  tipo: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
};

type PdiRow = {
  userEmail: string;
  cicloNome: string;
  status?: string;
  observacoes?: string;
};

export default function Importacao() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('usuarios');
  
  // Estados para Usuários
  const [usersData, setUsersData] = useState<UserRow[]>([]);
  const [usersPreview, setUsersPreview] = useState(false);
  const usersFileRef = useRef<HTMLInputElement>(null);
  
  // Estados para Ações
  const [acoesData, setAcoesData] = useState<AcaoRow[]>([]);
  const [acoesPreview, setAcoesPreview] = useState(false);
  const acoesFileRef = useRef<HTMLInputElement>(null);
  
  // Estados para PDIs
  const [pdisData, setPdisData] = useState<PdiRow[]>([]);
  const [pdisPreview, setPdisPreview] = useState(false);
  const pdisFileRef = useRef<HTMLInputElement>(null);
  
  // Estados de resultado
  const [importResult, setImportResult] = useState<{ show: boolean; type: string; results: any[] }>({ show: false, type: '', results: [] });

  // Mutations
  const importUsersMutation = trpc.import.users.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setImportResult({ show: true, type: 'usuarios', results: data.results });
      setUsersData([]);
      setUsersPreview(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      // Resetar para permitir novo upload
      setUsersData([]);
      setUsersPreview(false);
      if (usersFileRef.current) usersFileRef.current.value = '';
    }
  });

  const importAcoesMutation = trpc.import.acoes.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setImportResult({ show: true, type: 'acoes', results: data.results });
      setAcoesData([]);
      setAcoesPreview(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      // Resetar para permitir novo upload
      setAcoesData([]);
      setAcoesPreview(false);
      if (acoesFileRef.current) acoesFileRef.current.value = '';
    }
  });

  const importPdisMutation = trpc.import.pdis.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setImportResult({ show: true, type: 'pdis', results: data.results });
      setPdisData([]);
      setPdisPreview(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      // Resetar para permitir novo upload
      setPdisData([]);
      setPdisPreview(false);
      if (pdisFileRef.current) pdisFileRef.current.value = '';
    }
  });

  // Verificar permissão
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
              <p className="text-muted-foreground">
                Apenas administradores podem acessar a importação de dados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Função para baixar modelo CSV
  const downloadTemplate = (type: 'usuarios' | 'acoes' | 'pdis') => {
    let content = '';
    let filename = '';

    switch (type) {
      case 'usuarios':
        content = 'nome,email,cpf,cargo,departamento,email_lider,perfil\n';
        content += 'João Silva,joao@empresa.com,12345678901,Analista,TI,maria@empresa.com,colaborador\n';
        content += 'Maria Santos,maria@empresa.com,12345678902,Gerente,TI,,lider\n';
        filename = 'modelo_usuarios.csv';
        break;
      case 'acoes':
        content = 'email_usuario,titulo,descricao,tipo,status,data_inicio,data_fim\n';
        content += 'joao@empresa.com,Curso de Excel,Fazer curso online,curso,pendente,2026-02-01,2026-03-01\n';
        content += 'joao@empresa.com,Mentoria,Participar de mentoria,mentoria,em_andamento,2026-01-15,2026-06-15\n';
        filename = 'modelo_acoes.csv';
        break;
      case 'pdis':
        content = 'email_usuario,ciclo,status,observacoes\n';
        content += 'joao@empresa.com,Ciclo 2026,rascunho,PDI inicial do colaborador\n';
        content += 'maria@empresa.com,Ciclo 2026,em_andamento,PDI em desenvolvimento\n';
        filename = 'modelo_pdis.csv';
        break;
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Modelo baixado com sucesso!');
  };

  // Função para processar arquivo CSV
  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
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
    });
  };

  // Handler para upload de usuários
  const handleUsersUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        toast.error('Arquivo vazio ou sem dados');
        return;
      }

      const header = rows[0].map(h => h.toLowerCase().trim());
      const data: UserRow[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3) continue;

        const roleMap: Record<string, 'admin' | 'lider' | 'colaborador'> = {
          'admin': 'admin',
          'administrador': 'admin',
          'lider': 'lider',
          'líder': 'lider',
          'colaborador': 'colaborador',
          'empregado': 'colaborador'
        };

        const roleValue = row[header.indexOf('perfil')]?.toLowerCase().trim() || 'colaborador';
        
        data.push({
          name: row[header.indexOf('nome')] || '',
          email: row[header.indexOf('email')] || '',
          cpf: row[header.indexOf('cpf')]?.replace(/\D/g, '') || '',
          cargo: row[header.indexOf('cargo')] || undefined,
          departamentoNome: row[header.indexOf('departamento')] || undefined,
          leaderEmail: row[header.indexOf('email_lider')] || undefined,
          role: roleMap[roleValue] || 'colaborador'
        });
      }

      if (data.length === 0) {
        toast.error('Nenhum dado válido encontrado no arquivo');
        return;
      }

      setUsersData(data);
      setUsersPreview(true);
      toast.success(`${data.length} registros carregados para preview`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handler para upload de ações
  const handleAcoesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        toast.error('Arquivo vazio ou sem dados');
        return;
      }

      const header = rows[0].map(h => h.toLowerCase().trim());
      const data: AcaoRow[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;

        data.push({
          userEmail: row[header.indexOf('email_usuario')] || '',
          titulo: row[header.indexOf('titulo')] || '',
          descricao: row[header.indexOf('descricao')] || undefined,
          tipo: row[header.indexOf('tipo')] || 'outro',
          status: row[header.indexOf('status')] || 'pendente',
          dataInicio: row[header.indexOf('data_inicio')] || undefined,
          dataFim: row[header.indexOf('data_fim')] || undefined
        });
      }

      if (data.length === 0) {
        toast.error('Nenhum dado válido encontrado no arquivo');
        return;
      }

      setAcoesData(data);
      setAcoesPreview(true);
      toast.success(`${data.length} registros carregados para preview`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handler para upload de PDIs
  const handlePdisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        toast.error('Arquivo vazio ou sem dados');
        return;
      }

      const header = rows[0].map(h => h.toLowerCase().trim());
      const data: PdiRow[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;

        data.push({
          userEmail: row[header.indexOf('email_usuario')] || '',
          cicloNome: row[header.indexOf('ciclo')] || '',
          status: row[header.indexOf('status')] || 'rascunho',
          observacoes: row[header.indexOf('observacoes')] || undefined
        });
      }

      if (data.length === 0) {
        toast.error('Nenhum dado válido encontrado no arquivo');
        return;
      }

      setPdisData(data);
      setPdisPreview(true);
      toast.success(`${data.length} registros carregados para preview`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importação em Massa</h1>
        <p className="text-gray-600">Importe dados de usuários, ações e PDIs via arquivo CSV</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Instruções de Importação</AlertTitle>
        <AlertDescription className="text-blue-700">
          1. Baixe o modelo CSV correspondente<br />
          2. Preencha os dados seguindo o formato do modelo<br />
          3. Faça o upload do arquivo preenchido<br />
          4. Revise os dados no preview antes de confirmar<br />
          5. CPFs duplicados e emails inválidos serão rejeitados
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Usuários e Hierarquia
          </TabsTrigger>
          <TabsTrigger value="acoes" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Ações
          </TabsTrigger>
          <TabsTrigger value="pdis" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDIs
          </TabsTrigger>
        </TabsList>

        {/* Tab Usuários */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Importar Usuários e Hierarquia
              </CardTitle>
              <CardDescription>
                Importe colaboradores, líderes e administradores com suas hierarquias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => downloadTemplate('usuarios')}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Modelo CSV
                </Button>
                <Button onClick={() => usersFileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Fazer Upload
                </Button>
                <input
                  ref={usersFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleUsersUpload}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">Colunas do arquivo:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><strong>nome</strong> - Nome completo do usuário (obrigatório)</li>
                  <li><strong>email</strong> - Email corporativo (obrigatório, único)</li>
                  <li><strong>cpf</strong> - CPF sem pontuação (obrigatório, único)</li>
                  <li><strong>cargo</strong> - Cargo do usuário (opcional)</li>
                  <li><strong>departamento</strong> - Nome do departamento (deve existir no sistema)</li>
                  <li><strong>email_lider</strong> - Email do líder (deve existir no sistema)</li>
                  <li><strong>perfil</strong> - admin, lider ou colaborador (obrigatório)</li>
                </ul>
              </div>

              {usersPreview && usersData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Preview ({usersData.length} registros)</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setUsersData([]); setUsersPreview(false); }}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={() => importUsersMutation.mutate({ users: usersData })}
                        disabled={importUsersMutation.isPending}
                      >
                        {importUsersMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                        ) : (
                          <><CheckCircle className="h-4 w-4 mr-2" /> Confirmar Importação</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>CPF</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Líder</TableHead>
                          <TableHead>Perfil</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData.map((user, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.cpf}</TableCell>
                            <TableCell>{user.cargo || '-'}</TableCell>
                            <TableCell>{user.departamentoNome || '-'}</TableCell>
                            <TableCell>{user.leaderEmail || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'lider' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Ações */}
        <TabsContent value="acoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Importar Ações
              </CardTitle>
              <CardDescription>
                Importe ações de desenvolvimento vinculadas aos PDIs dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => downloadTemplate('acoes')}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Modelo CSV
                </Button>
                <Button onClick={() => acoesFileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Fazer Upload
                </Button>
                <input
                  ref={acoesFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleAcoesUpload}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">Colunas do arquivo:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><strong>email_usuario</strong> - Email do usuário dono da ação (obrigatório)</li>
                  <li><strong>titulo</strong> - Título da ação (obrigatório)</li>
                  <li><strong>descricao</strong> - Descrição detalhada (opcional)</li>
                  <li><strong>tipo</strong> - curso, mentoria, projeto, leitura, outro (obrigatório)</li>
                  <li><strong>status</strong> - pendente, em_andamento, concluida (opcional)</li>
                  <li><strong>data_inicio</strong> - Data de início YYYY-MM-DD (opcional)</li>
                  <li><strong>data_fim</strong> - Data de término YYYY-MM-DD (opcional)</li>
                </ul>
                <p className="mt-2 text-yellow-700 bg-yellow-50 p-2 rounded">
                  ⚠️ O usuário deve ter um PDI cadastrado para receber ações
                </p>
              </div>

              {acoesPreview && acoesData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Preview ({acoesData.length} registros)</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setAcoesData([]); setAcoesPreview(false); }}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={() => importAcoesMutation.mutate({ acoes: acoesData })}
                        disabled={importAcoesMutation.isPending}
                      >
                        {importAcoesMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                        ) : (
                          <><CheckCircle className="h-4 w-4 mr-2" /> Confirmar Importação</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email Usuário</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Início</TableHead>
                          <TableHead>Fim</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {acoesData.map((acao, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{acao.userEmail}</TableCell>
                            <TableCell>{acao.titulo}</TableCell>
                            <TableCell>{acao.tipo}</TableCell>
                            <TableCell>{acao.status || 'pendente'}</TableCell>
                            <TableCell>{acao.dataInicio || '-'}</TableCell>
                            <TableCell>{acao.dataFim || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab PDIs */}
        <TabsContent value="pdis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Importar PDIs
              </CardTitle>
              <CardDescription>
                Importe ou atualize PDIs vinculados aos usuários e ciclos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => downloadTemplate('pdis')}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Modelo CSV
                </Button>
                <Button onClick={() => pdisFileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Fazer Upload
                </Button>
                <input
                  ref={pdisFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handlePdisUpload}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">Colunas do arquivo:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><strong>email_usuario</strong> - Email do usuário (obrigatório)</li>
                  <li><strong>ciclo</strong> - Nome do ciclo (deve existir no sistema)</li>
                  <li><strong>status</strong> - rascunho, em_andamento, concluido (opcional)</li>
                  <li><strong>observacoes</strong> - Observações do PDI (opcional)</li>
                </ul>
                <p className="mt-2 text-blue-700 bg-blue-50 p-2 rounded">
                  ℹ️ Se o PDI já existir para o usuário/ciclo, será atualizado
                </p>
              </div>

              {pdisPreview && pdisData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Preview ({pdisData.length} registros)</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setPdisData([]); setPdisPreview(false); }}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={() => importPdisMutation.mutate({ pdis: pdisData })}
                        disabled={importPdisMutation.isPending}
                      >
                        {importPdisMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                        ) : (
                          <><CheckCircle className="h-4 w-4 mr-2" /> Confirmar Importação</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email Usuário</TableHead>
                          <TableHead>Ciclo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Observações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pdisData.map((pdi, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{pdi.userEmail}</TableCell>
                            <TableCell>{pdi.cicloNome}</TableCell>
                            <TableCell>{pdi.status || 'rascunho'}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{pdi.observacoes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Resultado */}
      <Dialog open={importResult.show} onOpenChange={(open) => setImportResult({ ...importResult, show: open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Importação</DialogTitle>
            <DialogDescription>
              Veja abaixo o resultado detalhado da importação
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  {importResult.results.filter(r => r.success).length} sucesso
                </span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">
                  {importResult.results.filter(r => !r.success).length} erros
                </span>
              </div>
            </div>

            {importResult.results.filter(r => !r.success).length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Identificador</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.results.filter(r => !r.success).map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{result.email || result.userEmail || result.titulo}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Erro</Badge>
                        </TableCell>
                        <TableCell className="text-red-600 text-sm">{result.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setImportResult({ show: false, type: '', results: [] })}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
