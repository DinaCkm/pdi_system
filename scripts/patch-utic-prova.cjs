const fs = require('fs');

function patchFile(path, transforms) {
  let text = fs.readFileSync(path, 'utf8');
  for (const t of transforms) {
    if (t.replaceAll) {
      if (text.includes(t.after)) continue;
      if (!text.includes(t.before)) throw new Error(`[UTIC patch] Trecho nao encontrado em ${path}: ${t.label}`);
      text = text.split(t.before).join(t.after);
      continue;
    }
    if (text.includes(t.after)) continue;
    if (!text.includes(t.before)) throw new Error(`[UTIC patch] Trecho nao encontrado em ${path}: ${t.label}`);
    text = text.replace(t.before, t.after);
  }
  fs.writeFileSync(path, text);
}

patchFile('client/src/pages/ProvaSeguraUtic.tsx', [
  {
    label: 'duracao por questao',
    before: 'const DURACAO_QUESTAO_SEGUNDOS = 2 * 60;',
    after: 'const DURACAO_QUESTAO_SEGUNDOS = 90;',
  },
  {
    label: 'alerta de inatividade',
    before: 'const INATIVIDADE_ALERTA_MS = 150 * 1000;',
    after: 'const INATIVIDADE_ALERTA_MS = 3 * 60 * 1000;',
  },
  {
    label: 'bloqueio de inatividade',
    before: 'const INATIVIDADE_BLOQUEIO_MS = 180 * 1000;',
    after: 'const INATIVIDADE_BLOQUEIO_MS = 5 * 60 * 1000;',
  },
  {
    label: 'retry salvamento',
    before: 'const salvarRespostaMutation = trpc.provaUtic.salvarResposta.useMutation();',
    after: 'const salvarRespostaMutation = trpc.provaUtic.salvarResposta.useMutation({ retry: 2, retryDelay: 500 });',
  },
  {
    label: 'ref posicao ponteiro',
    before: '  const ultimoPingRef = useRef(0);\n  const ultimaProtecaoRef = useRef(0);',
    after: '  const ultimoPingRef = useRef(0);\n  const ultimaPosicaoPonteiroRef = useRef<{ x: number; y: number } | null>(null);\n  const ultimaProtecaoRef = useRef(0);',
  },
  {
    label: 'motivo inatividade tipo',
    before: 'const bloquearSessao = async (motivo: "INATIVIDADE_3_MIN" | "FECHAMENTO" | "INTERRUPCAO_TECNICA" | "SEGURANCA") => {',
    after: 'const bloquearSessao = async (motivo: "INATIVIDADE_5_MIN" | "INATIVIDADE_90_SEG" | "INATIVIDADE_3_MIN" | "FECHAMENTO" | "INTERRUPCAO_TECNICA" | "SEGURANCA") => {',
  },
  {
    label: 'detector local de inatividade',
    before: `    const atividade = () => {\n      ultimaAtividadeLocalRef.current = Date.now();\n      setAvisoInatividade(false);\n      const agora = Date.now();\n      if (agora - ultimoPingRef.current >= 20_000) {\n        ultimoPingRef.current = agora;\n        atividadeMutation.mutate({ tentativaId });\n      }\n    };\n    const eventosAtividade = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;\n    eventosAtividade.forEach((nome) => window.addEventListener(nome, atividade, { passive: true }));`,
    after: `    const atividade = () => {\n      ultimaAtividadeLocalRef.current = Date.now();\n      setAvisoInatividade(false);\n      const agora = Date.now();\n      if (agora - ultimoPingRef.current >= 20_000) {\n        ultimoPingRef.current = agora;\n        atividadeMutation.mutate({ tentativaId });\n      }\n    };\n    const atividadePonteiro = (event: PointerEvent) => {\n      const anterior = ultimaPosicaoPonteiroRef.current;\n      const atual = { x: event.clientX, y: event.clientY };\n      if (!anterior || Math.hypot(atual.x - anterior.x, atual.y - anterior.y) >= 12) {\n        ultimaPosicaoPonteiroRef.current = atual;\n        atividade();\n      }\n    };\n    const eventosAtividade = ["mousedown", "keydown", "touchstart", "scroll"] as const;\n    eventosAtividade.forEach((nome) => window.addEventListener(nome, atividade, { passive: true }));\n    window.addEventListener("pointermove", atividadePonteiro, { passive: true });`,
  },
  {
    label: 'bloqueio local 5 minutos',
    before: 'window.setTimeout(() => void bloquearSessao("INATIVIDADE_3_MIN"), 800);',
    after: 'window.setTimeout(() => void bloquearSessao("INATIVIDADE_5_MIN"), 800);',
  },
  {
    label: 'cleanup ponteiro',
    before: '      eventosAtividade.forEach((nome) => window.removeEventListener(nome, atividade));\n      window.clearInterval(verificar);',
    after: '      eventosAtividade.forEach((nome) => window.removeEventListener(nome, atividade));\n      window.removeEventListener("pointermove", atividadePonteiro);\n      window.clearInterval(verificar);',
  },
  {
    label: 'mensagem tempo questao auditoria',
    before: 'Tempo de 2 minutos encerrado para a questão de banco ${questaoAtual.id}.',
    after: 'Tempo de 1 minuto e 30 segundos encerrado para a questão de banco ${questaoAtual.id}.',
  },
  {
    label: 'estado da alternativa selecionada',
    before: '  const [respostas, setRespostas] = useState<Record<number, string>>({});\n  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);',
    after: '  const [respostas, setRespostas] = useState<Record<number, string>>({});\n  const [respostaSelecionada, setRespostaSelecionada] = useState<string | null>(null);\n  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);',
  },
  {
    label: 'sincronizar selecao ao trocar questao',
    before: '  useEffect(() => { respostasRef.current = respostas; }, [respostas]);\n  useEffect(() => { if (!loading && !user) window.location.href = "/login"; }, [loading, user]);',
    after: '  useEffect(() => { respostasRef.current = respostas; }, [respostas]);\n  useEffect(() => { setRespostaSelecionada(questaoAtualId ? (respostasRef.current[questaoAtualId] ?? null) : null); }, [questaoAtualId]);\n  useEffect(() => { if (!loading && !user) window.location.href = "/login"; }, [loading, user]);',
  },
  {
    label: 'confirmar salvamento antes de avancar',
    before: `  const responder = (questaoId: number, opcaoId: string) => {\n    if (!tentativaId) return;\n    const proximo = { ...respostasRef.current, [questaoId]: opcaoId };\n    respostasRef.current = proximo;\n    setRespostas(proximo);\n    salvarRespostaMutation.mutate(\n      { tentativaId, questaoId, resposta: opcaoId },\n      { onError: (error) => setAviso(\`Não foi possível salvar a resposta no servidor: \${error.message}\`) }\n    );\n  };`,
    after: `  const responder = (_questaoId: number, opcaoId: string) => {\n    if (salvarRespostaMutation.isPending) return;\n    setRespostaSelecionada(opcaoId);\n    setAviso(null);\n  };\n\n  const salvarEAvancar = async () => {\n    if (!tentativaId || !questaoAtual || !respostaSelecionada || salvarRespostaMutation.isPending) return;\n    setAviso("Salvando resposta...");\n    try {\n      const resultado = await salvarRespostaMutation.mutateAsync({\n        tentativaId,\n        questaoId: questaoAtual.id,\n        resposta: respostaSelecionada,\n      });\n      if (!resultado.salvo) throw new Error("O servidor não confirmou o salvamento.");\n      const confirmadas = { ...respostasRef.current, [questaoAtual.id]: respostaSelecionada };\n      respostasRef.current = confirmadas;\n      setRespostas(confirmadas);\n      setRespostaSelecionada(null);\n      setAviso(null);\n      avancarQuestao(false);\n    } catch (error: any) {\n      setAviso(\`Sua resposta não foi gravada. Tente novamente antes de continuar. Detalhe: \${error?.message ?? "falha de comunicação com o servidor"}\`);\n    }\n  };`,
  },
  {
    label: 'recarregar pendentes do servidor antes de finalizar',
    before: `  const finalizar = async (motivo: "MANUAL" | "TEMPO" | "CONCLUIDA") => {\n    if (faseRef.current !== "em_prova" || !tentativaIdRef.current) return;\n    try {\n      await finalizarMutation.mutateAsync({ tentativaId: tentativaIdRef.current, motivo });`,
    after: `  const finalizar = async (motivo: "MANUAL" | "TEMPO" | "CONCLUIDA") => {\n    if (faseRef.current !== "em_prova" || !tentativaIdRef.current) return;\n    try {\n      if (motivo === "CONCLUIDA") {\n        const consulta = await estadoQuery.refetch();\n        const confirmadasServidor: Record<number, string> = {};\n        for (const item of consulta.data?.respostas ?? []) confirmadasServidor[Number(item.questaoId)] = String(item.resposta);\n        respostasRef.current = confirmadasServidor;\n        setRespostas(confirmadasServidor);\n        const pendentesServidor = ordemQuestoes.filter((id) => !confirmadasServidor[id]);\n        if (pendentesServidor.length > 0) {\n          const novaPassagem = passagem + 1;\n          setFila(pendentesServidor);\n          setIndiceAtual(0);\n          setPassagem(novaPassagem);\n          setTempoQuestaoRestante(DURACAO_QUESTAO_SEGUNDOS);\n          setRespostaSelecionada(null);\n          persistirNavegacao({ fila: pendentesServidor, indiceAtual: 0, passagem: novaPassagem });\n          setAviso(\`A avaliação não foi finalizada. O servidor identificou \${pendentesServidor.length} questão(ões) pendente(s), que serão reapresentadas agora.\`);\n          return;\n        }\n      }\n      await finalizarMutation.mutateAsync({ tentativaId: tentativaIdRef.current, motivo });`,
  },
  {
    label: 'reembaralhar questoes pendentes',
    before: '    const pendentes = ordemQuestoes.filter((id) => !respostasRef.current[id]);',
    after: '    const pendentes = embaralhar(ordemQuestoes.filter((id) => !respostasRef.current[id]));',
  },
  {
    label: 'radio usa selecao ainda nao confirmada',
    before: '                    checked={respostas[questaoAtual.id] === opcao.id}\n                    onChange={() => responder(questaoAtual.id, opcao.id)}',
    after: '                    checked={respostaSelecionada === opcao.id}\n                    disabled={salvarRespostaMutation.isPending}\n                    onChange={() => responder(questaoAtual.id, opcao.id)}',
  },
  {
    label: 'botao salva aguarda e avanca',
    before: '<Button disabled={!respostas[questaoAtual.id] || salvarRespostaMutation.isPending} onClick={() => avancarQuestao(false)}>\n                  Salvar e avançar\n                </Button>',
    after: '<Button disabled={!respostaSelecionada || salvarRespostaMutation.isPending} onClick={() => void salvarEAvancar()}>\n                  {salvarRespostaMutation.isPending ? "Salvando resposta..." : "Salvar e avançar"}\n                </Button>',
  },
  {
    label: 'texto salvamento confirmado',
    before: 'A resposta é salva no servidor no momento da marcação.',
    after: 'A resposta somente conta após a confirmação do servidor.',
  },
  {
    label: 'encerramento ao receber status concluido',
    before: `  const pararMonitoramento = () => {\n    streamTelaRef.current?.getTracks().forEach((track) => track.stop());\n    streamCameraMicRef.current?.getTracks().forEach((track) => track.stop());\n    streamTelaRef.current = null;\n    streamCameraMicRef.current = null;\n    setMonitoramentoTelaAtivo(false);\n    setCameraMicAtivos(false);\n  };`,
    after: `  const pararMonitoramento = () => {\n    streamTelaRef.current?.getTracks().forEach((track) => track.stop());\n    streamCameraMicRef.current?.getTracks().forEach((track) => track.stop());\n    streamTelaRef.current = null;\n    streamCameraMicRef.current = null;\n    setMonitoramentoTelaAtivo(false);\n    setCameraMicAtivos(false);\n  };\n\n  useEffect(() => {\n    const status = (estadoQuery.data?.tentativa as any)?.status as string | undefined;\n    if (faseRef.current !== "em_prova" || !["FINALIZADA", "CONCLUIDA", "FINALIZADA_TEMPO"].includes(status ?? "")) return;\n    sessaoIniciadaNestaPaginaRef.current = false;\n    faseRef.current = "finalizada";\n    setFase("finalizada");\n    pararMonitoramento();\n    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);\n  }, [(estadoQuery.data?.tentativa as any)?.status]);`,
  },
  {
    label: 'texto topo tempo',
    before: '60 questões oficiais · 2 minutos por questão · até 3 horas.',
    after: '60 questões oficiais · 1 minuto e 30 segundos por questão · até 3 horas.',
  },
  {
    label: 'texto alerta inatividade',
    before: 'Movimente o mouse ou pressione uma tecla. Ao completar 3 minutos sem atividade, a prova será bloqueada.',
    after: 'Movimente o mouse, role a tela ou pressione uma tecla. Ao completar 5 minutos sem atividade, a prova será bloqueada.',
  },
  {
    label: 'texto regra tempo',
    before: '<p><strong>4. Tempo:</strong> cada questão terá até 2 minutos e o tempo total máximo será de 3 horas. Questões sem resposta voltarão em nova passagem dentro do tempo restante.</p>',
    after: '<p><strong>4. Tempo:</strong> cada questão terá até 1 minuto e 30 segundos e o tempo total máximo será de 3 horas. Questões sem resposta voltarão em nova passagem dentro do tempo restante.</p>',
  },
  {
    label: 'texto regra inatividade',
    before: '<p><strong>5. Inatividade:</strong> após 2 minutos e 30 segundos sem atividade será exibido um aviso. Ao completar 3 minutos, a avaliação será bloqueada.</p>',
    after: '<p><strong>5. Inatividade:</strong> após 3 minutos sem interação será exibido um aviso. Ao completar 5 minutos sem atividade, a avaliação será bloqueada.</p>',
  },
  {
    label: "estado ausencia tela cheia",
    before: "  const [avisoInatividade, setAvisoInatividade] = useState(false);",
    after: "  const [avisoInatividade, setAvisoInatividade] = useState(false);\n  const [telaCheiaAusente, setTelaCheiaAusente] = useState(false);",
  },
  {
    label: "detectar saida e retorno tela cheia",
    before: "    const onFullscreen = () => { if (!document.fullscreenElement) registrarViolacao(\"saida_tela_cheia\"); };",
    after: "    const onFullscreen = () => {\n      if (document.fullscreenElement) {\n        setTelaCheiaAusente(false);\n        return;\n      }\n      if (faseRef.current === \"em_prova\") {\n        setTelaCheiaAusente(true);\n        registrarViolacao(\"saida_tela_cheia\");\n      }\n    };",
  },
  {
    label: "acao retorno tela cheia",
    before: "  useEffect(() => {\n    const onVisibility = () => { if (document.hidden) registrarViolacao(\"troca_aba\"); };",
    after: "  const retornarTelaCheia = async () => {\n    try {\n      await document.documentElement.requestFullscreen();\n      if (!document.fullscreenElement) throw new Error(\"O navegador não confirmou o modo tela cheia.\");\n      setTelaCheiaAusente(false);\n      setAviso(\"Modo tela cheia restaurado. Você pode continuar a avaliação.\");\n    } catch (error: any) {\n      setAviso(error?.message ?? \"Não foi possível retornar ao modo tela cheia. Use o botão novamente.\");\n    }\n  };\n\n  useEffect(() => {\n    const onVisibility = () => { if (document.hidden) registrarViolacao(\"troca_aba\"); };",
  },
  {
    label: "contador identifica ocorrencias seguranca",
    before: "<Badge variant={violacoes ? \"destructive\" : \"secondary\"}>Ocorrências {violacoes}/{LIMITE_VIOLACOES}</Badge>",
    after: "<Badge variant={violacoes ? \"destructive\" : \"secondary\"}>Ocorrências de segurança {violacoes}/{LIMITE_VIOLACOES}</Badge>",
  },
  {
    label: "aviso clique protegido sem falsa ocorrencia",
    before: "setAviso(\"Ação não permitida. Esta avaliação possui conteúdo protegido. A ocorrência foi registrada.\");",
    after: "setAviso(\"Ação não permitida. O conteúdo da avaliação é protegido; a ação foi impedida.\");",
  },
  {
    label: "rotulo aviso coerente",
    before: "{aviso && <div className=\"rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900\"><strong>Ocorrência:</strong> {aviso}</div>}",
    after: "{aviso && <div className=\"rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900\"><strong>Aviso:</strong> {aviso}</div>}",
  },
  {
    label: "bloqueio visual ate retorno tela cheia",
    before: "        <main className=\"mx-auto max-w-4xl p-5 pb-32 space-y-4\">",
    after: "        {telaCheiaAusente && fase === \"em_prova\" && (\n          <div className=\"fixed inset-0 z-[100] grid place-items-center bg-slate-950/95 p-6\">\n            <Card className=\"w-full max-w-xl border-red-400 shadow-2xl\">\n              <CardHeader>\n                <div className=\"flex items-start gap-3\">\n                  <AlertTriangle className=\"h-9 w-9 shrink-0 text-red-600\" />\n                  <div>\n                    <CardTitle>Modo tela cheia interrompido</CardTitle>\n                    <CardDescription className=\"mt-2 text-base\">A ocorrência {violacoes} de {LIMITE_VIOLACOES} foi registrada. A questão ficará protegida até você retornar ao modo tela cheia.</CardDescription>\n                  </div>\n                </div>\n              </CardHeader>\n              <CardContent className=\"space-y-4\">\n                <p className=\"text-sm text-slate-700\">O tempo total da avaliação continua correndo. Clique no botão abaixo para retomar com segurança.</p>\n                <Button className=\"w-full\" size=\"lg\" onClick={() => void retornarTelaCheia()}>\n                  <MonitorUp className=\"mr-2 h-5 w-5\" />Voltar para tela cheia\n                </Button>\n              </CardContent>\n            </Card>\n          </div>\n        )}\n\n        <main className=\"mx-auto max-w-4xl p-5 pb-32 space-y-4\">",
  },
  {
    label: "tipos contabilizados como violacao",
    before: "  const registrarViolacao = (tipo: \"troca_aba\" | \"saida_tela_cheia\" | \"interrupcao_compartilhamento\") => {",
    after: "  const registrarViolacao = (tipo: \"troca_aba\" | \"saida_tela_cheia\" | \"interrupcao_compartilhamento\" | \"tentativa_conteudo_protegido\" | \"tentativa_print_screen\") => {",
  },
  {
    label: "detalhes de todas as ocorrencias",
    before: "      const detalhe = tipo === \"troca_aba\"\n        ? \"A página da prova perdeu visibilidade.\"\n        : tipo === \"saida_tela_cheia\"\n          ? \"O modo tela cheia foi encerrado.\"\n          : \"O compartilhamento da tela foi interrompido.\";",
    after: "      const detalhe = tipo === \"troca_aba\"\n        ? \"A página da prova perdeu visibilidade.\"\n        : tipo === \"saida_tela_cheia\"\n          ? \"O modo tela cheia foi encerrado.\"\n          : tipo === \"interrupcao_compartilhamento\"\n            ? \"O compartilhamento da tela foi interrompido.\"\n            : tipo === \"tentativa_print_screen\"\n              ? \"Tentativa de captura de tela detectada pelo navegador.\"\n              : \"Tentativa de selecionar, copiar, colar, imprimir, salvar ou reproduzir conteúdo bloqueada.\";",
  },
  {
    label: "conteudo protegido incrementa contador",
    before: "      const detalhe = \"Tentativa de copiar, selecionar, colar, imprimir, salvar ou reproduzir conteúdo bloqueada.\";\n      registrarEvento(\"tentativa_conteudo_protegido\", detalhe);\n      setAviso(\"Ação não permitida. O conteúdo da avaliação é protegido; a ação foi impedida.\");",
    after: "      registrarViolacao(\"tentativa_conteudo_protegido\");",
  },
  {
    label: "print screen incrementa contador",
    before: "        registrarEvento(\"tentativa_print_screen\", \"Tecla Print Screen detectada pelo navegador.\");\n        setAviso(\"Tentativa de captura registrada. O sistema não permite reprodução do conteúdo da avaliação.\");",
    after: "        const agora = Date.now();\n        if (agora - ultimaProtecaoRef.current >= 1200) {\n          ultimaProtecaoRef.current = agora;\n          registrarViolacao(\"tentativa_print_screen\");\n        }",
  },
  {
    label: "contador geral de ocorrencias",
    before: "<Badge variant={violacoes ? \"destructive\" : \"secondary\"}>Ocorrências de segurança {violacoes}/{LIMITE_VIOLACOES}</Badge>",
    after: "<Badge variant={violacoes ? \"destructive\" : \"secondary\"}>Ocorrências {violacoes}/{LIMITE_VIOLACOES}</Badge>",
  },
  {
    label: "contador separado de ocorrencias criticas",
    before: "  const [violacoes, setViolacoes] = useState(0);",
    after: "  const [violacoes, setViolacoes] = useState(0);\n  const [violacoesCriticas, setViolacoesCriticas] = useState(0);",
  },
  {
    label: "acoes impedidas nao bloqueiam prova",
    before: "  const registrarViolacao = (tipo: \"troca_aba\" | \"saida_tela_cheia\" | \"interrupcao_compartilhamento\" | \"tentativa_conteudo_protegido\" | \"tentativa_print_screen\") => {\n    if (faseRef.current !== \"em_prova\") return;\n    setViolacoes((atual) => {\n      const novo = atual + 1;\n      const detalhe = tipo === \"troca_aba\"\n        ? \"A página da prova perdeu visibilidade.\"\n        : tipo === \"saida_tela_cheia\"\n          ? \"O modo tela cheia foi encerrado.\"\n          : tipo === \"interrupcao_compartilhamento\"\n            ? \"O compartilhamento da tela foi interrompido.\"\n            : tipo === \"tentativa_print_screen\"\n              ? \"Tentativa de captura de tela detectada pelo navegador.\"\n              : \"Tentativa de selecionar, copiar, colar, imprimir, salvar ou reproduzir conteúdo bloqueada.\";\n      setAviso(`${detalhe} Ocorrência ${novo} de ${LIMITE_VIOLACOES}.`);\n      registrarEvento(tipo, detalhe);\n      if (novo >= LIMITE_VIOLACOES) window.setTimeout(() => void bloquearSessao(\"SEGURANCA\"), 0);\n      return novo;\n    });\n  };",
    after: "  const registrarViolacao = (tipo: \"troca_aba\" | \"saida_tela_cheia\" | \"interrupcao_compartilhamento\" | \"tentativa_conteudo_protegido\" | \"tentativa_print_screen\") => {\n    if (faseRef.current !== \"em_prova\") return;\n    const critica = [\"troca_aba\", \"saida_tela_cheia\", \"interrupcao_compartilhamento\"].includes(tipo);\n    setViolacoes((atual) => {\n      const novo = atual + 1;\n      const detalhe = tipo === \"troca_aba\"\n        ? \"A página da prova perdeu visibilidade.\"\n        : tipo === \"saida_tela_cheia\"\n          ? \"O modo tela cheia foi encerrado.\"\n          : tipo === \"interrupcao_compartilhamento\"\n            ? \"O compartilhamento da tela foi interrompido.\"\n            : tipo === \"tentativa_print_screen\"\n              ? \"Tentativa de captura de tela detectada pelo navegador.\"\n              : \"Tentativa de selecionar, copiar, colar, imprimir, salvar ou reproduzir conteúdo bloqueada.\";\n      setAviso(`${detalhe} Ocorrência ${novo} registrada.`);\n      registrarEvento(tipo, detalhe);\n      return novo;\n    });\n    if (critica) {\n      setViolacoesCriticas((atual) => {\n        const novo = atual + 1;\n        if (novo >= LIMITE_VIOLACOES) window.setTimeout(() => void bloquearSessao(\"SEGURANCA\"), 0);\n        return novo;\n      });\n    }\n  };",
  },
  {
    label: "exibir total e limite critico",
    before: "<Badge variant={violacoes ? \"destructive\" : \"secondary\"}>Ocorrências {violacoes}/{LIMITE_VIOLACOES}</Badge>",
    after: "<Badge variant={violacoes ? \"destructive\" : \"secondary\"}>Ocorrências {violacoes}</Badge>\n              <Badge variant={violacoesCriticas ? \"destructive\" : \"secondary\"}>Críticas {violacoesCriticas}/{LIMITE_VIOLACOES}</Badge>",
  },
  {
    label: "mensagem retorno mostra contador critico",
    before: "<CardDescription className=\"mt-2 text-base\">A ocorrência {violacoes} de {LIMITE_VIOLACOES} foi registrada. A questão ficará protegida até você retornar ao modo tela cheia.</CardDescription>",
    after: "<CardDescription className=\"mt-2 text-base\">A ocorrência crítica {violacoesCriticas} de {LIMITE_VIOLACOES} foi registrada. A questão ficará protegida até você retornar ao modo tela cheia.</CardDescription>",
  },
  {
    label: "cronometro da questao no topo",
    before: "<div className=\"rounded-md bg-slate-950 px-4 py-2 font-mono text-white\">Total {formatarTempo(tempoTotalRestante)}</div>",
    after: "<div className=\"flex overflow-hidden rounded-md border border-slate-800 font-mono text-white shadow-sm\">\n                <div className=\"bg-slate-950 px-4 py-2\">\n                  <span className=\"mr-2 text-xs uppercase text-slate-300\">Total</span>{formatarTempo(tempoTotalRestante)}\n                </div>\n                <div className={tempoQuestaoRestante <= 10 ? \"bg-red-700 px-4 py-2\" : \"bg-blue-700 px-4 py-2\"}>\n                  <span className=\"mr-2 text-xs uppercase text-blue-100\">Questão</span>{formatarTempo(tempoQuestaoRestante)}\n                </div>\n              </div>",
  },
  {
    label: "remover cronometro duplicado abaixo das alternativas",
    before: "              <div className={`rounded-md border p-4 ${tempoQuestaoRestante <= 10 ? \"border-red-300 bg-red-50\" : \"bg-slate-50\"}`}>\n                <p className=\"text-xs uppercase text-muted-foreground\">Tempo desta questão</p>\n                <p className=\"font-mono text-3xl font-bold\">{formatarTempo(tempoQuestaoRestante)}</p>\n                <p className=\"text-xs text-muted-foreground\">Ao zerar, a próxima questão será apresentada. Se estiver sem resposta, esta questão voltará somente depois da passagem pelas demais.</p>\n              </div>\n\n",
    after: "",
  },
]);

