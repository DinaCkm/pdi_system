# TODO - Sistema de Gestão de PDI

## Infraestrutura e Configuração Base
- [x] Configurar schema do banco de dados com todas as entidades
- [x] Configurar tema visual com cores azuis e laranja
- [x] Configurar autenticação com email e CPF

## Gestão de Usuários
- [x] Implementar CRUD de usuários (Admin, Líder, Colaborador)
- [x] Implementar validação de CPF único
- [x] Implementar hierarquia de líderes (Líder pode ter líder)
- [x] Implementar controle de permissões por perfil

## Gestão de Competências
- [x] Implementar CRUD de Competências Bloco (backend)
- [x] Implementar CRUD de Competências Macro (backend)
- [x] Implementar CRUD de Competências Micro (backend)
- [x] Implementar hierarquia Bloco → Macro → Micro (backend)
- [ ] Criar páginas de gestão de competências (frontend)

## Ciclos Semestrais
- [x] Implementar CRUD de ciclos semestrais
- [x] Implementar validação de datas (fim > início)
- [x] Implementar bloqueio de sobreposição de ciclos

## Sistema de PDI
- [x] Implementar criação de PDI por Admin (backend)
- [x] Implementar adição de ações ao PDI (backend)
- [x] Implementar validação de prazo dentro do ciclo (backend)
- [x] Implementar exclusão de ações pelo Admin (backend)
- [ ] Criar página de gestão de PDIs (frontend)
- [ ] Criar página de gestão de Ações (frontend)] Implementar edição de ações pelo Admin
- [ ] Implementar exclusão de ações pelo Admin

## Fluxo de Aprovação
- [x] Implementar aprovação de ações pelo Líder (backend)
- [x] Implementar reprovação de ações pelo Líder (backend)
- [x] Implementar início de execução pelo Colaborador (backend)
- [ ] Implementar envio de evidências (arquivos + textos)
- [ ] Implementar avaliação de evidências pelo Admin (aprovar/reprovar/solicitar correção)
- [ ] Criar interface de aprovação para Líder (frontend)
- [ ] Criar interface de execução para Colaborador (frontend)

## Solicitações de Ajuste
- [ ] Implementar solicitação de ajuste por Colaborador
- [ ] Implementar solicitação de ajuste por Líder
- [ ] Implementar aprovação/reprovação de ajustes pelo Admin
- [ ] Implementar edição manual de ação após aprovação de ajuste

## Sistema de Notificações
- [x] Implementar notificações in-app (estrutura base)
- [x] Implementar notificações para criação de ações
- [x] Implementar notificações para aprovação/reprovação
- [ ] Implementar notificações para envio de evidências
- [ ] Implementar notificações para avaliação de evidências
- [ ] Implementar notificações para solicitações de ajuste
- [ ] Implementar notificações de vencimento
- [ ] Implementar notificações 7 dias antes do vencimento

## Job Automático
- [ ] Implementar job diário para marcar ações vencidas
- [ ] Implementar job diário para alertas 7 dias antes do vencimento

## Dashboards e Relatórios
- [ ] Implementar dashboard do Admin (gestão completa)
- [ ] Implementar dashboard do Líder (equipe direta)
- [ ] Implementar dashboard do Colaborador (próprio PDI)
- [ ] Implementar relatórios de acompanhamento para Admin
- [ ] Implementar visualização de progresso por colaborador

## Storage de Arquivos
- [ ] Implementar upload de arquivos de evidências para S3
- [ ] Implementar visualização de arquivos de evidências

## Interface e UX
- [x] Criar layout principal com navegação
- [x] Criar páginas de gestão de usuários
- [ ] Criar páginas de gestão de competências (placeholder)
- [ ] Criar páginas de gestão de ciclos (placeholder)
- [ ] Criar páginas de gestão de PDIs
- [ ] Criar páginas de gestão de ações
- [ ] Criar páginas de evidências
- [ ] Criar páginas de notificações
- [ ] Criar páginas de relatórios

## Testes
- [ ] Criar testes unitários para fluxo de aprovação
- [ ] Criar testes unitários para validações de negócio
- [ ] Criar testes unitários para permissões por perfil
- [ ] Testar sistema completo end-to-end

