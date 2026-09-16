import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Pencil, Save, ShieldCheck, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type Opcao = { letra: string; texto: string; naoSei: boolean };
type Questao = {
  id: string;
  enunciado: string;
  opcoes: Opcao[];
  gabarito: string;
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
type ColunaAlternativa = { indice: number; letra: string };

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

function pareceNaoSei(valor: string) {
  const normalizado = normalizar(valor);
  return normalizado.includes("nao sei") || normalizado.includes("nao tenho conhecimento") || normalizado.includes("desconheco");
}

function localizarColunasAlternativas(cabecalhosOriginais: unknown[]): ColunaAlternativa[] {
  return cabecalhosOriginais
    .map((cabecalho, indice) => {
      const normalizado = normalizar(cabecalho);
      const match = normalizado.match(/^alternativa\s+([a-z]+)(?:\s*\/\s*nao sei)?$/i);
      if (!match) return null;
      return { indice, letra: match[1].toUpperCase() };
    })
    .filter((item): item is ColunaAlternativa => Boolean(item));
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

  const cabecalhosOriginais = linhas[0];
  const cabecalhos = cabecalhosOriginais.map(normalizar);
  const colunasAlternativas = localizarColunasAlternativas(cabecalhosOriginais);
  if (colunasAlternativas.length < 2) throw new Error(`${arquivoNome}: a aba QUESTÕES deve ter pelo menos duas colunas de alternativas.`);

  const questoes: Questao[] = [];
  for (let indice = 1; indice < linhas.length; indice += 1) {
    const linha = linhas[indice];
    const idBruto = valorCabecalho(linha, cabecalhos, "ID da Questão");
    const enunciado = texto(valorCabecalho(linha, cabecalhos, "Enunciado"));
    if (!texto(idBruto) && !enunciado) continue;

    const alternativasDaLinha = colunasAlternativas
      .map(coluna => ({ letra: coluna.letra, texto: texto(linha[coluna.indice]) }))
      .filter(opcao => opcao.texto);

    if (alternativasDaLinha.length < 2) {
      throw new Error(`${arquivoNome}: questão ${texto(idBruto) || indice}, é necessário haver pelo menos duas alternativas preenchidas para armazenar o rascunho.`);
    }

    const ultimoIndice = alternativasDaLinha.length - 1;
    const opcoes: Opcao[] = alternativasDaLinha.map((opcao, posicao) => ({
      letra: opcao.letra,
      texto: opcao.texto,
      naoSei: posicao === ultimoIndice && pareceNaoSei(opcao.texto),
    }));

    const gabaritoInformado = texto(valorCabecalho(linha, cabecalhos, "Gabarito")).toUpperCase();
    const gabarito = gabaritoInformado || opcoes[0].letra;

    const eixosInformados = [1, 2, 3, 4, 5]
      .map(numero => texto(valorCabecalho(linha, cabecalhos, `Eixo ${numero} da Questão`)))
      .filter(Boolean)
      .map(nomeEixo => ({ nome: nomeEixo }));
    const eixos = eixosInformados.length ? eixosInformados : [{ nome: "PENDENTE DE CLASSIFICAÇÃO" }];

    questoes.push({
      id: texto(idBruto) || `Q${indice}`,
      enunciado: enunciado || "PENDENTE DE REVISÃO",
      opcoes,
      gabarito,
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
  const validarSalva = api.validarSalva.useMutation();
  const reabrirParaEdicao = api.reabrirParaEdicao.useMutation();
  const salvarRascunho = api.salvarRascunho.useMutation();
  const importarLote = api.importarLote.useMutation();
  const listaQuery = api.listar.useQuery(undefined, { refetchOnWindowFocus: false });

  const [arquivos, setArquivos] = useState<ArquivoProva[]>([]);
  const [erroLeitura, setErroLeitura] = useState("");
  const [validacao, setValidacao] = useState<any>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [validacaoSalva, setValidacaoSalva] = useState<any>(null);
  const [validandoId, setValidandoId] = useState<number | null>(null);
  const [reabrindoId, setReabrindoId] = useState<number | null>(null);
  const [mensagemAcao, setMensagemAcao] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [provaEdicao, setProvaEdicao] = useState<Prova | null>(null);

  const provaQuery = api.obter.useQuery(
    { id: editandoId ?? 0 },
    { enabled: Boolean(editandoId), refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (provaQuery.data?.prova && editandoId) {
      setProvaEdicao(provaQuery.data.prova as Prova);
    }
  }, [provaQuery.data, editandoId]);

  const limparFluxo = () => {
    setArquivos([]);
    setErroLeitura("");
    setValidacao(null);
    setResultado(null);
    setInputKey(chave => chave + 1);
  };

  const selecionar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selecionados = Array.from(event.target.files ?? []);
    setErroLeitura("");
    setValidacao(null);
    setResultado(null);
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

  const gravarRascunho = async () => {
    if (!arquivos.length) return;
    setErroLeitura("");
    setValidacao(null);
    try {
      const resposta = await importarLote.mutateAsync({ arquivos, confirmado: true });
      setResultado(resposta);
      await listaQuery.refetch();
    } catch (error: any) {
      setErroLeitura(error?.message || "Não foi possível gravar as provas como rascunho.");
    }
  };

  const validar = async () => {
    setErroLeitura("");
    try {
      setValidacao(await validarLote.mutateAsync({ arquivos }));
    } catch (error: any) {
      setValidacao(null);
      setErroLeitura(error?.message || "Não foi possível validar as provas carregadas.");
    }
  };

  const validarProvaSalva = async (id: number) => {
    setErroLeitura("");
    setValidacaoSalva(null);
    setMensagemAcao("");
    setValidandoId(id);
    try {
      const resposta = await validarSalva.mutateAsync({ id });
      setValidacaoSalva(resposta);
      await listaQuery.refetch();
    } catch (error: any) {
      setErroLeitura(error?.message || "Não foi possível validar a prova salva.");
    } finally {
      setValidandoId(null);
    }
  };

  const abrirEdicao = (id: number) => {
    setErroLeitura("");
    setMensagemAcao("");
    setEditandoId(id);
    setProvaEdicao(null);
  };

  const reabrirProva = async (id: number) => {
    setErroLeitura("");
    setValidacaoSalva(null);
    setMensagemAcao("");
    setReabrindoId(id);
    try {
      const resposta = await reabrirParaEdicao.mutateAsync({ id });
      setMensagemAcao(resposta?.mensagem || "Prova reaberta para edição. O status voltou para RASCUNHO.");
      await listaQuery.refetch();
      abrirEdicao(id);
    } catch (error: any) {
      setErroLeitura(error?.message || "Não foi possível reabrir a prova para edição.");
    } finally {
      setReabrindoId(null);
    }
  };

  const atualizarQuestao = (questaoIndex: number, alteracoes: Partial<Questao>) => {
    setProvaEdicao(atual => {
      if (!atual) return atual;
      return {
        ...atual,
        questoes: atual.questoes.map((questao, index) => index === questaoIndex ? { ...questao, ...alteracoes } : questao),
      };
    });
  };

  const atualizarOpcao = (questaoIndex: number, opcaoIndex: number, novoTexto: string) => {
    if (!provaEdicao) return;
    const questao = provaEdicao.questoes[questaoIndex];
    const opcoes = questao.opcoes.map((opcao, index) => index === opcaoIndex ? { ...opcao, texto: novoTexto } : opcao);
    const ultimo = opcoes.length - 1;
    const normalizadas = opcoes.map((opcao, index) => ({ ...opcao, naoSei: index === ultimo && pareceNaoSei(opcao.texto) }));
    atualizarQuestao(questaoIndex, { opcoes: normalizadas });
  };

  const salvarEdicao = async () => {
    if (!editandoId || !provaEdicao) return;
    setErroLeitura("");
    setMensagemAcao("");
    try {
      const resposta = await salvarRascunho.mutateAsync({ id: editandoId, prova: provaEdicao });
      setMensagemAcao(resposta?.mensagem || "Alterações salvas. A prova permanece como RASCUNHO.");
      await listaQuery.refetch();
      await provaQuery.refetch();
    } catch (error: any) {
      setErroLeitura(error?.message || "Não foi possível salvar as alterações da prova.");
    }
  };

  const fecharEdicao = () => {
    setEditandoId(null);
    setProvaEdicao(null);
  };

  const totalQuestoes = useMemo(() => arquivos.reduce((soma, item) => soma + item.prova.questoes.length, 0), [arquivos]);
  const carregando = validarLote.isPending || importarLote.isPending;

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3"><FileSpreadsheet className="h-7 w-7 text-blue-600" /><h1 className="text-2xl font-semibold">Upload de Avaliações</h1></div>
        <p className="max-w-4xl text-sm text-muted-foreground">As provas podem ser carregadas primeiro como RASCUNHO e validadas posteriormente. Uma prova VALIDADA precisa ser reaberta para edição antes de qualquer alteração.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Selecione as provas</CardTitle><CardDescription>O upload não exige validação prévia. A prova será armazenada como RASCUNHO para revisão posterior.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <input key={inputKey} type="file" accept=".xlsx" multiple onChange={selecionar} className="block w-full text-sm" />
          {arquivos.length > 0 && <div className="rounded-md border bg-muted/20 p-4 text-sm"><strong>{arquivos.length}</strong> prova(s) carregada(s) · <strong>{totalQuestoes}</strong> questão(ões). Você pode gravá-las agora como RASCUNHO sem validar.</div>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={gravarRascunho} disabled={!arquivos.length || carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Gravar como RASCUNHO</Button>
            <Button variant="outline" onClick={validar} disabled={!arquivos.length || carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validar agora (opcional)</Button>
          </div>
        </CardContent>
      </Card>

      {erroLeitura && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{erroLeitura}</AlertDescription></Alert>}
      {mensagemAcao && <Alert><Pencil className="h-4 w-4" /><AlertDescription>{mensagemAcao}</AlertDescription></Alert>}

      {validacao && (
        <Card>
          <CardHeader><CardTitle>Resultado da validação opcional</CardTitle><CardDescription>Esta conferência não é necessária para gravar o rascunho.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {(validacao.resultados ?? []).map((item: any) => (
              <div key={`${item.arquivoNome}-${item.codigo}`} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold">{item.nome}</p><p className="text-muted-foreground">{item.arquivoNome} · {item.unidade} · {item.ano}</p></div>
                  <div>{item.valido ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4" /> Sem pendências estruturais</span> : <span className="inline-flex items-center gap-1 text-red-700"><AlertCircle className="h-4 w-4" /> Requer revisão</span>}</div>
                </div>
                {(item.erros ?? []).length > 0 && <div className="mt-3 text-red-700">{item.erros.map((erro: string) => <p key={erro}>• {erro}</p>)}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {resultado?.sucesso && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription><div className="space-y-3"><p>{resultado.totalGravadas ?? resultado.totalProvas} prova(s) gravada(s) como RASCUNHO, totalizando {resultado.totalQuestoes} questão(ões). A validação poderá ser feita posteriormente.</p><Button type="button" variant="outline" onClick={limparFluxo}>Nova importação</Button></div></AlertDescription></Alert>}

      {validacaoSalva && (
        <Alert variant={validacaoSalva.validada ? "default" : "destructive"}>
          {validacaoSalva.validada ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>
            {validacaoSalva.validada ? `Prova ${validacaoSalva.codigo} validada com sucesso. Status alterado para VALIDADA.` : <div><p>A prova ${validacaoSalva.codigo} continua como RASCUNHO.</p>{(validacaoSalva.erros ?? []).map((erro: string) => <p key={erro}>• {erro}</p>)}</div>}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Avaliações já importadas</CardTitle><CardDescription>Rascunhos podem ser editados e validados. Provas validadas devem ser reabertas antes de qualquer alteração.</CardDescription></CardHeader>
        <CardContent>
          {listaQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (listaQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma avaliação importada ainda.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b text-left"><th className="px-3 py-2">Código</th><th className="px-3 py-2">Avaliação</th><th className="px-3 py-2">Unidade</th><th className="px-3 py-2">Ano</th><th className="px-3 py-2">Questões</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Ações</th></tr></thead><tbody>{(listaQuery.data ?? []).map((item: any) => <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-2">{item.codigo}</td><td className="px-3 py-2">{item.nome}</td><td className="px-3 py-2">{item.unidade}</td><td className="px-3 py-2">{item.ano}</td><td className="px-3 py-2">{item.totalQuestoes}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2"><div className="flex flex-wrap gap-2">{item.status === "RASCUNHO" ? <><Button size="sm" variant="outline" onClick={() => abrirEdicao(Number(item.id))}><Pencil className="mr-2 h-4 w-4" />Editar</Button><Button size="sm" variant="outline" onClick={() => validarProvaSalva(Number(item.id))} disabled={validandoId === Number(item.id)}>{validandoId === Number(item.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validar</Button></> : item.status === "VALIDADA" ? <Button size="sm" variant="outline" onClick={() => reabrirProva(Number(item.id))} disabled={reabrindoId === Number(item.id)}>{reabrindoId === Number(item.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}Reabrir para edição</Button> : <span className="text-muted-foreground">Sem ação disponível</span>}</div></td></tr>)}</tbody></table></div>
          )}
        </CardContent>
      </Card>

      {editandoId && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><CardTitle>Editar prova em RASCUNHO</CardTitle><CardDescription>As alterações ficam salvas como RASCUNHO. Depois, use Validar para voltar ao status VALIDADA.</CardDescription></div>
              <Button type="button" variant="outline" size="sm" onClick={fecharEdicao}><X className="mr-2 h-4 w-4" />Fechar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {provaQuery.isLoading || !provaEdicao ? <p className="text-sm text-muted-foreground">Carregando prova...</p> : <>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">Código<input className="mt-1 w-full rounded-md border px-3 py-2" value={provaEdicao.codigo} onChange={e => setProvaEdicao({ ...provaEdicao, codigo: e.target.value })} /></label>
                <label className="text-sm">Nome<input className="mt-1 w-full rounded-md border px-3 py-2" value={provaEdicao.nome} onChange={e => setProvaEdicao({ ...provaEdicao, nome: e.target.value })} /></label>
                <label className="text-sm">Unidade<input className="mt-1 w-full rounded-md border px-3 py-2" value={provaEdicao.unidade} onChange={e => setProvaEdicao({ ...provaEdicao, unidade: e.target.value })} /></label>
                <label className="text-sm">Ano<input type="number" className="mt-1 w-full rounded-md border px-3 py-2" value={provaEdicao.ano} onChange={e => setProvaEdicao({ ...provaEdicao, ano: Number(e.target.value) })} /></label>
                <label className="text-sm md:col-span-2">Descrição<textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={2} value={provaEdicao.descricao ?? ""} onChange={e => setProvaEdicao({ ...provaEdicao, descricao: e.target.value || null })} /></label>
              </div>

              <div className="space-y-5">
                {provaEdicao.questoes.map((questao, questaoIndex) => (
                  <div key={`${questao.id}-${questaoIndex}`} className="space-y-4 rounded-md border p-4">
                    <div className="font-semibold">Questão {questaoIndex + 1}</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm">ID<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.id} onChange={e => atualizarQuestao(questaoIndex, { id: e.target.value })} /></label>
                      <label className="text-sm">Gabarito<select className="mt-1 w-full rounded-md border px-3 py-2" value={questao.gabarito} onChange={e => atualizarQuestao(questaoIndex, { gabarito: e.target.value })}>{questao.opcoes.filter(opcao => !opcao.naoSei).map(opcao => <option key={opcao.letra} value={opcao.letra}>{opcao.letra}</option>)}</select></label>
                      <label className="text-sm md:col-span-2">Enunciado<textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={3} value={questao.enunciado} onChange={e => atualizarQuestao(questaoIndex, { enunciado: e.target.value })} /></label>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Alternativas</div>
                      {questao.opcoes.map((opcao, opcaoIndex) => <label key={`${opcao.letra}-${opcaoIndex}`} className="grid gap-2 text-sm md:grid-cols-[48px_1fr]"><span className="pt-2 font-semibold">{opcao.letra}</span><textarea className="min-h-[42px] rounded-md border px-3 py-2" value={opcao.texto} onChange={e => atualizarOpcao(questaoIndex, opcaoIndex, e.target.value)} /></label>)}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm md:col-span-2">Eixos da questão, separados por vírgula<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.eixos.map(eixo => eixo.nome).join(", ")} onChange={e => atualizarQuestao(questaoIndex, { eixos: e.target.value.split(",").map(item => item.trim()).filter(Boolean).map(nome => ({ nome })) })} /></label>
                      <label className="text-sm">Macroárea<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.macroarea ?? ""} onChange={e => atualizarQuestao(questaoIndex, { macroarea: e.target.value || null })} /></label>
                      <label className="text-sm">Microárea<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.microarea ?? ""} onChange={e => atualizarQuestao(questaoIndex, { microarea: e.target.value || null })} /></label>
                      <label className="text-sm md:col-span-2">Fonte / Tag<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.tagFonte ?? ""} onChange={e => atualizarQuestao(questaoIndex, { tagFonte: e.target.value || null })} /></label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={salvarEdicao} disabled={salvarRascunho.isPending}>{salvarRascunho.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar alterações</Button>
                <Button type="button" variant="outline" onClick={fecharEdicao}>Cancelar</Button>
              </div>
            </>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
