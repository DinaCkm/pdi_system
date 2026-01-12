import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

type DepartamentoFormData = {
  nome: string;
  descricao: string;
  leaderId?: number | undefined;
};

export default function Departamentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDepartamento, setSelectedDepartamento] = useState<any>(null);
  const [formData, setFormData] = useState<DepartamentoFormData>({
    nome: "",
    descricao: "",
    leaderId: undefined,
  });

  const { data: departamentos, isLoading, refetch } = trpc.departamentos.list.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const createMutation = trpc.departamentos.create.useMutation();
  const updateMutation = trpc.departamentos.update.useMutation();
  const deleteMutation = trpc.departamentos.delete.useMutation();

  const filteredDepartamentos = departamentos?.filter((dept) =>
    dept.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      toast.success("Departamento criado com sucesso!");
      setIsCreateOpen(false);
      setFormData({ nome: "", descricao: "", leaderId: undefined });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar departamento");
    }
  };

  const handleEdit = (dept: any) => {
    setSelectedDepartamento(dept);
    setFormData({
      nome: dept.nome,
      descricao: dept.descricao || "",
      leaderId: dept.leaderId || null,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedDepartamento.id,
        ...formData,
      });
      toast.success("Departamento atualizado com sucesso!");
      setIsEditOpen(false);
      setSelectedDepartamento(null);
      setFormData({ nome: "", descricao: "", leaderId: undefined });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar departamento");
    }
  };

  const handleToggleStatus = async (dept: any) => {
    const newStatus = dept.status === "ativo" ? "inativo" : "ativo";
    try {
      await updateMutation.mutateAsync({
        id: dept.id,
        status: newStatus,
      });
      toast.success(`Departamento ${newStatus === "ativo" ? "ativado" : "desativado"} com sucesso!`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: selectedDepartamento.id });
      toast.success("Departamento excluído com sucesso!");
      setIsDeleteOpen(false);
      setSelectedDepartamento(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir departamento");
    }
  };

  const openDeleteDialog = (dept: any) => {
    setSelectedDepartamento(dept);
    setIsDeleteOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Departamentos</h1>
            <p className="text-muted-foreground">
              Gerencie os departamentos da organização
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Departamento
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Líder</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredDepartamentos && filteredDepartamentos.length > 0 ? (
                filteredDepartamentos.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {dept.descricao || "-"}
                    </TableCell>
                    <TableCell>
                      {dept.leaderId ? (
                        users?.find(u => u.id === dept.leaderId)?.name || "-"
                      ) : (
                        <span className="text-muted-foreground italic">Sem líder</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={dept.status === "ativo" ? "default" : "secondary"}>
                        {dept.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(dept)}
                          title={dept.status === "ativo" ? "Desativar" : "Ativar"}
                        >
                          {dept.status === "ativo" ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(dept)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {searchTerm
                      ? "Nenhum departamento encontrado com esse termo de busca"
                      : "Nenhum departamento cadastrado"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de Criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Departamento</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo departamento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Tecnologia da Informação"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do departamento (opcional)"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leader">Líder do Departamento</Label>
              <select
                id="leader"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.leaderId?.toString() || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    leaderId: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              >
                <option value="">Nenhum líder atribuído</option>
                {users?.filter(u => u.status === "ativo" && (u.role === "admin" || u.role === "lider")).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === "admin" ? "Admin" : "Líder"})
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                Todos os usuários deste departamento terão este líder automaticamente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Departamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Departamento</DialogTitle>
            <DialogDescription>
              Atualize os dados do departamento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-leader">Líder do Departamento</Label>
              <select
                id="edit-leader"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.leaderId?.toString() || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    leaderId: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              >
                <option value="">Nenhum líder atribuído</option>
                {users?.filter(u => u.status === "ativo" && (u.role === "admin" || u.role === "lider")).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role === "admin" ? "Admin" : "Líder"})
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                Ao mudar o líder, todos os usuários deste departamento terão o novo líder
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o departamento{" "}
              <strong>{selectedDepartamento?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