patchFile('server/routers/provaUtic.ts', [
  {
    label: 'limite servidor inatividade',
    before: 'const LIMITE_INATIVIDADE_SEGUNDOS = 3 * 60;',
    after: 'const LIMITE_INATIVIDADE_SEGUNDOS = 5 * 60;',
  },
  {
    label: 'motivo servidor inatividade',
    before: "SET status = 'BLOQUEADA', blocked_at = NOW(), block_reason = 'INATIVIDADE_3_MIN'",
    after: "SET status = 'BLOQUEADA', blocked_at = NOW(), block_reason = 'INATIVIDADE_5_MIN'",
  },
  {
    label: 'evento servidor inatividade',
    before: 'Avaliação bloqueada após 3 minutos sem atividade.',
    after: 'Avaliação bloqueada após 5 minutos sem atividade.',
  },
  {
    label: 'enum bloqueio compatibilidade',
    before: 'z.enum(["INATIVIDADE_3_MIN", "FECHAMENTO", "INTERRUPCAO_TECNICA", "SEGURANCA"])',
    after: 'z.enum(["INATIVIDADE_5_MIN", "INATIVIDADE_90_SEG", "INATIVIDADE_3_MIN", "FECHAMENTO", "INTERRUPCAO_TECNICA", "SEGURANCA"])',
  },
  {
    label: 'validar inatividade diretamente no banco',
    before: "  const now = Date.now();\n  const expira = new Date(tentativa.expires_at).getTime();\n  const ultimaAtividade = new Date(tentativa.last_activity_at).getTime();\n\n  if (Number.isFinite(expira) && now >= expira) {\n    await db.execute(sql`\n      UPDATE prova_utic_tentativas\n         SET status = 'FINALIZADA_TEMPO', finished_at = NOW(), block_reason = 'TEMPO_TOTAL'\n       WHERE id = ${tentativa.id} AND status = 'EM_ANDAMENTO'\n    `);\n    await registrarEvento(tentativa.id, \"finalizada_tempo\", \"Tempo total de 3 horas encerrado.\");\n    return await obterUltimaTentativa(tentativa.colaborador_id);\n  }\n\n  if (Number.isFinite(ultimaAtividade) && now - ultimaAtividade >= LIMITE_INATIVIDADE_SEGUNDOS * 1000) {\n    await db.execute(sql`\n      UPDATE prova_utic_tentativas\n         SET status = 'BLOQUEADA', blocked_at = NOW(), block_reason = 'INATIVIDADE_5_MIN'\n       WHERE id = ${tentativa.id} AND status = 'EM_ANDAMENTO'\n    `);\n    await registrarEvento(tentativa.id, \"bloqueada_inatividade\", \"Avaliação bloqueada após 5 minutos sem atividade.\");\n    return await obterUltimaTentativa(tentativa.colaborador_id);\n  }",
    after: "  const expiracaoResult = await db.execute(sql`\n    UPDATE prova_utic_tentativas\n       SET status = 'FINALIZADA_TEMPO', finished_at = NOW(), block_reason = 'TEMPO_TOTAL'\n     WHERE id = ${tentativa.id}\n       AND status = 'EM_ANDAMENTO'\n       AND expires_at <= NOW()\n  `);\n  const expiracaoInfo: any = Array.isArray(expiracaoResult) ? expiracaoResult[0] : expiracaoResult;\n  if (Number(expiracaoInfo?.affectedRows ?? 0) > 0) {\n    await registrarEvento(tentativa.id, \"finalizada_tempo\", \"Tempo total de 3 horas encerrado.\");\n    return await obterUltimaTentativa(tentativa.colaborador_id);\n  }\n\n  const inatividadeResult = await db.execute(sql`\n    UPDATE prova_utic_tentativas\n       SET status = 'BLOQUEADA', blocked_at = NOW(), block_reason = 'INATIVIDADE_5_MIN'\n     WHERE id = ${tentativa.id}\n       AND status = 'EM_ANDAMENTO'\n       AND last_activity_at <= DATE_SUB(NOW(), INTERVAL ${LIMITE_INATIVIDADE_SEGUNDOS} SECOND)\n  `);\n  const inatividadeInfo: any = Array.isArray(inatividadeResult) ? inatividadeResult[0] : inatividadeResult;\n  if (Number(inatividadeInfo?.affectedRows ?? 0) > 0) {\n    await registrarEvento(tentativa.id, \"bloqueada_inatividade\", \"Avaliação bloqueada após 5 minutos sem atividade.\");\n    return await obterUltimaTentativa(tentativa.colaborador_id);\n  }",
  },
  {
    label: 'validar 60 respostas antes de concluir',
    before: `      if (!tentativa || tentativa.status !== "EM_ANDAMENTO") {\n        throw new TRPCError({ code: "FORBIDDEN", message: "Esta tentativa não pode ser finalizada pelo participante." });\n      }\n      const novoStatus = input.motivo === "CONCLUIDA" ? "CONCLUIDA" : input.motivo === "TEMPO" ? "FINALIZADA_TEMPO" : "FINALIZADA";`,
    after: `      if (!tentativa || tentativa.status !== "EM_ANDAMENTO") {\n        throw new TRPCError({ code: "FORBIDDEN", message: "Esta tentativa não pode ser finalizada pelo participante." });\n      }\n      if (input.motivo === "CONCLUIDA") {\n        const respostasResult = await db.execute(sql\`\n          SELECT COUNT(DISTINCT questao_id) AS total\n            FROM prova_utic_respostas\n           WHERE tentativa_id = \${input.tentativaId}\n        \`);\n        const totalRespondidas = Number(rowsOf<{ total: number | string }>(respostasResult)[0]?.total ?? 0);\n        if (totalRespondidas < 60) {\n          throw new TRPCError({\n            code: "CONFLICT",\n            message: \`Ainda existem \${60 - totalRespondidas} questão(ões) sem resposta confirmada no servidor. A avaliação continuará aberta para conclusão.\`,\n          });\n        }\n      }\n      const novoStatus = input.motivo === "CONCLUIDA" ? "CONCLUIDA" : input.motivo === "TEMPO" ? "FINALIZADA_TEMPO" : "FINALIZADA";`,
  },
]);

