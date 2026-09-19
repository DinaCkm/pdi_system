import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const relacaoLabel: Record<string, string> = {
  ESSENCIAL: "Essencial",
  TRANSVERSAL: "Transversal",
  NAO_APLICAVEL: "Não aplicável",
  PENDENTE: "Pendente",
};

const evolucaoLabel: Record<string, string> = {
  EVOLUCAO: "Evolução",
  ESTABILIDADE: "Estabilidade",
  REDUCAO: "Redução",
  SEM_COMPARACAO: "Sem comparação",
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
          A análise é individual. O objetivo é acompanhar se houve desenvolvimento das competências
          técnicas e comportamentais após as ações do PDI.
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
              <CardTitle>3. Competências Comportamentais — Evolução 2024 × 2025</CardTitle>
              <CardDescription>
                Nesta etapa, a evolução considera exclusivamente a mesma competência comportamental
                medida em 2024 e 2025. O DISC não participa deste cálculo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência comportamental</TableHead>
                      <TableHead>2024</TableHead>
                      <TableHead>2025</TableHead>
                      <TableHead>Variação</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Próxima ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapa.data.comportamental.competencias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhuma competência comportamental comparável localizada para este empregado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mapa.data.comportamental.competencias.map((item: any) => (
                        <TableRow key={item.competenciaMacroId}>
                          <TableCell className="font-medium">{item.competenciaNome || "—"}</TableCell>
                          <TableCell>
                            {item.resultado2024 === null ? "—" : Number(item.resultado2024).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.resultado2025 === null ? "—" : Number(item.resultado2025).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.variacao === null
                              ? "—"
                              : `${Number(item.variacao) > 0 ? "+" : ""}${Number(item.variacao).toFixed(2)}`}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.evolucao === "EVOLUCAO"
                                  ? "default"
                                  : item.evolucao === "SEM_COMPARACAO"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {evolucaoLabel[item.evolucao] || item.evolucao}
                            </Badge>
                            {!item.comparavel && item.motivo ? (
                              <div className="text-xs text-muted-foreground mt-1">{item.motivo}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {item.criarNovaAcaoPdi ? (
                              <Button size="sm" variant="outline" disabled>
                                Criar ação no PDI
                              </Button>
                            ) : item.evolucao === "EVOLUCAO" ? (
                              <span className="text-sm text-muted-foreground">Sem nova ação automática</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Aguardando comparação</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                O botão está apenas sinalizado nesta etapa e permanece desabilitado até ligarmos esta necessidade
                ao fluxo seguro de criação de ações do PDI.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regra metodológica aplicada</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong>Técnicas:</strong> a relação Essencial/Transversal é individual e decorre das atividades declaradas pelo empregado no questionário.</p>
              <p><strong>Comportamentais:</strong> comparar a mesma competência entre 2024 e 2025.</p>
              <p><strong>Leitura:</strong> resultado maior = evolução; resultado igual = estabilidade; resultado menor = redução.</p>
              <p><strong>PDI:</strong> estabilidade ou redução sinaliza necessidade de nova ação de desenvolvimento.</p>
              <p><strong>DISC:</strong> não participa do cálculo atual; fica reservado para funcionalidade futura.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
