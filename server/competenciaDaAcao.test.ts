import { describe, it, expect, vi } from 'vitest';

vi.mock('./db', () => ({
  getDb: async () => ({
    execute: async () => [[{ colaboradorId: 5, eixo: 'Gestão de Pessoas' }]],
  }),
}));

import { focosPermitidosDaCompetenciaAD, separarFoco, competenciaDaAcao } from '../shared/focosCompetencias';
import { COMPETENCIAS_AD_HISTORICAS } from '../shared/competenciasAdRelacionamento';
import { validarLastro } from './services/acoesLastro';

describe('focos por competência da AD', () => {
  it('toda competência da AD tem focos de desenvolvimento', () => {
    for (const ad of COMPETENCIAS_AD_HISTORICAS) {
      expect(focosPermitidosDaCompetenciaAD(ad).length).toBeGreaterThan(0);
    }
  });

  it('inclui Básicas, Essenciais e Masters da referência e do EcoLíder', () => {
    const focos = focosPermitidosDaCompetenciaAD('Foco no Cliente');
    expect(focos).toContain('Atenção (Básica)');
    expect(focos).toContain('Comunicação Assertiva (Essencial)');
    expect(focos).toContain('Negociação (Master)');
  });

  it('junta os focos de todas as macros ligadas à competência', () => {
    // Inteligência Emocional e Autoconhecimento também pertence a Relacionamento Interpessoal
    expect(focosPermitidosDaCompetenciaAD('Relacionamento Interpessoal')).toContain('Resiliência (Essencial)');
  });

  it('separa nome e nível do foco gravado', () => {
    expect(separarFoco('Atenção e Memória (Básica)')).toEqual({ nome: 'Atenção e Memória', nivel: 'Básica' });
    expect(separarFoco('Mindset Visionário (Jornada do Futuro)')).toEqual({ nome: 'Mindset Visionário', nivel: 'Jornada do Futuro' });
    expect(separarFoco('')).toBeNull();
  });
});

describe('competência de origem da ação', () => {
  it('ação comportamental mostra o foco e o nível', () => {
    const info = competenciaDaAcao({ tipoCompetencia: 'COMPORTAMENTAL', eixoNome: 'Foco no Cliente', focoBem: 'Atenção (Básica)' });
    expect(info).toMatchObject({ competencia: 'Atenção', nivel: 'Básica', origem: 'Foco no Cliente', informada: true });
  });

  it('ação técnica mostra o eixo', () => {
    expect(competenciaDaAcao({ tipoCompetencia: 'TECNICA', eixoNome: 'Gestão de Pessoas' })).toMatchObject({ competencia: 'Gestão de Pessoas', informada: true });
  });

  it('ação antiga usa a macro gravada', () => {
    expect(competenciaDaAcao({ macroNome: 'COMPORTAMENTAL - Comunicação' })).toMatchObject({ competencia: 'Comunicação', informada: true });
  });

  it('ação sem competência fica marcada', () => {
    expect(competenciaDaAcao({})).toMatchObject({ chave: 'SEM', informada: false });
  });
});

describe('validarLastro', () => {
  it('exige foco na ação comportamental', async () => {
    expect(await validarLastro(1, 'COMPORTAMENTAL', 'Foco no Cliente', '')).toHaveProperty('erro');
  });
  it('recusa foco de outra competência', async () => {
    expect(await validarLastro(1, 'COMPORTAMENTAL', 'Foco no Cliente', 'Mindset Visionário (Jornada do Futuro)')).toHaveProperty('erro');
  });
  it('aceita foco da competência', async () => {
    expect(await validarLastro(1, 'COMPORTAMENTAL', 'Foco no Cliente', 'Atenção (Básica)')).toEqual({ eixo: 'Foco no Cliente', foco: 'Atenção (Básica)' });
  });
  it('recusa competência fora da AD', async () => {
    expect(await validarLastro(1, 'COMPORTAMENTAL', 'Inventada', 'Atenção (Básica)')).toHaveProperty('erro');
  });
  it('técnico: aceita eixo da matriz do empregado e recusa outro', async () => {
    expect(await validarLastro(1, 'TECNICA', 'Gestão de Pessoas')).toEqual({ eixo: 'Gestão de Pessoas', foco: null });
    expect(await validarLastro(1, 'TECNICA', 'Outro eixo')).toHaveProperty('erro');
  });
});
