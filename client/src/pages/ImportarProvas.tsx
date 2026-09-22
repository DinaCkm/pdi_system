import { Fragment, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, ArrowDown, ArrowUp, Ban, CheckCircle2, Eye, FileSpreadsheet, History, Loader2, Pencil, Plus, Save, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  cicloId?: number | null;
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

function indiceParaLetra(indice: number) {
  let numero = indice + 1;
  let resultado = "";
  while (numero > 0) {
    const resto = (numero - 1) % 26;
    resultado = String.fromCharCode(65 + resto) + resultado;
    numero = Math.floor((numero - 1) / 26);
  }
  return resultado;
}

function renumerarOpcoes(opcoes: Opcao[], gabaritoAtual: string) {
  const indiceGabarito = opcoes.findIndex(opcao => opcao.letra === gabaritoAtual);
  const renumeradas = opcoes.map((opcao, index) => ({ ...opcao, letra: indiceParaLetra(index) }));
  return {
    opcoes: renumeradas,
    gabarito: indiceGabarito >= 0 && renumeradas[indiceGabarito] ? renumeradas[indiceGabarito].letra : "",
  };
}

function eixosDaProva(item: any) {
  return Array.from(
    new Set(
      (item?.eixosTecnicos ?? [])
        .map((eixo: unknown) => String(eixo ?? "").trim())
        .filter(Boolean),
    ),
  );
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
  const cabecalhosOriginais = linhas[0] ?? [];
  const cabecalhos = cabecalhosOriginais.map(normalizar);
  const colunasAlternativas = localizarColunasAlternativas(cabecalhosOriginais);

  const questoes: Questao[] = [];
  for (let indice = 1; indice < linhas.length; indice += 1) {
    const linha = linhas[indice];
    const linhaTemConteudo = linha.some(valor => texto(valor));
    if (!linhaTemConteudo) continue;

    const idBruto = valorCabecalho(linha, cabecalhos, "ID da Questão");
    const enunciado = texto(valorCabecalho(linha, cabecalhos, "Enunciado"));

    const alternativasDaLinha = colunasAlternativas
      .map(coluna => ({ letra: coluna.letra, texto: texto(linha[coluna.indice]) }))
      .filter(opcao => opcao.texto);

    const ultimoIndice = alternativasDaLinha.length - 1;
    const opcoes: Opcao[] = alternativasDaLinha.map((opcao, posicao) => ({
      letra: opcao.letra,
      texto: opcao.texto,
      naoSei: posicao === ultimoIndice && pareceNaoSei(opcao.texto),
    }));

    const gabarito = texto(valorCabecalho(linha, cabecalhos, "Gabarito")).toUpperCase();
    const eixos = [1, 2, 3, 4, 5]
      .map(numero => texto(valorCabecalho(linha, cabecalhos, `Eixo ${numero} da Questão`)))
      .filter(Boolean)
      .map(nomeEixo => ({ nome: nomeEixo }));

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

  return {
    arquivoNome,
    prova: {
      codigo,
      nome,
      unidade,
      ano,
      cicloId: null,
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
  const invalidarProva = api.invalidar.useMutation();
  const salvarRascunho = api.salvarRascunho.useMutation();
  const replicarEixos = api.replicarEixos.useMutation();
  const importarLote = api.importarLote.useMutation();
  const listaQuery = api.listar.useQuery(undefined, { refetchOnWindowFocus: false });
  const ciclosQuery = trpc.ciclos.list.useQuery();

  const [arquivos, setArquivos] = useState<ArquivoProva[]>([]);
  const [cicloIdUpload, setCicloIdUpload] = useState<number | null>(null);
  const [erroLeitura, setErroLeitura] = useState("");
  const [validacao, setValidacao] = useState<any>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [validacaoSalva, setValidacaoSalva] = useState<any>(null);
  const [validandoId, setValidandoId] = useState<number | null>(null);
  const [reabrindoId, setReabrindoId] = useState<number | null>(null);
  const [invalidandoId, setInvalidandoId] = useState<number | null>(null);
  const [justificativaInvalidacao, setJustificativaInvalidacao] = useState("");
  const [processandoInvalidacao, setProcessandoInvalidacao] = useState(false);
  const [processandoReplicacao, setProcessandoReplicacao] = useState(false);
  const [mensagemAcao, setMensagemAcao] = useState("");
  const [inputKey, setInputKey] = useState(0);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [provaEdicao, setProvaEdicao] = useState<Prova | null>(null);
  const [filtroProva, setFiltroProva] = useState("");
  const [filtroEixo, setFiltroEixo] = useState("");
  const [visualizandoId, setVisualizandoId] = useState<number | null>(null);
  const [previewIndice, setPreviewIndice] = useState(0);
  const [historicoId, setHistoricoId] = useState<number | null>(null);
  const [ultimaAuditoria, setUltimaAuditoria] = useState<any[]>([]);

  const provaQuery = api.obter.useQuery(
    { id: editandoId ?? 0 },
    { enabled: Boolean(editandoId), refetchOnWindowFocus: false },
  );
  const previewQuery = api.obter.useQuery(
    { id: visualizandoId ?? 0 },
    { enabled: Boolean(visualizandoId), refetchOnWindowFocus: false },
  );
  const historicoQuery = api.historico.useQuery(
    { id: historicoId ?? 0 },
    { enabled: Boolean(historicoId), refetchOnWindowFocus: false },
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

  const alterarCicloUpload = (cicloId: number | null) => {
    setCicloIdUpload(cicloId);
    setArquivos(atuais => atuais.map(item => ({
      ...item,
      prova: { ...item.prova, cicloId },
    })));
    setValidacao(null);
    setResultado(null);
  };

  const selecionar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selecionados = Array.from(event.target.files ?? []);
    setErroLeitura("");
    setValidacao(null);
    setResultado(null);
    if (!selecionados.length) { setArquivos([]); return; }
    if (!cicloIdUpload) {
      setArquivos([]);
      setErroLeitura("Selecione primeiro o Ciclo do PDI ao qual estas provas pertencem.");
      return;
    }

    try {
      const processados: ArquivoProva[] = [];
      for (const arquivo of selecionados) {
        if (!arquivo.name.toLowerCase().endsWith(".xlsx")) throw new Error(`${arquivo.name}: use arquivo .xlsx.`);
        const processado = lerProva(await arquivo.arrayBuffer(), arquivo.name);
        processado.prova.cicloId = cicloIdUpload;
        processados.push(processado);
      }
      setArquivos(processados);
    } catch (error: any) {
      setArquivos([]);
      setErroLeitura(error?.message || "Não foi possível ler os arquivos selecionados.");
    }
  };

  const gravarRascunho = async () => {
    if (!arquivos.length) return;
    if (!cicloIdUpload) {
      setErroLeitura("Selecione o Ciclo do PDI antes de gravar as provas.");
      return;
    }
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
    if (!cicloIdUpload) {
      setErroLeitura("Selecione o Ciclo do PDI antes de validar as provas.");
      return;
    }
    setErroLeitura("");
    try {
      setValidacao(await validarLote.mutateAsync({ arquivos }));
    } catch (error: any) {
      setValidacao(null);
      setErroLeitura(error?.message || "Não foi possível validar as provas carregadas.");
    }
  };

  const replicarEixosRegionais = async () => {
    const porCodigo = new Map((listaQuery.data ?? []).map((item: any) => [String(item.codigo), item]));
    const origem = porCodigo.get("REGIONAIS_2026_RPJ");
    const codigosDestino = [
      "REGIONAIS_2026_RBP",
      "REGIONAIS_2026_RMN",
      "REGIONAIS_2026_RNO",
      "REGIONAIS_2026_RSG",
      "REGIONAIS_2026_RSU",
      "REGIONAIS_2026_RVA",
    ];
    const destinos = codigosDestino.map(codigo => porCodigo.get(codigo));

    if (!origem || destinos.some(item => !item)) {
      setErroLeitura("Não foi possível localizar no sistema a prova de referência RPJ e todas as seis Regionais de destino.");
      return;
    }

    const confirmada = window.confirm(
      "Replicar exclusivamente os eixos técnicos da prova REGIONAIS_2026_RPJ para RBP, RMN, RNO, RSG, RSU e RVA? O sistema só continuará se as 65 questões forem textualmente idênticas e os IDs coincidirem."
    );
    if (!confirmada) return;

    setErroLeitura("");
    setMensagemAcao("");
    setProcessandoReplicacao(true);
    try {
      const resposta = await replicarEixos.mutateAsync({
        origemId: Number(origem.id),
        destinoIds: destinos.map((item: any) => Number(item.id)),
      });
      const resumo = (resposta?.resultados ?? [])
        .map((item: any) => `${item.codigo}: ${item.questoesAjustadas} questão(ões)`)
        .join(" · ");
      setMensagemAcao(`${resposta?.mensagem ?? "Eixos replicados."} ${resumo}`);
      await listaQuery.refetch();
    } catch (error: any) {
      setErroLeitura(error?.message || "Não foi possível replicar os eixos das Regionais.");
    } finally {
      setProcessandoReplicacao(false);
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
      if (resposta?.validada) {
        setVisualizandoId(id);
        setPreviewIndice(0);
        setHistoricoId(null);
        setEditandoId(null);
      }
    } catch (error: any) {
      setErroLeitura(error?.message || "Não foi possível validar a prova salva.");
    } finally {
      setValidandoId(null);
    }
  };

  const abrirEdicao = (id: number) => {
    setErroLeitura("");
    setMensagemAcao("");
    setVisualizandoId(null);
    setHistoricoId(null);
    setUltimaAuditoria([]);
    setEditandoId(id);
    setProvaEdicao(null);
  };

  const abrirPreview = (id: number) => {
    setEditandoId(null);
    setHistoricoId(null);
    setVisualizandoId(id);
    setPreviewIndice(0);
  };

  const abrirHistorico = (id: number) => {
    setEditandoId(null);
    setVisualizandoId(null);
    setInvalidandoId(null);
    setJustificativaInvalidacao("");
    setHistoricoId(id);
  };

  const abrirInvalidacao = (id: number) => {
    setErroLeitura("");
    setMensagemAcao("");
    setEditandoId(null);
    setVisualizandoId(null);
    setHistoricoId(null);
    setInvalidandoId(id);
    setJustificativaInvalidacao("");
  };

  const confirmarInvalidacao = async (id: number) => {
    const justificativa = justificativaInvalidacao.trim();
    if (justificativa.length < 10) {
      setErroLeitura("Informe uma justificativa com pelo menos 10 caracteres para invalidar a prova.");
      return;
    }
    setErroLeitura("");
    setMensagemAcao("");
    setProcessandoInvalidacao(true);
    try {
      const resposta = await invalidarProva.mutateAsync({ id, justificativa });
      setMensagemAcao(resposta?.mensagem || "Prova invalidada.");
      setInvalidandoId(null);
      setJustificativaInvalidacao("");
      await listaQuery.refetch();
    } catch (error: any) {
      setErroLeitura(error?.message || "Não foi possível invalidar a prova.");
    } finally {
      setProcessandoInvalidacao(false);
    }
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

  const adicionarAlternativa = (questaoIndex: number) => {
    if (!provaEdicao) return;
    const questao = provaEdicao.questoes[questaoIndex];
    const ultima = questao.opcoes[questao.opcoes.length - 1];
    const inserirAntesDaUltima = Boolean(ultima && (ultima.naoSei || pareceNaoSei(ultima.texto)));
    const novaOpcao: Opcao = { letra: "", texto: "", naoSei: false };
    const novas = inserirAntesDaUltima
      ? [...questao.opcoes.slice(0, -1), novaOpcao, ultima]
      : [...questao.opcoes, novaOpcao];
    const renumeradas = renumerarOpcoes(novas, questao.gabarito);
    atualizarQuestao(questaoIndex, renumeradas);
  };

  const removerAlternativa = (questaoIndex: number, opcaoIndex: number) => {
    if (!provaEdicao) return;
    const questao = provaEdicao.questoes[questaoIndex];
    const removida = questao.opcoes[opcaoIndex];
    const restantes = questao.opcoes.filter((_, index) => index !== opcaoIndex);
    const gabaritoBase = removida?.letra === questao.gabarito ? "" : questao.gabarito;
    const renumeradas = renumerarOpcoes(restantes, gabaritoBase);
    atualizarQuestao(questaoIndex, renumeradas);
  };

  const adicionarQuestao = () => {
    setProvaEdicao(atual => {
      if (!atual) return atual;
      const nova: Questao = {
        id: "",
        enunciado: "",
        opcoes: [],
        gabarito: "",
        eixos: [],
        macroarea: null,
        microarea: null,
        tagFonte: null,
      };
      return { ...atual, questoes: [...atual.questoes, nova] };
    });
  };

  const excluirQuestao = (questaoIndex: number) => {
    setProvaEdicao(atual => {
      if (!atual) return atual;
      return { ...atual, questoes: atual.questoes.filter((_, index) => index !== questaoIndex) };
    });
  };

  const moverQuestao = (questaoIndex: number, direcao: -1 | 1) => {
    setProvaEdicao(atual => {
      if (!atual) return atual;
      const destino = questaoIndex + direcao;
      if (destino < 0 || destino >= atual.questoes.length) return atual;
      const questoes = [...atual.questoes];
      [questoes[questaoIndex], questoes[destino]] = [questoes[destino], questoes[questaoIndex]];
      return { ...atual, questoes };
    });
  };

  const salvarEdicao = async () => {
    if (!editandoId || !provaEdicao) return;
    setErroLeitura("");
    setMensagemAcao("");
    try {
      const resposta = await salvarRascunho.mutateAsync({ id: editandoId, prova: provaEdicao });
      setMensagemAcao(resposta?.mensagem || "Alterações salvas. A prova permanece como RASCUNHO.");
      setUltimaAuditoria(resposta?.alteracoes ?? []);
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
  const provasImportadas = (listaQuery.data ?? []) as any[];
  const eixosDisponiveis = useMemo(
    () => Array.from(new Set(provasImportadas.flatMap((item: any) => item.eixosTecnicos ?? []))).sort((a, b) => String(a).localeCompare(String(b), "pt-BR")),
    [listaQuery.data],
  );
  const provasFiltradas = useMemo(() => {
    const termo = normalizar(filtroProva);
    const eixo = normalizar(filtroEixo);
    return provasImportadas.filter((item: any) => {
      const textoProva = normalizar([item.codigo, item.nome, item.unidade, item.ano, item.cicloNome].join(" "));
      const eixos = (item.eixosTecnicos ?? []).map(normalizar);
      return (!termo || textoProva.includes(termo)) && (!eixo || eixos.includes(eixo));
    });
  }, [listaQuery.data, filtroProva, filtroEixo]);

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3"><FileSpreadsheet className="h-7 w-7 text-blue-600" /><h1 className="text-2xl font-semibold">Upload de Avaliações</h1></div>
        <p className="max-w-4xl text-sm text-muted-foreground">As provas podem ser carregadas primeiro como RASCUNHO e validadas posteriormente. Uma prova VALIDADA precisa ser reaberta para edição antes de qualquer alteração.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>1. Selecione o ciclo e as provas</CardTitle><CardDescription>Use o mesmo Ciclo do PDI já existente no sistema. O ciclo será aplicado a todas as provas selecionadas neste lote.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <label className="block max-w-xl text-sm font-medium">
            Ciclo do PDI
            <select
              value={cicloIdUpload ?? ""}
              onChange={event => alterarCicloUpload(event.target.value ? Number(event.target.value) : null)}
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 font-normal"
            >
              <option value="">Selecione o ciclo antes das provas</option>
              {(ciclosQuery.data ?? []).map((ciclo: any) => (
                <option key={ciclo.id} value={ciclo.id}>{ciclo.nome}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">O ciclo selecionado é o mesmo utilizado pelos PDIs e pelas ações. Ele não é criado nesta tela.</p>
          <input key={inputKey} type="file" accept=".xlsx" multiple onChange={selecionar} disabled={!cicloIdUpload} className="block w-full text-sm disabled:cursor-not-allowed disabled:opacity-50" />
          {arquivos.length > 0 && <div className="rounded-md border bg-muted/20 p-4 text-sm"><strong>{arquivos.length}</strong> prova(s) carregada(s) · <strong>{totalQuestoes}</strong> questão(ões). Você pode gravá-las agora como RASCUNHO sem validar.</div>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={gravarRascunho} disabled={!arquivos.length || !cicloIdUpload || carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Gravar como RASCUNHO</Button>
            <Button variant="outline" onClick={validar} disabled={!arquivos.length || !cicloIdUpload || carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Validar agora (opcional)</Button>
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
        <CardHeader>
          <CardTitle>Avaliações já importadas</CardTitle>
          <CardDescription>Localize a prova, edite na própria linha, visualize como candidato e consulte todo o histórico de alterações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">Regionais 2026 — sincronização dos eixos técnicos</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Usa REGIONAIS_2026_RPJ como referência dos 11 eixos e altera somente o campo de eixo das 65 questões em RBP, RMN, RNO, RSG, RSU e RVA. A operação é bloqueada se qualquer questão não for idêntica.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={replicarEixosRegionais} disabled={processandoReplicacao || listaQuery.isLoading}>
                {processandoReplicacao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Replicar eixos das Regionais
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_280px_auto]">
            <label className="text-sm">Filtrar por prova
              <input className="mt-1 w-full rounded-md border px-3 py-2" placeholder="Código, nome, unidade ou ano" value={filtroProva} onChange={e => setFiltroProva(e.target.value)} />
            </label>
            <label className="text-sm">Filtrar por Eixo Técnico
              <select className="mt-1 w-full rounded-md border px-3 py-2" value={filtroEixo} onChange={e => setFiltroEixo(e.target.value)}>
                <option value="">Todos os eixos técnicos</option>
                {eixosDisponiveis.map(eixo => <option key={String(eixo)} value={String(eixo)}>{String(eixo)}</option>)}
              </select>
            </label>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={() => { setFiltroProva(""); setFiltroEixo(""); }}>Limpar filtros</Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">{provasFiltradas.length} prova(s) encontrada(s).</div>

          {listaQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : provasImportadas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma avaliação importada ainda.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead><tr className="border-b text-left">
                  <th className="px-3 py-2">Código</th><th className="px-3 py-2">Avaliação</th><th className="px-3 py-2">Unidade</th>
                  <th className="w-[160px] px-3 py-2">Eixos Técnicos</th><th className="px-3 py-2">Ano</th><th className="px-3 py-2">Ciclo</th><th className="px-3 py-2">Questões</th>
                  <th className="px-3 py-2">Status</th><th className="px-3 py-2">Ações</th>
                </tr></thead>
                <tbody>
                  {provasFiltradas.map((item: any) => (
                    <Fragment key={item.id}>
                      <tr className="border-b align-top">
                        <td className="px-3 py-3 font-medium">{item.codigo}</td>
                        <td className="px-3 py-3">{item.nome}</td>
                        <td className="px-3 py-3">{item.unidade}</td>
                        <td className="w-[160px] px-3 py-3">
                          {(() => {
                            const eixos = eixosDaProva(item);
                            if (eixos.length === 0) return <span className="text-xs text-muted-foreground">Sem eixo técnico</span>;
                            return (
                              <div className="flex min-w-[130px] flex-col items-start gap-1">
                                <span className="text-sm font-medium">{eixos.length} eixo{eixos.length === 1 ? "" : "s"}</span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs">
                                      Ver eixos
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" className="w-[380px] max-w-[calc(100vw-2rem)] p-0">
                                    <div className="border-b px-4 py-3">
                                      <p className="font-semibold">Eixos Técnicos da prova</p>
                                      <p className="text-xs text-muted-foreground">{eixos.length} eixo{eixos.length === 1 ? "" : "s"} técnico{eixos.length === 1 ? "" : "s"} distinto{eixos.length === 1 ? "" : "s"}</p>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto p-4">
                                      <ul className="space-y-2 text-sm">
                                        {eixos.map((eixo: string) => (
                                          <li key={eixo} className="rounded-md bg-slate-50 px-3 py-2 leading-relaxed">
                                            {eixo}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3">{item.ano}</td>
                        <td className="px-3 py-3">{item.cicloNome || <span className="text-amber-700">Sem ciclo</span>}</td>
                        <td className="px-3 py-3">{item.totalQuestoes}</td>
                        <td className="px-3 py-3">
                          {item.status === "INVALIDADA" ? (
                            <div className="min-w-[190px] space-y-1">
                              <div className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                                <Ban className="h-3.5 w-3.5" /> PROVA INVALIDADA
                              </div>
                              {item.invalidacaoMotivo && (
                                <p className="max-w-[320px] text-xs leading-relaxed text-red-800">
                                  <strong>Motivo:</strong> {item.invalidacaoMotivo}
                                </p>
                              )}
                              {item.invalidadaEm && (
                                <p className="text-[11px] text-muted-foreground">
                                  Invalidada em {new Date(item.invalidadaEm).toLocaleString("pt-BR")}
                                </p>
                              )}
                            </div>
                          ) : item.status}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.status === "RASCUNHO" ? <>
                              <Button size="sm" variant={editandoId === Number(item.id) ? "default" : "outline"} onClick={() => abrirEdicao(Number(item.id))}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                              <Button size="sm" variant="outline" onClick={() => validarProvaSalva(Number(item.id))} disabled={validandoId === Number(item.id)}>{validandoId === Number(item.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Salvar e validar</Button>
                            </> : item.status === "VALIDADA" ? <Button size="sm" variant="outline" onClick={() => reabrirProva(Number(item.id))} disabled={reabrindoId === Number(item.id)}>{reabrindoId === Number(item.id) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}Reabrir</Button> : null}
                            {["RASCUNHO", "VALIDADA"].includes(String(item.status)) && <Button size="sm" variant={invalidandoId === Number(item.id) ? "destructive" : "outline"} onClick={() => abrirInvalidacao(Number(item.id))}><Ban className="mr-2 h-4 w-4" />Invalidar prova</Button>}
                            {item.status !== "INVALIDADA" && <Button size="sm" variant={visualizandoId === Number(item.id) ? "default" : "outline"} onClick={() => abrirPreview(Number(item.id))}><Eye className="mr-2 h-4 w-4" />Visualizar como candidato</Button>}
                            <Button size="sm" variant={historicoId === Number(item.id) ? "default" : "outline"} onClick={() => abrirHistorico(Number(item.id))}><History className="mr-2 h-4 w-4" />Histórico</Button>
                          </div>
                        </td>
                      </tr>

                      {invalidandoId === Number(item.id) && (
                        <tr className="border-b bg-red-50/50">
                          <td colSpan={9} className="p-4">
                            <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
                              <div className="mb-3">
                                <h3 className="font-semibold text-red-900">Invalidar prova: {item.codigo}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">A prova será preservada para auditoria, mas deixará de ficar disponível para novas aplicações. Aplicações e resultados já existentes não serão apagados.</p>
                              </div>
                              <label className="block text-sm font-medium">
                                Justificativa obrigatória
                                <textarea
                                  value={justificativaInvalidacao}
                                  onChange={event => setJustificativaInvalidacao(event.target.value)}
                                  rows={3}
                                  maxLength={2000}
                                  placeholder="Ex.: versão incompleta substituída pela prova oficial de 65 questões."
                                  className="mt-1 w-full rounded-md border px-3 py-2 font-normal"
                                />
                              </label>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button type="button" variant="destructive" onClick={() => confirmarInvalidacao(Number(item.id))} disabled={processandoInvalidacao || justificativaInvalidacao.trim().length < 10}>
                                  {processandoInvalidacao ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}Confirmar invalidação
                                </Button>
                                <Button type="button" variant="outline" onClick={() => { setInvalidandoId(null); setJustificativaInvalidacao(""); }}>Cancelar</Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {editandoId === Number(item.id) && (
                        <tr className="border-b bg-slate-50/70">
                          <td colSpan={9} className="p-4">
                            <div className="rounded-lg border bg-white p-5 shadow-sm">
                              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                                <div><h3 className="text-lg font-semibold">Editar prova: {item.nome}</h3><p className="text-sm text-muted-foreground">A edição fica junto da prova selecionada. Salve antes de validar.</p></div>
                                <Button type="button" variant="outline" size="sm" onClick={fecharEdicao}><X className="mr-2 h-4 w-4" />Fechar edição</Button>
                              </div>

                              {provaQuery.isLoading || !provaEdicao ? <p className="text-sm text-muted-foreground">Carregando prova...</p> : <div className="space-y-6">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <label className="text-sm">Código<input className="mt-1 w-full rounded-md border px-3 py-2" value={provaEdicao.codigo} onChange={e => setProvaEdicao({ ...provaEdicao, codigo: e.target.value })} /></label>
                                  <label className="text-sm">Nome<input className="mt-1 w-full rounded-md border px-3 py-2" value={provaEdicao.nome} onChange={e => setProvaEdicao({ ...provaEdicao, nome: e.target.value })} /></label>
                                  <label className="text-sm">Unidade<input className="mt-1 w-full rounded-md border px-3 py-2" value={provaEdicao.unidade} onChange={e => setProvaEdicao({ ...provaEdicao, unidade: e.target.value })} /></label>
                                  <label className="text-sm">Ano<input type="number" className="mt-1 w-full rounded-md border px-3 py-2" value={provaEdicao.ano} onChange={e => setProvaEdicao({ ...provaEdicao, ano: Number(e.target.value) })} /></label>
                                  <label className="text-sm">Ciclo do PDI
                                    <select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={provaEdicao.cicloId ?? ""} onChange={e => setProvaEdicao({ ...provaEdicao, cicloId: e.target.value ? Number(e.target.value) : null })}>
                                      <option value="">Selecione o ciclo</option>
                                      {(ciclosQuery.data ?? []).map((ciclo: any) => <option key={ciclo.id} value={ciclo.id}>{ciclo.nome}</option>)}
                                    </select>
                                  </label>
                                  <label className="text-sm md:col-span-2">Descrição<textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={2} value={provaEdicao.descricao ?? ""} onChange={e => setProvaEdicao({ ...provaEdicao, descricao: e.target.value || null })} /></label>
                                </div>

                                {ultimaAuditoria.length > 0 && <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                                  <p className="font-medium text-blue-950">Auditoria da última gravação: {ultimaAuditoria.length} ajuste(s)</p>
                                  <div className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-blue-950">
                                    {ultimaAuditoria.map((alt: any, idx: number) => <p key={idx}>• {alt.campo}</p>)}
                                  </div>
                                </div>}

                                <div className="space-y-5">
                                  {provaEdicao.questoes.map((questao, questaoIndex) => (
                                    <div key={questaoIndex} className="space-y-4 rounded-md border p-4">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-semibold">Questão {questaoIndex + 1}</div>
                                        <div className="flex flex-wrap gap-2">
                                          <Button type="button" variant="outline" size="sm" onClick={() => moverQuestao(questaoIndex, -1)} disabled={questaoIndex === 0}><ArrowUp className="mr-2 h-4 w-4" />Subir</Button>
                                          <Button type="button" variant="outline" size="sm" onClick={() => moverQuestao(questaoIndex, 1)} disabled={questaoIndex === provaEdicao.questoes.length - 1}><ArrowDown className="mr-2 h-4 w-4" />Descer</Button>
                                          <Button type="button" variant="outline" size="sm" onClick={() => excluirQuestao(questaoIndex)}><Trash2 className="mr-2 h-4 w-4" />Excluir questão</Button>
                                        </div>
                                      </div>
                                      <div className="grid gap-3 md:grid-cols-2">
                                        <label className="text-sm">ID<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.id} onChange={e => atualizarQuestao(questaoIndex, { id: e.target.value })} /></label>
                                        <label className="text-sm">Gabarito<select className="mt-1 w-full rounded-md border px-3 py-2" value={questao.gabarito} onChange={e => atualizarQuestao(questaoIndex, { gabarito: e.target.value })}><option value="">Selecione</option>{questao.opcoes.map(opcao => <option key={opcao.letra} value={opcao.letra}>{opcao.letra}</option>)}</select></label>
                                        <label className="text-sm md:col-span-2">Enunciado<textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={3} value={questao.enunciado} onChange={e => atualizarQuestao(questaoIndex, { enunciado: e.target.value })} /></label>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">Alternativas</span><Button type="button" variant="outline" size="sm" onClick={() => adicionarAlternativa(questaoIndex)}><Plus className="mr-2 h-4 w-4" />Adicionar</Button></div>
                                        {questao.opcoes.map((opcao, opcaoIndex) => <div key={opcaoIndex} className="grid gap-2 md:grid-cols-[48px_1fr_auto]"><span className="pt-2 text-sm font-semibold">{opcao.letra}</span><textarea className="min-h-[42px] rounded-md border px-3 py-2 text-sm" value={opcao.texto} onChange={e => atualizarOpcao(questaoIndex, opcaoIndex, e.target.value)} /><Button type="button" variant="outline" size="sm" onClick={() => removerAlternativa(questaoIndex, opcaoIndex)}><Trash2 className="h-4 w-4" /></Button></div>)}
                                      </div>
                                      <div className="grid gap-3 md:grid-cols-2">
                                        <label className="text-sm md:col-span-2"><strong>Eixo(s) Técnico(s) da questão</strong> — separados por vírgula<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.eixos.map(eixo => eixo.nome).join(", ")} onChange={e => atualizarQuestao(questaoIndex, { eixos: e.target.value.split(",").map(item => item.trim()).filter(Boolean).map(nome => ({ nome })) })} /></label>

                                        <label className="text-sm md:col-span-2">Fonte / Tag<input className="mt-1 w-full rounded-md border px-3 py-2" value={questao.tagFonte ?? ""} onChange={e => atualizarQuestao(questaoIndex, { tagFonte: e.target.value || null })} /></label>
                                      </div>
                                    </div>
                                  ))}
                                  <Button type="button" variant="outline" onClick={adicionarQuestao}><Plus className="mr-2 h-4 w-4" />Adicionar nova questão</Button>
                                </div>

                                <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-white py-3">
                                  <Button type="button" onClick={salvarEdicao} disabled={salvarRascunho.isPending}>{salvarRascunho.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar alterações</Button>
                                  <Button type="button" variant="outline" onClick={() => validarProvaSalva(Number(item.id))} disabled={validandoId === Number(item.id)}><ShieldCheck className="mr-2 h-4 w-4" />Salvar e validar</Button>
                                </div>
                              </div>}
                            </div>
                          </td>
                        </tr>
                      )}

                      {visualizandoId === Number(item.id) && (
                        <tr className="border-b bg-blue-50/40">
                          <td colSpan={9} className="p-4">
                            <div className="rounded-lg border border-blue-200 bg-white p-5 shadow-sm">
                              <div className="mb-4 flex items-start justify-between gap-3">
                                <div><h3 className="text-lg font-semibold">Pré-visualização como candidato</h3><p className="text-sm text-muted-foreground">Esta prévia reproduz a ordem, enunciado e alternativas que o candidato verá.</p></div>
                                <Button variant="outline" size="sm" onClick={() => setVisualizandoId(null)}><X className="mr-2 h-4 w-4" />Fechar</Button>
                              </div>
                              {previewQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando prévia...</p> : previewQuery.data?.prova ? (() => {
                                const questoesPreview = (previewQuery.data.prova.questoes ?? []) as Questao[];
                                const q = questoesPreview[previewIndice];
                                if (!q) return <p className="text-sm text-muted-foreground">Nenhuma questão disponível.</p>;
                                return <div className="mx-auto max-w-4xl space-y-4">
                                  <div className="rounded-md border bg-slate-50 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3"><strong>{previewQuery.data.prova.nome}</strong><span className="text-sm">{previewIndice + 1} de {questoesPreview.length}</span></div>
                                    <p className="mt-1 text-xs text-muted-foreground">{previewQuery.data.prova.unidade}</p>
                                  </div>
                                  <div className="rounded-lg border p-5">
                                    <div className="mb-3 flex items-center justify-between gap-3"><span className="text-sm font-medium">Questão {previewIndice + 1}</span></div>
                                    <p className="mb-5 text-lg font-semibold leading-relaxed">{q.enunciado}</p>
                                    <div className="space-y-3">{q.opcoes.map(opcao => <div key={opcao.letra} className="flex w-full items-start gap-3 rounded-lg border bg-white p-4 text-left"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-semibold">{opcao.letra}</span><span className="pt-0.5 text-sm leading-relaxed">{opcao.texto}</span></div>)}</div>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <Button variant="outline" disabled={previewIndice === 0} onClick={() => setPreviewIndice(v => Math.max(0, v - 1))}>Anterior</Button>
                                    <Button disabled={previewIndice >= questoesPreview.length - 1} onClick={() => setPreviewIndice(v => Math.min(questoesPreview.length - 1, v + 1))}>Próxima</Button>
                                  </div>
                                </div>;
                              })() : <p className="text-sm text-red-700">Não foi possível carregar a prévia.</p>}
                            </div>
                          </td>
                        </tr>
                      )}

                      {historicoId === Number(item.id) && (
                        <tr className="border-b bg-amber-50/30">
                          <td colSpan={9} className="p-4">
                            <div className="rounded-lg border bg-white p-5 shadow-sm">
                              <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">Histórico de auditoria</h3><p className="text-sm text-muted-foreground">Registro permanente de importações, ajustes, validações e reaberturas.</p></div><Button variant="outline" size="sm" onClick={() => setHistoricoId(null)}><X className="mr-2 h-4 w-4" />Fechar</Button></div>
                              {historicoQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando histórico...</p> : (historicoQuery.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há eventos registrados para esta prova.</p> : <div className="space-y-3">
                                {(historicoQuery.data ?? []).map((evento: any) => <div key={evento.id} className="rounded-md border p-4">
                                  <div className="flex flex-wrap justify-between gap-2"><div className="font-medium">{evento.acao}</div><div className="text-xs text-muted-foreground">{new Date(evento.createdAt).toLocaleString("pt-BR")}</div></div>
                                  <p className="mt-1 text-xs text-muted-foreground">Por: {evento.usuarioNome || evento.usuarioEmail || "Sistema"}</p>
                                  {(evento.resumo ?? []).length > 0 && <div className="mt-3 space-y-2 text-sm">{evento.resumo.map((alt: any, idx: number) => <div key={idx} className="rounded bg-slate-50 p-2"><strong>{alt.campo}</strong><div className="mt-1 grid gap-2 md:grid-cols-2"><div><span className="text-xs text-muted-foreground">Antes</span><pre className="whitespace-pre-wrap font-sans text-xs">{typeof alt.antes === "string" ? alt.antes : JSON.stringify(alt.antes, null, 2)}</pre></div><div><span className="text-xs text-muted-foreground">Depois</span><pre className="whitespace-pre-wrap font-sans text-xs">{typeof alt.depois === "string" ? alt.depois : JSON.stringify(alt.depois, null, 2)}</pre></div></div></div>)}</div>}
                                </div>)}
                              </div>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
