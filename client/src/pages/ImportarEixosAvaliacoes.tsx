import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, ShieldCheck, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type TipoImportacao = "TECNICA" | "COMPORTAMENTAL";
type LinhaTecnica = {
  linha: number; nome: string | null; email: string | null; cpf: string | null; unidade: string | null;
  eixoId: string | null; eixoNome: string; relacao: "ESSENCIAL" | "TRANSVERSAL" | "NAO_APLICAVEL" | "PENDENTE";
  pontuacao: number | null; justificativa: string | null; fonte: string | null; observacao: string | null;
};
type LinhaComportamental = {
  linha: number; nome: string | null; email: string | null; cpf: string | null; unidade: string | null;
  eixoNome: string; pontuacao: number; escalaMin: number; escalaMax: number;
  classificacao: string | null; observacao: string | null;
};

function normalizar(valor: unknown) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
}

function texto(valor: unknown) {
  const resultado = String(valor ?? "").trim();
  return resultado || null;
}

function numero(valor: unknown, campo: string, linha: number) {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  const original = String(valor ?? "").trim().replace(/%$/, "").replace(/\s/g, "");
  const limpo = original.includes(",") ? original.replace(/\./g, "").replace(",", ".") : original;
  if (!limpo) throw new Error(`Linha ${linha}: ${campo} não informado.`);
  const resultado = Number(limpo);
  if (!Number.isFinite(resultado)) throw new Error(`Linha ${linha}: ${campo} inválido.`);
  return resultado;
}

export function percentual(valor: unknown, linha: number) {
  if (valor === null || valor === undefined || String(valor).trim() === "") return null;
  const possuiSinal = String(valor).includes("%");
  let resultado = numero(valor, "Percentual histórico", linha);
  if (!possuiSinal && resultado >= 0 && resultado <= 1) resultado *= 100;
  if (resultado < 0 || resultado > 100) throw new Error(`Linha ${linha}: percentual deve estar entre 0% e 100%.`);
  return Math.round(resultado * 100) / 100;
}

function valorColuna(linha: unknown[], cabecalhos: string[], aliases: string[]) {
  const indice = cabecalhos.findIndex(item => aliases.includes(item));
  return indice >= 0 ? linha[indice] : "";
}

function localizarCabecalho(linhas: unknown[][]) {
  const indice = linhas.slice(0, 30).findIndex(linha => {
    const colunas = linha.map(normalizar);
    const temPessoa = colunas.some(item => ["empregado", "colaborador", "nome", "email", "e mail", "cpf"].includes(item));
    const temEixo = colunas.some(item => ["eixo", "eixo nome", "competencia", "competencia comportamental"].includes(item));
    return temPessoa && temEixo;
  });
  if (indice < 0) throw new Error("Não localizei uma linha de cabeçalho com as colunas Empregado e Eixo.");
  return indice;
}

function relacao(valor: unknown, linha: number): LinhaTecnica["relacao"] {
  const item = normalizar(valor);
  if (!item || item === "pendente") return "PENDENTE";
  if (item === "essencial") return "ESSENCIAL";
  if (item === "transversal") return "TRANSVERSAL";
  if (["nao aplicavel", "nao se aplica", "na"].includes(item)) return "NAO_APLICAVEL";
  throw new Error(`Linha ${linha}: classificação “${String(valor)}” não reconhecida.`);
}

