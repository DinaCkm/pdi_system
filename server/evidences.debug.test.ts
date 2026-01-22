import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('DEBUG: Evidence Creation', () => {
  beforeAll(async () => {
    // Aguardar conexão com BD
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('deve testar createEvidence com dados simples', async () => {
    console.log('\n=== INICIANDO TESTE DE DEBUG ===\n');
    
    try {
      const evidenceData = {
        actionId: 1,
        colaboradorId: 1,
        descricao: 'Teste de evidência'
      };
      
      console.log('📝 Dados enviados para createEvidence:', evidenceData);
      
      const evidenceId = await db.createEvidence(evidenceData);
      
      console.log('✅ Evidence criada com ID:', evidenceId);
      expect(evidenceId).toBeGreaterThan(0);
      
      // Verificar se foi salva no BD
      const saved = await db.getEvidenceById(evidenceId);
      console.log('📦 Evidence recuperada do BD:', saved);
      expect(saved).toBeDefined();
      expect(saved?.status).toBe('aguardando_avaliacao');
      
    } catch (error: any) {
      console.error('\n❌ ERRO CAPTURADO NO TESTE:');
      console.error('Mensagem:', error?.message);
      console.error('Stack:', error?.stack);
      console.error('Objeto completo:', error);
      throw error;
    }
  });

  it('deve testar createEvidenceFile', async () => {
    console.log('\n=== TESTE DE ARQUIVO ===\n');
    
    try {
      // Criar evidence primeiro
      const evidenceData = {
        actionId: 1,
        colaboradorId: 1,
        descricao: 'Teste com arquivo'
      };
      
      const evidenceId = await db.createEvidence(evidenceData);
      console.log('✅ Evidence criada:', evidenceId);
      
      // Salvar arquivo
      await db.createEvidenceFile(evidenceId, 'https://example.com/file.pdf');
      console.log('✅ Arquivo salvo');
      
      expect(evidenceId).toBeGreaterThan(0);
    } catch (error: any) {
      console.error('\n❌ ERRO AO SALVAR ARQUIVO:');
      console.error('Mensagem:', error?.message);
      console.error('Stack:', error?.stack);
      throw error;
    }
  });

  it('deve testar createEvidenceText', async () => {
    console.log('\n=== TESTE DE TEXTO ===\n');
    
    try {
      // Criar evidence primeiro
      const evidenceData = {
        actionId: 1,
        colaboradorId: 1,
        descricao: 'Teste com texto'
      };
      
      const evidenceId = await db.createEvidence(evidenceData);
      console.log('✅ Evidence criada:', evidenceId);
      
      // Salvar texto
      await db.createEvidenceText(evidenceId, 'Descrição detalhada da evidência');
      console.log('✅ Texto salvo');
      
      expect(evidenceId).toBeGreaterThan(0);
    } catch (error: any) {
      console.error('\n❌ ERRO AO SALVAR TEXTO:');
      console.error('Mensagem:', error?.message);
      console.error('Stack:', error?.stack);
      throw error;
    }
  });
});
