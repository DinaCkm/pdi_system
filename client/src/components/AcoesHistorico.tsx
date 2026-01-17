import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

interface AcoesHistoricoProps {
  actionId: number;
  actionName?: string;
}

export function AcoesHistorico({ actionId, actionName }: AcoesHistoricoProps) {
  const { data: historico, isLoading, isError } = trpc.actions.getHistorico.useQuery({
    actionId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError || !historico) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Erro ao carregar histórico de mudanças
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma mudança registrada para esta ação
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionName && (
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-sm font-semibold text-foreground">
            Ação: <span className="font-normal">{actionName}</span>
          </p>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[140px]">Data/Hora</TableHead>
              <TableHead className="w-[120px]">Campo</TableHead>
              <TableHead className="w-[150px]">Valor Anterior</TableHead>
              <TableHead className="w-[150px]">Valor Novo</TableHead>
              <TableHead className="w-[140px]">Autor</TableHead>
              <TableHead>Motivo/Solicitação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.map((item, index) => (
              <TableRow key={item.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                <TableCell className="text-sm text-muted-foreground">
                  {item.createdAt
                    ? format(new Date(item.createdAt), "dd/MM/yy HH:mm", {
                        locale: ptBR,
                      })
                    : "---"}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  <Badge variant="outline">{item.campo || "---"}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {item.valorAnterior ? (
                    <span className="text-red-600 dark:text-red-400">
                      {item.valorAnterior}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">---</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {item.valorNovo ? (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {item.valorNovo}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">---</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  <span className="font-medium">{item.alteradorNome || "Sistema"}</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {item.motivoAlteracao || (item.solicitacaoAjusteId ? "Solicitação de ajuste" : "---")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground text-center pt-4">
        Total de {historico.length} mudança{historico.length !== 1 ? "s" : ""} registrada{historico.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
