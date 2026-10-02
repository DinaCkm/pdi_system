import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Sparkles, Loader2, Search, ChevronDown, X, Check, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import RichTextEditor from '@/components/RichTextEditor';
import { COMPETENCIAS_AD_HISTORICAS, competenciaADRelacionadaDaMacro, macroRelacionadaDaAD } from '../../../shared/competenciasAdRelacionamento';
import { useAuth } from '@/_core/hooks/useAuth';
import { opcoesEcoliderDaCompetenciaAD } from '../../../shared/deParaEcolider';
import { referenciasMetodologicas, aliasesCompetenciasHistoricas } from '../../../shared/focosCompetencias';



const aliasesMacroTecnicaPorEixo: Record<string, string> = {
  "administracao e apoio operacional": "gestao administrativa e processos de apoio",
  "contabilidade publica": "financas orcamento e contabilidade publica",
  "financas": "financas orcamento e contabilidade publica",
  "gestao orcamentaria": "gestao orcamentaria e financeira",
  "orcamento": "gestao orcamentaria e financeira",
  "tributaria": "tributaria",
  "auditoria": "auditoria interna e prestacao de contas",
  "compras e licitacoes": "compras licitacoes facilities e gestao contratual",
  "licitacoes": "compras licitacoes facilities e gestao contratual",
  "ouvidoria": "ouvidoria e relacionamento institucional",
  "marketing": "marketing institucional e inteligencia de mercado",
};

