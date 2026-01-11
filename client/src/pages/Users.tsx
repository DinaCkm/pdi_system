import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type UserRole = "admin" | "lider" | "user";

interface UserFormData {
  nome: string;
  email: string;
  cpf: string;
  cargo: string;
  role: UserRole;
  departamentoId: number | null;
  leaderId: number | null;
}

export default function Users() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; userId?: number; userName?: string }>({ open: false });
  
  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    nome: "",
    email: "",
    cpf: "",
    cargo: "",
    role: "user",
    departamentoId: null,
    leaderId: null,
  });

  // Queries
  const { data: users, refetch: refetchUsers } = trpc.users.getAll.useQuery();
  const { data: departamentos } = trpc.departamentos.getAll.useQuery();

  // Mutations
  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      refetchUsers();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      refetchUsers();
      closeDialog();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    },
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso!");
      refetchUsers();
      setDeleteConfirm({ open: false });
    },
    onError: (error) => {
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    },
  });

  // Filtered leaders based on selected department
  const availableLeaders = users?.filter(
    (u) =>
      u.role === "lider" &&
      u.departamentoId === formData.departamentoId &&
      u.id !== editingUserId
  ) || [];

  const openCreateDialog = () => {
    setEditingUserId(null);
    setFormData({
      nome: "",
      email: "",
      cpf: "",
      cargo: "",
      role: "user",
      departamentoId: null,
      leaderId: null,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: any) => {
    setEditingUserId(user.id);
    setFormData({
      nome: user.nome,
      email: user.email,
      cpf: user.cpf,
      cargo: user.cargo,
      role: user.role,
      departamentoId: user.departamentoId,
      leaderId: user.leaderId,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUserId(null);
    setFormData({
      nome: "",
      email: "",
      cpf: "",
      cargo: "",
      role: "user",
      departamentoId: null,
      leaderId: null,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.email || !formData.cpf || !formData.cargo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const payload = {
      ...formData,
      departamentoId: formData.departamentoId || undefined,
      leaderId: formData.leaderId || undefined,
    };

    if (editingUserId) {
      updateMutation.mutate({ id: editingUserId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (userId: number) => {
    deleteMutation.mutate({ id: userId });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      lider: "Líder",
      user: "Colaborador",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      admin: "destructive",
      lider: "default",
      user: "secondary",
    };
    return variants[role] || "secondary";
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Líder</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.nome}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.cpf}</TableCell>
                <TableCell>{user.cargo}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.departamento?.nome || "-"}
                </TableCell>
                <TableCell>
                  {user.leader?.nome || "-"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setDeleteConfirm({
                        open: true,
                        userId: user.id,
                        userName: user.nome,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUserId ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUserId
                ? "Atualize as informações do usuário"
                : "Preencha os dados para criar um novo usuário"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) =>
                    setFormData({ ...formData, cpf: e.target.value })
                  }
                  placeholder="000.000.000-00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo *</Label>
                <Input
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) =>
                    setFormData({ ...formData, cargo: e.target.value })
                  }
                  placeholder="Ex: Analista de Sistemas"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil *</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as UserRole })
                  }
                  required
                >
                  <option value="user">Colaborador</option>
                  <option value="lider">Líder</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departamento">Departamento</Label>
                <select
                  id="departamento"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.departamentoId?.toString() || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      departamentoId: e.target.value ? parseInt(e.target.value) : null,
                      leaderId: null,
                    })
                  }
                >
                  <option value="">Nenhum</option>
                  {departamentos?.map((dept) => (
                    <option key={dept.id} value={dept.id.toString()}>
                      {dept.nome}
                    </option>
                  ))}
                </select>
              </div>

              {formData.role === "user" && formData.departamentoId && (
                <div className="space-y-2">
                  <Label htmlFor="leader">Líder</Label>
                  <select
                    id="leader"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.leaderId?.toString() || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        leaderId: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  >
                    <option value="">Nenhum</option>
                    {availableLeaders.map((leader) => (
                      <option key={leader.id} value={leader.id.toString()}>
                        {leader.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingUserId ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário{" "}
              <strong>{deleteConfirm.userName}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm.userId && handleDelete(deleteConfirm.userId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
