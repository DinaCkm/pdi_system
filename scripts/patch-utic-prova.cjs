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
    after: 'const INATIVIDADE_ALERTA_MS = 60 * 1000;',
  },
  {
    label: 'bloqueio de inatividade',
    before: 'const INATIVIDADE_BLOQUEIO_MS = 180 * 1000;',
    after: 'const INATIVIDADE_BLOQUEIO_MS = 90 * 1000;',
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
    after: 'const bloquearSessao = async (motivo: "INATIVIDADE_90_SEG" | "INATIVIDADE_3_MIN" | "FECHAMENTO" | "INTERRUPCAO_TECNICA" | "SEGURANCA") => {',
  },
  {
    label: 'detector local de inatividade',
    before: `    const atividade = () => {\n      ultimaAtividadeLocalRef.current = Date.now();\n      setAvisoInatividade(false);\n      const agora = Date.now();\n      if (agora - ultimoPingRef.current >= 20_000) {\n        ultimoPingRef.current = agora;\n        atividadeMutation.mutate({ tentativaId });\n      }\n    };\n    const eventosAtividade = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;\n    eventosAtividade.forEach((nome) => window.addEventListener(nome, atividade, { passive: true }));`,
    after: `    const atividade = () => {\n      ultimaAtividadeLocalRef.current = Date.now();\n      setAvisoInatividade(false);\n      const agora = Date.now();\n      if (agora - ultimoPingRef.current >= 20_000) {\n        ultimoPingRef.current = agora;\n        atividadeMutation.mutate({ tentativaId });\n      }\n    };\n    const atividadePonteiro = (event: PointerEvent) => {\n      const anterior = ultimaPosicaoPonteiroRef.current;\n      const atual = { x: event.clientX, y: event.clientY };\n      if (!anterior || Math.hypot(atual.x - anterior.x, atual.y - anterior.y) >= 12) {\n        ultimaPosicaoPonteiroRef.current = atual;\n        atividade();\n      }\n    };\n    const eventosAtividade = ["mousedown", "keydown", "touchstart", "scroll"] as const;\n    eventosAtividade.forEach((nome) => window.addEventListener(nome, atividade, { passive: true }));\n    window.addEventListener("pointermove", atividadePonteiro, { passive: true });`,
  },
  {
    label: 'bloqueio local 90 segundos',
    before: 'window.setTimeout(() => void bloquearSessao("INATIVIDADE_3_MIN"), 800);',
    after: 'window.setTimeout(() => void bloquearSessao("INATIVIDADE_90_SEG"), 800);',
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
    label: 'reverter resposta nao salva',
    before: `    salvarRespostaMutation.mutate(\n      { tentativaId, questaoId, resposta: opcaoId },\n      { onError: (error) => setAviso(\`Não foi possível salvar a resposta no servidor: \${error.message}\`) }\n    );`,
    after: `    salvarRespostaMutation.mutate(\n      { tentativaId, questaoId, resposta: opcaoId },\n      {\n        onError: (error) => {\n          if (respostasRef.current[questaoId] === opcaoId) {\n            const corrigidas = { ...respostasRef.current };\n            delete corrigidas[questaoId];\n            respostasRef.current = corrigidas;\n            setRespostas(corrigidas);\n          }\n          setAviso(\`A resposta desta questão não foi confirmada no servidor. Selecione novamente antes de avançar. Detalhe: \${error.message}\`);\n        },\n      }\n    );`,
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
    after: 'Movimente o mouse, role a tela ou pressione uma tecla. Ao completar 1 minuto e 30 segundos sem atividade, a prova será bloqueada.',
  },
  {
    label: 'texto regra tempo',
    before: '<p><strong>4. Tempo:</strong> cada questão terá até 2 minutos e o tempo total máximo será de 3 horas. Questões sem resposta voltarão em nova passagem dentro do tempo restante.</p>',
    after: '<p><strong>4. Tempo:</strong> cada questão terá até 1 minuto e 30 segundos e o tempo total máximo será de 3 horas. Questões sem resposta voltarão em nova passagem dentro do tempo restante.</p>',
  },
  {
    label: 'texto regra inatividade',
    before: '<p><strong>5. Inatividade:</strong> após 2 minutos e 30 segundos sem atividade será exibido um aviso. Ao completar 3 minutos, a avaliação será bloqueada.</p>',
    after: '<p><strong>5. Inatividade:</strong> após 1 minuto sem interação será exibido um aviso. Ao completar 1 minuto e 30 segundos sem atividade, a avaliação será bloqueada.</p>',
  },
]);

patchFile('server/routers/provaUtic.ts', [
  {
    label: 'limite servidor inatividade',
    before: 'const LIMITE_INATIVIDADE_SEGUNDOS = 3 * 60;',
    after: 'const LIMITE_INATIVIDADE_SEGUNDOS = 90;',
  },
  {
    label: 'motivo servidor inatividade',
    before: "SET status = 'BLOQUEADA', blocked_at = NOW(), block_reason = 'INATIVIDADE_3_MIN'",
    after: "SET status = 'BLOQUEADA', blocked_at = NOW(), block_reason = 'INATIVIDADE_90_SEG'",
  },
  {
    label: 'evento servidor inatividade',
    before: 'Avaliação bloqueada após 3 minutos sem atividade.',
    after: 'Avaliação bloqueada após 1 minuto e 30 segundos sem atividade.',
  },
  {
    label: 'enum bloqueio compatibilidade',
    before: 'z.enum(["INATIVIDADE_3_MIN", "FECHAMENTO", "INTERRUPCAO_TECNICA", "SEGURANCA"])',
    after: 'z.enum(["INATIVIDADE_90_SEG", "INATIVIDADE_3_MIN", "FECHAMENTO", "INTERRUPCAO_TECNICA", "SEGURANCA"])',
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
    after: 'INATIVIDADE_90_SEG: "A avaliação foi bloqueada após 1 minuto e 30 segundos de inatividade.",\n    INATIVIDADE_3_MIN: "A avaliação foi bloqueada após 3 minutos de inatividade.",',
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
    after: 'INATIVIDADE_90_SEG: "Inatividade de 1min30",\n    INATIVIDADE_3_MIN: "Inatividade de 3 minutos",',
  },
]);

console.log('[UTIC] Patch de temporizacao, inatividade, persistencia e conclusao aplicado.');