export function lerPlanilha(buffer: ArrayBuffer, tipo: TipoImportacao) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: "" }) as unknown[][];
  const cabecalhoIndice = localizarCabecalho(linhas);
  const cabecalhos = linhas[cabecalhoIndice].map(normalizar);
  const dados = linhas.slice(cabecalhoIndice + 1);

  if (tipo === "TECNICA") {
    return dados.map((linha, indice): LinhaTecnica | null => {
      const numeroLinha = cabecalhoIndice + indice + 2;
      const nome = texto(valorColuna(linha, cabecalhos, ["empregado", "colaborador", "nome"]));
      const email = texto(valorColuna(linha, cabecalhos, ["email", "e mail"]));
      const cpf = texto(valorColuna(linha, cabecalhos, ["cpf"]));
      const eixoNome = texto(valorColuna(linha, cabecalhos, ["eixo", "eixo nome", "competencia"]));
      if (!nome && !email && !cpf && !eixoNome) return null;
      if (!eixoNome) throw new Error(`Linha ${numeroLinha}: eixo não informado.`);
      const fonteCertificacao = texto(valorColuna(linha, cabecalhos, ["fonte da certificacao", "fonte certificacao"]));
      const fonteAtividades = texto(valorColuna(linha, cabecalhos, ["fonte das atividades", "fonte atividades"]));
      return {
        linha: numeroLinha, nome, email, cpf,
        unidade: texto(valorColuna(linha, cabecalhos, ["unidade", "departamento"])),
        eixoId: texto(valorColuna(linha, cabecalhos, ["eixo id", "codigo do eixo", "codigo eixo"])),
        eixoNome,
        relacao: relacao(valorColuna(linha, cabecalhos, ["classificacao", "relacao", "relacao com a funcao"]), numeroLinha),
        pontuacao: percentual(valorColuna(linha, cabecalhos, ["percentual historico", "pontuacao", "resultado anterior", "percentual"]), numeroLinha),
        justificativa: texto(valorColuna(linha, cabecalhos, ["justificativa da classificacao para analise de recurso", "justificativa"])),
        fonte: [fonteCertificacao, fonteAtividades].filter(Boolean).join(" | ") || null,
        observacao: texto(valorColuna(linha, cabecalhos, ["observacoes", "observacao"])),
      };
    }).filter(Boolean) as LinhaTecnica[];
  }

  return dados.map((linha, indice): LinhaComportamental | null => {
    const numeroLinha = cabecalhoIndice + indice + 2;
    const nome = texto(valorColuna(linha, cabecalhos, ["empregado", "colaborador", "nome"]));
    const email = texto(valorColuna(linha, cabecalhos, ["email", "e mail"]));
    const cpf = texto(valorColuna(linha, cabecalhos, ["cpf"]));
    const eixoNome = texto(valorColuna(linha, cabecalhos, ["eixo", "eixo nome", "competencia", "competencia comportamental"]));
    const pontuacaoValor = valorColuna(linha, cabecalhos, ["pontuacao", "nota", "valor", "resultado"]);
    if (!nome && !email && !cpf && !eixoNome && String(pontuacaoValor).trim() === "") return null;
    if (!eixoNome) throw new Error(`Linha ${numeroLinha}: eixo não informado.`);
    const escalaMinValor = valorColuna(linha, cabecalhos, ["escala minima", "escala min", "minimo"]);
    const escalaMaxValor = valorColuna(linha, cabecalhos, ["escala maxima", "escala max", "maximo"]);
    return {
      linha: numeroLinha, nome, email, cpf,
      unidade: texto(valorColuna(linha, cabecalhos, ["unidade", "departamento"])), eixoNome,
      pontuacao: numero(pontuacaoValor, "Pontuação", numeroLinha),
      escalaMin: String(escalaMinValor).trim() === "" ? 0 : numero(escalaMinValor, "Escala mínima", numeroLinha),
      escalaMax: String(escalaMaxValor).trim() === "" ? 5 : numero(escalaMaxValor, "Escala máxima", numeroLinha),
      classificacao: texto(valorColuna(linha, cabecalhos, ["classificacao", "faixa", "conceito"])),
      observacao: texto(valorColuna(linha, cabecalhos, ["observacoes", "observacao"])),
    };
  }).filter(Boolean) as LinhaComportamental[];
}

