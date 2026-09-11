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

console.log('[UTIC] Patch de temporizacao, inatividade, persistencia e conclusao aplicado.');
