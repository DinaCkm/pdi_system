import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function ConfigurarUsuario() {
  const [, params] = useRoute("/usuarios/:id/configurar");
  const [, navigate] = useLocation();
  const userId = params?.id ? parseInt(params.id) : null;

  const [selectedRole, setSelectedRole] = useState<"colaborador" | "lider" | "admin">("colaborador");
  const [selectedDepartamento, setSelectedDepartamento] = useState<number | undefined>(undefined);
  const [selectedLeader, setSelectedLeader] = useState<number | undefined>(undefined);

  const { data: user, isLoading: loadingUser } = trpc.users.getById.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );
  
  const { data: departamentos = [] } = trpc.departamentos.list.useQuery();
  
  // Buscar todos os usuários para selecionar líder
  const { data: allUsers = [] } = trpc.users.list.useQuery();
  
  // Buscar departamentos para pegar o líder oficial
  const { data: allDepartamentos = [] } = trpc.departamentos.list.useQuery();
  
  const updateMutation = trpc.users.update.useMutation();

  // Filtrar líderes disponíveis do departamento selecionado
  const availableLeaders = useMemo(() => {
    if (!selectedDepartamento) return [];
    
    // Buscar líder oficial do departamento
    const departamento = allDepartamentos.find(d => d.id === selectedDepartamento);
    const leaderIds = new Set<number>();
    
    // Adicionar líder oficial do departamento (se existir)
    if (departamento?.leaderId && departamento.leaderId !== userId) {
      leaderIds.add(departamento.leaderId);
    }
    
    // Adicionar usuários com role líder/admin que pertencem ao departamento
    allUsers.forEach(u => {
      if (u.id !== userId && 
          u.departamentoId === selectedDepartamento && 
          (u.role === "lider" || u.role === "admin")) {
        leaderIds.add(u.id);
      }
    });
    
    // Retornar lista de usuários que são líderes
    return allUsers.filter(u => leaderIds.has(u.id));
  }, [allUsers, allDepartamentos, selectedDepartamento, userId]);

  // Carregar dados atuais do usuário
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setSelectedDepartamento(user.departamentoId ?? undefined);
      setSelectedLeader(user.leaderId ?? undefined);
    }
  }, [user]);

  // Handler para mudança de departamento
  const handleDepartamentoChange = (value: string) => {
    const newDeptId = value ? parseInt(value) : undefined;
    setSelectedDepartamento(newDeptId);
    // Resetar líder quando departamento mudar
    if (newDeptId !== selectedDepartamento) {
      setSelectedLeader(undefined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    // Validação: Líder e Colaborador precisam de departamento
    if ((selectedRole === "lider" || selectedRole === "colaborador") && !selectedDepartamento) {
      toast.error("Líderes e Colaboradores devem estar vinculados a um departamento.");
      return;
    }

    // Validação: Colaborador precisa de líder
    if (selectedRole === "colaborador" && !selectedLeader) {
      toast.error("Colaboradores devem ter um líder atribuído.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: userId,
        role: selectedRole,
        departamentoId: selectedDepartamento,
        leaderId: selectedLeader,
      });

      toast.success(`Perfil de ${user?.name} atualizado com sucesso!`);
      
      // Mostrar mensagem adicional para líderes
      if (selectedRole === "lider") {
        setTimeout(() => {
          toast.info("Próximo passo: Vá em Departamentos e defina este usuário como líder do departamento.");
        }, 1500);
      }
      
      // Navegar de volta após sucesso
      setTimeout(() => {
        navigate("/usuarios");
      }, 2000);
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

            {/* Seleção de Departamento - SEMPRE RENDERIZADO */}
            <div className="space-y-2" style={{ display: (selectedRole === "lider" || selectedRole === "colaborador") ? 'block' : 'none' }}>
                <Label htmlFor="departamento">Departamento *</Label>
                <select
                  id="departamento"
                  value={selectedDepartamento || ""}
                  onChange={(e) => handleDepartamentoChange(e.target.value)}
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
            </div>

            {/* Seleção de Líder - SEMPRE RENDERIZADO */}
            <div className="space-y-2" style={{ display: (selectedRole === "lider" || selectedRole === "colaborador") ? 'block' : 'none' }}>
                <Label htmlFor="lider">Líder {selectedRole === "colaborador" ? "*" : "(opcional)"}</Label>
                <select
                  id="lider"
                  value={selectedLeader || ""}
                  onChange={(e) => setSelectedLeader(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  required={selectedRole === "colaborador"}
                  disabled={!selectedDepartamento || availableLeaders.length === 0}
                >
                  <option value="">
                    {!selectedDepartamento 
                      ? "Selecione um departamento primeiro" 
                      : availableLeaders.length === 0 
                      ? "Nenhum líder disponível neste departamento" 
                      : "Selecione um líder"}
                  </option>
                  {availableLeaders.map((leader) => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name} ({leader.role === "admin" ? "Administrador" : "Líder"})
                    </option>
                  ))}
                </select>
                {selectedDepartamento && availableLeaders.length === 0 && (
                  <p className="text-sm text-amber-600">
                    ⚠️ Não há líderes cadastrados neste departamento. Configure um líder primeiro.
                  </p>
                )}
                {availableLeaders.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Selecione o líder direto deste {selectedRole === "colaborador" ? "colaborador" : "líder"}.
                  </p>
                )}
            </div>

            {/* Informação sobre líder automático - SEMPRE RENDERIZADO */}
            <div style={{ display: selectedRole === "lider" ? 'block' : 'none' }}>
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Após salvar, vá em <strong>Departamentos</strong> e defina este usuário como líder do departamento. Todos os colaboradores desse departamento terão este usuário como líder automaticamente.
                </AlertDescription>
              </Alert>
            </div>

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
