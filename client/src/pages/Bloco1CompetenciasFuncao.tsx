import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const relacaoLabel: Record<string, string> = {
  ESSENCIAL: "Essencial",
  TRANSVERSAL: "Transversal",
  NAO_APLICAVEL: "Não aplicável",
  PENDENTE: "Pendente",
};

export default function Bloco1CompetenciasFuncao() {
  const [colaboradorId, setColaboradorId] = useState("");
  const [busca, setBusca] = useState("");

  const empregados = trpc.bloco1CompetenciasFuncao.empregados.useQuery();
  const mapa = trpc.bloco1CompetenciasFuncao.mapaIndividual.useQuery(
    { colaboradorId: Number(colaboradorId || 0) },
    { enabled: Boolean(colaboradorId) },
  );

  const empregadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const dados = empregados.data ?? [];
    if (!termo) return dados;
    return dados.filter((u: any) =>
      [u.nome, u.cargo, u.funcaoNome, u.departamentoNome]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [empregados.data, busca]);

  return (
    <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">Bloco 1 — Competências Individuais</h1>
        <p className="text-muted-foreground max-w-4xl">
          A análise é individual. Pessoas com a mesma função podem ter competências e classificações diferentes,
          porque a fonte técnica é o questionário individual de levantamento das atividades e a fonte comportamental
          é a Avaliação de Desempenho.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar empregado</CardTitle>
          <CardDescription>
            A função organizacional é contexto da análise, mas não determina sozinha as competências da pessoa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por empregado, função, cargo ou unidade..."
          />
          <Select value={colaboradorId} onValueChange={setColaboradorId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o empregado" />
            </SelectTrigger>
            <SelectContent>
              {empregadosFiltrados.map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.nome} — {u.funcaoNome || u.cargo || "Sem função"} — {u.departamentoNome || "Sem unidade"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {mapa.data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{mapa.data.empregado.nome}</CardTitle>
              <CardDescription>
                Função: {mapa.data.empregado.funcaoNome || "Não vinculada"} · Cargo: {mapa.data.empregado.cargo || "—"} ·
                Unidade: {mapa.data.empregado.departamentoNome || "—"}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Competências Técnicas</CardTitle>
              <CardDescription>
                Fonte: questionário individual de levantamento das atividades. A classificação Essencial/Transversal
                é individual e não deve ser copiada automaticamente para outra pessoa com a mesma função.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Eixo / competência técnica</TableHead>
                      <TableHead>Classificação individual</TableHead>
                      <TableHead>Resultado histórico</TableHead>
                      <TableHead>Fonte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapa.data.tecnico.competencias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhuma matriz técnica individual localizada para este empregado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mapa.data.tecnico.competencias.map((item: any) => (
                        <TableRow key={item.eixoRegistroId}>
                          <TableCell className="font-medium">{item.eixoNome}</TableCell>
                          <TableCell>
                            <Badge variant={item.classificacao === "ESSENCIAL" ? "default" : "outline"}>
                              {relacaoLabel[item.classificacao] || item.classificacao}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.percentualAnterior === null ? "—" : `${Number(item.percentualAnterior).toFixed(1)}%`}
                          </TableCell>
                          <TableCell className="max-w-[420px] whitespace-normal">{item.fonte}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Competências Comportamentais</CardTitle>
              <CardDescription>
                Fonte: Avaliação de Desempenho individual. O resultado pertence à pessoa e não é herdado automaticamente
                por outras pessoas com a mesma função.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência comportamental</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Classificação da avaliação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapa.data.comportamental.competencias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhuma medição comportamental de Avaliação de Desempenho localizada para este empregado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mapa.data.comportamental.competencias.map((item: any) => {
                        const amplitude = item.escalaMax - item.escalaMin;
                        const percentual = amplitude > 0
                          ? ((item.valor - item.escalaMin) / amplitude) * 100
                          : null;
                        return (
                          <TableRow key={item.medicaoId}>
                            <TableCell className="font-medium">{item.competenciaNome || "—"}</TableCell>
                            <TableCell>
                              <div>{item.avaliacaoTitulo || "Avaliação de Desempenho"}</div>
                              <div className="text-xs text-muted-foreground">{String(item.dataReferencia || "")}</div>
                            </TableCell>
                            <TableCell>
                              {item.valor} / {item.escalaMax}
                              {percentual !== null ? ` (${percentual.toFixed(1)}%)` : ""}
                            </TableCell>
                            <TableCell>{item.classificacaoResultado || "—"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regra metodológica aplicada</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Técnicas:</strong> a relação Essencial/Transversal é individual e decorre das atividades declaradas pelo empregado no questionário.</p>
              <p><strong>Comportamentais:</strong> a análise parte da Avaliação de Desempenho individual.</p>
              <p><strong>Função:</strong> serve como contexto organizacional; não obriga duas pessoas da mesma função a terem o mesmo mapa de competências.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
