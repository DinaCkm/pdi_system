import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PDI {
  pdiId: number;
  colaboradorNome: string;
  departamentoNome: string;
  liderNome: string;
  cicloNome: string;
  status: string;
  totalAcoes: number;
  acoesConcluidasTotal: number;
  progresso: number;
}

export function DataTablePDIs() {
  const [, navigate] = useLocation();
  const [departamentoFilter, setDepartamentoFilter] = useState<string>("");
  const [pessoaFilter, setPessoaFilter] = useState<string>("");
  const [realizacaoFilter, setRealizacaoFilter] = useState<string>("todos");
  const [pdiToDelete, setPdiToDelete] = useState<number | null>(null);

  // Buscar departamentos para filtro
  const { data: departamentos = [] } = trpc.departamentos.list.useQuery();

  // Buscar PDIs com filtros
  const { data: pdisList = [], isLoading, refetch } = trpc.pdis.list.useQuery();
  
  // Filtrar PDIs localmente
  const pdis = pdisList.filter((pdi) => {
    // Filtro por departamento
    if (departamentoFilter && pdi.departamentoId !== parseInt(departamentoFilter)) {
      return false;
    }
    // Filtro por pessoa
    if (pessoaFilter && !pdi.colaboradorNome?.toLowerCase().includes(pessoaFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Mutation para deletar PDI
  const utils = trpc.useUtils();

  const deletePDIMutation = trpc.pdis.delete.useMutation({
    onSuccess: () => {
      toast.success("PDI deletado com sucesso!");
      utils.pdis.list.invalidate();
      setPdiToDelete(null);
    },
    onError: (error) => {
      toast.error(`Erro ao deletar PDI: ${error.message}`);
    },
  });

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "rascunho":
        return "bg-gray-100 text-gray-800";
      case "aguardando_aprovacao":
        return "bg-yellow-100 text-yellow-800";
      case "ativo":
        return "bg-blue-100 text-blue-800";
      case "concluido":
        return "bg-green-100 text-green-800";
      case "cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Função para obter label do status
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      rascunho: "Rascunho",
      aguardando_aprovacao: "Aguardando Aprovação",
      ativo: "Em Andamento",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return <div className="p-4">Carregando PDIs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filtro por Departamento */}
        <div>
          <label className="text-sm font-medium mb-2 block">Filtrar por Departamento</label>
          <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um departamento" />
            </SelectTrigger>
            <SelectContent>
              {departamentos.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  {dept.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Pessoa */}
        <div>
          <label className="text-sm font-medium mb-2 block">Filtrar por Pessoa</label>
          <Input
            placeholder="Digite o nome do colaborador"
            value={pessoaFilter}
            onChange={(e) => setPessoaFilter(e.target.value)}
          />
        </div>

        {/* Filtro por Realização */}
        <div>
          <label className="text-sm font-medium mb-2 block">Filtrar por Realização</label>
          <Select value={realizacaoFilter} onValueChange={setRealizacaoFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="0">0% (Não Iniciados)</SelectItem>
              <SelectItem value="1-50">1% a 50% (Em Início)</SelectItem>
              <SelectItem value="51-99">51% a 99% (Fase Final)</SelectItem>
              <SelectItem value="100">100% (Concluídos)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Colaborador</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Líder</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pdis.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  Nenhum PDI encontrado com os filtros selecionados
                </TableCell>
              </TableRow>
            ) : (
              pdis.map((pdi: PDI) => (
                <TableRow key={pdi.pdiId} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{pdi.colaboradorNome || "—"}</TableCell>
                  <TableCell>{pdi.departamentoNome || "—"}</TableCell>
                  <TableCell>{pdi.liderNome || "—"}</TableCell>
                  <TableCell>{pdi.cicloNome || "—"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(pdi.status)}>
                      {getStatusLabel(pdi.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${pdi.progresso || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{pdi.progresso || 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/pdis/${pdi.pdiId}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/pdis/${pdi.pdiId}/editar`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPdiToDelete(pdi.pdiId)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={pdiToDelete !== null} onOpenChange={(open) => !open && setPdiToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Deletar PDI</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este PDI? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pdiToDelete) {
                  deletePDIMutation.mutate({ id: pdiToDelete });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
