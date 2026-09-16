import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, ShieldCheck, Upload } from "lucide-react";
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

function validarAlternativasReais(arquivoNome: string, linhaNumero: number, opcoes: Opcao[]) {
  const reais = opcoes.filter(opcao => !opcao.naoSei);
  const vistos = new Map<string, string>();
  for (const opcao of reais) {
    if (pareceNaoSei(opcao.texto)) {
      throw new Error(`${arquivoNome}: linha ${linhaNumero}, a alternativa ${opcao.letra} contém texto de “Não sei”, mas não é a última alternativa preenchida.`);
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
  const cabecalhosOriginais = linhas[0];
  const cabecalhos = cabecalhosOriginais.map(normalizar);
  const colunasAlternativas = localizarColunasAlternativas(cabecalhosOriginais);
  if (colunasAlternativas.length < 2) throw new Error(`${arquivoNome}: a aba QUESTÕES deve ter pelo menos duas colunas de alternativas.`);

  const questoes: Questao[] = [];
  for (let indice = 1; indice < linhas.length; indice += 1) {
    const linha = linhas[indice];
    const numeroLinha = indice + 1;
    const idBruto = valorCabecalho(linha, cabecalhos, "ID da Questão");
    const enunciado = texto(valorCabecalho(linha, cabecalhos, "Enunciado"));
    if (!texto(idBruto) && !enunciado) continue;
    if (!texto(idBruto)) throw new Error(`${arquivoNome}: linha ${numeroLinha}, ID da questão não informado.`);
    if (!enunciado) throw new Error(`${arquivoNome}: linha ${numeroLinha}, enunciado não informado.`);

    const alternativasDaLinha = colunasAlternativas.map(coluna => ({ letra: coluna.letra, texto: texto(linha[coluna.indice]) }));
    const indicesPreenchidos = alternativasDaLinha.map((opcao, posicao) => opcao.texto ? posicao : -1).filter(posicao => posicao >= 0);
    if (indicesPreenchidos.length < 2) throw new Error(`${arquivoNome}: linha ${numeroLinha}, a questão deve ter pelo menos uma alternativa real e uma última alternativa “Não sei”.`);

    const ultimoIndicePreenchido = indicesPreenchidos[indicesPreenchidos.length - 1];
    for (let posicao = 0; posicao <= ultimoIndicePreenchido; posicao += 1) {
      if (!alternativasDaLinha[posicao].texto) throw new Error(`${arquivoNome}: linha ${numeroLinha}, há uma alternativa vazia entre alternativas preenchidas.`);
    }

    const preenchidas = alternativasDaLinha.slice(0, ultimoIndicePreenchido + 1);
    const ultima = preenchidas[preenchidas.length - 1];
    if (!pareceNaoSei(ultima.texto)) throw new Error(`${arquivoNome}: linha ${numeroLinha}, a última alternativa preenchida (${ultima.letra}) deve ser a opção “Não sei”.`);

    const opcoes: Opcao[] = preenchidas.map((opcao, posicao) => ({ letra: opcao.letra, texto: opcao.texto, naoSei: posicao === preenchidas.length - 1 }));
    validarAlternativasReais(arquivoNome, numeroLinha, opcoes);
    const ocorrenciasNaoSei = opcoes.filter(opcao => pareceNaoSei(opcao.texto));
    if (ocorrenciasNaoSei.length !== 1) throw new Error(`${arquivoNome}: linha ${numeroLinha}, deve existir exatamente uma única alternativa “Não sei”.`);

    const gabarito = texto(valorCabecalho(linha, cabecalhos, "Gabarito")).toUpperCase();
    const opcaoGabarito = opcoes.find(opcao => opcao.letra === gabarito);
    if (!opcaoGabarito || opcaoGabarito.naoSei) {
      const permitidos = opcoes.filter(opcao => !opcao.naoSei).map(opcao => opcao.letra).join(", ");
      throw new Error(`${arquivoNome}: linha ${numeroLinha}, gabarito deve apontar para uma alternativa real existente (${permitidos}). “Não sei” nunca pode ser gabarito.`);
    }

    const eixos = [1, 2, 3, 4, 5].map(numero => texto(valorCabecalho(linha, cabecalhos, `Eixo ${numero} da Questão`))).filter(Boolean).map(nomeEixo => ({ nome: nomeEixo }));
    if (!eixos.length) throw new Error(`${arquivoNome}: linha ${numeroLinha}, informe pelo menos o Eixo 1 da Questão.`);

    questoes.push({
      id: texto(idBruto),
      enunciado,
      opcoes,
      gabarito,
      eixos,
      macroarea: texto(valorCabecalho(linha, cabecalhos, "Macroárea")) || null,
      microarea: texto(valorCabecalho(linha, cabecalhos, "Microárea")) || null,
      tagFonte: texto(valorCabecalho(linha, cabecalhos, "Fonte / Tag")) || null,
    });
  }

  if (!questoes.length) throw new Error(`${arquivoNome}: nenhuma questão preenchida foi localizada.`);
  return { arquivoNome, prova: { codigo, nome, unidade, ano, descricao: descricao || null, numeroQuestoesDeclarado: Number.isFinite(numeroQuestoesDeclarado as number) ? numeroQuestoesDeclarado : null, questoes } };
}

function proximaLetra(opcoes: Opcao[]) {
  const ultimaReal = opcoes[Math.max(0, opcoes.length - 2)]?.letra || "A";
  const codigo = ultimaReal.charCodeAt(0) + 1;
  return codigo <= 90 ? String.fromCharCode(codigo) : `A${opcoes.length}`;
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
  const [inputKey, setInputKey] = useState(0);

  const limparFluxo = () => {
    setArquivos([]);
    setErroLeitura("");
    setValidacao(null);
    setConfirmado(false);
    setResultado(null);
    setInputKey(chave => chave + 1);
  };

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

  const atualizarProva = (arquivoIndex: number, campo: keyof Prova, valor: any) => {
    setArquivos(atuais => atuais.map((arquivo, index) => index === arquivoIndex ? { ...arquivo, prova: { ...arquivo.prova, [campo]: valor } } : arquivo));
    setValidacao(null);
  };

  const atualizarQuestao = (arquivoIndex: number, questaoIndex: number, alteracoes: Partial<Questao>) => {
    setArquivos(atuais => atuais.map((arquivo, index) => {
      if (index !== arquivoIndex) return arquivo;
      const questoes = arquivo.prova.questoes.map((questao, qi) => qi === questaoIndex ? { ...questao, ...alteracoes } : questao);
      return { ...arquivo, prova: { ...arquivo.prova, questoes, numeroQuestoesDeclarado: questoes.length } };
    }));
    setValidacao(null);
  };

  const atualizarOpcao = (arquivoIndex: number, questaoIndex: number, opcaoIndex: number, novoTexto: string) => {
    const questao = arquivos[arquivoIndex].prova.questoes[questaoIndex];
    const opcoes = questao.opcoes.map((opcao, oi) => oi === opcaoIndex ? { ...opcao, texto: novoTexto } : opcao);
    atualizarQuestao(arquivoIndex, questaoIndex, { opcoes });
  };

  const adicionarAlternativa = (arquivoIndex: number, questaoIndex: number) => {
    const questao = arquivos[arquivoIndex].prova.questoes[questaoIndex];
    const naoSei = questao.opcoes[questao.opcoes.length - 1];
    const novaLetra = proximaLetra(questao.opcoes);
    const opcoes = [...questao.opcoes.slice(0, -1), { letra: novaLetra, texto: "Nova alternativa", naoSei: false }, { ...naoSei, letra: String.fromCharCode(novaLetra.charCodeAt(0) + 1) }];
    atualizarQuestao(arquivoIndex, questaoIndex, { opcoes });
  };

  const removerAlternativa = (arquivoIndex: number, questaoIndex: number, opcaoIndex: number) => {
    const questao = arquivos[arquivoIndex].prova.questoes[questaoIndex];
    if (opcaoIndex >= questao.opcoes.length - 1 || questao.opcoes.length <= 2) return;
    const opcoesRestantes = questao.opcoes.filter((_, oi) => oi !== opcaoIndex);
    const opcoes = opcoesRestantes.map((opcao, oi) => ({ ...opcao, letra: String.fromCharCode(65 + oi), naoSei: oi === opcoesRestantes.length - 1 }));
    const gabarito = opcoes.some(opcao => !opcao.naoSei && opcao.letra === questao.gabarito) ? questao.gabarito : opcoes[0].letra;
    atualizarQuestao(arquivoIndex, questaoIndex, { opcoes, gabarito });
  };

  const excluirQuestao = (arquivoIndex: number, questaoIndex: number) => {
    setArquivos(atuais => atuais.map((arquivo, index) => {
      if (index !== arquivoIndex) return arquivo;
      const questoes = arquivo.prova.questoes.filter((_, qi) => qi !== questaoIndex);
      return { ...arquivo, prova: { ...arquivo.prova, questoes, numeroQuestoesDeclarado: questoes.length } };
    }));
    setValidacao(null);
  };

  const moverQuestao = (arquivoIndex: number, questaoIndex: number, direcao: -1 | 1) => {
    setArquivos(atuais => atuais.map((arquivo, index) => {
      if (index !== arquivoIndex) return arquivo;
      const destino = questaoIndex + direcao;
      if (destino < 0 || destino >= arquivo.prova.questoes.length) return arquivo;
      const questoes = [...arquivo.prova.questoes];
      [questoes[questaoIndex], questoes[destino]] = [questoes[destino], questoes[questaoIndex]];
      return { ...arquivo, prova: { ...arquivo.prova, questoes } };
    }));
    setValidacao(null);
  };

  const adicionarQuestao = (arquivoIndex: number) => {
    const arquivo = arquivos[arquivoIndex];
    const nova: Questao = {
      id: `Q${arquivo.prova.questoes.length + 1}`,
      enunciado: "Nova questão",
      opcoes: [
        { letra: "A", texto: "Nova alternativa", naoSei: false },
        { letra: "B", texto: "Não sei", naoSei: true },
      ],
      gabarito: "A",
      eixos: [{ nome: "Novo eixo" }],
      macroarea: null,
      microarea: null,
      tagFonte: null,
    };
    const questoes = [...arquivo.prova.questoes, nova];
    atualizarProva(arquivoIndex, "questoes", questoes);
    atualizarProva(arquivoIndex, "numeroQuestoesDeclarado", questoes.length);
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
        <p className="max-w-4xl text-sm text-muted-foreground">Envie a prova, revise e ajuste todo o conteúdo na tela e só depois execute a validação estrutural.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Selecione as provas</CardTitle><CardDescription>Cada questão pode ter quantidade variável de alternativas. A última alternativa preenchida deve ser sempre a única opção “Não sei”.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <input key={inputKey} type="file" accept=".xlsx" multiple onChange={selecionar} className="block w-full text-sm" />
          {arquivos.length > 0 && <div className="rounded-md border bg-muted/20 p-4 text-sm"><strong>{arquivos.length}</strong> prova(s) carregada(s) · <strong>{totalQuestoes}</strong> questão(ões). Antes de validar, revise abaixo todos os dados.</div>}
        </CardContent>
      </Card>

      {erroLeitura && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{erroLeitura}</AlertDescription></Alert>}

      {arquivos.map((arquivo, arquivoIndex) => (
        <Card key={`${arquivo.arquivoNome}-${arquivoIndex}`}>
          <CardHeader><CardTitle>2. Revisão completa — {arquivo.prova.nome}</CardTitle><CardDescription>{arquivo.arquivoNome}. Todos os campos abaixo podem ser ajustados antes da validação.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">Código<input className="mt-1 w-full rounded-md border px-3 py-2" value={arquivo.prova.codigo} onChange={e => atualizarProva(arquivoIndex, "codigo", e.target.value)} /></label>
              <label className="text-sm">Nome<input className="mt-1 w-full rounded-md border px-3 py-2" value={arquivo.prova.nome} onChange={e => atualizarProva(arquivoIndex, "nome", e.target.value)} /></label>
              <label className="text-sm">Unidade<input className="mt-1 w-full rounded-md border px-3 py-2" value={arquivo.prova.unidade} onChange={e => atualizarProva(arquivoIndex, "unidade", e.target.value)} /></label>
              <label className="text-sm">Ano<input type="number" className="mt-1 w-full rounded-md border px-3 py-2" value={arquivo.prova.ano} onChange={e => atualizarProva(arquivoIndex, "ano", Number(e.target.value))} /></label>
              <label className="text-sm md:col-span-2">Descrição<textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={2} value={arquivo.prova.descricao ?? ""} onChange={e => atualizarProva(arquivoIndex, "descricao", e.target.value)} /></label>
            </div>

            <div className="space-y-5">
              {arquivo.prova.questoes.map((questao, questaoIndex) => (
                <div key={`${questao.id}-${questaoIndex}`} className="rounded-md border p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>Questão {questaoIndex + 1}</strong>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => moverQuestao(arquivoIndex, questaoIndex, -1)} disabled={questaoIndex === 0}>Subir</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => moverQuestao(arquivoIndex, questaoIndex, 1)} disabled={questaoIndex === arquivo.prova.questoes.length - 1}>Descer</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => excluirQuestao(arquivoIndex, questaoIndex)} disabled={arquivo.prova.questoes.length <= 1}>Excluir questão</Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">ID<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.id} onChange={e => atualizarQuestao(arquivoIndex, questaoIndex, { id: e.target.value })} /></label>
                    <label className="text-sm">Gabarito<select className="mt-1 w-full rounded-md border px-3 py-2" value={questao.gabarito} onChange={e => atualizarQuestao(arquivoIndex, questaoIndex, { gabarito: e.target.value })}>{questao.opcoes.filter(opcao => !opcao.naoSei).map(opcao => <option key={opcao.letra} value={opcao.letra}>{opcao.letra}</option>)}</select></label>
                    <label className="text-sm md:col-span-2">Enunciado<textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={3} value={questao.enunciado} onChange={e => atualizarQuestao(arquivoIndex, questaoIndex, { enunciado: e.target.value })} /></label>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Alternativas</div>
                    {questao.opcoes.map((opcao, opcaoIndex) => (
                      <div key={`${opcao.letra}-${opcaoIndex}`} className="flex items-start gap-2">
                        <div className="w-10 pt-2 text-sm font-semibold">{opcao.letra}</div>
                        <textarea className="min-h-[42px] flex-1 rounded-md border px-3 py-2" value={opcao.texto} onChange={e => atualizarOpcao(arquivoIndex, questaoIndex, opcaoIndex, e.target.value)} />
                        {opcao.naoSei ? <span className="pt-2 text-xs font-medium text-muted-foreground">ÚLTIMA = NÃO SEI</span> : <Button type="button" variant="outline" size="sm" onClick={() => removerAlternativa(arquivoIndex, questaoIndex, opcaoIndex)} disabled={questao.opcoes.length <= 2}>Remover</Button>}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => adicionarAlternativa(arquivoIndex, questaoIndex)}>Adicionar alternativa antes do “Não sei”</Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm md:col-span-2">Eixos da questão, separados por vírgula<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.eixos.map(eixo => eixo.nome).join(", ")} onChange={e => atualizarQuestao(arquivoIndex, questaoIndex, { eixos: e.target.value.split(",").map(item => item.trim()).filter(Boolean).map(nome => ({ nome })) })} /></label>
                    <label className="text-sm">Macroárea<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.macroarea ?? ""} onChange={e => atualizarQuestao(arquivoIndex, questaoIndex, { macroarea: e.target.value || null })} /></label>
                    <label className="text-sm">Microárea<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.microarea ?? ""} onChange={e => atualizarQuestao(arquivoIndex, questaoIndex, { microarea: e.target.value || null })} /></label>
                    <label className="text-sm md:col-span-2">Fonte / Tag<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.tagFonte ?? ""} onChange={e => atualizarQuestao(arquivoIndex, questaoIndex, { tagFonte: e.target.value || null })} /></label>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => adicionarQuestao(arquivoIndex)}>Adicionar nova questão</Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {arquivos.length > 0 && (
        <Card>
          <CardHeader><CardTitle>3. Validar após a revisão</CardTitle><CardDescription>A validação só será executada sobre o conteúdo que está atualmente na tela.</CardDescription></CardHeader>
          <CardContent><Button onClick={validar} disabled={carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validar provas revisadas</Button></CardContent>
        </Card>
      )}

      {validacao && (
        <Card>
          <CardHeader><CardTitle>4. Resultado da validação</CardTitle><CardDescription>{validacao.totalComErro > 0 ? `${validacao.totalValidos ?? 0} prova(s) válida(s) e ${validacao.totalComErro} com erro.` : "Todas as provas passaram pela validação estrutural."}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {(validacao.resultados ?? []).map((item: any) => (
              <div key={`${item.arquivoNome}-${item.codigo}`} className="rounded-md border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{item.nome}</p><p className="text-muted-foreground">{item.arquivoNome} · {item.unidade} · {item.ano}</p></div><div>{item.valido ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4" /> Válida</span> : <span className="inline-flex items-center gap-1 text-red-700"><AlertCircle className="h-4 w-4" /> Com erro</span>}</div></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3"><div>Questões: <strong>{item.totalQuestoes}</strong></div><div>Eixos distintos: <strong>{item.totalEixosDistintos}</strong></div><div>Questões com múltiplos eixos: <strong>{item.questoesComMultiplosEixos}</strong></div></div>
                {(item.erros ?? []).length > 0 && <div className="mt-3 text-red-700">{item.erros.map((erro: string) => <p key={erro}>• {erro}</p>)}</div>}
              </div>
            ))}
            {validacao.valido && <div className="space-y-3 rounded-md border p-4"><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmado} onChange={event => setConfirmado(event.target.checked)} className="mt-1" /><span>Conferi a prova revisada e autorizo a gravação das provas válidas como rascunho.</span></label><Button onClick={importar} disabled={!confirmado || carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Gravar avaliações válidas</Button></div>}
          </CardContent>
        </Card>
      )}

      {resultado?.sucesso && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription><div className="space-y-3"><p>{resultado.totalGravadas ?? resultado.totalProvas} prova(s) gravada(s) com sucesso como RASCUNHO, totalizando {resultado.totalQuestoes} questão(ões).</p><Button type="button" variant="outline" onClick={limparFluxo}>Nova importação</Button></div></AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Avaliações já importadas</CardTitle><CardDescription>Histórico das provas recebidas por este módulo.</CardDescription></CardHeader>
        <CardContent>
          {listaQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (listaQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma avaliação importada ainda.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left"><th className="px-3 py-2">Código</th><th className="px-3 py-2">Avaliação</th><th className="px-3 py-2">Unidade</th><th className="px-3 py-2">Ano</th><th className="px-3 py-2">Questões</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{(listaQuery.data ?? []).map((item: any) => <tr key={item.id} className="border-b last:border-0"><td className="px-3 py-2">{item.codigo}</td><td className="px-3 py-2">{item.nome}</td><td className="px-3 py-2">{item.unidade}</td><td className="px-3 py-2">{item.ano}</td><td className="px-3 py-2">{item.totalQuestoes}</td><td className="px-3 py-2">{item.status}</td></tr>)}</tbody></table></div>}
        </CardContent>
      </Card>
    </div>
  );
}
