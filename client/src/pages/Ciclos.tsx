import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Ciclos() {
  const utils = trpc.useUtils();
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cicloToDelete, setCicloToDelete] = useState<number | null>(null);
  
  // Estados para edição
  const [editingCiclo, setEditingCiclo] = useState<any>(null);
  
  // Estados para formulário
  const [form, setForm] = useState({ 
    nome: "", 
    dataInicio: "", 
    dataFim: "" 
  });
  
  // Estados para busca
  const [search, setSearch] = useState("");

  // Queries
  const { data: ciclos, isLoading } = trpc.ciclos.list.useQuery();

  // Mutations
  const createMutation = trpc.ciclos.create.useMutation({
    onSuccess: () => {
      utils.ciclos.list.invalidate();
      toast.success("Ciclo criado com sucesso!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar ciclo");
    },
  });

  const updateMutation = trpc.ciclos.update.useMutation({
    onSuccess: () => {
      utils.ciclos.list.invalidate();
      toast.success("Ciclo atualizado com sucesso!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar ciclo");
    },
  });

  const deleteMutation = trpc.ciclos.delete.useMutation({
    onSuccess: () => {
      utils.ciclos.list.invalidate();
      toast.success("Ciclo excluído com sucesso!");
      setDeleteDialogOpen(false);
      setCicloToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir ciclo");
    },
  });

  // Funções auxiliares
  const resetForm = () => {
    setForm({ nome: "", dataInicio: "", dataFim: "" });
    setEditingCiclo(null);
  };

  const handleEdit = (ciclo: any) => {
    setEditingCiclo(ciclo);
    setForm({
      nome: ciclo.nome,
      dataInicio: new Date(ciclo.dataInicio).toISOString().split('T')[0],
      dataFim: new Date(ciclo.dataFim).toISOString().split('T')[0],
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setCicloToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (cicloToDelete) {
      deleteMutation.mutate({ id: cicloToDelete });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.nome || !form.dataInicio || !form.dataFim) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingCiclo) {
      updateMutation.mutate({
        id: editingCiclo.id,
        ...form,
      });
    } else {
      createMutation.mutate(form);
    }
  };

  // Determinar status do ciclo
  const getCicloStatus = (ciclo: any) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicio = new Date(ciclo.dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(ciclo.dataFim);
    fim.setHours(0, 0, 0, 0);

    if (hoje < inicio) {
      return { label: "Futuro", color: "text-blue-600", icon: Clock, bg: "bg-blue-50" };
    } else if (hoje >= inicio && hoje <= fim) {
      return { label: "Ativo", color: "text-green-600", icon: CheckCircle2, bg: "bg-green-50" };
    } else {
      return { label: "Encerrado", color: "text-gray-600", icon: XCircle, bg: "bg-gray-50" };
    }
  };

  // Filtrar ciclos
  const filteredCiclos = ciclos?.filter(ciclo =>
    ciclo.nome.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Ordenar ciclos (mais recente primeiro)
  const sortedCiclos = [...filteredCiclos].sort((a, b) => {
    return new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime();
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              Ciclos Semestrais
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os períodos semestrais do sistema de PDI
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600">
                <Plus className="mr-2 h-4 w-4" />
                Novo Ciclo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCiclo ? "Editar Ciclo" : "Novo Ciclo"}</DialogTitle>
                <DialogDescription>
                  {editingCiclo ? "Atualize as informações do ciclo semestral" : "Crie um novo ciclo semestral"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome do Ciclo *</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Ex: 1º Semestre 2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataInicio">Data de Início *</Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim">Data de Fim *</Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={form.dataFim}
                    onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                    ) : (
                      editingCiclo ? "Atualizar" : "Criar"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Lista de Ciclos
            </CardTitle>
            <CardDescription>
              Visualize e gerencie todos os ciclos semestrais cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Buscar por nome do ciclo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Data de Início</TableHead>
                    <TableHead>Data de Fim</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCiclos && sortedCiclos.length > 0 ? (
                    sortedCiclos.map((ciclo) => {
                      const status = getCicloStatus(ciclo);
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={ciclo.id}>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg}`}>
                              <StatusIcon className={`h-4 w-4 ${status.color}`} />
                              <span className={`text-sm font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{ciclo.nome}</TableCell>
                          <TableCell>{new Date(ciclo.dataInicio).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{new Date(ciclo.dataFim).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(ciclo)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(ciclo.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {search ? 'Nenhum ciclo encontrado com esse filtro' : 'Nenhum ciclo cadastrado'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este ciclo? Esta ação não pode ser desfeita.
              Todos os PDIs vinculados a este ciclo também serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