function normalizarNomeCompetencia(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^tecnica\s*-\s*/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolverMacroTecnica(eixo: string, macros: any[]) {
  const alvo = normalizarNomeCompetencia(eixo);
  if (!alvo) return null;
  const tecnicas = macros.filter((macro: any) =>
    /^t[eé]cnica\s*-/i.test(String(macro.nome ?? "").trim())
  );
  const alias = aliasesMacroTecnicaPorEixo[alvo];
  if (alias) {
    const encontrada = tecnicas.find((macro: any) => normalizarNomeCompetencia(macro.nome) === alias);
    if (encontrada) return encontrada;
  }

  const exata = tecnicas.find((macro: any) => normalizarNomeCompetencia(macro.nome) === alvo);
  if (exata) return exata;

  const tokensAlvo = alvo.split(" ").filter((token) => token.length >= 4);
  if (!tokensAlvo.length) return null;
  const pontuadas = tecnicas
    .map((macro: any) => {
      const nome = normalizarNomeCompetencia(macro.nome);
      const tokensMacro = new Set(nome.split(" ").filter((token) => token.length >= 4));
      const comuns = tokensAlvo.filter((token) => tokensMacro.has(token)).length;
      return { macro, score: comuns / tokensAlvo.length };
    })
    .sort((a, b) => b.score - a.score);

  if (!pontuadas[0] || pontuadas[0].score < 0.6) return null;
  if (pontuadas[1] && pontuadas[0].score - pontuadas[1].score < 0.2) return null;
  return pontuadas[0].macro;
}

export function AcoesNova() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const paramsOrigem = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const tipoCompetenciaParam = paramsOrigem.get("tipoCompetencia");
  const eixoOrigem = paramsOrigem.get("eixo") || "";

  const [formData, setFormData] = useState({
    pdiId: '',
    macroId: '',
    microcompetencia: '',
    titulo: '',
    descricao: '',
    prazo: '',
  });

  const [modoCriacao, setModoCriacao] = useState<"nova" | "biblioteca">("nova");
  const [tipoEscolhido, setTipoEscolhido] = useState<"" | "TECNICA" | "COMPORTAMENTAL">("");
  const [eixoEscolhido, setEixoEscolhido] = useState("");
  const [buscaGeral, setBuscaGeral] = useState("");
  const [mensagemLastro, setMensagemLastro] = useState("");
  const { user } = useAuth();
  const [buscaBiblioteca, setBuscaBiblioteca] = useState("");
  const [macroBiblioteca, setMacroBiblioteca] = useState("");
  const [eixoBiblioteca, setEixoBiblioteca] = useState("");
  const [grupoAberto, setGrupoAberto] = useState<"basicas" | "essenciais" | "master" | "jornada" | null>(null);
  const [subcompetenciaSelecionada, setSubcompetenciaSelecionada] = useState("");
  const [mostrarTodosModelosMacro, setMostrarTodosModelosMacro] = useState(false);
  const [criandoAcaoTecnica, setCriandoAcaoTecnica] = useState(false);
  const [acaoPreview, setAcaoPreview] = useState<null | {
    origem: "modelo" | "ia";
    foco: string;
    titulo: string;
    descricao: string;
    macroId: string;
  }>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  // Estado para busca de competências
  const [macroSearchTerm, setMacroSearchTerm] = useState('');
  const [macroDropdownOpen, setMacroDropdownOpen] = useState(false);
  const macroDropdownRef = useRef<HTMLDivElement>(null);
  
  // Estado para busca de PDI/colaborador
  const [pdiSearchTerm, setPdiSearchTerm] = useState('');
  const [pdiDropdownOpen, setPdiDropdownOpen] = useState(false);
  const pdiDropdownRef = useRef<HTMLDivElement>(null);

  // Buscando dados
  const { data: pdis = [], isLoading: loadingPdis } = trpc.pdis.list.useQuery();
  const { data: macros = [], isLoading: loadingMacros } = trpc.competencias.listAllMacros.useQuery();
  const { data: biblioteca = [], isLoading: loadingBiblioteca } = trpc.actions.library.useQuery();
  const baixarBiblioteca = () => {
    const macroPorId = new Map((macros as any[]).map((macro) => [Number(macro.id), String(macro.nome ?? '')]));
    const cabecalhos = [
      'ID do modelo', 'Título da ação', 'Descrição atual', 'ID da macro atual',
      'Macrocompetência atual', 'Microcompetência atual', 'Utilizações',
      'Tipo (lastro)', 'Eixo (lastro)', 'Já usado para',
    ];
    const linhas = (biblioteca as any[]).map((modelo) => [
      modelo.modeloId, modelo.titulo ?? '', modelo.descricao ?? '', modelo.macroId ?? '',
      macroPorId.get(Number(modelo.macroId)) ?? '', modelo.microcompetencia ?? '',
      modelo.utilizacoes ?? 0,
      modelo.tipoCompetencia === 'TECNICA' ? 'TÉCNICA' : modelo.tipoCompetencia === 'COMPORTAMENTAL' ? 'COMPORTAMENTAL' : '',
      modelo.eixoNome ?? '',
      descreverUsos(modelo),
    ]);
    const aba = XLSX.utils.aoa_to_sheet([cabecalhos, ...linhas]);
    aba['!cols'] = [16, 42, 65, 20, 46, 40, 16, 18, 42, 60].map((wch) => ({ wch }));
    aba['!autofilter'] = { ref: `A1:J${linhas.length + 1}` };
    const arquivo = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(arquivo, aba, 'Ações da biblioteca');
    const data = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(arquivo, `biblioteca_acoes_pdi_${data}.xlsx`);
  };
  const macroTecnicaInferida = useMemo(
    () => eixoOrigem ? resolverMacroTecnica(eixoOrigem, macros as any[]) : null,
    [eixoOrigem, macros],
  );
  // O tipo vem da linha da Evolução Individual (URL) ou é escolhido na Etapa 2 (menu Ações → Nova ação).
  const tipoEfetivo: "" | "TECNICA" | "COMPORTAMENTAL" =
    tipoCompetenciaParam === "TECNICA" || tipoCompetenciaParam === "COMPORTAMENTAL"
      ? tipoCompetenciaParam
      : tipoEscolhido;
  const fluxoTecnico = tipoEfetivo === "TECNICA";
  const fluxoComportamental = tipoEfetivo === "COMPORTAMENTAL";
  const tipoCompetenciaOrigem: "TECNICA" | "COMPORTAMENTAL" = fluxoTecnico ? "TECNICA" : "COMPORTAMENTAL";
  const eixoAtual = eixoOrigem || eixoEscolhido;
  const { data: eixosDisponiveis } = trpc.actions.eixosDisponiveis.useQuery(
    { pdiId: Number(formData.pdiId) },
    { enabled: Boolean(formData.pdiId) && Number(formData.pdiId) > 0 },
  );
  const importarLastroMutation = trpc.actions.importarLastro.useMutation();
  const { data: historicoEmpregado = [] } = trpc.actions.historyForPdi.useQuery(
    { pdiId: Number(formData.pdiId) },
    { enabled: Boolean(formData.pdiId) && Number(formData.pdiId) > 0 },
  );

  const eixosBiblioteca = useMemo(() => {
    return Array.from(
      new Set(
        (biblioteca as any[])
          .map((modelo) => String(modelo.microcompetencia ?? "").trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [biblioteca]);

  const modelosBiblioteca = useMemo(() => {
    const termo = buscaBiblioteca.trim().toLocaleLowerCase("pt-BR");
    return (biblioteca as any[]).filter((modelo) => {
      const atendeMacro = !macroBiblioteca || String(modelo.macroId ?? "") === macroBiblioteca;
      const atendeEixo =
        !eixoBiblioteca ||
        String(modelo.microcompetencia ?? "").trim() === eixoBiblioteca;
      const atendeBusca = !termo || [modelo.titulo, modelo.descricao, modelo.microcompetencia]
        .some((valor) => String(valor ?? "").toLocaleLowerCase("pt-BR").includes(termo));
      return atendeMacro && atendeEixo && atendeBusca;
    });
  }, [biblioteca, buscaBiblioteca, macroBiblioteca, eixoBiblioteca]);

  const usarModeloBiblioteca = (modelo: any) => {
    setFormData((prev) => ({
      ...prev,
      macroId: modelo.macroId ? String(modelo.macroId) : "",
      microcompetencia: modelo.microcompetencia || "",
      titulo: modelo.titulo || "",
      descricao: modelo.descricao || "",
    }));
    setModoCriacao("nova");
    setErrors({});
  };
  
  // Filtrar PDIs baseado na busca
  const filteredPdis = useMemo(() => {
    if (!pdiSearchTerm.trim()) return pdis;
    const term = pdiSearchTerm.toLowerCase();
    return pdis.filter((pdi: any) => 
      pdi.colaboradorNome?.toLowerCase().includes(term) ||
      pdi.titulo?.toLowerCase().includes(term)
    );
  }, [pdis, pdiSearchTerm]);
  
  // Obter nome do PDI/colaborador selecionado
  const selectedPdiInfo = useMemo(() => {
    if (!formData.pdiId) return null;
    const pdi = pdis.find((p: any) => String(p.pdiId) === formData.pdiId);
    return pdi ? { nome: pdi.colaboradorNome, titulo: pdi.titulo } : null;
  }, [formData.pdiId, pdis]);
  
  // Filtrar macros baseado na busca
  const filteredMacros = useMemo(() => {
    if (!macroSearchTerm.trim()) return macros;
    const term = macroSearchTerm.toLowerCase();
    return macros.filter((macro: any) => 
      macro.nome.toLowerCase().includes(term)
    );
  }, [macros, macroSearchTerm]);

  const macrosTecnicas = useMemo(
    () => (macros as any[])
      .filter((macro: any) => /^t[eé]cnica\s*-/i.test(String(macro.nome ?? "").trim()))
      .sort((a: any, b: any) => String(a.nome).localeCompare(String(b.nome), "pt-BR")),
    [macros],
  );

  const macroTecnicaSugerida = fluxoTecnico ? macroTecnicaInferida : null;
  
  // Obter nome da macro selecionada
  const selectedMacroName = useMemo(() => {
    if (!formData.macroId) return '';
    const macro = macros.find((m: any) => String(m.id) === formData.macroId);
    return macro ? macro.nome : '';
  }, [formData.macroId, macros]);


  const selectedMacroReference = useMemo(() => {
    if (!selectedMacroName) return null;
    const nomeSemPrefixo = selectedMacroName.replace(/^COMPORTAMENTAL\s*-\s*/i, '').trim();
    const aliasAtual = aliasesCompetenciasHistoricas[nomeSemPrefixo];
    const nomeNormalizado = aliasAtual
      ?? selectedMacroName.replace(/^COMPORTAMENTAL\s*-\s*/i, 'COMPORTAMENTAL - ');
    return referenciasMetodologicas[nomeNormalizado] ?? null;
  }, [selectedMacroName]);


  const acoesDisponiveisDaMacro = useMemo(() => {
    if (!formData.macroId) return [];
    const competencia = eixoOrigem || eixoEscolhido;
    return (biblioteca as any[]).filter(
      (modelo) => String(modelo.macroId ?? '') === formData.macroId
        || (competencia && (modelo.usos ?? []).some((uso: any) =>
          uso.tipoCompetencia === 'COMPORTAMENTAL' && uso.eixoNome === competencia)),
    );
  }, [biblioteca, formData.macroId, eixoOrigem, eixoEscolhido]);

  const normalizarBusca = (valor: unknown) =>
    String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();

  const modelosTecnicos = useMemo(() => {
    if (!fluxoTecnico || !eixoAtual) return [];
    const alvo = normalizarBusca(eixoAtual);
    return (biblioteca as any[])
      .filter((modelo) => (modelo.usos ?? []).some((uso: any) =>
        uso.tipoCompetencia === "TECNICA" && normalizarBusca(uso.eixoNome) === alvo))
      .sort((a, b) => Number(b.utilizacoes ?? 0) - Number(a.utilizacoes ?? 0));
  }, [biblioteca, fluxoTecnico, eixoAtual]);

  const resultadosBuscaGeral = useMemo(() => {
    const termo = normalizarBusca(buscaGeral);
    if (termo.length < 3) return [];
    return (biblioteca as any[])
      .filter((modelo) => [modelo.titulo, modelo.descricao]
        .some((valor) => normalizarBusca(String(valor ?? "").replace(/<[^>]+>/g, " ")).includes(termo)))
      .slice(0, 12);
  }, [biblioteca, buscaGeral]);

  const descreverUsos = (modelo: any) => {
    const usos = (modelo.usos ?? []) as any[];
    if (!usos.length) return "Ainda sem eixo registrado";
    return usos.slice(0, 3)
      .map((uso) => `${uso.eixoNome} (${uso.tipoCompetencia === "TECNICA" ? "técnico" : "comportamental"}) · ${uso.vezes}×`)
      .join("; ");
  };

  const modelosRelacionadosASubcompetencia = (nome: string) => {
    const alvo = normalizarBusca(nome);
    return acoesDisponiveisDaMacro.filter((modelo: any) => {
      const campos = [modelo.microcompetencia, modelo.titulo, modelo.descricao]
        .map(normalizarBusca)
        .filter(Boolean);
      return campos.some((campo) => campo.includes(alvo));
    });
  };

  const selecionarSubcompetencia = (nome: string) => {
    setSubcompetenciaSelecionada(nome);
    setFormData((prev) => ({ ...prev, microcompetencia: nome }));
    setMostrarTodosModelosMacro(false);
    setSugestaoGerada(false);
  };

  const usarModeloNoFoco = (modelo: any, foco: string) => {
    setSubcompetenciaSelecionada(foco);
    setAcaoPreview({
      origem: "modelo",
      foco,
      titulo: modelo.titulo || "",
      descricao: modelo.descricao || "",
      macroId: modelo.macroId ? String(modelo.macroId) : formData.macroId,
    });
    setErrors({});
    setSugestaoGerada(false);
  };
  
  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (macroDropdownRef.current && !macroDropdownRef.current.contains(event.target as Node)) {
        setMacroDropdownOpen(false);
      }
      if (pdiDropdownRef.current && !pdiDropdownRef.current.contains(event.target as Node)) {
        setPdiDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Mutation para sugestão com IA
  const sugerirAcaoMutation = trpc.ia.sugerirAcao.useMutation({
    onSuccess: (data) => {
      if (data.success && data.sugestao) {
        setAcaoPreview({
          origem: "ia",
          foco: fluxoTecnico ? eixoAtual : subcompetenciaSelecionada,
          titulo: data.sugestao.titulo,
          descricao: data.sugestao.detalhes,
          macroId: formData.macroId,
        });
        setSugestaoGerada(true);
      }
      setIsSuggesting(false);
    },
    onError: (error) => {
      console.error('Erro ao gerar sugestão:', error);
      setErrors({ submit: 'Erro ao gerar sugestão com IA. Tente novamente.' });
      setIsSuggesting(false);
    },
  });
  
  // Preencher o fluxo correto quando a ação nasce na Evolução Individual.
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlPdiId = params.get('pdiId');
    const eixo = params.get('eixo') || '';
    const macroRelacionada = params.get('macroRelacionada');
    const origem = params.get('origem');
    const modo = params.get('modo');
    const tipo = tipoCompetenciaOrigem;

    setFormData(prev => ({
      ...prev,
      ...(urlPdiId ? { pdiId: urlPdiId } : {}),
      ...(eixo ? { microcompetencia: eixo } : {}),
    }));

    if (tipo === 'TECNICA' && eixo) {
      setEixoBiblioteca(eixo);
      setSubcompetenciaSelecionada(eixo);
    }

    if (tipo === 'COMPORTAMENTAL' && macroRelacionada && macros.length > 0) {
      const alvo = macroRelacionada.replace(/^COMPORTAMENTAL\s*-\s*/i, 'COMPORTAMENTAL - ').trim();
      const macroEncontrada = (macros as any[]).find((macro) =>
        String(macro.nome ?? '').replace(/^COMPORTAMENTAL\s*-\s*/i, 'COMPORTAMENTAL - ').trim() === alvo
      );
      if (macroEncontrada) {
        const macroRelacionadaId = String(macroEncontrada.id);
        setFormData(prev => ({ ...prev, macroId: macroRelacionadaId }));
        setMacroBiblioteca(macroRelacionadaId);
      }
    }

    if (modo === "biblioteca" || origem === "evolucao_individual") {
      setModoCriacao("nova");
    }
  }, [searchString, macros, tipoCompetenciaOrigem, eixoOrigem]);
  
  useEffect(() => {
    if (!fluxoComportamental || eixoOrigem || !eixoEscolhido || macros.length === 0) return;
    const alvo = String(macroRelacionadaDaAD(eixoEscolhido) ?? "").replace(/^COMPORTAMENTAL\s*-\s*/i, 'COMPORTAMENTAL - ').trim();
    const macroEncontrada = (macros as any[]).find((macro) =>
      String(macro.nome ?? '').replace(/^COMPORTAMENTAL\s*-\s*/i, 'COMPORTAMENTAL - ').trim() === alvo
    );
    setFormData(prev => ({ ...prev, macroId: macroEncontrada ? String(macroEncontrada.id) : '' }));
    setSubcompetenciaSelecionada('');
    setAcaoPreview(null);
  }, [fluxoComportamental, eixoOrigem, eixoEscolhido, macros]);

  const utils = trpc.useUtils();
  
  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      utils.actions.list.invalidate();
      navigate('/acoes');
    },
    onError: (error) => {
      setErrors({ submit: `Erro do Servidor: ${error.message}` });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '', submit: '' }));
  };
  
  const handleSelectPdi = (pdiId: string) => {
    setFormData(prev => ({ ...prev, pdiId }));
    setPdiSearchTerm('');
    setPdiDropdownOpen(false);
    setErrors(prev => ({ ...prev, pdiId: '', submit: '' }));
  };
  
  const handleSelectMacro = (macroId: string, macroNome: string) => {
    setFormData(prev => ({ ...prev, macroId }));
    setMacroSearchTerm('');
    setMacroDropdownOpen(false);
    setErrors(prev => ({ ...prev, macroId: '', submit: '' }));
  };

  const handleSugerirComIA = () => {
    const macroSelecionada = macros.find((m: any) => String(m.id) === formData.macroId);
    const referencia = fluxoTecnico ? eixoAtual : macroSelecionada?.nome;

    if (!referencia) {
      setErrors({ submit: fluxoTecnico ? 'Eixo técnico não identificado.' : 'Não foi possível localizar as Competências do B.E.M. relacionadas.' });
      return;
    }

    if (fluxoTecnico && !subcompetenciaSelecionada) {
      setSubcompetenciaSelecionada(eixoAtual);
    }

    setIsSuggesting(true);
    setErrors({});
    
    sugerirAcaoMutation.mutate({
      competenciaMacro: referencia,
      competenciaMicro: fluxoTecnico ? eixoAtual : (formData.microcompetencia || undefined),
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.pdiId) newErrors.pdiId = 'Selecione o PDI vinculado';
    if (!tipoEfetivo) newErrors.macroId = 'Escolha se a ação desenvolve um eixo técnico ou uma competência comportamental.';
    if (fluxoComportamental && !competenciaAdAtual) newErrors.macroId = 'Escolha a competência comportamental que a ação vai desenvolver.';
    if (fluxoComportamental && competenciaAdAtual && !subcompetenciaSelecionada) newErrors.macroId = 'Escolha o foco da ação (Básica, Essencial, Master ou Jornada do Futuro).';
    if (fluxoTecnico && !eixoAtual) newErrors.macroId = 'Escolha o eixo técnico que a ação vai desenvolver.';
    if (!formData.titulo.trim()) newErrors.titulo = 'Título é obrigatório';
    if (!formData.prazo) newErrors.prazo = 'Prazo é obrigatório';
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Conversão segura
    const pdiIdNumerico = Number(formData.pdiId);

    // Validação final de segurança
    if (!pdiIdNumerico || isNaN(pdiIdNumerico)) {
      setErrors({ submit: 'Erro Interno: ID do PDI inválido. Recarregue a página.' });
      return;
    }

    // Validar e garantir que prazo seja string ISO (YYYY-MM-DD)
    let prazoFormatado = formData.prazo;
    if (formData.prazo instanceof Date) {
      prazoFormatado = formData.prazo.toISOString().split('T')[0];
    }
    
    // Ação nova: sem macro e sem microcompetência. O vínculo é tipo + eixo (+ foco B.E.M.).
    createMutation.mutate({
      pdiId: pdiIdNumerico,
      tipoCompetencia: tipoCompetenciaOrigem,
      eixoNome: fluxoTecnico ? eixoAtual : competenciaAdAtual,
      ...(fluxoComportamental && subcompetenciaSelecionada ? { focoBem: focoBemComNivel(subcompetenciaSelecionada) } : {}),
      titulo: formData.titulo,
      descricao: formData.descricao,
      prazo: prazoFormatado,
    });
  };

  const normalizarTitulo = (valor: unknown) =>
    normalizarBusca(valor).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  const historicoDaPreview = useMemo(() => {
    if (!acaoPreview) return [];
    const tituloAlvo = normalizarTitulo(acaoPreview.titulo);
    const focoAlvo = normalizarBusca(acaoPreview.foco);
    const macroAlvo = String(acaoPreview.macroId || "");

    return (historicoEmpregado as any[]).filter((acao) => {
      const titulo = normalizarTitulo(acao.titulo);
      const micro = normalizarBusca(acao.microcompetencia ?? acao.microcompetenciaNome);
      const mesmaMacro = macroAlvo && String(acao.macroId ?? "") === macroAlvo;
      const mesmoTitulo = Boolean(tituloAlvo && titulo === tituloAlvo);
      const mesmaSubcompetencia = Boolean(focoAlvo && micro.includes(focoAlvo));
      return mesmoTitulo || (fluxoTecnico ? mesmaSubcompetencia : (mesmaMacro && mesmaSubcompetencia));
    });
  }, [acaoPreview, historicoEmpregado, fluxoTecnico]);

  const aprovarPreview = () => {
    if (!acaoPreview) return;
    setSubcompetenciaSelecionada(acaoPreview.foco);
    setFormData((prev) => ({
      ...prev,
      macroId: acaoPreview.macroId || prev.macroId,
      microcompetencia: acaoPreview.foco,
      titulo: acaoPreview.titulo,
      descricao: acaoPreview.descricao,
    }));
    setErrors({});
  };

  const canSuggest = Boolean((fluxoTecnico ? eixoAtual : formData.macroId) && subcompetenciaSelecionada && !isSuggesting);
  const [sugestaoGerada, setSugestaoGerada] = useState(false);

  const competenciaAdAtual = fluxoComportamental
    ? (eixoOrigem || eixoEscolhido || competenciaADRelacionadaDaMacro(selectedMacroName) || selectedMacroReference?.competenciaAD || "")
    : "";

  const importarLastroDoArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setMensagemLastro('Lendo o arquivo...');
    try {
      const dados = await arquivo.arrayBuffer();
      const planilha = XLSX.read(dados, { type: 'array' });
      const linhasArquivo = XLSX.utils.sheet_to_json<any>(planilha.Sheets[planilha.SheetNames[0]], { defval: '' });
      const linhas = linhasArquivo
        .map((linha: any) => {
          const tipoTexto = normalizarBusca(linha['Tipo']);
          return {
            modeloId: Number(linha['ID']),
            tipoCompetencia: (tipoTexto.startsWith('tec') ? 'TECNICA' : tipoTexto.startsWith('comp') ? 'COMPORTAMENTAL' : '') as any,
            eixoNome: String(linha['Eixo'] ?? '').trim(),
          };
        })
        .filter((linha: any) => linha.modeloId > 0 && linha.tipoCompetencia && linha.eixoNome);
      if (!linhas.length) {
        setMensagemLastro('Nenhuma linha válida. O arquivo precisa das colunas ID, Tipo e Eixo.');
        return;
      }
      setMensagemLastro(`Gravando o lastro de ${linhas.length} modelos...`);
      let modelos = 0;
      let acoes = 0;
      const erros: string[] = [];
      for (let i = 0; i < linhas.length; i += 200) {
        const resposta = await importarLastroMutation.mutateAsync({ linhas: linhas.slice(i, i + 200) });
        modelos += resposta.modelosAtualizados;
        acoes += resposta.acoesAtualizadas;
        erros.push(...resposta.erros);
      }
      await utils.actions.library.invalidate();
      setMensagemLastro(`Lastro gravado: ${modelos} modelos, ${acoes} ações.${erros.length ? ` ${erros.length} linha(s) com erro: ${erros.slice(0, 3).join(' ')}` : ''}`);
    } catch (error: any) {
      setMensagemLastro(`Não foi possível importar: ${error?.message ?? error}`);
    }
  };

  const opcoesEcolider = opcoesEcoliderDaCompetenciaAD(competenciaAdAtual);
  const mastersDaCompetencia = opcoesEcolider.master.length
    ? opcoesEcolider.master.map((nome) => ({ nome, justificativa: `Competência Master do EcoLíder ligada a ${competenciaAdAtual}.` }))
    : (selectedMacroReference?.master ? [selectedMacroReference.master] : []);
  const jornadaDaCompetencia = opcoesEcolider.jornadaFuturo.map((nome) => ({ nome, justificativa: `Competência da Jornada do Futuro do EcoLíder ligada a ${competenciaAdAtual}.` }));

  const focoBemComNivel = (nome: string) => {
    const ref = selectedMacroReference;
    if (!ref) return nome;
    if (ref.basicas.some((item) => item.nome === nome)) return `${nome} (Básica)`;
    if (ref.essenciais.some((item) => item.nome === nome)) return `${nome} (Essencial)`;
    if (ref.master?.nome === nome) return `${nome} (Master)`;
    const opcoes = opcoesEcoliderDaCompetenciaAD(competenciaAdAtual);
    if (opcoes.master.includes(nome)) return `${nome} (Master)`;
    if (opcoes.jornadaFuturo.includes(nome)) return `${nome} (Jornada do Futuro)`;
    return nome;
  };

  const usarModeloDaBusca = (modelo: any) => {
    const foco = fluxoTecnico ? eixoAtual : subcompetenciaSelecionada;
    if (!foco) {
      setErrors({ submit: 'Escolha primeiro o foco B.E.M. (Básica, Essencial ou Master) acima; depois use o modelo.' });
      return;
    }
    setSubcompetenciaSelecionada(foco);
    setAcaoPreview({ origem: "modelo", foco, titulo: modelo.titulo || "", descricao: modelo.descricao || "", macroId: formData.macroId });
    setErrors({});
  };

  const renderBuscaGeral = () => (
    <div style={{ marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
      <div style={{ fontWeight: 750, color: '#0f172a' }}>Buscar em toda a biblioteca</div>
      <div style={{ marginTop: '3px', fontSize: '13px', color: '#64748b' }}>
        Procura em todas as ações, técnicas e comportamentais. O modelo empresta só o conteúdo: o eixo desta ação continua sendo o escolhido acima.
      </div>
      <input
        value={buscaGeral}
        onChange={(e) => setBuscaGeral(e.target.value)}
        placeholder="Digite ao menos 3 letras (ex.: oratória, Power BI, licitação)"
        style={{ marginTop: '9px', width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '7px' }}
      />
      {buscaGeral.trim().length >= 3 && (
        <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
          {resultadosBuscaGeral.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748b' }}>Nenhum modelo encontrado para essa busca.</div>
          ) : resultadosBuscaGeral.map((modelo: any) => (
            <div key={`busca-${modelo.modeloId}`} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '11px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', background: '#fff' }}>
              <div>
                <div style={{ fontWeight: 650 }}>{modelo.titulo}</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>Já usado para: {descreverUsos(modelo)}</div>
              </div>
              <button type="button" onClick={() => usarModeloDaBusca(modelo)} style={{ flexShrink: 0, border: '1px solid #2563eb', borderRadius: '6px', padding: '8px 11px', background: '#2563eb', color: '#fff', fontWeight: 650, cursor: 'pointer' }}>
                Usar como modelo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderModelosDoFoco = (foco: string) => {
    const modelos = modelosRelacionadosASubcompetencia(foco);
    const selecionada = subcompetenciaSelecionada === foco;

    return (
      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {modelos.length > 0 ? (
          <>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              {modelos.length} modelo(s) relacionado(s) diretamente a esta subcompetência.
            </div>
            {modelos.slice(0, 4).map((modelo: any) => (
              <div
                key={modelo.modeloId || `${modelo.titulo}-${foco}`}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 650, color: '#0f172a' }}>{modelo.titulo}</div>
                  {modelo.microcompetencia ? (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                      Biblioteca: {modelo.microcompetencia}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => usarModeloNoFoco(modelo, foco)}
                  style={{
                    flexShrink: 0,
                    border: '1px solid #2563eb',
                    borderRadius: '6px',
                    padding: '8px 11px',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                >
                  Usar como modelo
                </button>
              </div>
            ))}
          </>
        ) : (
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Ainda não existe modelo classificado diretamente para esta subcompetência.
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => selecionarSubcompetencia(foco)}
            style={{
              border: selecionada ? '2px solid #2563eb' : '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '9px 12px',
              background: selecionada ? '#eff6ff' : '#fff',
              color: '#1e3a8a',
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            {selecionada ? 'Foco selecionado' : 'Criar ação nesta subcompetência'}
          </button>
          {selecionada && (
            <button
              type="button"
              onClick={handleSugerirComIA}
              disabled={!canSuggest}
              style={{
                border: 'none',
                borderRadius: '7px',
                padding: '9px 12px',
                background: canSuggest ? '#0284c7' : '#94a3b8',
                color: '#fff',
                fontWeight: 650,
                cursor: canSuggest ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <Sparkles size={16} />
              {isSuggesting ? 'Gerando...' : sugestaoGerada ? 'Gerar outra sugestão' : 'Sugerir ação com IA'}
            </button>
          )}
        </div>
        {acaoPreview && acaoPreview.foco === foco && (
          <div style={{ marginTop: '14px', border: '2px solid #93c5fd', borderRadius: '10px', padding: '16px', background: '#f8fbff' }}>
            <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>
              Prévia da ação
            </div>
            <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 750, color: '#0f172a' }}>
              {acaoPreview.titulo}
            </div>
            <div
              style={{ marginTop: '10px', color: '#475569', lineHeight: 1.55 }}
              dangerouslySetInnerHTML={{ __html: acaoPreview.descricao || '<p>Sem descrição.</p>' }}
            />

            <div style={{ marginTop: '14px', padding: '12px', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#334155' }}>Histórico deste empregado</div>
              {historicoDaPreview.length === 0 ? (
                <div style={{ marginTop: '5px', fontSize: '13px', color: '#166534' }}>
                  Não localizamos esta mesma ação nem ação da mesma macro/subcompetência em PDIs anteriores.
                </div>
              ) : (
                <div style={{ marginTop: '7px' }}>
                  <div style={{ fontSize: '13px', color: '#b45309', fontWeight: 650 }}>
                    Atenção: encontramos {historicoDaPreview.length} ocorrência(s) relacionada(s) no histórico.
                  </div>
                  <ul style={{ margin: '7px 0 0', paddingLeft: '18px', color: '#475569', fontSize: '13px' }}>
                    {historicoDaPreview.slice(0, 5).map((acao: any) => (
                      <li key={acao.id}>
                        {acao.titulo} — {acao.pdiTitulo || 'PDI'} — status: {acao.status || 'não informado'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) 1fr', gap: '12px', alignItems: 'end' }}>
              <div>
                <label htmlFor={`prazo-inline-${foco}`} style={{ display: 'block', fontWeight: 700, marginBottom: '5px' }}>
                  Prazo para incluir no PDI
                </label>
                <input
                  id={`prazo-inline-${foco}`}
                  name="prazo"
                  type="date"
                  value={formData.prazo}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px', border: errors.prazo ? '2px solid #dc2626' : '1px solid #cbd5e1', borderRadius: '7px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={aprovarPreview}
                  style={{ border: 'none', borderRadius: '7px', padding: '10px 14px', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Aprovar esta ação
                </button>
                <button
                  type="submit"
                  onClick={aprovarPreview}
                  disabled={!formData.prazo || createMutation.isPending}
                  style={{ border: 'none', borderRadius: '7px', padding: '10px 14px', background: formData.prazo ? '#166534' : '#94a3b8', color: '#fff', fontWeight: 700, cursor: formData.prazo ? 'pointer' : 'not-allowed' }}
                >
                  {createMutation.isPending ? 'Incluindo...' : 'Aprovar e incluir no PDI'}
                </button>
                <button
                  type="button"
                  onClick={() => setAcaoPreview(null)}
                  style={{ border: '1px solid #cbd5e1', borderRadius: '7px', padding: '10px 14px', background: '#fff', fontWeight: 650, cursor: 'pointer' }}
                >
                  Fechar prévia
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa', padding: '28px 20px 48px' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        <div style={{ marginBottom: '22px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 750, margin: 0 }}>Criar ação de desenvolvimento</h1>
          <p style={{ color: '#64748b', marginTop: '7px' }}>
            Escolha primeiro o foco de desenvolvimento. Depois utilize um modelo, crie a ação ou peça uma sugestão à IA.
          </p>
          <button
            type="button"
            onClick={baixarBiblioteca}
            disabled={loadingBiblioteca || loadingMacros || biblioteca.length === 0}
            style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 12px', border: '1px solid #0f766e', borderRadius: '7px', background: '#fff', color: '#0f766e', fontWeight: 700, cursor: loadingBiblioteca || loadingMacros || biblioteca.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            <Download size={17} /> Baixar biblioteca de ações (.xlsx)
          </button>
          {user?.role === 'admin' && (
            <label style={{ marginTop: '10px', marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 12px', border: '1px solid #5E2B8A', borderRadius: '7px', background: '#fff', color: '#5E2B8A', fontWeight: 700, cursor: 'pointer' }}>
              Importar lastro das ações (.xlsx)
              <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e) => { importarLastroDoArquivo(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          )}
          {mensagemLastro && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#334155' }}>{mensagemLastro}</div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '8px',
          marginBottom: '22px',
        }}>
          {['1. Pessoa', '2. Competência', '3. Foco', '4. Ação', '5. Revisão'].map((etapa) => (
            <div key={etapa} style={{
              padding: '10px 8px',
              textAlign: 'center',
              borderRadius: '7px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              fontWeight: 650,
              color: '#475569',
            }}>{etapa}</div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Etapa 1</div>
            <h2 style={{ margin: '4px 0 14px', fontSize: '20px' }}>De quem é esta ação?</h2>

            <div ref={pdiDropdownRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setPdiDropdownOpen(!pdiDropdownOpen)}
                style={{
                  width: '100%', padding: '12px 14px',
                  border: errors.pdiId ? '2px solid red' : pdiDropdownOpen ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  borderRadius: '7px', background: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                }}
              >
                {formData.pdiId && selectedPdiInfo ? (
                  <span style={{ fontWeight: 600 }}>{selectedPdiInfo.nome} — {selectedPdiInfo.titulo}</span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Selecione o empregado e o PDI</span>
                )}
                <ChevronDown size={18} />
              </div>

              {pdiDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  marginTop: '5px', background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: '8px', boxShadow: '0 12px 30px rgba(15,23,42,.12)',
                }}>
                  <div style={{ padding: '10px' }}>
                    <input
                      value={pdiSearchTerm}
                      onChange={(e) => setPdiSearchTerm(e.target.value)}
                      placeholder="Buscar empregado..."
                      style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {filteredPdis.map((pdi: any) => (
                      <button
                        type="button"
                        key={pdi.pdiId}
                        onClick={() => handleSelectPdi(String(pdi.pdiId))}
                        style={{
                          width: '100%', textAlign: 'left', padding: '11px 14px',
                          border: 'none', borderTop: '1px solid #f1f5f9',
                          background: formData.pdiId === String(pdi.pdiId) ? '#eff6ff' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontWeight: 650 }}>{pdi.colaboradorNome}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{pdi.titulo}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {errors.pdiId && <div style={{ color: '#b91c1c', marginTop: '6px', fontSize: '13px' }}>{errors.pdiId}</div>}
          </section>

          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Etapa 2</div>
            <h2 style={{ margin: '4px 0 14px', fontSize: '20px' }}>
              {fluxoTecnico ? 'Qual eixo técnico estamos desenvolvendo?' : 'Qual competência estamos desenvolvendo?'}
            </h2>

            {!tipoCompetenciaParam && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {([['TECNICA', 'Eixo técnico'], ['COMPORTAMENTAL', 'Competência comportamental']] as const).map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => { setTipoEscolhido(valor); setEixoEscolhido(''); setAcaoPreview(null); setSubcompetenciaSelecionada(''); setFormData(prev => ({ ...prev, macroId: '' })); setErrors({}); }}
                    style={{ border: tipoEscolhido === valor ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: tipoEscolhido === valor ? '#eff6ff' : '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            )}
            {!tipoEfetivo ? (
              <div style={{ fontSize: '13px', color: '#64748b' }}>Escolha acima se a ação vai desenvolver um eixo técnico ou uma competência comportamental.</div>
            ) : fluxoTecnico ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {eixoOrigem ? (
                  <div style={{ padding: '14px 16px', borderRadius: '9px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 750 }}>Eixo técnico selecionado na Evolução</div>
                    <div style={{ marginTop: '5px', fontWeight: 750, fontSize: '17px' }}>{eixoOrigem}</div>
                  </div>
                ) : !formData.pdiId ? (
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Escolha primeiro o empregado na Etapa 1 para ver os eixos técnicos da matriz dele.</div>
                ) : (eixosDisponiveis?.tecnicos ?? []).length === 0 ? (
                  <div style={{ border: '1px solid #fecaca', background: '#fff7f7', color: '#991b1b', borderRadius: '8px', padding: '11px 13px', fontSize: '13px' }}>
                    Este empregado ainda não tem eixos técnicos na matriz. Importe a matriz dele antes de criar uma ação técnica.
                  </div>
                ) : (
                  <select
                    value={eixoEscolhido}
                    onChange={(event) => { setEixoEscolhido(event.target.value); setSubcompetenciaSelecionada(event.target.value); setAcaoPreview(null); setErrors({}); }}
                    style={{ width: '100%', padding: '11px 12px', border: errors.macroId ? '2px solid #dc2626' : '1px solid #cbd5e1', borderRadius: '7px', background: '#fff' }}
                  >
                    <option value="">Selecione o eixo técnico da matriz do empregado</option>
                    {(eixosDisponiveis?.tecnicos ?? []).map((eixo: string) => (
                      <option key={eixo} value={eixo}>{eixo}</option>
                    ))}
                  </select>
                )}
                {errors.macroId && <div style={{ color: '#b91c1c', fontSize: '13px' }}>{errors.macroId}</div>}
              </div>
            ) : (
              <>
                {!eixoOrigem && (
                  <select
                    value={eixoEscolhido}
                    onChange={(event) => setEixoEscolhido(event.target.value)}
                    style={{ width: '100%', marginBottom: '10px', padding: '11px 12px', border: errors.macroId ? '2px solid #dc2626' : '1px solid #cbd5e1', borderRadius: '7px', background: '#fff' }}
                  >
                    <option value="">Selecione a competência comportamental da Avaliação de Desempenho</option>
                    {COMPETENCIAS_AD_HISTORICAS.map((competencia) => (
                      <option key={competencia} value={competencia}>{competencia}</option>
                    ))}
                  </select>
                )}
                {competenciaAdAtual && (
                  <div style={{ marginBottom: '10px', padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 750 }}>Competência comportamental selecionada na Evolução</div>
                    <div style={{ marginTop: '4px', fontWeight: 700 }}>{competenciaAdAtual}</div>
                  </div>
                )}

                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#1d4ed8', fontWeight: 750 }}>Competências do B.E.M. relacionadas</div>
                  <div style={{ marginTop: '4px', fontWeight: 700 }}>
                    {selectedMacroName || 'Relação não localizada automaticamente'}
                  </div>
                  <div style={{ marginTop: '5px', color: '#475569', fontSize: '13px' }}>
                    A competência escolhida na Evolução abre automaticamente a trilha B.E.M. correspondente. Não é necessário selecionar manualmente uma macrocompetência.
                  </div>
                </div>

                {competenciaAdAtual && !selectedMacroName && (
                  <div style={{ marginTop: '10px', border: '1px solid #fecaca', background: '#fff7f7', color: '#991b1b', borderRadius: '8px', padding: '11px 13px', fontSize: '13px' }}>
                    Não foi possível localizar automaticamente a trilha das Competências do B.E.M. para esta competência. Revise o relacionamento cadastrado antes de criar a ação.
                  </div>
                )}
                {errors.macroId && <div style={{ color: '#b91c1c', marginTop: '6px', fontSize: '13px' }}>{errors.macroId}</div>}
              </>
            )}
          </section>

          {fluxoTecnico && eixoAtual && (
            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Etapa 3</div>
              <h2 style={{ margin: '4px 0 6px', fontSize: '20px' }}>Escolha a ação para o eixo técnico</h2>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '14px' }}>
                Veja as ações já usadas para este eixo, busque em toda a biblioteca, crie uma nova ação ou peça uma sugestão à IA.
              </p>

              <div style={{ fontWeight: 750, color: '#0f172a', marginBottom: '8px' }}>Mais usados para este eixo</div>
              {modelosTecnicos.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {modelosTecnicos.slice(0, 8).map((modelo: any) => (
                    <div key={modelo.modeloId} style={{ border: '1px solid #e2e8f0', borderRadius: '9px', padding: '13px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 750 }}>{modelo.titulo}</div>
                        {modelo.descricao ? <div style={{ marginTop: '5px', color: '#64748b', fontSize: '13px' }} dangerouslySetInnerHTML={{ __html: modelo.descricao }} /> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSubcompetenciaSelecionada(eixoAtual);
                          setAcaoPreview({
                            origem: "modelo",
                            foco: eixoAtual,
                            titulo: modelo.titulo || "",
                            descricao: modelo.descricao || "",
                            macroId: '',
                          });
                          setErrors({});
                        }}
                        style={{ flexShrink: 0, border: '1px solid #5E2B8A', borderRadius: '7px', padding: '8px 11px', background: '#5E2B8A', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Usar como modelo
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ border: '1px dashed #cbd5e1', borderRadius: '9px', padding: '14px', color: '#64748b', fontSize: '13px' }}>
                  Ainda não há ações registradas para este eixo. Use a busca na biblioteca, crie uma nova ação ou peça uma sugestão à IA.
                </div>
              )}

              {renderBuscaGeral()}

              <div style={{ marginTop: '14px', display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={!eixoAtual}
                  onClick={() => {
                    setSubcompetenciaSelecionada(eixoAtual);
                    setCriandoAcaoTecnica(true);
                    setAcaoPreview(null);
                    setFormData(prev => ({ ...prev, microcompetencia: eixoAtual, titulo: '', descricao: '' }));
                    setErrors({});
                  }}
                  style={{ border: 'none', borderRadius: '7px', padding: '10px 14px', background: '#5E2B8A', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Criar nova ação para este eixo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubcompetenciaSelecionada(eixoAtual);
                    handleSugerirComIA();
                  }}
                  disabled={isSuggesting}
                  style={{ border: 'none', borderRadius: '7px', padding: '10px 14px', background: !isSuggesting ? '#0284c7' : '#94a3b8', color: '#fff', fontWeight: 700, cursor: !isSuggesting ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                >
                  <Sparkles size={16} />
                  {isSuggesting ? 'Gerando sugestão...' : 'Sugerir ação para este eixo com IA'}
                </button>
              </div>

              {criandoAcaoTecnica && (
                <div style={{ marginTop: '16px', border: '1px solid #c4b5fd', borderRadius: '10px', padding: '16px', background: '#faf8ff' }}>
                  <div style={{ fontSize: '12px', fontWeight: 750, color: '#5E2B8A', textTransform: 'uppercase' }}>Nova ação técnica</div>
                  <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '5px' }}>Título da ação</label>
                      <input
                        name="titulo"
                        value={formData.titulo}
                        onChange={handleChange}
                        placeholder="Ex.: Curso, projeto, prática, mentoria ou outra ação de desenvolvimento"
                        style={{ width: '100%', padding: '10px 12px', border: errors.titulo ? '2px solid #dc2626' : '1px solid #cbd5e1', borderRadius: '7px' }}
                      />
                      {errors.titulo && <div style={{ color: '#b91c1c', marginTop: '5px', fontSize: '12px' }}>{errors.titulo}</div>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '5px' }}>Descrição da ação</label>
                      <RichTextEditor
                        value={formData.descricao}
                        onChange={(value) => setFormData(prev => ({ ...prev, descricao: value }))}
                        placeholder="Descreva o que deverá ser realizado e a evidência esperada."
                        minHeight="110px"
                      />
                    </div>
                    <div style={{ maxWidth: '280px' }}>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '5px' }}>Prazo</label>
                      <input
                        name="prazo"
                        type="date"
                        value={formData.prazo}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px 12px', border: errors.prazo ? '2px solid #dc2626' : '1px solid #cbd5e1', borderRadius: '7px' }}
                      />
                      {errors.prazo && <div style={{ color: '#b91c1c', marginTop: '5px', fontSize: '12px' }}>{errors.prazo}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        disabled={createMutation.isPending}
                        style={{ border: 'none', borderRadius: '7px', padding: '10px 14px', background: '#166534', color: '#fff', fontWeight: 700, cursor: createMutation.isPending ? 'not-allowed' : 'pointer' }}
                      >
                        {createMutation.isPending ? 'Incluindo...' : 'Criar e incluir no PDI'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCriandoAcaoTecnica(false)}
                        style={{ border: '1px solid #cbd5e1', borderRadius: '7px', padding: '10px 14px', background: '#fff', fontWeight: 650, cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {acaoPreview && acaoPreview.foco === eixoAtual && (
                <div style={{ marginTop: '14px', border: '2px solid #93c5fd', borderRadius: '10px', padding: '16px', background: '#f8fbff' }}>
                  <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Prévia da ação</div>
                  <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 750, color: '#0f172a' }}>{acaoPreview.titulo}</div>
                  <div style={{ marginTop: '10px', color: '#475569', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: acaoPreview.descricao || '<p>Sem descrição.</p>' }} />
                  <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) 1fr', gap: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '5px' }}>Prazo para incluir no PDI</label>
                      <input name="prazo" type="date" value={formData.prazo} onChange={handleChange} style={{ width: '100%', padding: '10px', border: errors.prazo ? '2px solid #dc2626' : '1px solid #cbd5e1', borderRadius: '7px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={aprovarPreview} style={{ border: 'none', borderRadius: '7px', padding: '10px 14px', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Aprovar esta ação</button>
                      <button type="submit" onClick={aprovarPreview} disabled={!formData.prazo || createMutation.isPending} style={{ border: 'none', borderRadius: '7px', padding: '10px 14px', background: formData.prazo ? '#166534' : '#94a3b8', color: '#fff', fontWeight: 700, cursor: formData.prazo ? 'pointer' : 'not-allowed' }}>
                        {createMutation.isPending ? 'Incluindo...' : 'Aprovar e incluir no PDI'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {fluxoComportamental && selectedMacroReference && (
            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 750, color: '#2563eb', textTransform: 'uppercase' }}>Etapa 3</div>
              <h2 style={{ margin: '4px 0 6px', fontSize: '20px' }}>Quais Competências do B.E.M. serão desenvolvidas?</h2>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '14px' }}>
                A competência comportamental selecionada na Evolução abriu automaticamente sua trilha B.E.M. Escolha a competência do B.E.M. que será foco da ação.
              </p>

              {([
                ['basicas', 'Básicas', selectedMacroReference.basicas],
                ['essenciais', 'Essenciais', selectedMacroReference.essenciais],
                ['master', 'Master', mastersDaCompetencia],
                ['jornada', 'Jornada do Futuro', jornadaDaCompetencia],
              ] as const).filter(([, , itens]) => itens.length > 0).map(([chave, titulo, itens]) => (
                <div key={chave} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setGrupoAberto(grupoAberto === chave ? null : chave)}
                    style={{
                      width: '100%', padding: '13px 15px', border: 'none', background: '#f8fafc',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', fontWeight: 750, fontSize: '15px',
                    }}
                  >
                    <span>{titulo} <span style={{ color: '#94a3b8', fontWeight: 600 }}>({itens.length})</span></span>
                    <ChevronDown size={18} style={{ transform: grupoAberto === chave ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </button>

                  {grupoAberto === chave && (
                    <div style={{ padding: '10px 14px 14px' }}>
                      {itens.map((item: any) => (
                        <div key={item.nome} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontWeight: 750, color: '#0f172a' }}>{item.nome}</div>
                          <div style={{ marginTop: '4px', fontSize: '13px', lineHeight: 1.5, color: '#64748b' }}>{item.justificativa}</div>
                          {renderModelosDoFoco(item.nome)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {renderBuscaGeral()}
              {acoesDisponiveisDaMacro.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setMostrarTodosModelosMacro(!mostrarTodosModelosMacro)}
                    style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 650, cursor: 'pointer', padding: 0 }}
                  >
                    {mostrarTodosModelosMacro ? 'Ocultar outros modelos da macro' : `Ver também os ${acoesDisponiveisDaMacro.length} modelos gerais desta macro`}
                  </button>
                  {mostrarTodosModelosMacro && (
                    <div style={{ marginTop: '10px', display: 'grid', gap: '8px' }}>
                      {acoesDisponiveisDaMacro.slice(0, 8).map((modelo: any) => (
                        <div key={modelo.modeloId} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '13px' }}>
                          <strong>{modelo.titulo}</strong>
                          {modelo.microcompetencia ? <span style={{ color: '#64748b' }}> — {modelo.microcompetencia}</span> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

        </form>
      </div>
    </div>
  );
}
