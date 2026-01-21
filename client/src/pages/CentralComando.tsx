'use client';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, AlertTriangle, Zap, Users, Building2 } from "lucide-react";
import { useState, useMemo } from "react";

export default function CentralComando() {
  const { data: users = [] } = trpc.users.list.useQuery();
  const { data: departamentos = [] } = trpc.departamentos.list.useQuery();
  const updateUserMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Líder atualizado com sucesso!");
      setSelectedUser(null);
      setNewLeaderId(null);
    },
    onError: (error) => toast.error(error.message || "Erro ao atualizar líder"),
  });

  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [newLeaderId, setNewLeaderId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Agrupar usuários por departamento e líder
  const hierarchy = useMemo(() => {
    const map: Record<number, Record<number, any[]>> = {};
    
    departamentos.forEach((dept: any) => {
      map[dept.id] = {};
    });

    users.forEach((user: any) => {
      if (user.departamentoId && map[user.departamentoId]) {
        const leaderId = user.leaderId || 0;
        if (!map[user.departamentoId][leaderId]) {
          map[user.departamentoId][leaderId] = [];
        }
        map[user.departamentoId][leaderId].push(user);
      }
    });

    return map;
  }, [users, departamentos]);

  // Diagnosticar erros
  const errors = useMemo(() => {
    const errorList: Array<{ type: string; user: any; message: string }> = [];
    
    users.forEach((user: any) => {
      // Verificar auto-liderança
      if (user.leaderId === user.id) {
        errorList.push({
          type: "auto_lider",
          user,
          message: `❌ ${user.name} é seu próprio líder!`,
        });
      }
      
      // Verificar PDI sem líder
      if ((user.role === "lider" || user.role === "colaborador") && !user.leaderId) {
        errorList.push({
          type: "sem_lider",
          user,
          message: `⚠️ ${user.name} não tem líder atribuído!`,
        });
      }
    });

    return errorList;
  }, [users]);

  const handleTrocarLider = (userId: number) => {
    const user = users.find((u: any) => u.id === userId);
    if (user?.leaderId === userId) {
      toast.error("Este usuário é seu próprio líder! Use 'Corrigir Agora'.");
      return;
    }
    setSelectedUser(userId);
    setNewLeaderId(null);
  };

  const handleCorrigirAutoLider = (userId: number) => {
    updateUserMutation.mutate({
      id: userId,
      leaderId: null,
    });
  };

  const handleConfirmTrocarLider = () => {
    if (!selectedUser || !newLeaderId) return;
    
    // Bloquear auto-atribuição
    if (selectedUser === newLeaderId) {
      toast.error("Um usuário não pode ser seu próprio líder!");
      return;
    }

    updateUserMutation.mutate({
      id: selectedUser,
      leaderId: newLeaderId,
    });
    setShowConfirm(false);
  };

  const toggleDept = (deptId: number) => {
    const newSet = new Set(expandedDepts);
    if (newSet.has(deptId)) {
      newSet.delete(deptId);
    } else {
      newSet.add(deptId);
    }
    setExpandedDepts(newSet);
  };

  const getDeptName = (deptId: number) => {
    return departamentos.find((d: any) => d.id === deptId)?.nome || `Depto ${deptId}`;
  };

  const getLeaderName = (leaderId: number | null) => {
    if (!leaderId) return "Sem Líder";
    return users.find((u: any) => u.id === leaderId)?.name || `Líder ${leaderId}`;
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0", fontSize: "28px", fontWeight: "800", color: "#111827", display: "flex", alignItems: "center", gap: "12px" }}>
          <Building2 size={32} /> Central de Comando da Hierarquia
        </h1>
        <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
          Visualize e edite a estrutura organizacional em tempo real
        </p>
      </div>

      {/* DIAGNÓSTICO DE ERROS */}
      {errors.length > 0 && (
        <Card style={{ padding: "16px", marginBottom: "24px", borderLeft: "4px solid #ef4444", backgroundColor: "#fef2f2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", color: "#dc2626", fontWeight: "700" }}>
            <AlertTriangle size={20} /> Inconsistências Detectadas ({errors.length})
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {errors.map((error, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", backgroundColor: "white", borderRadius: "6px", border: "1px solid #fecaca" }}>
                <span style={{ fontSize: "14px", color: "#7f1d1d" }}>{error.message}</span>
                {error.type === "auto_lider" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCorrigirAutoLider(error.user.id)}
                    style={{ color: "#dc2626", fontWeight: "600" }}
                  >
                    <Zap size={16} className="mr-1" /> Corrigir Agora
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* HIERARQUIA */}
      <div style={{ display: "grid", gap: "16px" }}>
        {departamentos.map((dept: any) => (
          <Card key={dept.id} style={{ padding: "16px", border: "1px solid #e5e7eb" }}>
            {/* HEADER DO DEPARTAMENTO */}
            <div
              onClick={() => toggleDept(dept.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                padding: "8px",
                backgroundColor: "#f3f4f6",
                borderRadius: "6px",
                marginBottom: "12px",
              }}
            >
              {expandedDepts.has(dept.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <Building2 size={20} style={{ color: "#2563eb" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "700", color: "#111827" }}>{dept.nome}</div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  {users.filter((u: any) => u.departamentoId === dept.id).length} usuários
                </div>
              </div>
              <Badge variant="outline">{dept.status === 'ativo' ? "Ativo" : "Inativo"}</Badge>
            </div>

            {/* CONTEÚDO EXPANDIDO */}
            {expandedDepts.has(dept.id) && (
              <div style={{ paddingLeft: "16px", borderLeft: "2px solid #e5e7eb", display: "grid", gap: "12px" }}>
                {Object.entries(hierarchy[dept.id] || {}).map(([leaderId, subordinados]: any) => (
                  <div key={leaderId} style={{ display: "grid", gap: "8px" }}>
                    {/* LÍDER */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", backgroundColor: "#eff6ff", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                      <Users size={18} style={{ color: "#1e40af" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "700", color: "#1e40af" }}>
                          {leaderId === "0" ? "Sem Líder Direto" : getLeaderName(Number(leaderId))}
                        </div>
                      </div>
                    </div>

                    {/* SUBORDINADOS */}
                    {subordinados.map((user: any) => (
                      <div
                        key={user.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px",
                          backgroundColor: user.leaderId === user.id ? "#fef2f2" : "white",
                          borderRadius: "6px",
                          border: user.leaderId === user.id ? "1px solid #fecaca" : "1px solid #e5e7eb",
                          marginLeft: "24px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "600", color: user.leaderId === user.id ? "#dc2626" : "#111827" }}>
                            {user.name}
                            {user.leaderId === user.id && <span style={{ marginLeft: "8px", color: "#dc2626", fontSize: "12px" }}>⚠️ AUTO-LÍDER</span>}
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280" }}>
                            {user.role === "admin" ? "Administrador" : user.role === "lider" ? "Líder" : "Colaborador"}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleTrocarLider(user.id)}
                          style={{ backgroundColor: "#2563eb", color: "white" }}
                        >
                          Trocar Líder
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* MODAL DE TROCAR LÍDER */}
      <AlertDialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar Líder</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o novo líder para {users.find((u: any) => u.id === selectedUser)?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Select value={newLeaderId?.toString() || ""} onValueChange={(val) => setNewLeaderId(Number(val))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um líder..." />
            </SelectTrigger>
            <SelectContent>
              {users
                .filter((u: any) => u.id !== selectedUser && (u.role === "lider" || u.role === "admin"))
                .map((u: any) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.name} ({u.role === "admin" ? "Admin" : "Líder"})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setShowConfirm(true); }}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE CONFIRMAÇÃO */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja mudar o líder de <strong>{users.find((u: any) => u.id === selectedUser)?.name}</strong> para <strong>{getLeaderName(newLeaderId)}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmTrocarLider} style={{ backgroundColor: "#2563eb" }}>
            Confirmar Alteração
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
