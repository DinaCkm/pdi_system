import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Edit, Trash2, Eye, History } from "lucide-react";
import { useLocation } from "wouter";
import { HistoricoAcao } from "@/components/HistoricoAcao";

export default function Acoes() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAcaoId, setSelectedAcaoId] = useState<number | null>(null);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoActionId, setHistoricoActionId] = useState<number | null>(null);

  const { data: acoes, isLoading, refetch } = trpc.actions.list.useQuery();
  const deleteMutation = trpc.actions.delete.useMutation({
    onSuccess: () => {
      toast.success("Ação deletada com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao deletar ação");
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar esta ação?")) {
      deleteMutation.mutate({ id });
    }
  };

  const filteredAcoes = acoes?.filter((acao: any) =>
    acao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acao.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 5px 0", fontSize: "28px", fontWeight: "bold" }}>Ações</h1>
          <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>Gerencie as ações dos PDIs</p>
        </div>
        <Button
          onClick={() => navigate("/acoes/nova")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#0066cc",
            color: "white",
            padding: "10px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          <Plus size={18} />
          Nova Ação
        </Button>
      </div>

      {/* Barra de Busca */}
      <div style={{ marginBottom: "20px" }}>
        <Input
          type="text"
          placeholder="Buscar ações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "14px",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Lista de Ações */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
          <p style={{ marginTop: "10px", color: "#666" }}>Carregando ações...</p>
        </div>
      ) : filteredAcoes.length === 0 ? (
        <Card style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ color: "#666", marginBottom: "20px" }}>Nenhuma ação encontrada</p>
          <Button
            onClick={() => navigate("/acoes/nova")}
            style={{
              backgroundColor: "#0066cc",
              color: "white",
              padding: "10px 16px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Criar primeira ação
          </Button>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {filteredAcoes.map((acao: any) => (
            <Card key={acao.id} style={{ padding: "16px" }}>
              <CardHeader style={{ paddingBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <CardTitle style={{ margin: "0 0 4px 0", fontSize: "16px" }}>
                      {acao.nome}
                    </CardTitle>
                    <CardDescription style={{ margin: "0", fontSize: "13px" }}>
                      {acao.descricao}
                    </CardDescription>
                  </div>
                  <Badge style={{ marginLeft: "12px" }}>
                    {acao.status || "Pendente"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent style={{ paddingTop: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#666", fontWeight: "500" }}>PDI:</span>
                    <p style={{ margin: "4px 0 0 0" }}>{acao.pdiTitulo}</p>
                  </div>
                  <div>
                    <span style={{ color: "#666", fontWeight: "500" }}>Competência:</span>
                    <p style={{ margin: "4px 0 0 0" }}>{acao.microcompetenciaNome}</p>
                  </div>
                  <div>
                    <span style={{ color: "#666", fontWeight: "500" }}>Prazo:</span>
                    <p style={{ margin: "4px 0 0 0" }}>
                      {acao.prazo ? new Date(acao.prazo).toLocaleDateString("pt-BR") : "-"}
                    </p>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAcaoId(acao.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      fontSize: "12px",
                    }}
                  >
                    <Eye size={14} />
                    Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/acoes/editar/${acao.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      fontSize: "12px",
                    }}
                  >
                    <Edit size={14} />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHistoricoActionId(acao.id);
                      setHistoricoOpen(true);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      fontSize: "12px",
                    }}
                  >
                    <History size={14} />
                    Histórico
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(acao.id)}
                    disabled={deleteMutation.isPending}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      color: "#d32f2f",
                    }}
                  >
                    <Trash2 size={14} />
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {historicoActionId && (
        <HistoricoAcao
          actionId={historicoActionId}
          open={historicoOpen}
          onOpenChange={setHistoricoOpen}
        />
      )}
    </div>
  );
}
