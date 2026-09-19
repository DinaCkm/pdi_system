import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const NIVEIS = [
  ["EXECUTA_COM_ORIENTACAO", "Executa com orientação"],
  ["EXECUTA_COM_AUTONOMIA", "Executa com autonomia"],
  ["ANALISA_RECOMENDA", "Analisa e recomenda"],
  ["DECIDE", "Decide"],
  ["COORDENA", "Coordena"],
  ["RESPONDE_PELO_RESULTADO", "Responde pelo resultado"],
] as const;

export default function Bloco1CompetenciasFuncao() {
  const [funcaoId, setFuncaoId] = useState("");
  const [competenciaId, setCompetenciaId] = useState("");
  const [classificacao, setClassificacao] = useState<"ESSENCIAL_FUNCAO" | "TRANSVERSAL_FUNCAO">("ESSENCIAL_FUNCAO");
  const [nivel, setNivel] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [busca, setBusca] = useState("");

  const funcoes = trpc.bloco1CompetenciasFuncao.funcoes.useQuery();
  const funcaoSelecionada = (funcoes.data ?? []).find((f: any) => String(f.id) === funcaoId);

  const competencias = trpc.bloco1CompetenciasFuncao.competencias.useQuery(
    { organizacaoId: Number(funcaoSelecionada?.organizacaoId || 0) },
    { enabled: Boolean(funcaoSelecionada?.organizacaoId) },
  );

  const requisitos = trpc.bloco1CompetenciasFuncao.requisitos.useQuery(
    { funcaoOrganizacionalId: Number(funcaoId || 0) },
    { enabled: Boolean(funcaoId) },
  );

  const salvar = trpc.bloco1CompetenciasFuncao.salvarRequisito.useMutation();
  const remover = trpc.bloco1CompetenciasFuncao.removerRequisito.useMutation();

  const competenciasDisponiveis = useMemo(() => {
    const existentes = new Set((requisitos.data ?? []).map((r: any) => Number(r.competenciaOrganizacionalId)));
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return (competencias.data ?? []).filter((c: any) => {
      if (existentes.has(Number(c.id))) return false;
      if (!termo) return true;
      return [c.nome, c.descricao].filter(Boolean).some((v) =>
        String(v).toLocaleLowerCase("pt-BR").includes(termo),
      );
    });
  }, [competencias.data, requisitos.data, busca]);

  const salvarRequisito = async () => {
    if (!funcaoId || !competenciaId) {
      toast.error("Selecione a função e a competência.");
      return;
    }
    try {
      await salvar.mutateAsync({
        funcaoOrganizacionalId: Number(funcaoId),
        competenciaOrganizacionalId: Number(competenciaId),
        classificacaoFuncao: classificacao,
        nivelResponsabilidade: nivel ? (nivel as any) : null,
        justificativa: justificativa.trim() || null,
      });
      toast.success("Competência vinculada à função.");
      setCompetenciaId("");
      setNivel("");
      setJustificativa("");
      await requisitos.refetch();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível salvar.");
    }
  };

  const removerRequisito = async (id: number) => {
    if (!window.confirm("Remover esta competência da função?")) return;
    try {
      await remover.mutateAsync({ id });
      toast.success("Competência removida da função.");
      await requisitos.refetch();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível remover.");
    }
  };

  return (
    <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">Bloco 1 — Competências da Função</h1>
        <p className="text-muted-foreground">
          Defina, por função organizacional, quais competências são Essenciais e quais são Transversais.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Selecionar função</CardTitle></CardHeader>
        <CardContent>
          <Select value={funcaoId} onValueChange={(v) => {
            setFuncaoId(v);
            setCompetenciaId("");
          }}>
            <SelectTrigger><SelectValue placeholder="Selecione a função organizacional" /></SelectTrigger>
            <SelectContent>
              {(funcoes.data ?? []).map((f: any) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {funcaoId && (
        <>
          <Card>
            <CardHeader><CardTitle>2. Competências já definidas para a função</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Nível de responsabilidade</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(requisitos.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhuma competência definida para esta função.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (requisitos.data ?? []).map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.competenciaNome}</TableCell>
                          <TableCell>
                            <Badge variant={r.classificacaoFuncao === "ESSENCIAL_FUNCAO" ? "default" : "outline"}>
                              {r.classificacaoFuncao === "ESSENCIAL_FUNCAO" ? "Essencial" : "Transversal"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {NIVEIS.find(([value]) => value === r.nivelResponsabilidade)?.[1] || "—"}
                          </TableCell>
                          <TableCell className="max-w-[420px] whitespace-normal">{r.justificativa || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removerRequisito(Number(r.id))}
                              disabled={remover.isPending}
                            >
                              Remover
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
            <CardHeader><CardTitle>3. Adicionar competência à função</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar competência por nome ou descrição..."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Competência organizacional</Label>
                  <Select value={competenciaId} onValueChange={setCompetenciaId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {competenciasDisponiveis.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Classificação na função</Label>
                  <Select value={classificacao} onValueChange={(v) => setClassificacao(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESSENCIAL_FUNCAO">Essencial</SelectItem>
                      <SelectItem value="TRANSVERSAL_FUNCAO">Transversal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Nível de responsabilidade</Label>
                  <Select value={nivel} onValueChange={setNivel}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {NIVEIS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>Justificativa</Label>
                  <Textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    placeholder="Por que esta competência é essencial ou transversal para esta função?"
                  />
                </div>
              </div>

              <Button onClick={salvarRequisito} disabled={salvar.isPending || !competenciaId}>
                {salvar.isPending ? "Salvando..." : "Adicionar competência à função"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
