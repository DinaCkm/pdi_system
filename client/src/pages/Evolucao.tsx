import { Activity, Brain, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Evolucao() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-semibold tracking-tight">Evolução</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-4xl">
          Área destinada à comparação entre a trilha de desenvolvimento e as novas medições de competência.
          Esta versão inicial é somente estrutural e não calcula nem grava resultados.
        </p>
        <Badge variant="outline">Estrutura inicial — sem cálculo e sem gravação</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progresso comportamental</CardDescription>
            <CardTitle className="text-2xl">Aguardando medição</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Será calculado somente após nova Avaliação de Desempenho comparável.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progresso técnico</CardDescription>
            <CardTitle className="text-2xl">Aguardando medição</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Será calculado somente após nova Avaliação Técnica comparável.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Competências com progresso</CardDescription>
            <CardTitle className="text-2xl">—</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Não será inferido progresso apenas pela conclusão das ações.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Novos gaps</CardDescription>
            <CardTitle className="text-2xl">—</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Serão exibidos após a nova medição identificar necessidades não priorizadas antes.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-blue-600" />
              <CardTitle>Evolução Comportamental</CardTitle>
            </div>
            <CardDescription>Comparação por competência entre a trilha e a nova AD.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
              <span className="col-span-2">Competência</span>
              <span>Ações</span>
              <span>Anterior</span>
              <span>Nova AD</span>
              <span>Situação</span>
            </div>
            <div className="py-6 text-sm text-center text-muted-foreground">
              Aguardando novas medições comportamentais.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-600" />
              <CardTitle>Evolução Técnica</CardTitle>
            </div>
            <CardDescription>Comparação por competência/eixo após a nova avaliação técnica.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
              <span className="col-span-2">Competência/Eixo</span>
              <span>Ações</span>
              <span>Anterior</span>
              <span>Nova prova</span>
              <span>Situação</span>
            </div>
            <div className="py-6 text-sm text-center text-muted-foreground">
              Aguardando novas medições técnicas.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle>Fechamento do ciclo</CardTitle>
          </div>
          <CardDescription>
            O sistema deverá separar o resultado em três grupos para orientar o próximo PDI.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-lg border p-4">
            <div className="font-medium">Podem sair da prioridade</div>
            <div className="mt-1 text-muted-foreground">Competências com resultado atual adequado.</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="font-medium">Devem continuar</div>
            <div className="mt-1 text-muted-foreground">Competências cujo gap permanece após nova medição.</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="font-medium">Novos gaps</div>
            <div className="mt-1 text-muted-foreground">Necessidades identificadas agora e não priorizadas anteriormente.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
