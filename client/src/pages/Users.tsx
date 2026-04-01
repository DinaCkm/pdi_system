import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModalCustomizado } from "@/components/ModalCustomizado";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  UserCheck,
  UserX,
} from "lucide-react";
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
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Users() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId?: number;
    currentStatus?: string;
  }>({ open: false });
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [filterDepartamento, setFilterDepartamento] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<"" | "ativo" | "inativo">("");
  const ITEMS_PER_PAGE = 10;
  const [, navigate] = useLocation();

  const [formData, setFormData] = useState({
  name: "",
  email: "",
  cpf: "",
  studentId: "",
  cargo: "",
});

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: departamentos } = trpc.departamentos.list.useQuery();
  const createMutation = trpc.users.create.useMutation();
  const updateMutation = trpc.users.update.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();

  const safeString = (value: unknown): string =>
    typeof value === "string" ? value : "";

  const safeLower = (value: unknown): string =>
    safeString(value).toLowerCase();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync({
        ...formData,
        role: "colaborador" as any,
      });

      toast.success("Usuário criado com sucesso! Configure o perfil e hierarquia na próxima etapa.");
      setIsCreateOpen(false);
      setFormData({ name: "", email: "", cpf: "", studentId: "", cargo: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user.id);
    setFormData({
  name: safeString(user?.name),
  email: safeString(user?.email),
  cpf: safeString(user?.cpf),
  studentId: safeString(user?.studentId),
  cargo: safeString(user?.cargo),
});
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateMutation.mutateAsync({
        id: editingUser,
        ...formData,
      });

      toast.success("Dados do usuário atualizados com sucesso!");
      setIsEditOpen(false);
      setEditingUser(null);
      setFormData({ name: "", email: "", cpf: "", studentId: "", cargo: "" });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar usuário");
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmDialog.userId) return;
    const isAtivando = confirmDialog.currentStatus === "inativo";

    try {
      if (isAtivando) {
        await updateMutation.mutateAsync({ id: confirmDialog.userId, status: "ativo" });
        toast.success("Usuário reativado com sucesso!");
      } else {
        await deleteMutation.mutateAsync({ id: confirmDialog.userId });
        toast.success("Usuário inativado com sucesso!");
      }

      setConfirmDialog({ open: false });
      refetch();
    } catch (error: any) {
      toast.error(
        error.message || (isAtivando ? "Erro ao reativar usuário" : "Erro ao inativar usuário")
      );
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      admin: { variant: "destructive", label: "Administrador" },
      lider: { variant: "default", label: "Líder" },
      user: { variant: "secondary", label: "Colaborador" },
      colaborador: { variant: "secondary", label: "Colaborador" },
    };

    const config = variants[role] || variants.user;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDepartamentoNome = (departamentoId: number | null) => {
    if (!departamentoId) return "-";
    const dept = departamentos?.find((d: any) => d.id === departamentoId);
    return dept?.nome || "-";
  };

  const getLiderNome = (leaderId: number | null) => {
    if (!leaderId) return "-";
    const leader = users?.find((u: any) => u.id === leaderId);
    return safeString(leader?.name) || "-";
  };

  const filteredUsers =
    users?.filter((user: any) => {
      const term = safeLower(searchTerm);

      const matchesSearch =
  safeLower(user?.name).includes(term) ||
  safeLower(user?.email).includes(term) ||
  safeLower(user?.studentId).includes(term);

      const matchesDepartamento =
        !filterDepartamento || user.departamentoId === filterDepartamento;

      const matchesStatus =
        !filterStatus || user.status === filterStatus;

      return matchesSearch && matchesDepartamento && matchesStatus;
    }) || [];

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterDepartamento(undefined);
    setFilterStatus("");
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-600 to-orange-500 text-white">
          <CardTitle className="text-2xl">Gestão de Usuários</CardTitle>
          <CardDescription className="text-blue-50">
            Gerencie os usuários do sistema
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, e-mail ou ID do aluno..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 w-full"
                />
              </div>

              <select
                value={filterDepartamento || ""}
                onChange={(e) => {
                  setFilterDepartamento(e.target.value ? Number(e.target.value) : undefined);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="">Todos os Departamentos</option>
                {departamentos?.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.nome}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as "" | "ativo" | "inativo");
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="">Todos os Status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>

              <Button onClick={handleResetFilters} variant="outline" className="whitespace-nowrap">
                Limpar Filtros
              </Button>

              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-orange-500 whitespace-nowrap"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>ID do Aluno</TableHead>
                  <TableHead>Depto. Pertence</TableHead>
                  <TableHead>Depto. Lidera</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user: any) => {
                    const departamentoLiderado = departamentos?.find((d: any) => d.leaderId === user.id);

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {safeString(user?.name) || "-"}
                        </TableCell>

                        <TableCell>
                          {safeString(user?.email) || "-"}
                        </TableCell>

                        <TableCell>
                          {safeString(user?.studentId) || "-"}
                        </TableCell>

                        
                        <TableCell>
                          <span
                            className="max-w-[200px] truncate block"
                            title={getDepartamentoNome(user.departamentoId)}
                          >
                            {getDepartamentoNome(user.departamentoId)}
                          </span>
                        </TableCell>

                        <TableCell>
                          {user.role === "lider" && departamentoLiderado ? (
                            <span className="font-semibold text-blue-600 flex items-center gap-1">
                              👑 {departamentoLiderado.nome}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell>{getRoleBadge(safeString(user?.role))}</TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {getLiderNome(user.leaderId)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(user)}
                              title="Editar Dados"
                            >
                              <Pencil className="h-4 w-4 text-green-600" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/usuarios/${user.id}/configurar`)}
                              title="Configurar Perfil"
                            >
                              <Settings className="h-4 w-4 text-blue-600" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setConfirmDialog({
                                  open: true,
                                  userId: user.id,
                                  currentStatus: user.status,
                                })
                              }
                              title={user.status === "inativo" ? "Reativar" : "Inativar"}
                            >
                              {user.status === "inativo" ? (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              ) : (
                                <UserX className="h-4 w-4 text-red-600" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ModalCustomizado
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setFormData({ name: "", email: "", cpf: "", studentId: "", cargo: "" });
        }}
        title="Criar Novo Usuário"
        description="Preencha os dados básicos. Configure perfil e hierarquia depois."
      >
        <form onSubmit={handleCreate}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome Completo *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">E-mail *</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-cpf">CPF *</Label>
              <Input
                id="create-cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                required
              />
            </div>

            <div className="space-y-2">
  <Label htmlFor="create-student-id">ID do Aluno</Label>
  <Input
    id="create-student-id"
    value={formData.studentId}
    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
    placeholder="Informe o ID do aluno"
  />
</div>
            <div className="space-y-2">
              <Label htmlFor="create-cargo">Cargo *</Label>
              <Input
                id="create-cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </ModalCustomizado>

      <ModalCustomizado
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingUser(null);
          setFormData({ name: "", email: "", cpf: "", studentId: "", cargo: "" });
        }}
        title="Editar Dados do Usuário"
        description="Atualize os dados básicos do usuário (nome, email, CPF, cargo)."
      >
        <form onSubmit={handleUpdate}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cpf">CPF *</Label>
              <Input
                id="edit-cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                required
              />
            </div>

            <div className="space-y-2">
  <Label htmlFor="edit-student-id">ID do Aluno</Label>
  <Input
    id="edit-student-id"
    value={formData.studentId}
    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
    placeholder="Informe o ID do aluno"
  />
</div>

            <div className="space-y-2">
              <Label htmlFor="edit-cargo">Cargo *</Label>
              <Input
                id="edit-cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </ModalCustomizado>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.currentStatus === "inativo"
                ? "Confirmar Reativação"
                : "Confirmar Inativação"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {confirmDialog.currentStatus === "inativo"
                ? "Tem certeza que deseja reativar este usuário? Ele voltará a ter acesso ao sistema e seus dados serão restaurados."
                : "Tem certeza que deseja inativar este usuário? Ele poderá ser reativado dentro de 6 meses."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              className={
                confirmDialog.currentStatus === "inativo"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {confirmDialog.currentStatus === "inativo" ? "Reativar" : "Inativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
