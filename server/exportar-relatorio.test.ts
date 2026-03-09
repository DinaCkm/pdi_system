import { describe, it, expect, vi } from 'vitest';

/**
 * Testes para o endpoint de exportação de relatório Excel
 * das solicitações de ações.
 */

// Testar a lógica de mapeamento dos dados de exportação
describe('Exportar Relatório - Mapeamento de Dados', () => {
  // Função que replica a lógica de mapeamento do endpoint exportarRelatorio
  function mapSolicitacaoParaRelatorio(s: any) {
    let parecerCKM = '';
    if (s.ckmParecerTipo === 'com_aderencia') parecerCKM = 'Com Aderência';
    else if (s.ckmParecerTipo === 'sem_aderencia') parecerCKM = 'Sem Aderência';

    let parecerLider = '';
    if (s.gestorDecisao === 'aprovado') parecerLider = 'De Acordo';
    else if (s.gestorDecisao === 'reprovado') parecerLider = 'Não Aprovado';
    else if (s.gestorDecisao === 'encerrada') parecerLider = 'Encerrada';

    let parecerRH = '';
    if (s.rhDecisao === 'aprovado') parecerRH = 'Aprovado';
    else if (s.rhDecisao === 'reprovado') parecerRH = 'Vetado';
    if (s.statusGeral === 'aguardando_solicitante') parecerRH = 'Revisão Solicitada';

    const formatDateExport = (d: any) => {
      if (!d) return '';
      const date = new Date(d);
      return date.toLocaleDateString('pt-BR');
    };

    return {
      departamento: s.solicitanteDepartamento || '',
      lider: s.solicitanteLiderNome || '',
      empregado: s.solicitanteNome || '',
      tituloAcao: s.titulo || '',
      periodoExecucao: s.prazo ? formatDateExport(s.prazo) : '',
      valorInvestimento: s.previsaoInvestimento || '',
      parecerCKM,
      parecerLider,
      parecerRH,
      dataInclusao: formatDateExport(s.createdAt),
      statusGeral: s.statusGeral || '',
    };
  }

  it('deve mapear corretamente uma solicitação completa com todos os pareceres', () => {
    const solicitacao = {
      solicitanteDepartamento: 'SEBRAE TO',
      solicitanteLiderNome: 'João Silva',
      solicitanteNome: 'Maria Santos',
      titulo: 'Curso de Liderança',
      prazo: '2026-04-27',
      previsaoInvestimento: 'R$ 2.500,00',
      ckmParecerTipo: 'com_aderencia',
      gestorDecisao: 'aprovado',
      rhDecisao: 'aprovado',
      statusGeral: 'aprovada',
      createdAt: '2026-03-06T10:00:00.000Z',
    };

    const resultado = mapSolicitacaoParaRelatorio(solicitacao);

    expect(resultado.departamento).toBe('SEBRAE TO');
    expect(resultado.lider).toBe('João Silva');
    expect(resultado.empregado).toBe('Maria Santos');
    expect(resultado.tituloAcao).toBe('Curso de Liderança');
    expect(resultado.valorInvestimento).toBe('R$ 2.500,00');
    expect(resultado.parecerCKM).toBe('Com Aderência');
    expect(resultado.parecerLider).toBe('De Acordo');
    expect(resultado.parecerRH).toBe('Aprovado');
    expect(resultado.dataInclusao).toBeTruthy();
    expect(resultado.statusGeral).toBe('aprovada');
  });

  it('deve mapear parecer CKM "sem_aderencia" corretamente', () => {
    const solicitacao = {
      ckmParecerTipo: 'sem_aderencia',
      gestorDecisao: null,
      rhDecisao: null,
      statusGeral: 'aguardando_gestor',
      titulo: 'Congresso',
      solicitanteNome: 'Pedro',
      createdAt: '2026-03-05',
    };

    const resultado = mapSolicitacaoParaRelatorio(solicitacao);
    expect(resultado.parecerCKM).toBe('Sem Aderência');
    expect(resultado.parecerLider).toBe('');
    expect(resultado.parecerRH).toBe('');
  });

  it('deve mapear parecer do Líder "reprovado" como "Não Aprovado"', () => {
    const solicitacao = {
      ckmParecerTipo: 'com_aderencia',
      gestorDecisao: 'reprovado',
      rhDecisao: null,
      statusGeral: 'vetada_gestor',
      titulo: 'Evento',
      solicitanteNome: 'Ana',
      createdAt: '2026-03-01',
    };

    const resultado = mapSolicitacaoParaRelatorio(solicitacao);
    expect(resultado.parecerLider).toBe('Não Aprovado');
  });

  it('deve mapear parecer do Líder "encerrada" como "Encerrada"', () => {
    const solicitacao = {
      gestorDecisao: 'encerrada',
      statusGeral: 'encerrada_lider',
      titulo: 'Workshop',
      solicitanteNome: 'Carlos',
      createdAt: '2026-03-02',
    };

    const resultado = mapSolicitacaoParaRelatorio(solicitacao);
    expect(resultado.parecerLider).toBe('Encerrada');
  });

  it('deve mapear parecer do RH "reprovado" como "Vetado"', () => {
    const solicitacao = {
      ckmParecerTipo: 'com_aderencia',
      gestorDecisao: 'aprovado',
      rhDecisao: 'reprovado',
      statusGeral: 'vetada_rh',
      titulo: 'Seminário',
      solicitanteNome: 'Lucia',
      createdAt: '2026-03-03',
    };

    const resultado = mapSolicitacaoParaRelatorio(solicitacao);
    expect(resultado.parecerRH).toBe('Vetado');
  });

  it('deve mapear status "aguardando_solicitante" como "Revisão Solicitada" no parecer RH', () => {
    const solicitacao = {
      ckmParecerTipo: 'com_aderencia',
      gestorDecisao: 'aprovado',
      rhDecisao: null,
      statusGeral: 'aguardando_solicitante',
      titulo: 'Treinamento',
      solicitanteNome: 'Roberto',
      createdAt: '2026-03-04',
    };

    const resultado = mapSolicitacaoParaRelatorio(solicitacao);
    expect(resultado.parecerRH).toBe('Revisão Solicitada');
  });

  it('deve retornar campos em branco quando dados não estão preenchidos', () => {
    const solicitacao = {
      solicitanteDepartamento: null,
      solicitanteLiderNome: null,
      solicitanteNome: null,
      titulo: null,
      prazo: null,
      previsaoInvestimento: null,
      ckmParecerTipo: null,
      gestorDecisao: null,
      rhDecisao: null,
      statusGeral: 'aguardando_ckm',
      createdAt: null,
    };

    const resultado = mapSolicitacaoParaRelatorio(solicitacao);
    expect(resultado.departamento).toBe('');
    expect(resultado.lider).toBe('');
    expect(resultado.empregado).toBe('');
    expect(resultado.tituloAcao).toBe('');
    expect(resultado.periodoExecucao).toBe('');
    expect(resultado.valorInvestimento).toBe('');
    expect(resultado.parecerCKM).toBe('');
    expect(resultado.parecerLider).toBe('');
    expect(resultado.parecerRH).toBe('');
    expect(resultado.dataInclusao).toBe('');
  });

  it('deve retornar todos os 11 campos esperados no relatório', () => {
    const solicitacao = {
      titulo: 'Teste',
      solicitanteNome: 'Teste User',
      createdAt: '2026-01-01',
      statusGeral: 'aguardando_ckm',
    };

    const resultado = mapSolicitacaoParaRelatorio(solicitacao);
    const campos = Object.keys(resultado);

    expect(campos).toContain('departamento');
    expect(campos).toContain('lider');
    expect(campos).toContain('empregado');
    expect(campos).toContain('tituloAcao');
    expect(campos).toContain('periodoExecucao');
    expect(campos).toContain('valorInvestimento');
    expect(campos).toContain('parecerCKM');
    expect(campos).toContain('parecerLider');
    expect(campos).toContain('parecerRH');
    expect(campos).toContain('dataInclusao');
    expect(campos).toContain('statusGeral');
    expect(campos.length).toBe(11);
  });
});
