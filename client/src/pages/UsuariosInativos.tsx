import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, AlertCircle, Clock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function UsuariosInativos() {
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; userId?: number; userName?: string }>({ open: false });

  const { data: users, isLoading, refetch } = trpc.users.listDeleted.useQuery();
  const restoreMutation = trpc.users.restore.useMutation();

  const handleRestore = async () => {
    if (!confirmDialog.userId) return;
    
    try {
      await restoreMutation.mutateAsync({ id: confirmDialog.userId });
      toast.success("Usuário reativado com sucesso!");
      setConfirmDialog({ open: false });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao reativar usuário");
    }
  };

  const canRestore = (deletedAt: Date) => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(deletedAt) > sixMonthsAgo;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      lider: "Líder",
      colaborador: "Colaborador"
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      admin: "destructive",
      lider: "default",
      colaborador: "secondary"
    };
    return variants[role] || "outline";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários Inativos</h1>
        <p className="text-muted-foreground mt-2">
          Usuários inativados podem ser reativados dentro de 6 meses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários Inativos</CardTitle>
          <CardDescription>
            {users?.length || 0} usuário(s) inativo(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário inativo encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Inativado há</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const canBeRestored = user.deletedAt && canRestore(user.deletedAt);
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.cpf}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.cargo}</TableCell>
                      <TableCell>
                        {user.deletedAt && (
                          <span className={!canBeRestored ? "text-red-600 font-medium" : ""}>
                            {formatDistanceToNow(new Date(user.deletedAt), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canBeRestored ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setConfirmDialog({ open: true, userId: user.id, userName: user.name })}
                            title="Reativar usuário"
                          >
                            <RotateCcw className="w-4 h-4 mr-2 text-green-600" />
                            Reativar
                          </Button>
                        ) : (
                          <Badge variant="destructive">
                            Prazo expirado
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-green-500" />
              Confirmar Reativação
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reativar o usuário <strong>{confirmDialog.userName}</strong>? 
              Todos os PDIs e ações vinculados serão restaurados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-green-600 hover:bg-green-700"
            >
              Reativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
