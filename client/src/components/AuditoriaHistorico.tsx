import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AuditLogEntry {
  id: number;
  campo: string;
  valorAnterior: string | null;
  valorNovo: string | null;
  adminId: number;
  adminName: string | null;
  createdAt: Date | string;
}

interface AuditoriaHistoricoProps {
  adjustmentRequestId: number;
}

export default function AuditoriaHistorico({ adjustmentRequestId }: AuditoriaHistoricoProps) {
  const { data: auditLogs, isLoading } = trpc.actions.getAuditLog.useQuery(
    { adjustmentRequestId },
    { enabled: adjustmentRequestId > 0 }
  ) as any; // TODO: Remover cast quando getAuditLog for adicionado ao router

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Histórico de Auditoria</CardTitle>
          <CardDescription>Carregando histórico de alterações...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Histórico de Auditoria</CardTitle>
          <CardDescription>Nenhuma alteração registrada</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-900">📋 Histórico de Auditoria</CardTitle>
        <CardDescription>Registro completo de todas as alterações realizadas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {auditLogs.map((log: AuditLogEntry) => (
          <div key={log.id} className="border-l-4 border-blue-400 pl-4 py-2 bg-white rounded p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-800">{log.adminName || "Admin"}</span>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                {log.campo.charAt(0).toUpperCase() + log.campo.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm mb-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">
                {new Date(log.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>

            <div className="bg-gray-50 rounded p-2 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Anterior:</span>
                <span className="text-red-600 line-through">{log.valorAnterior || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">Novo:</span>
                <span className="text-green-600 font-semibold">{log.valorNovo || "N/A"}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
