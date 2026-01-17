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
  const [editForm, setEditForm] = useState({ nome: '', descricao: '' });

  // Queries
  const { data: micros = [] } = trpc.competencias.getMicrosWithFilters.useQuery({
    blocoNome: filters.blocoNome || undefined,
    macroNome: filters.macroNome || undefined,
    microNome: filters.microNome || undefined,
    status: (filters.status as 'ativo' | 'inativo') || undefined,
  });

  const { data: blocos = [] } = trpc.competencias.listBlocos.useQuery();
  const { data: macros = [] } = trpc.competencias.listAllMacros.useQuery();

  // Contar dependências ativas
  const activeMicrosByMacro = useMemo(() => {
    const counts: Record<number, number> = {};
    micros.forEach((micro) => {
      if (micro.microStatus === 'ativo') {
        counts[micro.macroId] = (counts[micro.macroId] || 0) + 1;
      }
    });
    return counts;
  }, [micros]);

  const activeMacrosByBloco = useMemo(() => {
    const counts: Record<number, number> = {};
    macros.forEach((macro) => {
      if (macro.status === 'ativo') {
        counts[macro.blocoId] = (counts[macro.blocoId] || 0) + 1;
      }
    });
    return counts;
  }, [macros]);

  // Mutations
  const inativarMicroMutation = trpc.competencias.inativarMicro.useMutation({
    onSuccess: () => {
      toast.success('Micro-competência inativada');
      setShowConfirmDialog(false);
      setSelectedMicro(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const editarMicroMutation = trpc.competencias.editarMicro.useMutation({
    onSuccess: () => {
      toast.success('Micro-competência atualizada');
      setShowEditDialog(false);
      setEditingMicro(null);
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

  const getStatusBadge = (status: string) => {
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
                <SelectItem key={macro.id} value={macro.nome}>
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
          <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
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
            {micros.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Nenhuma competência encontrada
                </TableCell>
              </TableRow>
            ) : (
              micros.map((micro) => (
                <TableRow key={micro.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{micro.blocoNome}</TableCell>
                  <TableCell>{micro.macroNome}</TableCell>
                  <TableCell>{micro.microNome}</TableCell>
                  <TableCell>{getStatusBadge(micro.microStatus)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditar(micro)}
                      className="inline-flex items-center gap-1"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInativar(micro)}
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Confirmação - Inativar */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Inativar Micro-Competência</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar <strong>{selectedMicro?.microNome}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmInativar}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Inativar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Edição */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>✏️ Editar Micro-Competência</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                placeholder="Digite o novo nome"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Input
                value={editForm.descricao}
                onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
                placeholder="Digite a descrição"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEditar}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Salvar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
