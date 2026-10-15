import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Upload } from "lucide-react";
import { RelatorioEmpregadoDocumento, ESTILO_IMPRESSAO, type RelatorioEmpregado as Rel } from "@/components/RelatorioEmpregadoDocumento";
import { ABAS_PLANILHA_2025, lerPlanilha2025 } from "../../../shared/pdi2025Planilha";

// Relatório gerencial do empregado no PDI: a história da pessoa em linha do tempo.
// Líder vê a própria equipe; administrador e gerente (RH) veem todos.

const api = (trpc as any).relatorioEmpregado;

function ImportarPdi2025() {
  const situacao = api.situacaoPdi2025.useQuery(undefined, { refetchOnWindowFocus: false });
  const importar = api.importarPdi2025.useMutation();
  const [status, setStatus] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const s = situacao.data;

  async function enviar(arquivo: File) {
    setErro(null);
    try {
      setStatus("Lendo a planilha…");
      const wb = XLSX.read(await arquivo.arrayBuffer(), { type: "array" });
      const abas: Record<string, unknown[][]> = {};
      for (const a of ABAS_PLANILHA_2025) {
        const ws = wb.Sheets[a];
        if (ws) abas[a] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];
      }
      const p = lerPlanilha2025(abas);
      const lotes: Array<{ resumos: any[]; areas: any[]; acoes: any[] }> = [{ resumos: p.resumos, areas: [], acoes: [] }];
      for (let i = 0; i < p.areas.length; i += 400) lotes.push({ resumos: [], areas: p.areas.slice(i, i + 400), acoes: [] });
      for (let i = 0; i < p.acoes.length; i += 300) lotes.push({ resumos: [], areas: [], acoes: p.acoes.slice(i, i + 300) });
      let novos = 0;
      for (let i = 0; i < lotes.length; i++) {
        setStatus(`Enviando parte ${i + 1} de ${lotes.length}…`);
        const r = await importar.mutateAsync(lotes[i]);
        novos += r.resumos + r.areas + r.acoes;
      }
      setStatus(
        `Importação concluída: ${p.resumos.length} empregados, ${p.areas.length} áreas e ${p.acoes.length} ações lidas; ${novos} registros novos.${p.semEmail.length ? ` Ações pendentes sem e-mail correspondente: ${p.semEmail.join(", ")}.` : ""}`,
      );
      await situacao.refetch();
    } catch (e: any) {
      setStatus(null);
      setErro(e?.message || "Não foi possível importar a planilha.");
    }
  }

  return (
    <Card className="nao-imprimir">
      <CardHeader>
        <CardTitle className="text-base">PDI 2025 (planilha do ciclo 2025)</CardTitle>
        <CardDescription>
          O PDI 2025 foi conduzido fora da plataforma. Carregue a planilha "Relatório - Ciclo 2025 Finalizado e Revisado" para que os capítulos do PDI 2025 apareçam nos relatórios.
          Reenviar a mesma planilha não duplica nada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {s && (
          <div>
            Na base: <strong>{s.empregados}</strong> empregados, {s.areas} áreas e {s.acoes} ações.
            {s.semCadastro > 0 && <span className="text-amber-700"> {s.semCadastro} sem cadastro correspondente na plataforma (e-mail): {s.nomesSemCadastro.join(", ")}.</span>}
          </div>
        )}
        <input ref={input} type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
        <Button variant="outline" onClick={() => input.current?.click()} disabled={importar.isPending}>
          <Upload className="mr-2 h-4 w-4" /> Importar planilha do PDI 2025
        </Button>
        {status && <div className="text-muted-foreground">{status}</div>}
        {erro && <div className="text-red-700">{erro}</div>}
      </CardContent>
    </Card>
  );
}

