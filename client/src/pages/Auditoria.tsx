import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";

export default function Auditoria() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCampo, setFilterCampo] = useState<string>("all");

  // Obter todas as ações com histórico
  const { data: acoes, isLoading, isError } = trpc.actions.list.useQuery();

  // Extrair histórico de todas as ações
  const allHistorico = acoes?.flatMap((acao) =>
    (acao.historico || []).map((item: any) => ({
      ...item,
      acaoNome: acao.nome,
      acaoId: acao.id,
    }))
  ) || [];

  // Filtrar histórico
  const filteredHistorico = allHistorico.filter((item) => {
    const matchesSearch =
      item.acaoNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.alteradorNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.campo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCampo = filterCampo === "all" || item.campo === filterCampo;

    return matchesSearch && matchesCampo;
  });

  // Obter lista única de campos para filtro
  const uniqueCampos = Array.from(
    new Set(allHistorico.map((item) => item.campo).filter(Boolean))
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Erro ao carregar histórico de auditoria
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auditoria</h1>
        <p className="text-muted-foreground mt-2">
          Visualize o histórico completo de todas as mudanças realizadas no sistema
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Buscar por Ação, Autor ou Campo</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="campo">Campo Alterado</Label>
              <select
                id="campo"
                value={filterCampo}
                onChange={(e) => setFilterCampo(e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="all">Todos os campos</option>
                {uniqueCampos.map((campo) => (
                  <option key={campo} value={campo}>
                    {campo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Mudanças</CardTitle>
          <CardDescription>
            Total de {filteredHistorico.length} mudança{filteredHistorico.length !== 1 ? "s" : ""} registrada{filteredHistorico.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistorico.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma mudança encontrada
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-[140px]">Data/Hora</TableHead>
                    <TableHead className="w-[150px]">Ação</TableHead>
                    <TableHead className="w-[120px]">Campo</TableHead>
                    <TableHead className="w-[150px]">Valor Anterior</TableHead>
                    <TableHead className="w-[150px]">Valor Novo</TableHead>
                    <TableHead className="w-[140px]">Autor</TableHead>
                    <TableHead>Motivo/Solicitação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistorico.map((item, index) => (
                    <TableRow key={`${item.id}-${index}`} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.createdAt
                          ? format(new Date(item.createdAt), "dd/MM/yy HH:mm", {
                              locale: ptBR,
                            })
                          : "---"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary"
                          onClick={() => {
                            // Navegar para ação específica se necessário
                            window.location.href = `/acoes?acaoId=${item.acaoId}`;
                          }}
                        >
                          {item.acaoNome}
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm">
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
                      <TableCell className="text-sm font-medium">
                        {item.alteradorNome || "Sistema"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {item.motivoAlteracao || (item.solicitacaoAjusteId ? "Solicitação de ajuste" : "---")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