export default function ImportarEixosAvaliacoes() {
  const api = (trpc as any).importacaoEixos;
  const [tipo, setTipo] = useState<TipoImportacao>("TECNICA");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [linhas, setLinhas] = useState<Array<LinhaTecnica | LinhaComportamental>>([]);
  const [erroLeitura, setErroLeitura] = useState("");
  const [validacao, setValidacao] = useState<any>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [avaliacaoId, setAvaliacaoId] = useState<number | null>(null);
  const [substituir, setSubstituir] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const avaliacoesQuery = (trpc as any).avaliacoes.listar.useQuery({ tipo: "DESEMPENHO" }, { refetchOnWindowFocus: false });
  const avaliacoesDisponiveis = useMemo(() => (avaliacoesQuery.data ?? []).filter((item: any) => ["RASCUNHO", "EM_CONFERENCIA"].includes(item.status)), [avaliacoesQuery.data]);
  const validarTecnicos = api.validarTecnicos.useMutation();
  const validarComportamentais = api.validarComportamentais.useMutation();
  const importarTecnicos = api.importarTecnicos.useMutation();
  const importarComportamentais = api.importarComportamentais.useMutation();

  const limpar = (novoTipo = tipo) => {
    setTipo(novoTipo); setArquivo(null); setLinhas([]); setErroLeitura(""); setValidacao(null);
    setResultado(null); setConfirmado(false); setSubstituir(false);
  };

  const selecionarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selecionado = event.target.files?.[0];
    if (!selecionado) return;
    setArquivo(selecionado); setErroLeitura(""); setValidacao(null); setResultado(null); setConfirmado(false);
    try {
      const dados = lerPlanilha(await selecionado.arrayBuffer(), tipo);
      if (!dados.length) throw new Error("A planilha não contém linhas de dados.");
      setLinhas(dados);
    } catch (error: any) {
      setLinhas([]); setErroLeitura(error?.message || "Não foi possível ler a planilha.");
    }
  };

  const validar = async () => {
    setResultado(null); setConfirmado(false);
    setErroLeitura("");
    try {
      if (tipo === "TECNICA") setValidacao(await validarTecnicos.mutateAsync({ linhas }));
      else {
        if (!avaliacaoId) { setErroLeitura("Selecione a Avaliação de Desempenho antes de validar."); return; }
        setValidacao(await validarComportamentais.mutateAsync({ avaliacaoId, linhas }));
      }
    } catch (error: any) {
      setValidacao(null);
      setErroLeitura(error?.message || "Não foi possível validar o arquivo.");
    }
  };

  const importar = async () => {
    if (!arquivo || !validacao?.valido || !confirmado) return;
    setErroLeitura("");
    try {
      if (tipo === "TECNICA") setResultado(await importarTecnicos.mutateAsync({ linhas, arquivoNome: arquivo.name, substituirExistentes: substituir, confirmado: true }));
      else if (avaliacaoId) setResultado(await importarComportamentais.mutateAsync({ avaliacaoId, linhas, arquivoNome: arquivo.name, confirmado: true }));
    } catch (error: any) {
      setErroLeitura(error?.message || "O upload foi cancelado e nenhuma linha foi gravada.");
    }
  };

  const carregando = validarTecnicos.isPending || validarComportamentais.isPending || importarTecnicos.isPending || importarComportamentais.isPending;
  const exemplo = linhas.slice(0, 8) as any[];

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3"><FileSpreadsheet className="h-7 w-7 text-blue-600" /><h1 className="text-2xl font-semibold">Upload de Eixos das Avaliações</h1></div>
        <p className="max-w-4xl text-sm text-muted-foreground">Importação administrativa com conferência integral antes da gravação. Um arquivo com erro não grava nenhuma linha.</p>
      </div>

      <Card><CardHeader><CardTitle>1. Escolha o tipo de eixo</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3">
        <Button variant={tipo === "TECNICA" ? "default" : "outline"} onClick={() => limpar("TECNICA")}>Eixos técnicos</Button>
        <Button variant={tipo === "COMPORTAMENTAL" ? "default" : "outline"} onClick={() => limpar("COMPORTAMENTAL")}>Eixos comportamentais</Button>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>2. Prepare e selecione a planilha</CardTitle><CardDescription>
        {tipo === "TECNICA" ? "A matriz consolidada já é aceita; títulos explicativos acima do cabeçalho podem ser mantidos." : "Selecione uma Avaliação de Desempenho aberta e use a planilha-modelo."}
      </CardDescription></CardHeader><CardContent className="space-y-4">
        {tipo === "COMPORTAMENTAL" && <label className="block space-y-2 text-sm font-medium">Avaliação de Desempenho
          <select value={avaliacaoId ?? ""} onChange={event => setAvaliacaoId(event.target.value ? Number(event.target.value) : null)} className="h-10 w-full rounded-md border bg-background px-3 font-normal">
            <option value="">Selecione</option>{avaliacoesDisponiveis.map((item: any) => <option key={item.id} value={item.id}>{item.titulo} — {item.status === "RASCUNHO" ? "Rascunho" : "Em conferência"}</option>)}
          </select>
        </label>}
        <a href={tipo === "TECNICA" ? "/templates/modelo_importacao_eixos_tecnicos.csv" : "/templates/modelo_importacao_eixos_comportamentais.csv"} download className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 underline"><Download className="h-4 w-4" />Baixar planilha-modelo</a>
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center">
          <Upload className="mb-2 h-7 w-7 text-muted-foreground" /><span className="font-medium">{arquivo?.name || "Selecionar Excel ou CSV"}</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={selecionarArquivo} />
        </label>
        {erroLeitura && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{erroLeitura}</AlertDescription></Alert>}
      </CardContent></Card>

      {linhas.length > 0 && <Card><CardHeader><CardTitle>3. Confira antes de validar</CardTitle><CardDescription>{linhas.length} linhas lidas. Amostra das primeiras linhas:</CardDescription></CardHeader><CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b bg-muted/40 text-left"><th className="p-3">Linha</th><th className="p-3">Empregado</th><th className="p-3">Eixo</th><th className="p-3">Pontuação</th><th className="p-3">Classificação</th></tr></thead><tbody>
          {exemplo.map(item => <tr key={item.linha} className="border-b last:border-0"><td className="p-3">{item.linha}</td><td className="p-3">{item.nome || item.email || item.cpf}</td><td className="p-3">{item.eixoNome}</td><td className="p-3">{item.pontuacao ?? "Pendente"}</td><td className="p-3">{item.relacao || item.classificacao || "—"}</td></tr>)}
        </tbody></table></div>
        <Button onClick={validar} disabled={carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validar sem gravar</Button>
      </CardContent></Card>}

      {validacao && <Card className={validacao.valido ? "border-emerald-300" : "border-red-300"}><CardHeader><CardTitle className="flex items-center gap-2">{validacao.valido ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}{validacao.valido ? "Arquivo validado" : "Arquivo não aprovado"}</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Linhas</p><p className="text-2xl font-bold">{validacao.totalLinhas}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Empregados</p><p className="text-2xl font-bold">{validacao.totalEmpregados}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Eixos</p><p className="text-2xl font-bold">{validacao.totalEixos}</p></div></div>
        {(validacao.erros?.length > 0 || validacao.avisos?.length > 0) && <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">{validacao.erros?.map((item: any, index: number) => <p key={`e-${index}`} className="text-sm text-red-700"><strong>Linha {item.linha} — {item.campo}:</strong> {item.mensagem}</p>)}{validacao.avisos?.map((item: any, index: number) => <p key={`a-${index}`} className="text-sm text-amber-700"><strong>Aviso na linha {item.linha}:</strong> {item.mensagem}</p>)}</div>}
        {validacao.valido && !resultado && <div className="space-y-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          {tipo === "TECNICA" && <label className="flex items-start gap-2"><input type="checkbox" checked={substituir} onChange={event => setSubstituir(event.target.checked)} className="mt-1" /><span><strong>Substituir eixos que já existem.</strong> Deixe desmarcado para preservar tudo que já estiver cadastrado.</span></label>}
          <label className="flex items-start gap-2"><input type="checkbox" checked={confirmado} onChange={event => setConfirmado(event.target.checked)} className="mt-1" /><span>Conferi o resumo e autorizo a gravação deste arquivo.</span></label>
          <Button onClick={importar} disabled={!confirmado || carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Fazer upload agora</Button>
        </div>}
      </CardContent></Card>}

      {resultado && <Alert className="border-emerald-300 bg-emerald-50"><CheckCircle2 className="h-4 w-4 text-emerald-700" /><AlertDescription><strong>Upload concluído.</strong> Criados: {resultado.criados}. {resultado.atualizados !== undefined && <>Atualizados: {resultado.atualizados}. </>}Ignorados por já existirem: {resultado.ignorados}.</AlertDescription></Alert>}
    </div>
  );
}
