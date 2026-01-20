import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface HistoricoAcaoProps {
  actionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistoricoAcao({ actionId, open, onOpenChange }: HistoricoAcaoProps) {
  const { data: historico, isLoading } = trpc.actions.getHistory.useQuery(
    { actionId },
    { enabled: open }
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFieldLabel = (campo: string) => {
    const labels: Record<string, string> = {
      titulo: "Título",
      descricao: "Descrição",
      prazo: "Prazo",
      status: "Status",
      macroId: "Competência",
    };
    return labels[campo] || campo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
            <p style={{ marginTop: "10px", color: "#666" }}>Carregando histórico...</p>
          </div>
        ) : historico && historico.length > 0 ? (
          <div style={{ display: "grid", gap: "16px" }}>
            {historico.map((item: any) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  padding: "16px",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                  <div>
                    <p style={{ margin: "0 0 4px 0", color: "#666", fontSize: "12px", fontWeight: "500" }}>
                      Campo
                    </p>
                    <p style={{ margin: "0", fontSize: "14px", fontWeight: "600" }}>
                      {getFieldLabel(item.campo)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px 0", color: "#666", fontSize: "12px", fontWeight: "500" }}>
                      Data
                    </p>
                    <p style={{ margin: "0", fontSize: "14px" }}>{formatDate(item.createdAt)}</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                  <div>
                    <p style={{ margin: "0 0 4px 0", color: "#666", fontSize: "12px", fontWeight: "500" }}>
                      De
                    </p>
                    <p
                      style={{
                        margin: "0",
                        fontSize: "14px",
                        padding: "8px",
                        backgroundColor: "#fff3cd",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                      }}
                    >
                      {item.valorAnterior || "-"}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px 0", color: "#666", fontSize: "12px", fontWeight: "500" }}>
                      Para
                    </p>
                    <p
                      style={{
                        margin: "0",
                        fontSize: "14px",
                        padding: "8px",
                        backgroundColor: "#d4edda",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                      }}
                    >
                      {item.valorNovo || "-"}
                    </p>
                  </div>
                </div>

                {item.alteradoPorNome && (
                  <div>
                    <p style={{ margin: "0 0 4px 0", color: "#666", fontSize: "12px", fontWeight: "500" }}>
                      Alterado por
                    </p>
                    <p style={{ margin: "0", fontSize: "14px" }}>{item.alteradoPorNome}</p>
                  </div>
                )}

                {item.motivoAlteracao && (
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ margin: "0 0 4px 0", color: "#666", fontSize: "12px", fontWeight: "500" }}>
                      Motivo
                    </p>
                    <p style={{ margin: "0", fontSize: "14px", fontStyle: "italic" }}>{item.motivoAlteracao}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            <p>Nenhuma alteração registrada</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
