import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function ConfigurarUsuario() {
  const [, params] = useRoute("/usuarios/:id/configurar");
  const [, navigate] = useLocation();
  const userId = params?.id ? parseInt(params.id) : null;

  const [selectedRole, setSelectedRole] = useState<"colaborador" | "lider" | "admin">("colaborador");
  const [selectedDepartamento, setSelectedDepartamento] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: user, isLoading: loadingUser } = trpc.users.getById.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );
  
  const { data: departamentos = [] } = trpc.departamentos.list.useQuery();
  
  const updateMutation = trpc.users.update.useMutation();

  // Carregar dados atuais do usuário
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedDepartamento(user.departamentoId);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    // Validação: Líder e Colaborador precisam de departamento
    if ((selectedRole === "lider" || selectedRole === "colaborador") && !selectedDepartamento) {
      toast.error("Líderes e Colaboradores devem estar vinculados a um departamento.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: userId,
        role: selectedRole,
        departamentoId: selectedDepartamento,
      });

      setShowSuccess(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configuração");
    }
  };

  if (!userId) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">ID de usuário inválido</p>
      </div>
    );
  }

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Usuário não encontrado</p>
      </div>
    );
  }

  // Tela de sucesso
  if (showSuccess) {
    return (
      <div className="container max-w-2xl py-8">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Perfil Configurado!</h3>
                <p className="text-sm text-green-700 mt-1">
                  O perfil de <strong>{user.name}</strong> foi atualizado com sucesso.
                </p>
              </div>
              <Button
                onClick={() => navigate("/usuarios")}
                className="mt-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Usuários
              </Button>
              
              {selectedRole === "lider" && (
                <Alert className="mt-4">
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Próximo passo:</strong> Vá em <strong>Departamentos</strong> e defina este usuário como líder do departamento selecionado.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/usuarios")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Perfil do Usuário</CardTitle>
          <CardDescription>
            Defina o perfil de acesso do usuário no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Nome:</p>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPF:</p>
                <p className="font-medium">{user.cpf}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cargo:</p>
                <p className="font-medium">{user.cargo}</p>
              </div>
            </div>

            {/* Seleção de Perfil */}
            <div className="space-y-3">
              <Label className="text-base">Perfil *</Label>
              <div className="grid gap-3">
                {/* Colaborador */}
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRole === "colaborador"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="colaborador"
                    checked={selectedRole === "colaborador"}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Colaborador</p>
                    <p className="text-sm text-muted-foreground">
                      Acessa e gerencia seu próprio PDI
                    </p>
                  </div>
                </label>

                {/* Líder */}
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRole === "lider"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="lider"
                    checked={selectedRole === "lider"}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Líder</p>
                    <p className="text-sm text-muted-foreground">
                      Gerencia sua equipe e aprova ações
                    </p>
                  </div>
                </label>

                {/* Administrador */}
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRole === "admin"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={selectedRole === "admin"}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Administrador</p>
                    <p className="text-sm text-muted-foreground">
                      Acesso total ao sistema e gestão completa
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Seleção de Departamento (condicional) */}
            {(selectedRole === "lider" || selectedRole === "colaborador") && (
              <div className="space-y-2">
                <Label htmlFor="departamento">Departamento *</Label>
                <select
                  id="departamento"
                  value={selectedDepartamento || ""}
                  onChange={(e) => setSelectedDepartamento(e.target.value ? parseInt(e.target.value) : null)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Selecione um departamento</option>
                  {departamentos
                    .filter((d) => d.status === "ativo")
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.nome}
                      </option>
                    ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  🔒 O líder será atribuído automaticamente com base no líder do departamento selecionado.
                </p>
              </div>
            )}

            {/* Informação sobre líder automático */}
            {selectedRole === "lider" && (
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Após salvar, vá em <strong>Departamentos</strong> e defina este usuário como líder do departamento. Todos os colaboradores desse departamento terão este usuário como líder automaticamente.
                </AlertDescription>
              </Alert>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-4">
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
                className="flex-1 bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 hover:opacity-90"
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
