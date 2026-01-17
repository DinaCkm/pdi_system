import { describe, it, expect, beforeEach } from 'vitest';
import * as db from './db';

describe('Competências - Funções de Criação', () => {
  describe('createBloco', () => {
    it('deve criar um bloco com nome e descrição', async () => {
      const result = await db.createBloco({
        nome: 'Bloco Teste',
        descricao: 'Descrição do bloco teste'
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('number');
      expect(result.id).toBeGreaterThan(0);
    });

    it('deve criar um bloco apenas com nome', async () => {
      const result = await db.createBloco({
        nome: 'Bloco Simples'
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('number');
    });

    it('deve lançar erro se nome não for fornecido', async () => {
      try {
        await db.createBloco({
          nome: '',
          descricao: 'Descrição'
        });
        expect.fail('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error.message).toContain('obrigatório');
      }
    });
  });

  describe('createMacro', () => {
    let blocoId: number;

    beforeEach(async () => {
      const bloco = await db.createBloco({
        nome: `Bloco para Macro ${Date.now()}`,
        descricao: 'Bloco temporário para testes'
      });
      blocoId = bloco.id;
    });

    it('deve criar uma macro com blocoId e nome', async () => {
      const result = await db.createMacro({
        blocoId,
        nome: 'Macro Teste',
        descricao: 'Descrição da macro teste'
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('number');
      expect(result.id).toBeGreaterThan(0);
    });

    it('deve criar uma macro apenas com blocoId e nome', async () => {
      const result = await db.createMacro({
        blocoId,
        nome: 'Macro Simples'
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('number');
    });

    it('deve lançar erro se blocoId não for fornecido', async () => {
      try {
        await db.createMacro({
          blocoId: 0,
          nome: 'Macro Teste'
        });
        expect.fail('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error.message).toContain('obrigatório');
      }
    });

    it('deve lançar erro se nome não for fornecido', async () => {
      try {
        await db.createMacro({
          blocoId,
          nome: ''
        });
        expect.fail('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error.message).toContain('obrigatório');
      }
    });
  });

  describe('createMicro', () => {
    let blocoId: number;
    let macroId: number;

    beforeEach(async () => {
      const bloco = await db.createBloco({
        nome: `Bloco para Micro ${Date.now()}`,
        descricao: 'Bloco temporário para testes'
      });
      blocoId = bloco.id;

      const macro = await db.createMacro({
        blocoId,
        nome: `Macro para Micro ${Date.now()}`,
        descricao: 'Macro temporária para testes'
      });
      macroId = macro.id;
    });

    it('deve criar uma micro com macroId e nome', async () => {
      const result = await db.createMicro({
        macroId,
        nome: 'Micro Teste',
        descricao: 'Descrição da micro teste'
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('number');
      expect(result.id).toBeGreaterThan(0);
    });

    it('deve criar uma micro apenas com macroId e nome', async () => {
      const result = await db.createMicro({
        macroId,
        nome: 'Micro Simples'
      });
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('number');
    });

    it('deve lançar erro se macroId não for fornecido', async () => {
      try {
        await db.createMicro({
          macroId: 0,
          nome: 'Micro Teste'
        });
        expect.fail('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error.message).toContain('obrigatório');
      }
    });

    it('deve lançar erro se nome não for fornecido', async () => {
      try {
        await db.createMicro({
          macroId,
          nome: ''
        });
        expect.fail('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error.message).toContain('obrigatório');
      }
    });
  });

  describe('Hierarquia de Competências', () => {
    it('deve criar uma hierarquia completa: Bloco -> Macro -> Micro', async () => {
      // Criar Bloco
      const bloco = await db.createBloco({
        nome: `Bloco Hierarquia ${Date.now()}`,
        descricao: 'Bloco para teste de hierarquia'
      });
      expect(bloco.id).toBeGreaterThan(0);

      // Criar Macro
      const macro = await db.createMacro({
        blocoId: bloco.id,
        nome: `Macro Hierarquia ${Date.now()}`,
        descricao: 'Macro para teste de hierarquia'
      });
      expect(macro.id).toBeGreaterThan(0);

      // Criar Micro
      const micro = await db.createMicro({
        macroId: macro.id,
        nome: `Micro Hierarquia ${Date.now()}`,
        descricao: 'Micro para teste de hierarquia'
      });
      expect(micro.id).toBeGreaterThan(0);

      // Verificar que todas as IDs foram criadas
      expect(bloco.id).toBeDefined();
      expect(macro.id).toBeDefined();
      expect(micro.id).toBeDefined();
    });
  });
});
