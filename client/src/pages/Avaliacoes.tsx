import { ClipboardCheck, FileUp, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Avaliacoes() {
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
        <Badge variant="outline">Estrutura inicial — sem gravação de dados</Badge>
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
          <CardTitle>Fluxo previsto</CardTitle>
          <CardDescription>
            Nesta primeira versão, o fluxo é apenas informativo para validação da arquitetura.
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
