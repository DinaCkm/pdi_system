import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function ConfigurarUsuario() {
  const [, params] = useRoute("/usuarios/:id/configurar");
  const [, navigate] = useLocation();
  const userId = params?.id ? parseInt(params.id) : null;

  const [formData, setFormData] = useState({
    role: "user",
    departamentoId: null as number | null,
    leaderId: null as number | null,
  });

  const { data: user, isLoading: loadingUser } = trpc.users.getById.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );
  const { data: users } = trpc.users.list.useQuery();
  const { data: departamentos } = trpc.departamentos.list.useQuery();
  const updateMutation = trpc.users.update.useMutation();

  // Carregar dados atuais do usuário
  useEffect(() => {
    if (user) {
      setFormData({
        role: user.role,
        departamentoId: user.departamentoId,
        leaderId: user.leaderId,
      });
    }
  }, [user]);

  // Filtrar líderes disponíveis (mesmo departamento, exceto o próprio usuário)
  const availableLeaders = users?.filter(
    (u) =>
      u.id !== userId &&
      u.deletedAt === null &&
      (u.role === "admin" || u.role === "lider") &&
      (!formData.departamentoId || u.departamentoId === formData.departamentoId)
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    try {
      // Validações
      if ((formData.role === "lider" || formData.role === "colaborador") && !formData.departamentoId) {
        toast.error(`${formData.role === "lider" ? "Líderes" : "Colaboradores"} devem estar vinculados a um departamento.`);
        return;
      }

      // Buscar líder automaticamente do departamento
      let leaderIdToSet: number | null = null;
      if (formData.departamentoId) {
        const dept = departamentos?.find(d => d.id === formData.departamentoId);
        leaderIdToSet = dept?.leaderId || null;
        
        if (!leaderIdToSet && (formData.role === "lider" || formData.role === "colaborador")) {
          toast.error("O departamento selecionado não possui um líder definido. Configure o líder do departamento primeiro.");
          return;
        }
      }

      await updateMutation.mutateAsync({
        id: userId,
        role: formData.role as any,
        departamentoId: formData.departamentoId,
        leaderId: leaderIdToSet,
      });

      toast.success("Configuração salva com sucesso!");
      navigate("/usuarios");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração");
    }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Usuário não encontrado</p>
        <Button onClick={() => navigate("/usuarios")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate("/usuarios")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-600 to-orange-500 text-white">
          <CardTitle className="text-2xl">Configurar Perfil e Hierarquia</CardTitle>
          <CardDescription className="text-blue-50">
            Defina o perfil, departamento e líder de {user.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações do Usuário */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-lg">Informações Básicas</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <p className="font-medium">{user.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">CPF:</span>
                  <p className="font-medium">{user.cpf}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cargo:</span>
                  <p className="font-medium">{user.cargo}</p>
                </div>
              </div>
            </div>

            {/* Perfil */}
            <div className="space-y-2">
              <Label htmlFor="role">Perfil *</Label>
              <select
                id="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setFormData({
                    ...formData,
                    role: newRole,
                    // Resetar departamento e líder se mudar para admin
                    departamentoId: newRole === "admin" ? null : formData.departamentoId,
                    leaderId: newRole === "admin" ? null : formData.leaderId,
                  });
                }}
                required
              >
                <option value="colaborador">Colaborador</option>
                <option value="lider">Líder</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="text-sm text-muted-foreground">
                {formData.role === "admin" && "Administradores têm acesso total ao sistema"}
                {formData.role === "lider" && "Líderes gerenciam suas equipes e aprovam ações"}
                {formData.role === "colaborador" && "Colaboradores executam ações e enviam evidências"}
              </p>
            </div>

            {/* Departamento (condicional) */}
            {(formData.role === "lider" || formData.role === "colaborador") && (
              <div className="space-y-2">
                <Label htmlFor="departamento">Departamento *</Label>
                <select
                  id="departamento"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.departamentoId?.toString() || ""}
                  onChange={(e) => {
                    const newDeptId = e.target.value ? parseInt(e.target.value) : null;
                    setFormData({
                      ...formData,
                      departamentoId: newDeptId,
                      leaderId: null, // Resetar líder ao mudar departamento
                    });
                  }}
                  required
                >
                  <option value="">Selecione um departamento</option>
                  {departamentos?.filter(d => d.status === "ativo").map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.nome}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  {formData.role === "lider" ? "Líderes" : "Colaboradores"} devem estar vinculados a um departamento
                </p>
              </div>
            )}

            {/* Líder (automático pelo departamento) */}
            {(formData.role === "lider" || formData.role === "colaborador") && formData.departamentoId && (
              <div className="space-y-2">
                <Label>Líder do Departamento</Label>
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 py-2 text-sm">
                  {(() => {
                    const dept = departamentos?.find(d => d.id === formData.departamentoId);
                    if (!dept?.leaderId) {
                      return <span className="text-muted-foreground italic">Departamento sem líder definido</span>;
                    }
                    const leader = users?.find(u => u.id === dept.leaderId);
                    return leader ? (
                      <span>{leader.name} ({leader.role === "admin" ? "Admin" : "Líder"})</span>
                    ) : (
                      <span className="text-muted-foreground italic">Líder não encontrado</span>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  🔒 Líder é definido automaticamente pelo departamento
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/usuarios")}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-600 to-orange-500"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configuração
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
