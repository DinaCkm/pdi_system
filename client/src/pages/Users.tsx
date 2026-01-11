import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Power, Search, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

type UserFormData = {
  name: string;
  email: string;
  cpf: string;
  role: "admin" | "lider" | "colaborador";
  cargo: string;
  leaderId?: number;
};

export default function Users() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: 'delete' | 'toggle'; userId?: number; currentStatus?: string }>({ open: false, type: 'delete' });
  const ITEMS_PER_PAGE = 10;

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const createMutation = trpc.users.create.useMutation();
  const updateMutation = trpc.users.update.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();

  const { register, handleSubmit, reset, watch, setValue } = useForm<UserFormData>();
  const selectedRole = watch("role");

  const onSubmit = async (data: UserFormData) => {
    try {
      if (editingUser) {
        await updateMutation.mutateAsync({ id: editingUser.id, ...data });
        toast.success("Usuário atualizado com sucesso!");
        setEditingUser(null);
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Usuário criado com sucesso!");
        setIsCreateOpen(false);
      }
      reset();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar usuário");
    }
  };

  const handleDelete = async () => {
    if (!confirmDialog.userId) return;
    
    try {
      await deleteMutation.mutateAsync({ id: confirmDialog.userId });
      toast.success("Usuário excluído com sucesso!");
      setConfirmDialog({ open: false, type: 'delete' });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir usuário");
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setValue("name", user.name);
    setValue("email", user.email);
    setValue("cpf", user.cpf);
    setValue("role", user.role);
    setValue("cargo", user.cargo);
    setValue("leaderId", user.leaderId);
  };

  const handleToggleStatus = async () => {
    if (!confirmDialog.userId || !confirmDialog.currentStatus) return;
    
    const newStatus = confirmDialog.currentStatus === "ativo" ? "inativo" : "ativo";
    const action = newStatus === "ativo" ? "ativado" : "inativado";
    
    try {
      await updateMutation.mutateAsync({ id: confirmDialog.userId, status: newStatus });
      toast.success(`Usuário ${action} com sucesso!`);
      setConfirmDialog({ open: false, type: 'toggle' });
      refetch();
    } catch (error: any) {
      toast.error(error.message || `Erro ao ${action === "ativado" ? "ativar" : "inativar"} usuário`);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      admin: "destructive",
      lider: "default",
      colaborador: "secondary",
    };
    const labels: Record<string, string> = {
      admin: "Administrador",
      lider: "Líder",
      colaborador: "Colaborador",
    };
    return <Badge variant={variants[role] || "default"}>{labels[role] || role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return status === "ativo" ? (
      <Badge variant="default" className="bg-green-500">Ativo</Badge>
    ) : (
      <Badge variant="secondary">Inativo</Badge>
    );
  };

  // Filtrar usuários por busca
  const filteredUsers = users?.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Paginação
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset para página 1 quando busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie administradores, líderes e colaboradores</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo usuário. CPF deve ser único no sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input id="name" {...register("name", { required: true })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...register("email", { required: true })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input id="cpf" {...register("cpf", { required: true })} placeholder="000.000.000-00" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cargo">Cargo *</Label>
                  <Input id="cargo" {...register("cargo", { required: true })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Perfil *</Label>
                  <Select onValueChange={(value) => setValue("role", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="lider">Líder</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(selectedRole === "lider" || selectedRole === "colaborador") && (
                  <div className="grid gap-2">
                    <Label htmlFor="leaderId">Líder</Label>
                    <Select onValueChange={(value) => setValue("leaderId", parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o líder" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.filter(u => u.role === "lider" || u.role === "admin").map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); reset(); }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar Usuário
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Usuários Cadastrados</CardTitle>
              <CardDescription>
                {filteredUsers.length} de {users?.length || 0} usuários {searchTerm && '(filtrados)'}
              </CardDescription>
            </div>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum usuário encontrado com esse filtro' : 'Nenhum usuário cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.cpf}</TableCell>
                  <TableCell>{user.cargo}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setConfirmDialog({ open: true, type: 'toggle', userId: user.id, currentStatus: user.status })}
                        title={user.status === "ativo" ? "Inativar usuário" : "Ativar usuário"}
                      >
                        <Power className={`w-4 h-4 ${user.status === "ativo" ? "text-green-600" : "text-gray-400"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} title="Editar usuário">
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDialog({ open: true, type: 'delete', userId: user.id })} title="Excluir usuário">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages} ({filteredUsers.length} usuários)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Confirmação */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, type: 'delete' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              {confirmDialog.type === 'delete' ? 'Confirmar Exclusão' : 'Confirmar Alteração de Status'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'delete' 
                ? 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.'
                : `Tem certeza que deseja ${confirmDialog.currentStatus === 'ativo' ? 'inativar' : 'ativar'} este usuário?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.type === 'delete' ? handleDelete : handleToggleStatus}
              className={confirmDialog.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmDialog.type === 'delete' ? 'Excluir' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Edição */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Atualize os dados do usuário
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome Completo *</Label>
                <Input id="edit-name" {...register("name", { required: true })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input id="edit-email" type="email" {...register("email", { required: true })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-cpf">CPF *</Label>
                <Input id="edit-cpf" {...register("cpf", { required: true })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-cargo">Cargo *</Label>
                <Input id="edit-cargo" {...register("cargo", { required: true })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Perfil *</Label>
                <Select value={watch("role")} onValueChange={(value) => setValue("role", value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="lider">Líder</SelectItem>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEditingUser(null); reset(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
