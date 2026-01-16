import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface PendencyBadgeProps {
  count: number;
  label: string;
  type?: "warning" | "info" | "success";
  animated?: boolean;
}

/**
 * Componente de Badge para exibir pendências com notificação visual
 * Exibe ícone piscante quando há pendências críticas
 */
export function PendencyBadge({
  count,
  label,
  type = "warning",
  animated = true,
}: PendencyBadgeProps) {
  if (count === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <span>{label}</span>
      </div>
    );
  }

  const baseStyles = "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium";
  const typeStyles = {
    warning: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div className={`${baseStyles} ${typeStyles[type]} ${animated ? "animate-pulse" : ""}`}>
      <AlertCircle className={`h-4 w-4 ${animated ? "animate-bounce" : ""}`} />
      <span>{label}</span>
      <Badge
        variant="secondary"
        className={`ml-1 ${
          type === "warning"
            ? "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100"
            : type === "info"
            ? "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100"
            : "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100"
        }`}
      >
        {count}
      </Badge>
    </div>
  );
}

/**
 * Componente para exibir múltiplas pendências em um resumo
 */
export function PendenciesSummary({
  pdisAwaitingApproval = 0,
  actionsWithPendingEvidence = 0,
  pendingAdjustmentRequests = 0,
}: {
  pdisAwaitingApproval?: number;
  actionsWithPendingEvidence?: number;
  pendingAdjustmentRequests?: number;
}) {
  const total =
    pdisAwaitingApproval + actionsWithPendingEvidence + pendingAdjustmentRequests;

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>Nenhuma pendência</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pdisAwaitingApproval > 0 && (
        <PendencyBadge
          count={pdisAwaitingApproval}
          label="PDIs Aguardando Aprovação"
          type="warning"
        />
      )}
      {actionsWithPendingEvidence > 0 && (
        <PendencyBadge
          count={actionsWithPendingEvidence}
          label="Ações com Evidência Pendente"
          type="warning"
        />
      )}
      {pendingAdjustmentRequests > 0 && (
        <PendencyBadge
          count={pendingAdjustmentRequests}
          label="Solicitações de Ajuste Pendentes"
          type="warning"
        />
      )}
    </div>
  );
}
