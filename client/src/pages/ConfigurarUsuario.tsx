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
      // Apenas salvar o perfil
      // Departamento e líder serão definidos na página de Departamentos
      await updateMutation.mutateAsync({
        id: userId,
        role: formData.role as any,
      });

      toast.success("Configuração salva com sucesso!");
      // Aguardar um pouco antes de navegar para evitar conflito com toast
      setTimeout(() => {
        navigate("/usuarios");
      }, 100);
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
            <div className="space-y-3">
              <Label>Perfil *</Label>
              <div className="space-y-2">
                {[
                  { value: "colaborador", label: "Colaborador", desc: "Executam ações e enviam evidências" },
                  { value: "lider", label: "Líder", desc: "Gerenciam suas equipes e aprovam ações" },
                  { value: "admin", label: "Administrador", desc: "Têm acesso total ao sistema" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.role === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={formData.role === option.value}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setFormData({
                          ...formData,
                          role: newRole,
                          departamentoId: newRole === "admin" ? null : formData.departamentoId,
                          leaderId: newRole === "admin" ? null : formData.leaderId,
                        });
                      }}
                      className="mt-1"
                      required
                    />
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Informação sobre departamento */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                📌 <strong>Próximo passo:</strong> Após definir o perfil, vá em <strong>Departamentos</strong> para vincular este usuário a um departamento e definir hierarquia.
              </p>
            </div>

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