patchFile('client/src/components/ProvaUticRealtimeGuard.tsx', [
  {
    label: 'mensagem nova inatividade',
    before: 'INATIVIDADE_3_MIN: "A avaliação foi bloqueada após 3 minutos de inatividade.",',
    after: 'INATIVIDADE_5_MIN: "A avaliação foi bloqueada após 5 minutos de inatividade.",\n    INATIVIDADE_90_SEG: "A avaliação foi bloqueada após 1 minuto e 30 segundos de inatividade.",\n    INATIVIDADE_3_MIN: "A avaliação foi bloqueada após 3 minutos de inatividade.",',
  },
  {
    label: 'mutation finalizacao automatica',
    before: `  const estadoQuery = trpc.provaUtic.estado.useQuery(undefined, {\n    enabled: Boolean(user),\n    refetchInterval: 2000,\n    refetchOnWindowFocus: true,\n  });`,
    after: `  const estadoQuery = trpc.provaUtic.estado.useQuery(undefined, {\n    enabled: Boolean(user),\n    refetchInterval: 2000,\n    refetchOnWindowFocus: true,\n  });\n  const finalizarMutation = trpc.provaUtic.finalizar.useMutation();`,
  },
  {
    label: 'efeito auto conclusao 60',
    before: `  useEffect(() => {\n    if (!bloqueada || !bloqueioKey) return;`,
    after: `  const respostasSalvas = estadoQuery.data?.respostas?.length ?? 0;\n\n  useEffect(() => {\n    if (tentativa?.status !== "EM_ANDAMENTO" || !tentativa?.id || respostasSalvas < 60 || finalizarMutation.isPending) return;\n    finalizarMutation.mutate(\n      { tentativaId: Number(tentativa.id), motivo: "CONCLUIDA" },\n      { onSuccess: () => void estadoQuery.refetch() }\n    );\n  }, [tentativa?.id, tentativa?.status, respostasSalvas, finalizarMutation.isPending]);\n\n  useEffect(() => {\n    if (!bloqueada || !bloqueioKey) return;`,
  },
]);

