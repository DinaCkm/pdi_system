import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextDisplay from '@/components/RichTextDisplay';
import { stripHtml } from '@/components/RichTextDisplay';
import { 
  CheckCircle, XCircle, Clock, Building2, User, Calendar, 
  Search, FileText, Target, Filter, Download
} from "lucide-react";
import { IIPDashboard } from "@/components/IIPDashboard";

type TabType = 'concluidas' | 'evidencias_pendentes' | 'evidencias_devolvidas';

export default function GestaoGerente() {
  const [activeTab, setActiveTab] = useState<TabType>('concluidas');
  const [searchTerm, setSearchTerm] = useState('');
  const [departamentoFilter, setDepartamentoFilter] = useState<string>('todos');
  const [empregadoFilter, setEmpregadoFilter] = useState<string>('todos');

  // Queries
  const { data: acoesConcluidas = [], isLoading: loadingConcluidas } = trpc.actions.listConcluidas.useQuery();
  const { data: allEvidences = [], isLoading: loadingEvidences } = trpc.evidences.listAll.useQuery();

  // Separar evidências por status
  const evidenciasPendentes = useMemo(() => 
    allEvidences.filter((ev: any) => ['aguardando_avaliacao', 'aguardando_analise', 'pending', 'pendente'].includes(ev.status)),
    [allEvidences]
  );
  
  const evidenciasDevolvidas = useMemo(() => 
    allEvidences.filter((ev: any) => ev.status === 'reprovada'),
    [allEvidences]
  );

  // Extrair departamentos únicos das ações concluídas
  const departamentos = useMemo(() => {
    const deptos = new Map<string, string>();
    acoesConcluidas.forEach((acao: any) => {
      if (acao.departamentoId && acao.departamentoNome) {
        deptos.set(String(acao.departamentoId), acao.departamentoNome);
      }
    });
    allEvidences.forEach((ev: any) => {
      if (ev.solicitante?.departamentoId && ev.solicitante?.departamento) {
        deptos.set(String(ev.solicitante.departamentoId), ev.solicitante.departamento);
      }
    });
    return Array.from(deptos.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [acoesConcluidas, allEvidences]);

  // Extrair empregados únicos
  const empregados = useMemo(() => {
    const emps = new Map<string, string>();
    acoesConcluidas.forEach((acao: any) => {
      if (acao.empregadoId && acao.empregadoNome) {
        emps.set(String(acao.empregadoId), acao.empregadoNome);
      }
    });
    allEvidences.forEach((ev: any) => {
      if (ev.colaboradorId && ev.solicitante?.name) {
        emps.set(String(ev.colaboradorId), ev.solicitante.name);
      }
    });
    return Array.from(emps.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [acoesConcluidas, allEvidences]);

  // Filtrar ações concluídas
  const filteredAcoes = useMemo(() => {
    let result = acoesConcluidas;
    if (departamentoFilter !== 'todos') {
      result = result.filter((a: any) => String(a.departamentoId) === departamentoFilter);
    }
    if (empregadoFilter !== 'todos') {
      result = result.filter((a: any) => String(a.empregadoId) === empregadoFilter);
    }
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter((a: any) =>
        (a.titulo || '').toLowerCase().includes(search) ||
        (a.empregadoNome || '').toLowerCase().includes(search) ||
        (a.departamentoNome || '').toLowerCase().includes(search)
      );
    }
    return result;
  }, [acoesConcluidas, departamentoFilter, empregadoFilter, searchTerm]);

  // Filtrar evidências
  const filterEvidences = (evidences: any[]) => {
    let result = evidences;
    if (departamentoFilter !== 'todos') {
      result = result.filter((ev: any) => String(ev.solicitante?.departamentoId) === departamentoFilter);
    }
    if (empregadoFilter !== 'todos') {
      result = result.filter((ev: any) => String(ev.colaboradorId) === empregadoFilter);
    }
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter((ev: any) =>
        (ev.solicitante?.name || '').toLowerCase().includes(search) ||
        (ev.acao?.titulo || '').toLowerCase().includes(search) ||
        (ev.solicitante?.departamento || '').toLowerCase().includes(search)
      );
    }
    return result;
  };

  const filteredPendentes = filterEvidences(evidenciasPendentes);
  const filteredDevolvidas = filterEvidences(evidenciasDevolvidas);

  // Contadores
  const counts = {
    concluidas: filteredAcoes.length,
    pendentes: filteredPendentes.length,
    devolvidas: filteredDevolvidas.length,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-600">Gestão de Ações e Evidências</h1>
        <p className="text-gray-600 mt-2">Consulte ações concluídas e evidências por departamento e empregado</p>
      </div>

      {/* IIP - Visão Completa (igual admin) */}
      <IIPDashboard
        userRole="gerente"
        departamentoId={departamentoFilter && departamentoFilter !== 'todos' ? parseInt(departamentoFilter) : undefined}
      />

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'concluidas' ? 'ring-2 ring-green-500' : ''}`} onClick={() => setActiveTab('concluidas')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Ações Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{acoesConcluidas.length}</div>
            <p className="text-sm text-gray-600">ações finalizadas</p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'evidencias_pendentes' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setActiveTab('evidencias_pendentes')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Evidências Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{evidenciasPendentes.length}</div>
            <p className="text-sm text-gray-600">aguardando avaliação</p>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer hover:shadow-md transition-shadow ${activeTab === 'evidencias_devolvidas' ? 'ring-2 ring-red-500' : ''}`} onClick={() => setActiveTab('evidencias_devolvidas')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Evidências Devolvidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{evidenciasDevolvidas.length}</div>
            <p className="text-sm text-gray-600">não aprovadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="h-4 w-4 text-gray-500 shrink-0" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, ação ou departamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Departamentos</SelectItem>
                {departamentos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={empregadoFilter} onValueChange={setEmpregadoFilter}>
              <SelectTrigger className="w-[200px]">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Empregado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Empregados</SelectItem>
                {empregados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Abas */}
      <div className="flex flex-wrap gap-2 mb-2">
        <Button
          variant={activeTab === 'concluidas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('concluidas')}
          className={activeTab === 'concluidas' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Ações Concluídas ({counts.concluidas})
        </Button>
        <Button
          variant={activeTab === 'evidencias_pendentes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('evidencias_pendentes')}
          className={activeTab === 'evidencias_pendentes' ? 'bg-amber-600 hover:bg-amber-700' : ''}
        >
          <Clock className="h-4 w-4 mr-1" />
          Evidências Pendentes ({counts.pendentes})
        </Button>
        <Button
          variant={activeTab === 'evidencias_devolvidas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('evidencias_devolvidas')}
          className={activeTab === 'evidencias_devolvidas' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Evidências Devolvidas ({counts.devolvidas})
        </Button>
      </div>

      {/* Conteúdo das abas */}
      <div className="space-y-4">
        {/* Ações Concluídas */}
        {activeTab === 'concluidas' && (
          <>
            {loadingConcluidas ? (
              <Card className="text-center py-8">
                <p className="text-gray-600">Carregando ações concluídas...</p>
              </Card>
            ) : filteredAcoes.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-gray-600">Nenhuma ação concluída encontrada</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredAcoes.map((acao: any) => (
                  <Card key={acao.id} className="border-green-200 bg-green-50/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{acao.titulo}</CardTitle>
                          <CardDescription className="space-y-1 mt-1">
                            <span className="flex items-center gap-1 text-xs">
                              <User className="h-3 w-3" />
                              Empregado: <strong>{acao.empregadoNome || 'Não informado'}</strong>
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <Building2 className="h-3 w-3" />
                              Depto: {acao.departamentoNome || 'Não informado'}
                            </span>
                            {acao.liderNome && (
                              <span className="flex items-center gap-1 text-xs">
                                <User className="h-3 w-3" />
                                Líder: {acao.liderNome}
                              </span>
                            )}
                            {acao.pdiTitulo && (
                              <span className="flex items-center gap-1 text-xs">
                                <FileText className="h-3 w-3" />
                                PDI: {acao.pdiTitulo}
                              </span>
                            )}
                            {acao.macroCompetencia && (
                              <span className="flex items-center gap-1 text-xs">
                                <Target className="h-3 w-3" />
                                Competência: {acao.macroCompetencia}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              Prazo: {acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-green-700 font-semibold">
                              <CheckCircle className="h-3 w-3" />
                              Concluída em: {acao.dataConclusao ? new Date(acao.dataConclusao).toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Concluída
                        </Badge>
                      </div>
                    </CardHeader>
                    {acao.descricao && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600 line-clamp-2">{typeof acao.descricao === 'string' ? stripHtml(acao.descricao) : ''}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Evidências Pendentes */}
        {activeTab === 'evidencias_pendentes' && (
          <>
            {loadingEvidences ? (
              <Card className="text-center py-8">
                <p className="text-gray-600">Carregando evidências pendentes...</p>
              </Card>
            ) : filteredPendentes.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-gray-600">Nenhuma evidência pendente encontrada</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredPendentes.map((evidence: any) => (
                  <Card key={evidence.id} className="border-amber-200 bg-amber-50/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{evidence.acao?.titulo || "Ação desconhecida"}</CardTitle>
                          <CardDescription className="space-y-1 mt-1">
                            <span className="block">Enviada por: <strong>{evidence.solicitante?.name || "Desconhecido"}</strong></span>
                            <span className="flex items-center gap-1 text-xs">
                              <Building2 className="h-3 w-3" />
                              Depto: {evidence.solicitante?.departamento || 'Não informado'}
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <User className="h-3 w-3" />
                              Líder: {evidence.solicitante?.liderNome || 'Não informado'}
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              Enviada em: {evidence.createdAt ? new Date(evidence.createdAt).toLocaleDateString('pt-BR') + ' às ' + new Date(evidence.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </span>
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm font-semibold text-gray-700">Descrição:</p>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-3">{evidence.descricao ? stripHtml(evidence.descricao) : "Sem descrição"}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Evidências Devolvidas */}
        {activeTab === 'evidencias_devolvidas' && (
          <>
            {loadingEvidences ? (
              <Card className="text-center py-8">
                <p className="text-gray-600">Carregando evidências devolvidas...</p>
              </Card>
            ) : filteredDevolvidas.length === 0 ? (
              <Card className="text-center py-8">
                <p className="text-gray-600">Nenhuma evidência devolvida encontrada</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredDevolvidas.map((evidence: any) => (
                  <Card key={evidence.id} className="border-red-200 bg-red-50/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{evidence.acao?.titulo || "Ação desconhecida"}</CardTitle>
                          <CardDescription className="space-y-1 mt-1">
                            <span className="block">Enviada por: <strong>{evidence.solicitante?.name || "Desconhecido"}</strong></span>
                            <span className="flex items-center gap-1 text-xs">
                              <Building2 className="h-3 w-3" />
                              Depto: {evidence.solicitante?.departamento || 'Não informado'}
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <User className="h-3 w-3" />
                              Líder: {evidence.solicitante?.liderNome || 'Não informado'}
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              Enviada em: {evidence.createdAt ? new Date(evidence.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-red-700 font-semibold">
                              <XCircle className="h-3 w-3" />
                              Devolvida em: {evidence.evaluatedAt ? new Date(evidence.evaluatedAt).toLocaleDateString('pt-BR') + ' às ' + new Date(evidence.evaluatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </span>
                            {evidence.avaliador?.name && (
                              <span className="flex items-center gap-1 text-xs">
                                <User className="h-3 w-3" />
                                Avaliado por: {evidence.avaliador.name}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Devolvida
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Descrição:</p>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-3">{evidence.descricao ? stripHtml(evidence.descricao) : "Sem descrição"}</div>
                      </div>
                      {evidence.justificativaRejeicao && (
                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm font-semibold text-red-700">Motivo da Devolução:</p>
                          <div className="text-sm text-red-600 mt-1"><RichTextDisplay content={evidence.justificativaRejeicao} /></div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
