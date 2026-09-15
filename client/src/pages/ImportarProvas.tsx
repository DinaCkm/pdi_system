import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, ShieldCheck, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type Opcao = { letra: "A" | "B" | "C" | "D" | "E" | "F"; texto: string; naoSei: boolean };
type Questao = {
  id: string;
  enunciado: string;
  opcoes: Opcao[];
  gabarito: "A" | "B" | "C" | "D" | "E";
  eixos: { nome: string }[];
  macroarea?: string | null;
  microarea?: string | null;
  tagFonte?: string | null;
};
type Prova = {
  codigo: string;
  nome: string;
  unidade: string;
  ano: number;
  descricao?: string | null;
  numeroQuestoesDeclarado?: number | null;
  questoes: Questao[];
};
type ArquivoProva = { arquivoNome: string; prova: Prova };

function texto(valor: unknown) {
  return String(valor ?? "").trim();
}

function normalizar(valor: unknown) {
  return texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function abaPorNome(workbook: XLSX.WorkBook, nomes: string[]) {
  const achada = workbook.SheetNames.find(nome => nomes.includes(normalizar(nome)));
  if (!achada) throw new Error(`Aba obrigatória não encontrada: ${nomes[0].toUpperCase()}.`);
  return workbook.Sheets[achada];
}

function campoMapa(linhas: unknown[][]) {
  const mapa = new Map<string, unknown>();
  for (const linha of linhas) {
    const chave = normalizar(linha?.[0]);
    if (chave) mapa.set(chave, linha?.[1]);
  }
  return mapa;
}

function valorCabecalho(linha: unknown[], cabecalhos: string[], nome: string) {
  const indice = cabecalhos.indexOf(normalizar(nome));
  return indice >= 0 ? linha[indice] : undefined;
}

function valorPrimeiroCabecalho(linha: unknown[], cabecalhos: string[], nomes: string[]) {
  for (const nome of nomes) {
    const valor = valorCabecalho(linha, cabecalhos, nome);
    if (valor !== undefined) return valor;
  }
  return undefined;
}

function pareceNaoSei(valor: string) {
  const normalizado = normalizar(valor);
  return normalizado.includes("nao sei") || normalizado.includes("nao tenho conhecimento") || normalizado.includes("desconheco");
}

function validarAlternativasReais(arquivoNome: string, linhaNumero: number, opcoes: Opcao[]) {
  const reais = opcoes.filter(opcao => !opcao.naoSei);
  const vistos = new Map<string, string>();
  for (const opcao of reais) {
    if (pareceNaoSei(opcao.texto)) {
      throw new Error(`${arquivoNome}: linha ${linhaNumero}, a alternativa ${opcao.letra} foi tratada como alternativa real, mas contém texto de “Não sei”.`);
    }
    const chave = normalizar(opcao.texto);
    const anterior = vistos.get(chave);
    if (anterior) {
      throw new Error(`${arquivoNome}: linha ${linhaNumero}, as alternativas ${anterior} e ${opcao.letra} têm o mesmo conteúdo.`);
    }
    vistos.set(chave, opcao.letra);
  }
}

function lerProva(buffer: ArrayBuffer, arquivoNome: string): ArquivoProva {
  const workbook = XLSX.read(buffer, { type: "array" });
  const wsProva = abaPorNome(workbook, ["prova"]);
  const wsQuestoes = abaPorNome(workbook, ["questoes"]);

  const provaLinhas = XLSX.utils.sheet_to_json(wsProva, { header: 1, raw: true, defval: "" }) as unknown[][];
  const campos = campoMapa(provaLinhas);

  const codigo = texto(campos.get("codigo da prova"));
  const nome = texto(campos.get("nome da prova"));
  const unidade = texto(campos.get("unidade"));
  const ano = Number(campos.get("ano"));
  const descricao = texto(campos.get("descricao"));

  if (!codigo) throw new Error(`${arquivoNome}: Código da prova não informado na aba PROVA.`);
  if (!nome) throw new Error(`${arquivoNome}: Nome da prova não informado na aba PROVA.`);
  if (!unidade) throw new Error(`${arquivoNome}: Unidade não informada na aba PROVA.`);
  if (!Number.isInteger(ano)) throw new Error(`${arquivoNome}: Ano inválido na aba PROVA.`);

  const numeroDeclaradoBruto = campos.get("numero de questoes") ?? campos.get("número de questões");
  const numeroQuestoesDeclarado = texto(numeroDeclaradoBruto) ? Number(numeroDeclaradoBruto) : null;

  const linhas = XLSX.utils.sheet_to_json(wsQuestoes, { header: 1, raw: true, defval: "" }) as unknown[][];
  if (linhas.length < 2) throw new Error(`${arquivoNome}: a aba QUESTÕES não contém questões.`);
  const cabecalhos = linhas[0].map(normalizar);
  const questoes: Questao[] = [];

  for (let indice = 1; indice < linhas.length; indice += 1) {
    const linha = linhas[indice];
    const numeroLinha = indice + 1;
    const idBruto = valorCabecalho(linha, cabecalhos, "ID da Questão");
    const enunciado = texto(valorCabecalho(linha, cabecalhos, "Enunciado"));
    if (!texto(idBruto) && !enunciado) continue;
    if (!texto(idBruto)) throw new Error(`${arquivoNome}: linha ${numeroLinha}, ID da questão não informado.`);
    if (!enunciado) throw new Error(`${arquivoNome}: linha ${numeroLinha}, enunciado não informado.`);

    const opcoes: Opcao[] = [];
    for (const letra of ["A", "B", "C", "D"] as const) {
      const opcaoTexto = texto(valorCabecalho(linha, cabecalhos, `Alternativa ${letra}`));
      if (!opcaoTexto) throw new Error(`${arquivoNome}: linha ${numeroLinha}, alternativa ${letra} não informada.`);
      if (pareceNaoSei(opcaoTexto)) throw new Error(`${arquivoNome}: linha ${numeroLinha}, a alternativa ${letra} não pode ser “Não sei”.`);
      opcoes.push({ letra, texto: opcaoTexto, naoSei: false });
    }

    const alternativaE = texto(valorPrimeiroCabecalho(linha, cabecalhos, ["Alternativa E", "Alternativa E / Não sei", "Alternativa E real"]));
    const alternativaF = texto(valorPrimeiroCabecalho(linha, cabecalhos, ["Alternativa F / Não sei", "Alternativa F", "F / Não sei", "Não sei"]));

    if (!alternativaE) {
      throw new Error(`${arquivoNome}: linha ${numeroLinha}, a alternativa E deve conter a 5ª alternativa real ou a única opção “Não sei”.`);
    }

    if (alternativaF) {
      if (pareceNaoSei(alternativaE)) {
        throw new Error(`${arquivoNome}: linha ${numeroLinha}, existe “Não sei” em E e também conteúdo em F. Deve existir apenas uma alternativa “Não sei”.`);
      }
      if (!pareceNaoSei(alternativaF)) {
        throw new Error(`${arquivoNome}: linha ${numeroLinha}, quando F estiver preenchida ela deve ser a única opção “Não sei”.`);
      }
      opcoes.push({ letra: "E", texto: alternativaE, naoSei: false });
      opcoes.push({ letra: "F", texto: alternativaF, naoSei: true });
    } else {
      if (!pareceNaoSei(alternativaE)) {
        throw new Error(`${arquivoNome}: linha ${numeroLinha}, questão com 4 alternativas reais deve usar E como a única opção “Não sei”; para 5 alternativas reais, preencha E com a alternativa real e F com “Não sei”.`);
      }
      opcoes.push({ letra: "E", texto: alternativaE, naoSei: true });
    }

    validarAlternativasReais(arquivoNome, numeroLinha, opcoes);

    if (opcoes.filter(opcao => opcao.naoSei).length !== 1) {
      throw new Error(`${arquivoNome}: linha ${numeroLinha}, deve existir exatamente uma alternativa “Não sei”.`);
    }

    const gabarito = texto(valorCabecalho(linha, cabecalhos, "Gabarito")).toUpperCase();
    const opcaoGabarito = opcoes.find(opcao => opcao.letra === gabarito);
    if (!opcaoGabarito || opcaoGabarito.naoSei) {
      const permitidos = opcoes.filter(opcao => !opcao.naoSei).map(opcao => opcao.letra).join(", ");
      throw new Error(`${arquivoNome}: linha ${numeroLinha}, gabarito deve apontar para uma alternativa real existente (${permitidos}). “Não sei” nunca pode ser gabarito.`);
    }

    const eixos = [1, 2, 3, 4, 5]
      .map(numero => texto(valorCabecalho(linha, cabecalhos, `Eixo ${numero} da Questão`)))
      .filter(Boolean)
      .map(nomeEixo => ({ nome: nomeEixo }));
    if (!eixos.length) throw new Error(`${arquivoNome}: linha ${numeroLinha}, informe pelo menos o Eixo 1 da Questão.`);

    questoes.push({
      id: texto(idBruto),
      enunciado,
      opcoes,
      gabarito: gabarito as Questao["gabarito"],
      eixos,
      macroarea: texto(valorCabecalho(linha, cabecalhos, "Macroárea")) || null,
      microarea: texto(valorCabecalho(linha, cabecalhos, "Microárea")) || null,
      tagFonte: texto(valorCabecalho(linha, cabecalhos, "Fonte / Tag")) || null,
    });
  }

  if (!questoes.length) throw new Error(`${arquivoNome}: nenhuma questão preenchida foi localizada.`);

  return {
    arquivoNome,
    prova: {
      codigo,
      nome,
      unidade,
      ano,
      descricao: descricao || null,
      numeroQuestoesDeclarado: Number.isFinite(numeroQuestoesDeclarado as number) ? numeroQuestoesDeclarado : null,
      questoes,
    },
  };
}

export default function ImportarProvas() {
  const api = (trpc as any).importacaoProvas;
  const validarLote = api.validarLote.useMutation();
  const importarLote = api.importarLote.useMutation();
  const listaQuery = api.listar.useQuery(undefined, { refetchOnWindowFocus: false });

  const [arquivos, setArquivos] = useState<ArquivoProva[]>([]);
  const [erroLeitura, setErroLeitura] = useState("");
  const [validacao, setValidacao] = useState<any>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const selecionar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selecionados = Array.from(event.target.files ?? []);
    setErroLeitura("");
    setValidacao(null);
    setResultado(null);
    setConfirmado(false);
    if (!selecionados.length) { setArquivos([]); return; }

    try {
      const processados: ArquivoProva[] = [];
      for (const arquivo of selecionados) {
        if (!arquivo.name.toLowerCase().endsWith(".xlsx")) throw new Error(`${arquivo.name}: use arquivo .xlsx.`);
        processados.push(lerProva(await arquivo.arrayBuffer(), arquivo.name));
      }
      setArquivos(processados);
    } catch (error: any) {
      setArquivos([]);
      setErroLeitura(error?.message || "Não foi possível ler os arquivos selecionados.");
    }
  };

  const validar = async () => {
    setErroLeitura(""); setResultado(null); setConfirmado(false);
    try { setValidacao(await validarLote.mutateAsync({ arquivos })); }
    catch (error: any) { setValidacao(null); setErroLeitura(error?.message || "Não foi possível validar o lote."); }
  };

  const importar = async () => {
    if (!validacao?.valido || !confirmado) return;
    setErroLeitura("");
    try {
      const resposta = await importarLote.mutateAsync({ arquivos, confirmado: true });
      setResultado(resposta);
      await listaQuery.refetch();
    } catch (error: any) {
      setErroLeitura(error?.message || "Não foi possível concluir a importação das provas válidas.");
    }
  };

  const totalQuestoes = useMemo(() => arquivos.reduce((soma, item) => soma + item.prova.questoes.length, 0), [arquivos]);
  const carregando = validarLote.isPending || importarLote.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3"><FileSpreadsheet className="h-7 w-7 text-blue-600" /><h1 className="text-2xl font-semibold">Upload de Avaliações</h1></div>
        <p className="max-w-4xl text-sm text-muted-foreground">Envie uma ou várias provas em Excel. Cada prova é validada individualmente antes da gravação.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Selecione as provas</CardTitle><CardDescription>Use arquivos .xlsx no padrão com as abas PROVA e QUESTÕES. Em cada questão, use A–D como alternativas reais. Se houver 4 alternativas reais, E deve ser a única opção “Não sei” e F fica vazia. Se houver 5 alternativas reais, E é a 5ª alternativa e F deve ser a única opção “Não sei”.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <input type="file" accept=".xlsx" multiple onChange={selecionar} className="block w-full text-sm" />
          {arquivos.length > 0 && <div className="rounded-md border bg-muted/20 p-4 text-sm"><strong>{arquivos.length}</strong> prova(s) selecionada(s) · <strong>{totalQuestoes}</strong> questão(ões) no total.</div>}
          <Button onClick={validar} disabled={!arquivos.length || carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validar lote</Button>
        </CardContent>
      </Card>

      {erroLeitura && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{erroLeitura}</AlertDescription></Alert>}

      {validacao && (
        <Card>
          <CardHeader><CardTitle>2. Conferência antes da gravação</CardTitle><CardDescription>{validacao.totalComErro > 0 ? `${validacao.totalValidos ?? 0} prova(s) válida(s) e ${validacao.totalComErro} com erro. As válidas poderão ser gravadas; as demais deverão ser corrigidas.` : "Todas as provas passaram pela validação estrutural."}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {(validacao.resultados ?? []).map((item: any) => (
              <div key={`${item.arquivoNome}-${item.codigo}`} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold">{item.nome}</p><p className="text-muted-foreground">{item.arquivoNome} · {item.unidade} · {item.ano}</p></div>
                  <div>{item.valido ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4" /> Válida</span> : <span className="inline-flex items-center gap-1 text-red-700"><AlertCircle className="h-4 w-4" /> Com erro</span>}</div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3"><div>Questões: <strong>{item.totalQuestoes}</strong></div><div>Eixos distintos: <strong>{item.totalEixosDistintos}</strong></div><div>Questões com múltiplos eixos: <strong>{item.questoesComMultiplosEixos}</strong></div></div>
                {(item.erros ?? []).length > 0 && <div className="mt-3 text-red-700">{item.erros.map((erro: string) => <p key={erro}>• {erro}</p>)}</div>}
                {(item.avisos ?? []).length > 0 && <div className="mt-3 text-amber-800">{item.avisos.map((aviso: string) => <p key={aviso}>• {aviso}</p>)}</div>}
              </div>
            ))}

            {validacao.valido && (
              <div className="space-y-3 rounded-md border p-4">
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmado} onChange={event => setConfirmado(event.target.checked)} className="mt-1" /><span>Conferi o resumo e autorizo a gravação das provas válidas deste lote como rascunho. As provas com erro permanecerão fora da gravação.</span></label>
                <Button onClick={importar} disabled={!confirmado || carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Gravar avaliações válidas</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {resultado?.sucesso && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>{resultado.totalGravadas ?? resultado.totalProvas} prova(s) gravada(s) com sucesso como RASCUNHO, totalizando {resultado.totalQuestoes} questão(ões). {resultado.totalComErro > 0 ? `${resultado.totalComErro} prova(s) ficaram de fora por erro.` : ""}</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Avaliações já importadas</CardTitle><CardDescription>Histórico das provas recebidas por este módulo.</CardDescription></CardHeader>
        <CardContent>
          {listaQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (listaQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma avaliação importada ainda.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left"><th className="px-3 py-2">Código</th><th className="px-3 py-2">Avaliação</th><th className="px-3 py-2">Unidade</th><th className="px-3 py-2">Ano</th><th className="px-3 py-2">Questões</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{(listaQuery.data ?? []).map((item: any) => <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-2">{item.codigo}</td><td className="px-3 py-2">{item.nome}</td><td className="px-3 py-2">{item.unidade}</td><td className="px-3 py-2">{item.ano}</td><td className="px-3 py-2">{item.totalQuestoes}</td><td className="px-3 py-2">{item.status}</td></tr>)}</tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