patchFile('client/src/pages/AdminAvaliacoes.tsx', [
  {
    label: 'rotulo novo motivo inatividade',
    before: 'INATIVIDADE_3_MIN: "Inatividade de 3 minutos",',
    after: 'INATIVIDADE_5_MIN: "Inatividade de 5 minutos",\n    INATIVIDADE_90_SEG: "Inatividade de 1min30",\n    INATIVIDADE_3_MIN: "Inatividade de 3 minutos",',
  },
]);


patchFile("client/src/pages/ProvaSeguraUtic.tsx", [
  {
    label: "titulo superior",
    before: "Avaliação Técnica UTIC — Modo Prova Segura",
    after: "Avaliação de Proficiência para a Função — UTIC — Modo Seguro",
  },
  {
    label: "titulo inicial",
    before: "Modo Prova Segura — Avaliação Técnica UTIC",
    after: "Modo Seguro — Avaliação de Proficiência para a Função — UTIC",
  },
  {
    label: "ambiente inicial",
    before: "Ambiente de produção para validação controlada da prova completa da UTIC.",
    after: "Ambiente de produção para aplicação controlada da Avaliação de Proficiência para a Função da UTIC.",
  },
  {
    label: "pagina perdeu visibilidade",
    before: "A página da prova perdeu visibilidade.",
    after: "A página da Avaliação de Proficiência para a Função perdeu visibilidade.",
  },
  {
    label: "erro multiplas telas",
    before: "Para realizar a avaliação, mantenha somente uma tela ativa e tente novamente.",
    after: "Para realizar a Avaliação de Proficiência para a Função, mantenha somente uma tela ativa e tente novamente.",
  },
  {
    label: "erro compartilhamento",
    before: "compartilhamento de tela exigido pela avaliação.",
    after: "compartilhamento de tela exigido pela Avaliação de Proficiência para a Função.",
  },
  {
    label: "erro tela inteira",
    before: "Para realizar esta avaliação é obrigatório compartilhar TELA INTEIRA.",
    after: "Para realizar a Avaliação de Proficiência para a Função é obrigatório compartilhar TELA INTEIRA.",
  },
  {
    label: "erro modo seguro",
    before: "modo tela cheia é obrigatório para iniciar a avaliação.",
    after: "modo tela cheia é obrigatório para iniciar a Avaliação de Proficiência para a Função.",
  },
  {
    label: "erro ambiente seguro",
    before: "ambiente seguro da avaliação.",
    after: "ambiente seguro da Avaliação de Proficiência para a Função.",
  },
  {
    label: "titulo bloqueada",
    before: "Avaliação interrompida e bloqueada",
    after: "Avaliação de Proficiência para a Função interrompida e bloqueada",
  },
  {
    label: "retorno bloqueado",
    before: "Você não pode retornar à avaliação automaticamente.",
    after: "Você não pode retornar à Avaliação de Proficiência para a Função automaticamente.",
  },
  {
    label: "encerrada seguranca",
    before: "Avaliação encerrada por segurança",
    after: "Avaliação de Proficiência para a Função encerrada por segurança",
  },
  {
    label: "concluida",
    before: "AVALIAÇÃO CONCLUÍDA",
    after: "AVALIAÇÃO DE PROFICIÊNCIA PARA A FUNÇÃO CONCLUÍDA",
  },
  {
    label: "tempo encerrado",
    before: "O tempo total da avaliação foi encerrado.",
    after: "O tempo total da Avaliação de Proficiência para a Função foi encerrado.",
  },
  {
    label: "sucesso concluida",
    before: "Avaliação concluída com sucesso. Suas respostas foram registradas.",
    after: "Avaliação de Proficiência para a Função concluída com sucesso. Suas respostas foram registradas.",
  },
  {
    label: "encerramento automatico",
    before: "A avaliação será encerrada automaticamente quando o tempo total chegar a zero.",
    after: "A Avaliação de Proficiência para a Função será encerrada automaticamente quando o tempo total chegar a zero.",
  },
  {
    label: "inatividade bloqueio",
    before: "a prova será bloqueada.",
    after: "a Avaliação de Proficiência para a Função será bloqueada.",
  },
  {
    label: "botao finalizar",
    before: "FINALIZAR AVALIAÇÃO",
    after: "FINALIZAR AVALIAÇÃO DE PROFICIÊNCIA PARA A FUNÇÃO",
  },
  {
    label: "continuar",
    before: "Continuar avaliação",
    after: "Continuar Avaliação de Proficiência para a Função",
  },
  {
    label: "retomar",
    before: "RETOMAR AVALIAÇÃO LIBERADA",
    after: "RETOMAR AVALIAÇÃO DE PROFICIÊNCIA PARA A FUNÇÃO",
  },
  {
    label: "requisitos",
    before: "Requisitos da avaliação",
    after: "Requisitos da Avaliação de Proficiência para a Função",
  },
  {
    label: "botao iniciar",
    before: "Iniciar avaliação",
    after: "Iniciar Avaliação de Proficiência para a Função",
  },
  {
    label: "regras titulo",
    before: "antes de iniciar a avaliação",
    after: "antes de iniciar a Avaliação de Proficiência para a Função",
  },
  {
    label: "declaracao ambiente",
    before: "realizar a prova em ambiente monitorado.",
    after: "realizar a Avaliação de Proficiência para a Função em ambiente monitorado.",
  },
  {
    label: "equipamento",
    before: "durante toda a avaliação.",
    after: "durante toda a Avaliação de Proficiência para a Função.",
  },
  {
    label: "tela unica",
    before: "utilize somente a tela da prova.",
    after: "utilize somente a tela da Avaliação de Proficiência para a Função.",
  },
  {
    label: "regra finalizacao",
    before: "a avaliação pode ser finalizada voluntariamente",
    after: "a Avaliação de Proficiência para a Função pode ser finalizada voluntariamente",
  },
  {
    label: "aceite",
    before: "REALIZAÇÃO DA AVALIAÇÃO.",
    after: "REALIZAÇÃO DA AVALIAÇÃO DE PROFICIÊNCIA PARA A FUNÇÃO.",
  },
  {
    label: "monitor",
    before: "monitor desta avaliação ativo.",
    after: "monitor desta Avaliação de Proficiência para a Função ativo.",
  },
  {
    label: "tela necessaria",
    before: "tela necessária para a avaliação",
    after: "tela necessária para a Avaliação de Proficiência para a Função",
  },
]);

