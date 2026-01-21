import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, XCircle, Clock, FileText, Filter, Search, AlertTriangle, Eye, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MinhasPendencias() {
  const authData = useAuth();
  const user = authData?.user;
  const userId = user?.id;

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [selectedAcao, setSelectedAcao] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Buscando as ações reais
  const { data: acoes, isLoading } = trpc.actions.list.useQuery(
    undefined,
    { enabled: !!userId }
  );

  // Filtrando para garantir que mostra apenas as ações do usuário logado
  const minhasAcoes = useMemo(() => {
    if (!acoes || !userId) return [];
    return acoes.filter((acao: any) => String(acao.responsavelId) === String(userId));
  }, [acoes, userId]);

  // Filtrar ações com base em busca e status
  const filteredAcoes = useMemo(() => {
    return minhasAcoes.filter((acao: any) => {
      // Filtro de busca (título ou descrição)
      const matchesSearch =
        searchTerm === "" ||
        acao.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acao.descricao?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status
      const matchesStatus = filterStatus === "todos" || acao.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [minhasAcoes, searchTerm, filterStatus]);

  // Função para obter badge de status
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
      nao_iniciada: { variant: "outline", label: "Não Iniciada", className: "bg-gray-50 text-gray-700 border-gray-300" },
      em_andamento: { variant: "default", label: "Em Andamento", className: "bg-blue-500 text-white" },
      concluida: { variant: "outline", label: "Concluída", className: "bg-green-50 text-green-700 border-green-300" },
      cancelada: { variant: "destructive", label: "Cancelada" },
    };
    const config = variants[status] || variants.nao_iniciada;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  // Função para formatar data
  const formatDate = (date: any) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR");
  };

  // Função para abrir detalhes
  const handleViewDetails = (acao: any) => {
    setSelectedAcao(acao);
    setShowDetailsDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
          Minhas Ações
        </h1>
        <p className="text-muted-foreground">
          Acompanhe o andamento das suas ações do PDI.
        </p>
      </div>

      {/* Filtros e Busca */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Busca por Título */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro de Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="nao_iniciada">Não Iniciada</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            Exibindo <strong>{filteredAcoes.length}</strong> de <strong>{minhasAcoes.length}</strong> ações
          </p>
        </CardContent>
      </Card>

      {/* Lista de Ações */}
      {filteredAcoes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhuma ação encontrada</p>
            <p className="text-sm text-muted-foreground mt-2">
              {minhasAcoes.length === 0
                ? "Você ainda não possui ações cadastradas."
                : "Nenhuma ação corresponde aos filtros selecionados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAcoes.map((acao: any) => (
            <Card key={acao.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{acao.titulo}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {acao.descricao || "Sem descrição"}
                    </CardDescription>
                  </div>
                  <div className="ml-4">
                    {getStatusBadge(acao.status)}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {/* Prazo */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Prazo</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <p className="text-sm font-medium">{formatDate(acao.prazo)}</p>
                    </div>
                  </div>

                  {/* Macro Competência */}
                  {acao.macroId && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Macro</p>
                      <p className="text-sm font-medium mt-1">{acao.macroId}</p>
                    </div>
                  )}

                  {/* Micro Competência */}
                  {acao.microcompetencia && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Micro</p>
                      <p className="text-sm font-medium mt-1 truncate">{acao.microcompetencia}</p>
                    </div>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(acao)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Detalhes */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAcao?.titulo}</DialogTitle>
            <DialogDescription>
              Detalhes completos da ação
            </DialogDescription>
          </DialogHeader>

          {selectedAcao && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                <p className="mt-1">{selectedAcao.descricao || "Sem descrição"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedAcao.status)}</div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prazo</p>
                  <p className="mt-1">{formatDate(selectedAcao.prazo)}</p>
                </div>

                {selectedAcao.macroId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Macro Competência</p>
                    <p className="mt-1">{selectedAcao.macroId}</p>
                  </div>
                )}

                {selectedAcao.microcompetencia && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Micro Competência</p>
                    <p className="mt-1">{selectedAcao.microcompetencia}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
