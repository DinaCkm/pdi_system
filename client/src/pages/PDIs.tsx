import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Eye, Edit, Trash2, FileText, Target, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Controller, useForm } from "react-hook-form";

type PDIFormData = {
  colaboradorId: number;
  cicloId: number;
  titulo: string;
  objetivoGeral?: string;
};

type BulkPDIFormData = {
  cicloId: number;
  titulo: string;
  objetivoGeral?: string;
};

export default function PDIs() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirecionar se não for Admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      if (user.role === "lider") {
        setLocation("/pdis-equipe");
      } else {
        setLocation("/meu-pdi");
      }
    }
  }, [user, setLocation]);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkCreateDialog, setShowBulkCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPDI, setSelectedPDI] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterColaborador, setFilterColaborador] = useState<string>("todos");
  const [filterCiclo, setFilterCiclo] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const utils = trpc.useUtils();
  const { data: pdis, isLoading } = trpc.pdis.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const { data: ciclos } = trpc.ciclos.list.useQuery();
  const { data: actions } = trpc.actions.list.useQuery();

  const createMutation = trpc.pdis.create.useMutation({
    onSuccess: async () => {
      toast.success("PDI criado com sucesso!");
      await utils.pdis.list.invalidate();
      setShowCreateDialog(false);
      // reset() movido para onOpenChange
    },
    onError: (error) => {
      toast.error(`Erro ao criar PDI: ${error.message}`);
    },
  });

  const deleteMutation = trpc.pdis.delete.useMutation({
    onSuccess: async () => {
      toast.success("PDI excluído com sucesso!");
      await utils.pdis.list.invalidate();
      setShowDeleteDialog(false);
      setSelectedPDI(null);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir PDI: ${error.message}`);
    },
  });

  const createBulkMutation = (trpc.pdis as any).createBulk.useMutation({
    onSuccess: async (result: { success: boolean; created: number; skipped: number; total: number }) => {
      toast.success(`${result.created} PDIs criados com sucesso! (${result.skipped} já existiam)`);
      await utils.pdis.list.invalidate();
      setShowBulkCreateDialog(false);
      resetBulk();
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar PDIs em lote: ${error.message}`);
    },
  });

  const { control, handleSubmit, reset, watch } = useForm<PDIFormData>();
  const { control: controlBulk, handleSubmit: handleSubmitBulk, reset: resetBulk, watch: watchBulk } = useForm<BulkPDIFormData>();

  const selectedColaboradorId = watch("colaboradorId");
  const selectedCicloId = watch("cicloId");

  // Normalizar para número
  const colaboradorIdNum = typeof selectedColaboradorId === "number" ? selectedColaboradorId : Number(selectedColaboradorId);
  const cicloIdNum = typeof selectedCicloId === "number" ? selectedCicloId : Number(selectedCicloId);

  const onSubmit = (data: PDIFormData) => {
    createMutation.mutate(data);
  };

  const handleDelete = () => {
    if (selectedPDI) {
      deleteMutation.mutate({ id: selectedPDI.id });
    }
  };

  const handleView = (pdi: any) => {
    setSelectedPDI(pdi);
    setShowViewDialog(true);
  };

  const handleDeleteClick = (pdi: any) => {
    setSelectedPDI(pdi);
    setShowDeleteDialog(true);
  };

  // Filtrar colaboradores (apenas líderes e colaboradores)
  const colaboradores = users?.filter(u => u.role === "colaborador" || u.role === "lider") || [];

  // Filtrar PDIs
  const filteredPDIs = pdis?.filter(pdi => {
    const colaborador = users?.find(u => u.id === pdi.colaboradorId);
    const ciclo = ciclos?.find(c => c.id === pdi.cicloId);
    
    const matchSearch = searchTerm === "" || 
      pdi.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      colaborador?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchColaborador = filterColaborador === "todos" || pdi.colaboradorId === parseInt(filterColaborador);
    const matchCiclo = filterCiclo === "todos" || pdi.cicloId === parseInt(filterCiclo);
    const matchStatus = filterStatus === "todos" || pdi.status === filterStatus;

    return matchSearch && matchColaborador && matchCiclo && matchStatus;
  }) || [];

  // Verificar se já existe PDI para o colaborador/ciclo selecionado
  const pdiExistente = pdis?.find(
    p => p.colaboradorId === colaboradorIdNum && p.cicloId === cicloIdNum
  );

  // Contar ações por PDI
  const getAcoesCount = (pdiId: number) => {
    return actions?.filter(a => a.pdiId === pdiId).length || 0;
  };

  // Obter nome do colaborador
  const getColaboradorNome = (id: number) => {
    return users?.find(u => u.id === id)?.name || "Desconhecido";
  };

  // Obter nome do ciclo
  const getCicloNome = (id: number) => {
    return ciclos?.find(c => c.id === id)?.nome || "Desconhecido";
  };

  // Obter badge de status
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      em_andamento: { label: "Em Andamento", className: "bg-blue-100 text-blue-700" },
      concluido: { label: "Concluído", className: "bg-green-100 text-green-700" },
      cancelado: { label: "Cancelado", className: "bg-gray-100 text-gray-700" },
    };
    const config = variants[status] || { label: status, className: "" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            Gestão de PDIs
          </h1>
          <p className="text-muted-foreground mt-1">
            Planos de Desenvolvimento Individual dos colaboradores
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-blue-600 to-orange-500">
            <Plus className="w-4 h-4 mr-2" />
            Novo PDI
          </Button>
          <Button onClick={() => setShowBulkCreateDialog(true)} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
            <FileText className="w-4 h-4 mr-2" />
            Criar em Lote
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Buscar por título ou colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Colaborador</Label>
              <Select value={filterColaborador} onValueChange={setFilterColaborador}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ciclo</Label>
              <Select value={filterCiclo} onValueChange={setFilterCiclo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ciclos?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de PDIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPDIs.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {searchTerm || filterColaborador !== "todos" || filterCiclo !== "todos" || filterStatus !== "todos"
                  ? "Nenhum PDI encontrado com os filtros aplicados."
                  : "Nenhum PDI cadastrado ainda. Clique em 'Novo PDI' para criar o primeiro."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPDIs.map((pdi) => (
            <Card key={pdi.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{pdi.titulo}</CardTitle>
                    <CardDescription className="mt-1">
                      {getColaboradorNome(pdi.colaboradorId)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(pdi.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Target className="w-4 h-4 mr-2" />
                    {getCicloNome(pdi.cicloId)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 mr-2" />
                    {getAcoesCount(pdi.id)} ações vinculadas
                  </div>
                  {pdi.objetivoGeral && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {pdi.objetivoGeral}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleView(pdi)} className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(pdi)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog de Criação */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) reset(); // reset só ao fechar
        }}
      >
        <DialogContent
          className="max-w-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Criar Novo PDI</DialogTitle>
            <DialogDescription>
              Crie um Plano de Desenvolvimento Individual para um colaborador em um ciclo específico.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Colaborador *</Label>
              <Controller
                name="colaboradorId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {colaboradores.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name} ({c.role === "lider" ? "Líder" : "Colaborador"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>Ciclo *</Label>
              <Controller
                name="cicloId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ciclo" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      {ciclos?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.nome} ({new Date(c.dataInicio).toLocaleDateString()} - {new Date(c.dataFim).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {pdiExistente && selectedColaboradorId && selectedCicloId && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Já existe um PDI para este colaborador neste ciclo: <strong>{pdiExistente.titulo}</strong>
                </p>
              </div>
            )}

            <div>
              <Label>Título do PDI *</Label>
              <Controller
                name="titulo"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input {...field} placeholder="Ex: PDI 2024/1 - João Silva" />
                )}
              />
            </div>

            <div>
              <Label>Objetivo Geral</Label>
              <Controller
                name="objetivoGeral"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Descreva o objetivo geral deste PDI..."
                    rows={4}
                  />
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || (!!pdiExistente && !!colaboradorIdNum && !!cicloIdNum)}
                className="bg-gradient-to-r from-blue-600 to-orange-500"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar PDI
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent
          className="max-w-3xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{selectedPDI?.titulo}</DialogTitle>
            <DialogDescription>
              Detalhes do Plano de Desenvolvimento Individual
            </DialogDescription>
          </DialogHeader>
          {selectedPDI && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Colaborador</Label>
                  <p className="font-medium">{getColaboradorNome(selectedPDI.colaboradorId)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ciclo</Label>
                  <p className="font-medium">{getCicloNome(selectedPDI.cicloId)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPDI.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ações Vinculadas</Label>
                  <p className="font-medium">{getAcoesCount(selectedPDI.id)} ações</p>
                </div>
              </div>
              {selectedPDI.objetivoGeral && (
                <div>
                  <Label className="text-muted-foreground">Objetivo Geral</Label>
                  <p className="mt-1">{selectedPDI.objetivoGeral}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Criado em</Label>
                <p className="text-sm">{new Date(selectedPDI.createdAt).toLocaleString()}</p>
              </div>
              
              {/* Lista de Ações Vinculadas */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-muted-foreground">Ações Vinculadas ({getAcoesCount(selectedPDI.id)})</Label>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setShowViewDialog(false);
                      window.location.href = `/acoes?pdiId=${selectedPDI.id}`;
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Ação
                  </Button>
                </div>
                {actions && actions.filter((a: any) => a.pdiId === selectedPDI.id).length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {actions.filter((a: any) => a.pdiId === selectedPDI.id).map((acao: any) => (
                      <div key={acao.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-muted-foreground" />
                            <p className="font-medium text-sm">{acao.nome}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Prazo: {new Date(acao.prazo).toLocaleDateString()} • Status: {acao.status}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setShowViewDialog(false);
                            window.location.href = `/acoes?acaoId=${acao.id}`;
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma ação vinculada ainda.</p>
                    <p className="text-xs mt-1">Clique em "Adicionar Ação" para criar a primeira.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criação em Lote */}
      <Dialog open={showBulkCreateDialog} onOpenChange={(open) => {
        setShowBulkCreateDialog(open);
        if (!open) resetBulk();
      }}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Criar PDIs em Lote</DialogTitle>
            <DialogDescription>
              Criar PDI para todos os colaboradores ativos em um ciclo específico
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitBulk((data) => createBulkMutation.mutate(data))} className="space-y-4">
            <div>
              <Label>Ciclo *</Label>
              <Controller
                name="cicloId"
                control={controlBulk}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ciclo" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {ciclos?.map(ciclo => (
                        <SelectItem key={ciclo.id} value={ciclo.id.toString()}>
                          {ciclo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>Título do PDI *</Label>
              <Controller
                name="titulo"
                control={controlBulk}
                rules={{ required: true }}
                render={({ field }) => (
                  <Input {...field} placeholder="Ex: PDI- 1º Ciclo 2066 - Foco: Desenvolvimento Técnico e Prático" />
                )}
              />
            </div>

            <div>
              <Label>Objetivo Geral (Opcional)</Label>
              <Controller
                name="objetivoGeral"
                control={controlBulk}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="Objetivo geral que será aplicado a todos os PDIs..."
                    rows={4}
                  />
                )}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                💡 Serão criados PDIs para todos os colaboradores e líderes ativos que ainda não possuem PDI neste ciclo.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBulkCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createBulkMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-orange-500"
              >
                {createBulkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar PDIs em Lote
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o PDI <strong>{selectedPDI?.titulo}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Esta ação não pode ser desfeita. Todas as ações vinculadas a este PDI também serão excluídas.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir PDI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