patchFile("client/src/components/ProvaUticRealtimeGuard.tsx", [
  {
    label: "admin bloqueio",
    before: "A avaliação foi bloqueada pelo administrador.",
    after: "A Avaliação de Proficiência para a Função foi bloqueada pelo administrador.",
  },
  {
    label: "inatividade cinco",
    before: "A avaliação foi bloqueada após 5 minutos de inatividade.",
    after: "A Avaliação de Proficiência para a Função foi bloqueada após 5 minutos de inatividade.",
  },
  {
    label: "inatividade noventa",
    before: "A avaliação foi bloqueada após 1 minuto e 30 segundos de inatividade.",
    after: "A Avaliação de Proficiência para a Função foi bloqueada após 1 minuto e 30 segundos de inatividade.",
  },
  {
    label: "inatividade tres",
    before: "A avaliação foi bloqueada após 3 minutos de inatividade.",
    after: "A Avaliação de Proficiência para a Função foi bloqueada após 3 minutos de inatividade.",
  },
  {
    label: "fechamento",
    before: "A avaliação foi bloqueada após fechamento ou interrupção da sessão.",
    after: "A Avaliação de Proficiência para a Função foi bloqueada após fechamento ou interrupção da sessão.",
  },
  {
    label: "interrupcao",
    before: "A avaliação foi bloqueada devido a uma interrupção técnica.",
    after: "A Avaliação de Proficiência para a Função foi bloqueada devido a uma interrupção técnica.",
  },
  {
    label: "seguranca",
    before: "A avaliação foi bloqueada devido a uma ocorrência de segurança.",
    after: "A Avaliação de Proficiência para a Função foi bloqueada devido a uma ocorrência de segurança.",
  },
  {
    label: "generica",
    before: "A avaliação está bloqueada.",
    after: "A Avaliação de Proficiência para a Função está bloqueada.",
  },
  {
    label: "status",
    before: "Verificando status da avaliação...",
    after: "Verificando status da Avaliação de Proficiência para a Função...",
  },
  {
    label: "titulo administrador",
    before: "AVALIAÇÃO BLOQUEADA PELO ADMINISTRADOR",
    after: "AVALIAÇÃO DE PROFICIÊNCIA PARA A FUNÇÃO BLOQUEADA PELO ADMINISTRADOR",
  },
  {
    label: "titulo bloqueada",
    before: ": \"AVALIAÇÃO BLOQUEADA\"}</CardTitle>",
    after: ": \"AVALIAÇÃO DE PROFICIÊNCIA PARA A FUNÇÃO BLOQUEADA\"}</CardTitle>",
  },
  {
    label: "nova avaliacao",
    before: "Não tente iniciar uma nova avaliação.",
    after: "Não tente iniciar uma nova Avaliação de Proficiência para a Função.",
  },
]);

