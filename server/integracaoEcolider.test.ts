import { describe, it, expect, vi } from 'vitest';

vi.mock('./db', () => ({ getDb: async () => null }));

import { assinarIntegracao, assinaturaIntegracaoValida } from './services/integracaoAssinatura';
import { catalogoComportamental, catalogoTecnicoDasLinhas } from './services/catalogoCompetencias';
import { codigoFocoComportamental, codigoEixoTecnico } from '../shared/codigosCompetencia';
import { criarHandlerCatalogo, CATALOGO_COMPETENCIAS_PATH } from './integracaoEcoliderRoutes';

const SECRET = 'segredo-teste';

function resposta() {
  const res: any = { statusCode: 200, body: undefined, setHeader: () => {} };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  return res;
}
function pedido(headers: Record<string, string>) {
  return { method: 'GET', originalUrl: CATALOGO_COMPETENCIAS_PATH, get: (n: string) => headers[n] } as any;
}
function assinado() {
  const ts = String(Math.floor(Date.now() / 1000));
  return pedido({ 'X-Integracao-Timestamp': ts, 'X-Integracao-Assinatura': assinarIntegracao(SECRET, ts, 'GET', CATALOGO_COMPETENCIAS_PATH) });
}

describe('assinatura da integração', () => {
  const base = { secret: SECRET, metodo: 'POST', caminho: '/x', agoraSegundos: 1000 };
  it('aceita a assinatura correta, incluindo o corpo', () => {
    const assinatura = assinarIntegracao(SECRET, '1000', 'POST', '/x', '{"a":1}');
    expect(assinaturaIntegracaoValida({ ...base, timestamp: '1000', assinatura, corpo: '{"a":1}' })).toBe(true);
    expect(assinaturaIntegracaoValida({ ...base, timestamp: '1000', assinatura, corpo: '{"a":2}' })).toBe(false);
  });
  it('recusa timestamp vencido e assinatura malformada', () => {
    expect(assinaturaIntegracaoValida({ ...base, timestamp: '600', assinatura: assinarIntegracao(SECRET, '600', 'POST', '/x') })).toBe(false);
    expect(assinaturaIntegracaoValida({ ...base, timestamp: '1000', assinatura: 'zz' })).toBe(false);
  });
});

describe('códigos estáveis', () => {
  it('gera o código do foco comportamental', () => {
    expect(codigoFocoComportamental('Foco no Cliente', 'Atenção (Básica)')).toBe('COMP:FOCO_NO_CLIENTE:BASICA:ATENCAO');
    expect(codigoFocoComportamental('Foco no Cliente', 'Atenção')).toBeNull();
  });
  it('gera o código do eixo técnico', () => {
    expect(codigoEixoTecnico('e03a')).toBe('TEC:E03A');
    expect(codigoEixoTecnico('')).toBeNull();
  });
});

describe('catálogo de competências', () => {
  it('comportamental: códigos únicos e todos com nível', () => {
    const itens = catalogoComportamental();
    expect(itens.length).toBeGreaterThan(0);
    expect(new Set(itens.map((i) => i.codigo)).size).toBe(itens.length);
    expect(itens.every((i) => i.nivel)).toBe(true);
  });
  it('técnico: agrupa por código e marca conflito de nomes', () => {
    const itens = catalogoTecnicoDasLinhas([
      { eixoId: 'E01', eixoNome: 'Gestão de Pessoas' },
      { eixoId: 'E01', eixoNome: 'Gestão de Pessoas' },
      { eixoId: 'E02', eixoNome: 'Finanças' },
      { eixoId: 'E02', eixoNome: 'Finanças e Orçamento' },
    ]);
    expect(itens.find((i) => i.codigo === 'TEC:E01')).toMatchObject({ competencia: 'Gestão de Pessoas', conflito: false });
    expect(itens.find((i) => i.codigo === 'TEC:E02')).toMatchObject({ conflito: true, nomesEncontrados: ['Finanças', 'Finanças e Orçamento'] });
  });
});

describe('rota do catálogo', () => {
  const montar = async () => catalogoComportamental();
  it('503 sem segredo, 401 sem assinatura, 200 assinado', async () => {
    let res = resposta();
    await criarHandlerCatalogo({ secret: () => undefined, montar })(assinado(), res);
    expect(res.statusCode).toBe(503);
    res = resposta();
    await criarHandlerCatalogo({ secret: () => SECRET, montar })(pedido({}), res);
    expect(res.statusCode).toBe(401);
    res = resposta();
    await criarHandlerCatalogo({ secret: () => SECRET, montar })(assinado(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.itens.length).toBeGreaterThan(0);
  });
});
