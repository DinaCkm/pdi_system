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

  const [selectedRole, setSelectedRole] = useState<"colaborador" | "lider" | "gerente" | "admin">("colaborador");
  const [selectedDepartamento, setSelectedDepartamento] = useState<number | undefined>(undefined);
  const [selectedLeader, setSelectedLeader] = useState<number | undefined>(undefined);
  const [selectedDepartamentoColaborador, setSelectedDepartamentoColaborador] = useState<number | undefined>(undefined);
  const [selectedLeaderColaborador, setSelectedLeaderColaborador] = useState<number | undefined>(undefined);

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
  const updateDepartamentoMutation = trpc.departamentos.update.useMutation();

  // Filtrar líderes disponíveis do departamento selecionado
  // COM FILTRO DE AUTOATRIBUIÇÃO (Impede que o usuário seja seu próprio líder)
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
    // FILTRO DE AUTOATRIBUIÇÃO: Garante que u.id !== userId
    return allUsers.filter(u => u.id !== userId && leaderIds.has(u.id));
  }, [allUsers, allDepartamentos, selectedDepartamento, userId]);

  // Carregar dados atuais do usuário
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      
      // Para líderes: departamento que lidera vem de user_department_roles com LEADER
      // departamento de colaborador vem de user.departamentoId
      if (user.role === "lider") {
        // Buscar departamento que o líder lidera
        const leaderDept = allDepartamentos.find(d => {
          // Verificar se há um registro de LEADER para este usuário neste departamento
          return d.leaderId === user.id;
        });
        setSelectedDepartamento(leaderDept?.id ?? undefined);
        setSelectedDepartamentoColaborador(user.departamentoId ?? undefined);
        setSelectedLeaderColaborador(user.leaderId ?? undefined);
      } else {
        setSelectedDepartamento(user.departamentoId ?? undefined);
        setSelectedLeader(user.leaderId ?? undefined);
      }
    }
  }, [user, allDepartamentos]);

  // Limpeza de estado quando selectedRole muda (Regra de Ouro)
  useEffect(() => {
    // Se mudar de Líder para Colaborador, resetar campos de dualidade
    if (selectedRole === "colaborador") {
      setSelectedDepartamentoColaborador(undefined);
      setSelectedLeaderColaborador(undefined);
    }
    // Se mudar para Líder, resetar campo simples de líder
    if (selectedRole === "lider") {
      setSelectedLeader(undefined);
    }
  }, [selectedRole]);

  // Filtrar líderes disponíveis para o departamento de colaborador
  // COM FILTRO DE AUTOATRIBUIÇÃO (Impede que o usuário seja seu próprio líder)
  const availableLeadersColaborador = useMemo(() => {
    if (!selectedDepartamentoColaborador) return [];
    
    const departamento = allDepartamentos.find(d => d.id === selectedDepartamentoColaborador);
    const leaderIds = new Set<number>();
    
    if (departamento?.leaderId && departamento.leaderId !== userId) {
      leaderIds.add(departamento.leaderId);
    }
    
    allUsers.forEach(u => {
      if (u.id !== userId && 
          u.departamentoId === selectedDepartamentoColaborador && 
          (u.role === "lider" || u.role === "admin")) {
        leaderIds.add(u.id);
      }
    });
    
    // FILTRO DE AUTOATRIBUIÇÃO: Garante que u.id !== userId
    return allUsers.filter(u => u.id !== userId && leaderIds.has(u.id));
  }, [allUsers, allDepartamentos, selectedDepartamentoColaborador, userId]);

  // Handler para mudança de departamento
  const handleDepartamentoChange = (value: string) => {
    const newDeptId = value ? parseInt(value) : undefined;
    setSelectedDepartamento(newDeptId);
    // Resetar líder quando departamento mudar
    if (newDeptId !== selectedDepartamento) {
      setSelectedLeader(undefined);
    }
  };

  // VALIDAÇÃO: Detecta conflito de departamentos (Regra de Ouro)
  const temConflitoDepartamento = 
    selectedRole === "lider" && 
    selectedDepartamento === selectedDepartamentoColaborador;

  // REGRAS 5 E 6: Validação de Obrigatoriedade de Vínculos
  // Admin e Gerente não precisam de departamento/líder
  const perfilOperacional = selectedRole === "colaborador" || selectedRole === "lider";
  
  const faltaDepartamento = selectedRole === "colaborador" && !selectedDepartamento;
  const faltaDepartamentoColaborador = selectedRole === "lider" && !selectedDepartamentoColaborador;
  const faltaLider = (selectedRole === "colaborador" && !selectedLeader) || (selectedRole === "lider" && !selectedLeaderColaborador);
  
  // Gerente e Admin não precisam de vínculos
  const camposIncompletos = (selectedRole === "admin" || selectedRole === "gerente") ? false : (faltaDepartamento || faltaDepartamentoColaborador || faltaLider);
  const botaoDesabilitado = updateMutation.isPending || temConflitoDepartamento || camposIncompletos;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    // TRAVA 1: Conflito de Departamento (Regra de Ouro)
    if (selectedRole === "lider" && selectedDepartamento === selectedDepartamentoColaborador) {
      toast.error("⚠️ Conflito Detectado", {
        description: "Um Líder não pode ser membro do mesmo departamento que ele lidera. Selecione departamentos distintos."
      });
      return;
    }

    // REGRA 5: Departamento Obrigatório para Colaborador
    if (selectedRole === "colaborador" && !selectedDepartamento) {
      toast.error("📍 Departamento Obrigatório", {
        description: "Colaboradores devem estar vinculados a um departamento para que possam ter um PDI e serem avaliados."
      });
      return;
    }

    // REGRA 5: Departamento Obrigatório para Líder (como colaborador)
    if (selectedRole === "lider" && !selectedDepartamentoColaborador) {
      toast.error("📍 Departamento de Colaborador Obrigatório", {
        description: "Líderes devem estar vinculados a um departamento como colaborador para que possam ter seu próprio PDI e serem avaliados por um gestor superior."
      });
      return;
    }

    // REGRA 6: Líder Obrigatório para Colaborador
    if (selectedRole === "colaborador" && !selectedLeader) {
      toast.error("👤 Líder Obrigatório", {
        description: "Colaboradores devem ter um líder direto atribuído para que possam ser orientados e avaliados."
      });
      return;
    }

    // REGRA 6: Líder Obrigatório para Líder (no departamento de colaborador)
    if (selectedRole === "lider" && !selectedLeaderColaborador) {
      toast.error("👤 Líder Superior Obrigatório", {
        description: "Líderes devem ter um líder superior atribuído no departamento de colaborador para que possam ter seu próprio PDI."
      });
      return;
    }

    try {
      // Para líderes, usar o departamento de colaborador
      const finalDepartamentoId = selectedRole === "lider" ? selectedDepartamentoColaborador : selectedDepartamento;
      const finalLeaderId = selectedRole === "lider" ? selectedLeaderColaborador : selectedLeader;

      // Para admins e gerentes, limpar vínculos antigos
      const departamentoParaSalvar = (selectedRole === "admin" || selectedRole === "gerente") ? null : finalDepartamentoId;
      const liderParaSalvar = (selectedRole === "admin" || selectedRole === "gerente") ? null : finalLeaderId;

      // Se o usuário está sendo promovido a Líder, atualizar o departamento para vinculá-lo
      if (selectedRole === "lider" && selectedDepartamento) {
        try {
          // Atualizar o departamento para vincular este usuário como líder
          await updateDepartamentoMutation.mutateAsync({
            id: selectedDepartamento,
            leaderId: userId,
          });
        } catch (deptError) {
          console.warn("Aviso: Não foi possível atualizar o departamento automaticamente", deptError);
          // Continuar mesmo se falhar, pois o usuário foi promovido com sucesso
        }
      }

      await updateMutation.mutateAsync({
        id: userId,
        role: selectedRole,
        departamentoId: departamentoParaSalvar,
        leaderId: liderParaSalvar,
      });

      // Aguardar um momento para React finalizar processamento antes do redirect
      setTimeout(() => {
        window.location.href = "/usuarios";
      }, 50);
    } catch (error: any) {
      alert(error.message || "Erro ao salvar configuração");
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

                {/* Gerente */}
                <label
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRole === "gerente"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="gerente"
                    checked={selectedRole === "gerente"}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Gerente</p>
                    <p className="text-sm text-muted-foreground">
                      Visualiza Dashboard, PDIs, Ações e Relatórios (acesso de leitura)
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

            {/* COLABORADOR: Seleção de Departamento e Líder */}
            {selectedRole === "colaborador" && (
              <>
                <div className="space-y-2">
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

                <div className="space-y-2">
                  <Label htmlFor="lider">Líder *</Label>
                  <select
                    id="lider"
                    value={selectedLeader || ""}
                    onChange={(e) => setSelectedLeader(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
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
                </div>
              </>
            )}

            {/* ALERTA: Conflito de Departamentos (Regra de Ouro) */}
            {temConflitoDepartamento && (
              <Alert className="border-red-200 bg-red-50">
                <InfoIcon className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <strong>Erro de Regra:</strong> Um Líder não pode ser membro do mesmo departamento que ele lidera. Por favor, selecione departamentos distintos.
                </AlertDescription>
              </Alert>
            )}

            {/* LÍDER: Seleção de Departamentos (Lidera + Colaborador) */}
            {selectedRole === "lider" && (
              <>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">i️ Dualidade de Roles</p>
                  <p className="text-sm text-blue-800 mt-1">
                    Como Líder, você terá dois papéis:
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 ml-4 space-y-1">
                    <li>✓ <strong>Lidera</strong> um departamento</li>
                    <li>✓ <strong>É colaborador</strong> em outro departamento</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departamento-lidera">Departamento que você LIDERA *</Label>
                  <select
                    id="departamento-lidera"
                    value={selectedDepartamento || ""}
                    onChange={(e) => {
                      const newDeptId = e.target.value ? parseInt(e.target.value) : undefined;
                      setSelectedDepartamento(newDeptId);
                    }}
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

                <div className="space-y-2">
                  <Label htmlFor="departamento-colaborador">Departamento onde você É COLABORADOR *</Label>
                  <select
                    id="departamento-colaborador"
                    value={selectedDepartamentoColaborador || ""}
                    onChange={(e) => {
                      const newDeptId = e.target.value ? parseInt(e.target.value) : undefined;
                      setSelectedDepartamentoColaborador(newDeptId);
                      
                      // Preencher líder automaticamente se o departamento tem um líder
                      if (newDeptId) {
                        const dept = allDepartamentos.find(d => d.id === newDeptId);
                        if (dept?.leaderId) {
                          setSelectedLeaderColaborador(dept.leaderId);
                        } else {
                          setSelectedLeaderColaborador(undefined);
                        }
                      } else {
                        setSelectedLeaderColaborador(undefined);
                      }
                    }}
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

                <div className="space-y-2">
                  <Label htmlFor="lider-colaborador">Seu Líder neste departamento *</Label>
                  <select
                    id="lider-colaborador"
                    value={selectedLeaderColaborador || ""}
                    onChange={(e) => setSelectedLeaderColaborador(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    disabled={!selectedDepartamentoColaborador || availableLeadersColaborador.length === 0}
                  >
                    <option value="">
                      {!selectedDepartamentoColaborador
                        ? "Selecione um departamento primeiro" 
                        : availableLeadersColaborador.length === 0 
                        ? "Nenhum líder disponível neste departamento" 
                        : "Selecione um líder"}
                    </option>
                    {availableLeadersColaborador.map((leader) => (
                      <option key={leader.id} value={leader.id}>
                        {leader.name} ({leader.role === "admin" ? "Administrador" : "Líder"})
                      </option>
                    ))}
                  </select>
                  {selectedDepartamentoColaborador && availableLeadersColaborador.length === 0 && (
                    <p className="text-sm text-amber-600">
                      ⚠️ Não há líderes cadastrados neste departamento.
                    </p>
                  )}
                </div>
              </>
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
                disabled={botaoDesabilitado}
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