patchFile("server/routers/provaUtic.ts", [
  {
    label: "declaracao servidor",
    before: "pessoa que realizará esta avaliação. Confirmo que esta fotografia foi capturada por mim imediatamente antes do início da prova",
    after: "pessoa que realizará esta Avaliação de Proficiência para a Função. Confirmo que esta fotografia foi capturada por mim imediatamente antes do início da Avaliação de Proficiência para a Função",
  },
  {
    label: "continuidade liberada",
    before: "Existe uma avaliação liberada para continuidade. Use Retomar avaliação.",
    after: "Existe uma Avaliação de Proficiência para a Função liberada para continuidade. Use Retomar.",
  },
  {
    label: "identidade previa",
    before: "Antes de iniciar a avaliação, tire sua fotografia pela câmera",
    after: "Antes de iniciar a Avaliação de Proficiência para a Função, tire sua fotografia pela câmera",
  },
  {
    label: "vincular identidade",
    before: "confirmação de identidade à avaliação.",
    after: "confirmação de identidade à Avaliação de Proficiência para a Função.",
  },
  {
    label: "indisponivel respostas",
    before: "Esta avaliação não está disponível para respostas.",
    after: "Esta Avaliação de Proficiência para a Função não está disponível para respostas.",
  },
  {
    label: "finalizacao evento",
    before: "Avaliação finalizada:",
    after: "Avaliação de Proficiência para a Função finalizada:",
  },
  {
    label: "continuidade nao liberada",
    before: "continuidade desta avaliação ainda não foi liberada",
    after: "continuidade desta Avaliação de Proficiência para a Função ainda não foi liberada",
  },
  {
    label: "tempo usuario",
    before: "tempo total desta avaliação já terminou.",
    after: "tempo total desta Avaliação de Proficiência para a Função já terminou.",
  },
  {
    label: "bloqueio admin requisito",
    before: "Somente uma avaliação em andamento ou liberada pode ser bloqueada",
    after: "Somente uma Avaliação de Proficiência para a Função em andamento ou liberada pode ser bloqueada",
  },
  {
    label: "bloqueada administrador",
    before: "Avaliação bloqueada pelo administrador",
    after: "Avaliação de Proficiência para a Função bloqueada pelo administrador",
  },
  {
    label: "tempo admin",
    before: "tempo total da avaliação já terminou",
    after: "tempo total da Avaliação de Proficiência para a Função já terminou",
  },
  {
    label: "tempo devolvido",
    before: "tempo restante da prova.",
    after: "tempo restante da Avaliação de Proficiência para a Função.",
  },
]);

console.log('[UTIC] Patch de temporizacao, inatividade, persistencia e conclusao aplicado.');
