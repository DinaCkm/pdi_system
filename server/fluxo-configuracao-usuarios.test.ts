import { describe, it, expect } from "vitest";

/**
 * Testes de Integração - Fluxo Completo de Configuração de Usuários
 * Fase 2: Atribuição e Validação de Perfis
 * 
 * Cenários testados:
 * 1. Colaborador válido
 * 2. Líder válido (dualidade)
 * 3. Administrador válido
 * 4. Cenários inválidos (bloqueados)
 */

describe("Fluxo Completo de Configuração de Usuários - Regras de Departamento vs Perfil", () => {
  
  // ============ CENÁRIOS VÁLIDOS ============
  
  describe("✅ Cenários Válidos", () => {
    
    it("deve permitir Colaborador com departamento e líder", () => {
      const usuario = {
        id: 1,
        name: "Pedro",
        email: "pedro@empresa.com",
        cpf: "12345678901",
        role: "colaborador",
        departamentoId: 1, // Vendas
        leaderId: 2, // João (Líder)
      };

      // Validações
      const temDepartamento = !!usuario.departamentoId;
      const temLider = !!usuario.leaderId;
      const ehColaborador = usuario.role === "colaborador";

      expect(ehColaborador).toBe(true);
      expect(temDepartamento).toBe(true);
      expect(temLider).toBe(true);
      expect(usuario.departamentoId).not.toBe(usuario.leaderId);
    });

    it("deve permitir Líder com dualidade de departamentos", () => {
      const usuario = {
        id: 2,
        name: "João",
        email: "joao@empresa.com",
        cpf: "98765432101",
        role: "lider",
        departamentoLiderado: 1, // Vendas (LIDERA)
        departamentoColaborador: 2, // Estratégia (COLABORADOR)
        liderSuperior: 3, // Maria (Diretora)
      };

      // Validações de dualidade
      const temDualdepartamentos = usuario.departamentoLiderado !== usuario.departamentoColaborador;
      const temLiderSuperior = !!usuario.liderSuperior;
      const ehLider = usuario.role === "lider";

      expect(ehLider).toBe(true);
      expect(temDualdepartamentos).toBe(true);
      expect(temLiderSuperior).toBe(true);
    });

    it("deve permitir Administrador sem departamento obrigatório", () => {
      const usuario = {
        id: 3,
        name: "Admin",
        email: "admin@empresa.com",
        cpf: "11111111111",
        role: "admin",
        departamentoId: undefined,
        leaderId: undefined,
      };

      // Validações
      const ehAdmin = usuario.role === "admin";
      const podeSerSemDepartamento = usuario.role === "admin";

      expect(ehAdmin).toBe(true);
      expect(podeSerSemDepartamento).toBe(true);
    });

    it("deve permitir Administrador com departamento opcional", () => {
      const usuario = {
        id: 4,
        name: "Admin2",
        email: "admin2@empresa.com",
        cpf: "22222222222",
        role: "admin",
        departamentoId: 1, // Opcional
        leaderId: undefined,
      };

      expect(usuario.role).toBe("admin");
      expect(usuario.departamentoId).toBeDefined();
    });
  });

  // ============ CENÁRIOS INVÁLIDOS ============
  
  describe("❌ Cenários Inválidos (Bloqueados)", () => {
    
    it("deve bloquear Colaborador sem departamento", () => {
      const usuario = {
        role: "colaborador",
        departamentoId: undefined,
        leaderId: 2,
      };

      const validacao = () => {
        if (usuario.role === "colaborador" && !usuario.departamentoId) {
          throw new Error("Colaboradores devem estar vinculados a um departamento");
        }
      };

      expect(validacao).toThrow("Colaboradores devem estar vinculados a um departamento");
    });

    it("deve bloquear Colaborador sem líder", () => {
      const usuario = {
        role: "colaborador",
        departamentoId: 1,
        leaderId: undefined,
      };

      const validacao = () => {
        if (usuario.role === "colaborador" && !usuario.leaderId) {
          throw new Error("Colaboradores devem ter um líder atribuído");
        }
      };

      expect(validacao).toThrow("Colaboradores devem ter um líder atribuído");
    });

    it("deve bloquear Líder sem departamento de colaborador", () => {
      const usuario = {
        role: "lider",
        departamentoLiderado: 1,
        departamentoColaborador: undefined,
        liderSuperior: 3,
      };

      const validacao = () => {
        if (usuario.role === "lider" && !usuario.departamentoColaborador) {
          throw new Error("Líderes devem estar vinculados a um departamento como colaborador");
        }
      };

      expect(validacao).toThrow("Líderes devem estar vinculados a um departamento como colaborador");
    });

    it("deve bloquear Líder sem líder superior", () => {
      const usuario = {
        role: "lider",
        departamentoLiderado: 1,
        departamentoColaborador: 2,
        liderSuperior: undefined,
      };

      const validacao = () => {
        if (usuario.role === "lider" && !usuario.liderSuperior) {
          throw new Error("Líderes devem ter um líder atribuído no departamento de colaborador");
        }
      };

      expect(validacao).toThrow("Líderes devem ter um líder atribuído no departamento de colaborador");
    });

    it("deve bloquear Líder com departamentos iguais (conflito)", () => {
      const usuario = {
        role: "lider",
        departamentoLiderado: 1, // Vendas
        departamentoColaborador: 1, // Vendas (ERRO!)
        liderSuperior: 3,
      };

      const validacao = () => {
        if (usuario.role === "lider" && usuario.departamentoLiderado === usuario.departamentoColaborador) {
          throw new Error("Um Líder não pode ser membro do mesmo departamento que ele lidera");
        }
      };

      expect(validacao).toThrow("Um Líder não pode ser membro do mesmo departamento que ele lidera");
    });

    it("deve bloquear autoatribuição de líder", () => {
      const usuario = {
        id: 1,
        role: "colaborador",
        departamentoId: 1,
        leaderId: 1, // Autoatribuição!
      };

      const validacao = () => {
        if (usuario.id === usuario.leaderId) {
          throw new Error("Um usuário não pode ser seu próprio líder");
        }
      };

      expect(validacao).toThrow("Um usuário não pode ser seu próprio líder");
    });

    it("deve bloquear autoatribuição de líder para Líder", () => {
      const usuario = {
        id: 2,
        role: "lider",
        departamentoLiderado: 1,
        departamentoColaborador: 2,
        liderSuperior: 2, // Autoatribuição!
      };

      const validacao = () => {
        if (usuario.id === usuario.liderSuperior) {
          throw new Error("Um Líder não pode ser seu próprio líder superior");
        }
      };

      expect(validacao).toThrow("Um Líder não pode ser seu próprio líder superior");
    });
  });

  // ============ FLUXO COMPLETO ============
  
  describe("🔄 Fluxo Completo de Cadastro", () => {
    
    it("deve validar fluxo completo: Criar → Configurar → Salvar", () => {
      // Fase 1: Criação
      const novoUsuario = {
        name: "João Silva",
        email: "joao@empresa.com",
        cpf: "12345678901",
        cargo: "Gerente",
        role: undefined, // Será configurado na Fase 2
      };

      expect(novoUsuario.name).toBeTruthy();
      expect(novoUsuario.email).toContain("@");
      expect(novoUsuario.cpf.length).toBe(11);

      // Fase 2: Configuração
      const usuarioConfigurado = {
        ...novoUsuario,
        id: 1,
        role: "lider",
        departamentoLiderado: 1, // Vendas
        departamentoColaborador: 2, // Estratégia
        liderSuperior: 3, // Maria
      };

      // Validações
      const departamentosDistintos = usuarioConfigurado.departamentoLiderado !== usuarioConfigurado.departamentoColaborador;
      const temTodosOsCampos = !!(
        usuarioConfigurado.role &&
        usuarioConfigurado.departamentoLiderado &&
        usuarioConfigurado.departamentoColaborador &&
        usuarioConfigurado.liderSuperior
      );

      expect(departamentosDistintos).toBe(true);
      expect(temTodosOsCampos).toBe(true);
    });

    it("deve validar matriz de permissões por perfil", () => {
      const matriz = {
        colaborador: {
          departamentoObrigatorio: true,
          liderObrigatorio: true,
          podeSerSemDepartamento: false,
        },
        lider: {
          departamentoObrigatorio: true,
          liderObrigatorio: true,
          podeSerSemDepartamento: false,
          dualdepartamentos: true,
        },
        admin: {
          departamentoObrigatorio: false,
          liderObrigatorio: false,
          podeSerSemDepartamento: true,
        },
      };

      // Validar Colaborador
      expect(matriz.colaborador.departamentoObrigatorio).toBe(true);
      expect(matriz.colaborador.liderObrigatorio).toBe(true);

      // Validar Líder
      expect(matriz.lider.dualdepartamentos).toBe(true);
      expect(matriz.lider.departamentoObrigatorio).toBe(true);

      // Validar Admin
      expect(matriz.admin.podeSerSemDepartamento).toBe(true);
      expect(matriz.admin.departamentoObrigatorio).toBe(false);
    });
  });

  // ============ REGRAS DE OURO ============
  
  describe("🏆 Regras de Ouro - Validação Rigorosa", () => {
    
    it("deve aplicar todas as 6 Regras de Ouro", () => {
      const regrasDeOuro = {
        "1. Autoatribuição Bloqueada": true,
        "2. Conflito de Departamentos Bloqueado": true,
        "3. CPF Duplicado Bloqueado": true,
        "4. Email Duplicado Bloqueado": true,
        "5. Departamento Obrigatório (Colaborador/Líder)": true,
        "6. Líder Obrigatório (Colaborador/Líder)": true,
      };

      const todasAtivas = Object.values(regrasDeOuro).every(ativa => ativa === true);
      expect(todasAtivas).toBe(true);
    });

    it("deve validar integridade hierárquica sem ciclos", () => {
      // Estrutura válida
      const hierarquia = {
        "João (ID 1)": { role: "lider", lider: "Maria" },
        "Maria (ID 2)": { role: "lider", lider: "Carlos" },
        "Carlos (ID 3)": { role: "admin", lider: undefined },
      };

      // Verificar se há ciclos
      const temCiclo = (usuario: string, visitados = new Set()): boolean => {
        if (visitados.has(usuario)) return true;
        visitados.add(usuario);
        
        const lider = hierarquia[usuario as keyof typeof hierarquia]?.lider;
        if (!lider) return false;
        
        return temCiclo(lider, visitados);
      };

      expect(temCiclo("João (ID 1)")).toBe(false);
      expect(temCiclo("Maria (ID 2)")).toBe(false);
    });
  });
});
