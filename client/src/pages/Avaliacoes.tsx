import { ClipboardCheck, FileUp, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const statusLabel: Record<string, string> = {
  RASCUNHO: "Rascunho",
  EM_CONFERENCIA: "Em conferência",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

const tipoLabel: Record<string, string> = {
  DESEMPENHO: "Avaliação de Desempenho",
  TECNICA: "Avaliação Técnica",
};

export default function Avaliacoes() {
  const avaliacoesQuery = trpc.avaliacoes.listar.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Avaliações</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Área destinada às novas medições que serão utilizadas posteriormente
          para analisar o desenvolvimento das competências trabalhadas no PDI.
        </p>
        <Badge variant="outline">Base conectada ao banco de dados</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileUp className="h-6 w-6 text-blue-600" />
              <CardTitle>Avaliação de Desempenho</CardTitle>
            </div>
            <CardDescription>
              Importação da avaliação realizada fora do PDI-System.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Selecionar ciclo e importar o relatório.</p>
            <p>Conferir empregado, competência e resultado antes de salvar.</p>
            <p>Associar competências equivalentes quando os nomes forem diferentes.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ListChecks className="h-6 w-6 text-blue-600" />
              <CardTitle>Avaliação Técnica</CardTitle>
            </div>
            <CardDescription>
              Cadastro, publicação e aplicação da nova avaliação técnica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Criar avaliação por ciclo e departamento/unidade.</p>
            <p>Cadastrar questões, competências e funções essenciais.</p>
            <p>Calcular Performance na Função e Prontidão separadamente.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-6 w-6 text-blue-600" />
              <CardTitle>Resultados das Avaliações</CardTitle>
            </div>
            <CardDescription>
              Acompanhamento das medições antes de entrarem no módulo Evolução.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Acompanhar avaliações concluídas e pendentes.</p>
            <p>Consultar resultados por empregado e competência.</p>
            <p>Validar dados antes da comparação de evolução.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avaliações registradas</CardTitle>
          <CardDescription>
            Registros armazenados na nova base de Avaliações e Evolução.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {avaliacoesQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Carregando avaliações...</p>
          )}

          {avaliacoesQuery.isError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              Não foi possível consultar a base de avaliações. Nenhum dado foi alterado.
            </div>
          )}

          {!avaliacoesQuery.isLoading &&
            !avaliacoesQuery.isError &&
            (avaliacoesQuery.data?.length ?? 0) === 0 && (
              <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                Nenhuma avaliação cadastrada até o momento. A estrutura está pronta para receber a primeira nova medição.
              </div>
            )}

          {(avaliacoesQuery.data?.length ?? 0) > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 pr-4 font-medium">Avaliação</th>
                    <th className="py-3 pr-4 font-medium">Tipo</th>
                    <th className="py-3 pr-4 font-medium">Ciclo</th>
                    <th className="py-3 pr-4 font-medium">Unidade</th>
                    <th className="py-3 pr-4 font-medium">Data de referência</th>
                    <th className="py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {avaliacoesQuery.data?.map(avaliacao => (
                    <tr key={avaliacao.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{avaliacao.titulo}</td>
                      <td className="py-3 pr-4">{tipoLabel[avaliacao.tipo] ?? avaliacao.tipo}</td>
                      <td className="py-3 pr-4">{avaliacao.cicloNome ?? `Ciclo ${avaliacao.cicloId}`}</td>
                      <td className="py-3 pr-4">{avaliacao.departamentoNome ?? "Todas / não informada"}</td>
                      <td className="py-3 pr-4">{String(avaliacao.dataReferencia)}</td>
                      <td className="py-3">
                        <Badge variant="secondary">
                          {statusLabel[avaliacao.status] ?? avaliacao.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo do módulo</CardTitle>
          <CardDescription>
            A evolução só será apresentada quando houver nova medição comparável da mesma competência.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">Trilha do PDI</Badge>
            <span>→</span>
            <Badge variant="secondary">Nova avaliação</Badge>
            <span>→</span>
            <Badge variant="secondary">Resultado por competência</Badge>
            <span>→</span>
            <Badge variant="secondary">Módulo Evolução</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