export default function RelatorioEmpregado() {
  const { user } = useAuth();
  const role = String(user?.role ?? "");
  const isAdmin = role === "admin" || role === "Administrador";
  const empregados = trpc.bloco1CompetenciasFuncao.empregados.useQuery(undefined, { enabled: !!user });
  const [busca, setBusca] = useState("");
  const [colaboradorId, setColaboradorId] = useState("");

  const lista = useMemo(() => {
    const todos = (empregados.data ?? []).filter((u: any) => u.status !== "inativo" && Number(u.id) !== Number(user?.id));
    const b = busca.trim().toLowerCase();
    return b ? todos.filter((u: any) => [u.nome, u.funcaoNome, u.cargo, u.departamentoNome].some((v) => String(v ?? "").toLowerCase().includes(b))) : todos;
  }, [empregados.data, busca, user?.id]);

  const rel = api.relatorio.useQuery({ colaboradorId: Number(colaboradorId) }, { enabled: !!colaboradorId, refetchOnWindowFocus: false });
  const r: Rel | undefined = rel.data;

  useEffect(() => {
    if (lista.length === 1 && !colaboradorId) setColaboradorId(String(lista[0].id));
  }, [lista, colaboradorId]);

  return (
    <div className="space-y-6">
      <style>{ESTILO_IMPRESSAO}</style>
      <div className="nao-imprimir">
        <h1 className="text-3xl font-bold">Relatório do Empregado</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          A história de cada pessoa no PDI, em linha do tempo: o que foi levantado nas avaliações, o que foi trabalhado e como foi trabalhado.
          {role === "lider" ? " Você vê os empregados da sua equipe." : ""}
        </p>
      </div>

      {isAdmin && <ImportarPdi2025 />}

      <Card className="nao-imprimir">
        <CardHeader>
          <CardTitle className="text-base">Selecionar empregado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, função, cargo ou unidade..." />
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[260px]">
              <Select value={colaboradorId} onValueChange={setColaboradorId}>
                <SelectTrigger>
                  <SelectValue placeholder={empregados.isLoading ? "Carregando…" : "Selecione o empregado"} />
                </SelectTrigger>
                <SelectContent>
                  {lista.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nome} — {u.funcaoNome || u.cargo || "Sem função"} — {u.departamentoNome || "Sem unidade"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!r} onClick={() => window.open(`/relatorio-empregado/${colaboradorId}/imprimir`, "_blank")}>
              <FileDown className="mr-2 h-4 w-4" /> Baixar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {colaboradorId && rel.isLoading && <div className="text-sm text-muted-foreground">Montando o relatório…</div>}
      {rel.error && <div className="text-sm text-red-700">{rel.error.message}</div>}
      {r && (
        <div className="bg-white rounded-2xl border p-4 md:p-8">
          <RelatorioEmpregadoDocumento r={r} />
        </div>
      )}
    </div>
  );
}

// Versão para impressão: sem menu, com o logo da CKM em todas as páginas; abre a janela de impressão
// (o usuário escolhe "Salvar como PDF").
export function RelatorioEmpregadoImprimir({ id }: { id: string }) {
  const rel = api.relatorio.useQuery({ colaboradorId: Number(id) }, { refetchOnWindowFocus: false });
  const r: Rel | undefined = rel.data;
  useEffect(() => {
    if (!r) return;
    document.title = r.titulo;
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, [r]);
  return (
    <div style={{ background: "#fff", minHeight: "100vh", padding: 24 }}>
      <style>{ESTILO_IMPRESSAO}</style>
      {rel.isLoading && <div style={{ padding: 24 }}>Preparando o PDF…</div>}
      {rel.error && <div style={{ padding: 24, color: "#b42318" }}>{rel.error.message}</div>}
      {r && (
        // O cabeçalho da tabela se repete em cada página impressa: é ele que leva o logo da CKM a todas as páginas.
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <td style={{ padding: 0 }}>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", height: 56, marginBottom: 8 }}>
                  <img src="/logo-ckm.png" alt="CKM Talents" style={{ height: 34 }} />
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 0 }}>
                <RelatorioEmpregadoDocumento r={r} />
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