## Autenticação Customizada (NOVA FUNCIONALIDADE)
- [x] Implementar autenticação customizada com Email + CPF (sem senha)
- [x] Criar página de login customizada
- [x] Criar sistema de sessão customizado
- [x] Remover dependência do Manus OAuth
- [x] Atualizar fluxo de login no frontend

## Departamentos (NOVA FUNCIONALIDADE)
- [x] Adicionar tabela "departamentos" ao schema
- [ ] Implementar CRUD de departamentos
- [ ] Vincular usuários a departamentos
- [ ] Atualizar página de gestão de usuários com departamentos
- [ ] Atualizar relatórios para incluir filtro por departamento

## Importação em Massa (NOVA FUNCIONALIDADE)
- [ ] Criar página de importação em massa
- [ ] Implementar upload de arquivo Excel/CSV
- [ ] Criar parser para planilhas de usuários
- [ ] Criar parser para planilhas de departamentos
- [ ] Criar parser para planilhas de competências (Bloco/Macro/Micro)
- [ ] Criar parser para planilhas de ações de PDI
- [ ] Implementar validação de dados antes da importação
- [ ] Implementar preview dos dados a serem importados
- [ ] Criar templates de planilha para download
- [ ] Implementar feedback de sucesso/erro após importação

## Setup Inicial (NOVA FUNCIONALIDADE)
- [x] Criar página /setup para cadastro do primeiro admin
- [x] Validar se banco está vazio antes de permitir acesso
- [x] Bloquear página após primeiro admin ser criado
- [x] Redirecionar para /setup se não houver usuários no banco

## Bugs a Corrigir
- [x] Corrigir erro 404 ao acessar sistema publicado
- [x] Verificar roteamento e redirecionamentos

## Bugs Reportados
- [x] Página de setup não está aparecendo no primeiro acesso (resolvido: precisa publicar)
- [x] Investigar redirecionamento Home → Setup (funcionando corretamente)

## Auditoria de Setup Inicial
- [ ] Verificar se rota /setup está acessível
- [ ] Testar criação de primeiro usuário via formulário
- [ ] Verificar se login automático funciona após criar admin
- [ ] Confirmar que /setup fica bloqueado após primeiro admin
- [ ] Testar fluxo completo: setup → login → dashboard

## Próximas Implementações (Ordem da Arquitetura)
- [ ] Criar página de gestão de Departamentos (CRUD completo)
- [ ] Atualizar página de usuários para incluir seleção de departamento
- [x] Criar páginas de gestão de Competências (Bloco, Macro, Micro)
- [ ] Criar página de gestão de Ciclos Semestrais
- [ ] Criar página de gestão de PDIs
- [ ] Criar página de gestão de Ações
- [ ] Implementar interface de aprovação para Líder
- [ ] Implementar interface de execução para Colaborador
- [ ] Implementar sistema de evidências com upload S3
- [ ] Implementar avaliação de evidências pelo Admin
- [ ] Implementar sistema de solicitação de ajustes
- [ ] Implementar job automático de vencimento
- [ ] Implementar dashboards específicos por perfil
- [ ] Implementar relatórios de acompanhamento

## Bugs e Funcionalidades Faltantes Reportadas
- [x] Garantir que botões de EDITAR e EXCLUIR usuário estão VISÍVEIS na tabela
- [x] Adicionar funcionalidade de INATIVAR/ATIVAR usuário (status ativo/inativo)
- [x] Adicionar coluna de STATUS na tabela de usuários
- [x] Adicionar botão toggle para ativar/inativar usuário

## Melhorias Solicitadas - Página de Usuários
- [x] Implementar paginação na lista de usuários (10 itens por página)
- [x] Adicionar campo de busca para filtrar por nome ou e-mail
- [x] Criar modal de confirmação antes de excluir ou inativar usuário
## Melhorias Solicitadas - Página de Competências

- [x] Adicionar campo de busca para filtrar Blocos por nome
- [x] Adicionar campo de busca para filtrar Macros por nome
- [x] Adicionar campo de busca para filtrar Micros por nome
