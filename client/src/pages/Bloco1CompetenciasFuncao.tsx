import { useMemo, useState } from "react";
import { useLocation } from "wouter";
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
  const [, navigate] = useLocation();
  const [colaboradorId, setColaboradorId] = useState("");
  const [busca, setBusca] = useState("");

  const empregados = trpc.bloco1CompetenciasFuncao.empregados.useQuery();
  const pdis = trpc.pdis.list.useQuery();
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

  const pdiDoEmpregado = useMemo(() => {
    if (!colaboradorId) return null;
    return (pdis.data ?? []).find(
      (pdi: any) => Number(pdi.colaboradorId) === Number(colaboradorId),
    ) ?? null;
  }, [pdis.data, colaboradorId]);

  const abrirBiblioteca = (eixo: string, macroId?: number | null) => {
    const params = new URLSearchParams();
    if (pdiDoEmpregado?.pdiId) params.set("pdiId", String(pdiDoEmpregado.pdiId));
    if (eixo) params.set("eixo", eixo);
    if (macroId) params.set("macroId", String(macroId));
    params.set("origem", "evolucao_individual");
    params.set("modo", "biblioteca");
    navigate(`/acoes/nova?${params.toString()}`);
  };

  return (
    <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">Evolução Individual</h1>
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
                      <TableHead>Anterior</TableHead>
                      <TableHead>Atual</TableHead>
                      <TableHead>Evolução</TableHead>
                      <TableHead>Próxima ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapa.data.tecnico.competencias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                          <TableCell>
                            {item.percentualAtual === null ? "—" : `${Number(item.percentualAtual).toFixed(1)}%`}
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
                              {item.evolucao === "SEM_COMPARACAO"
                                ? "Sem comparação"
                                : `${evolucaoLabel[item.evolucao] || item.evolucao} ${item.evolucaoPp === null ? "" : `(${Number(item.evolucaoPp) > 0 ? "+" : ""}${Number(item.evolucaoPp).toFixed(1)} p.p.)`}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => abrirBiblioteca(item.eixoNome)}>
                              Criar ação no PDI
                            </Button>
                          </TableCell>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => abrirBiblioteca(item.competenciaNome || "", Number(item.competenciaMacroId))}
                            >
                              Criar ação no PDI
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                A criação de nova ação permanece disponível em qualquer resultado de evolução.
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
              <p><strong>PDI:</strong> estabilidade ou redução sinaliza necessidade de atenção, mas a criação de nova ação permanece disponível em qualquer resultado, inclusive quando houve evolução.</p>
              <p><strong>DISC:</strong> não participa do cálculo atual; fica reservado para funcionalidade futura.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
