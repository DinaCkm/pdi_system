import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Pencil, Power } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CompetenciaHierarquia {
  blocoId: number;
  blocoNome: string;
  blocoStatus: string;
  macroId: number | null;
  macroNome: string | null;
  macroStatus: string | null;
  microId: number | null;
  microNome: string | null;
  microStatus: string | null;
}

interface MicroCompetencia {
  id: number;
  microNome: string;
  microStatus: string;
  macroId: number;
  macroNome: string;
  blocoId: number;
  blocoNome: string;
}

export function MatrizCompetenciasConsolidada() {
  const utils = trpc.useUtils();
  const [filters, setFilters] = useState({
    blocoNome: '',
    macroNome: '',
    microNome: '',
    status: '',
  });
  const [selectedMicro, setSelectedMicro] = useState<MicroCompetencia | null>(null);
  const [editingMicro, setEditingMicro] = useState<MicroCompetencia | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [editForm, setEditForm] = useState({ nome: '', descricao: '' });

  // Query da hierarquia completa
  const { data: hierarquia = [] } = trpc.competencias.getCompetenciasHierarchy.useQuery({
    blocoNome: filters.blocoNome || undefined,
    macroNome: filters.macroNome || undefined,
    microNome: filters.microNome || undefined,
    status: (filters.status as 'ativo' | 'inativo') || undefined,
  });

  // Extrair blocos únicos
  const blocos = useMemo(() => {
    const uniqueBlocos = new Map();
    hierarquia.forEach((item) => {
      if (item.blocoId && !uniqueBlocos.has(item.blocoId)) {
        uniqueBlocos.set(item.blocoId, {
          id: item.blocoId,
          nome: item.blocoNome,
          status: item.blocoStatus,
        });
      }
    });
    return Array.from(uniqueBlocos.values());
  }, [hierarquia]);

  // Extrair macros únicas
  const macros = useMemo(() => {
    const uniqueMacros = new Map();
    hierarquia.forEach((item) => {
      if (item.macroId && !uniqueMacros.has(item.macroId)) {
        uniqueMacros.set(item.macroId, {
          id: item.macroId,
          nome: item.macroNome,
          status: item.macroStatus,
          blocoId: item.blocoId,
        });
      }
    });
    return Array.from(uniqueMacros.values());
  }, [hierarquia]);

  // Mutations
  const inativarMicroMutation = trpc.competencias.inativarMicro.useMutation({
    onSuccess: () => {
      toast.success('Micro-competência inativada');
      setShowConfirmDialog(false);
      setSelectedMicro(null);
      utils.competencias.getCompetenciasHierarchy.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const editarMicroMutation = trpc.competencias.editarMicro.useMutation({
    onSuccess: () => {
      toast.success('Micro-competencia atualizada');
      setShowEditDialog(false);
      setEditingMicro(null);
      utils.competencias.getCompetenciasHierarchy.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const ativarMicroMutation = trpc.competencias.ativarMicro.useMutation({
    onSuccess: () => {
      toast.success('Micro-competencia ativada');
      setShowActivateDialog(false);
      setSelectedMicro(null);
      utils.competencias.getCompetenciasHierarchy.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleInativar = (micro: MicroCompetencia) => {
    setSelectedMicro(micro);
    setShowConfirmDialog(true);
  };

  const handleConfirmInativar = () => {
    if (selectedMicro) {
      inativarMicroMutation.mutate({ id: selectedMicro.id });
    }
  };

  const handleAtivar = (micro: MicroCompetencia) => {
    setSelectedMicro(micro);
    setShowActivateDialog(true);
  };

  const handleConfirmAtivar = () => {
    if (selectedMicro) {
      ativarMicroMutation.mutate({ id: selectedMicro.id });
    }
  };

  const handleEditar = (micro: MicroCompetencia) => {
    setEditingMicro(micro);
    setEditForm({ nome: micro.microNome, descricao: '' });
    setShowEditDialog(true);
  };

  const handleConfirmEditar = () => {
    if (editingMicro && editForm.nome.trim()) {
      editarMicroMutation.mutate({
        id: editingMicro.id,
        nome: editForm.nome,
        descricao: editForm.descricao || undefined,
      });
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'ativo') {
      return <Badge className="bg-green-100 text-green-800">✅ Ativo</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">✗ Inativo</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium">Filtrar por Bloco</label>
          <Select value={filters.blocoNome} onValueChange={(v) => handleFilterChange('blocoNome', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os Blocos" />
            </SelectTrigger>
            <SelectContent>
              {blocos.map((bloco) => (
                <SelectItem key={bloco.id} value={bloco.nome}>
                  {bloco.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Filtrar por Macro</label>
          <Select value={filters.macroNome} onValueChange={(v) => handleFilterChange('macroNome', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as Macros" />
            </SelectTrigger>
            <SelectContent>
              {macros.map((macro) => (
                <SelectItem key={macro.id} value={macro.nome || ''}>
                  {macro.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Buscar Micro</label>
          <Input
            placeholder="Digite o nome da micro..."
            value={filters.microNome}
            onChange={(e) => handleFilterChange('microNome', e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Filtrar por Status</label>
          <Select key={`status-filter-${filters.status}`} value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
              <SelectItem value="ativo">Ativas</SelectItem>
              <SelectItem value="inativo">Inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">Bloco</TableHead>
              <TableHead className="font-semibold">Macro</TableHead>
              <TableHead className="font-semibold">Micro</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarquia.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Nenhuma competência encontrada
                </TableCell>
              </TableRow>
            ) : (
              hierarquia.map((item, index) => (
                <TableRow key={`${item.blocoId}-${item.macroId}-${item.microId}-${index}`} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{item.blocoNome}</TableCell>
                  <TableCell>{item.macroNome || '-'}</TableCell>
                  <TableCell>{item.microNome || '-'}</TableCell>
                  <TableCell>
                    {item.microStatus ? (
                      getStatusBadge(item.microStatus)
                    ) : item.macroStatus ? (
                      getStatusBadge(item.macroStatus)
                    ) : (
                      getStatusBadge(item.blocoStatus)
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {item.microId && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const micro: MicroCompetencia = {
                              id: item.microId!,
                              microNome: item.microNome!,
                              microStatus: item.microStatus!,
                              macroId: item.macroId!,
                              macroNome: item.macroNome!,
                              blocoId: item.blocoId,
                              blocoNome: item.blocoNome,
                            };
                            handleEditar(micro);
                          }}
                          className="inline-flex items-center gap-1"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </Button>
                        {item.microStatus === 'ativo' ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const micro: MicroCompetencia = {
                                      id: item.microId!,
                                      microNome: item.microNome!,
                                      microStatus: item.microStatus!,
                                      macroId: item.macroId!,
                                      macroNome: item.macroNome!,
                                      blocoId: item.blocoId,
                                      blocoNome: item.blocoNome,
                                    };
                                    handleInativar(micro);
                                  }}
                                  className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                                >
                                  <Power className="w-4 h-4" />
                                  Inativar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Inativar esta Microcompetência</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const micro: MicroCompetencia = {
                                      id: item.microId!,
                                      microNome: item.microNome!,
                                      microStatus: item.microStatus!,
                                      macroId: item.macroId!,
                                      macroNome: item.macroNome!,
                                      blocoId: item.blocoId,
                                      blocoNome: item.blocoNome,
                                    };
                                    handleAtivar(micro);
                                  }}
                                  className="inline-flex items-center gap-1 text-green-600 hover:text-green-700"
                                >
                                  <Power className="w-4 h-4" />
                                  Ativar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ativar esta Microcompetência</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar Microcompetência</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar "{selectedMicro?.microNome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmInativar} className="bg-orange-600 hover:bg-orange-700">
              Inativar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ativar Microcompetência</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja ativar "{selectedMicro?.microNome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAtivar} className="bg-green-600 hover:bg-green-700">
              Ativar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Microcompetência</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                placeholder="Nome da microcompetência"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                placeholder="Descrição (opcional)"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEditar} className="bg-blue-600 hover:bg-blue-700">
              Salvar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
