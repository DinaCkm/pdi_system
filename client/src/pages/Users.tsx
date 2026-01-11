import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Usuário excluído com sucesso!");
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
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>
            Total de {users?.length || 0} usuários no sistema
          </CardDescription>
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
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.cpf}</TableCell>
                  <TableCell>{user.cargo}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
