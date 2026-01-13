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

## Melhorias Solicitadas - Visualização de Micros
- [x] Adicionar coluna "Bloco" na tabela de Micros para mostrar hierarquia completa (Bloco → Macro → Micro)

## Melhorias Solicitadas - Ordenação de Competências
- [x] Implementar ordenação clicável na tabela de Blocos (por nome e descrição)
- [x] Implementar ordenação clicável na tabela de Macros (por bloco, nome e descrição)
- [x] Implementar ordenação clicável na tabela de Micros (por bloco, macro, nome e descrição)
- [x] Adicionar ícones visuais para indicar direção da ordenação (ascendente/descendente)

## Implementação da Página de Ciclos Semestrais
- [x] Criar página /ciclos com layout DashboardLayout
- [x] Implementar formulário de criação de ciclo (nome, data início, data fim)
- [x] Implementar validação de datas (fim > início)
- [x] Implementar listagem de ciclos com status visual (Ativo/Encerrado/Futuro)
- [x] Implementar edição de ciclos existentes
- [x] Implementar exclusão de ciclos com modal de confirmação
- [x] Adicionar filtros e busca por nome/período
- [x] Adicionar indicador visual do ciclo atualmente ativo
- [x] Adicionar rota /ciclos no App.tsx
- [x] Adicionar link de navegação no DashboardLayout

## Validação Obrigatória de Líder e Departamento
- [x] Adicionar validação no backend: Líder e Colaborador DEVEM ter departamento
- [x] Adicionar validação no backend: Líder e Colaborador DEVEM ter líder
- [x] Atualizar formulário de usuários: campos obrigatórios para Líder/Colaborador
- [x] Atualizar formulário de usuários: campos opcionais para Admin
- [x] Adicionar mensagens de erro claras quando validação falhar
- [x] Adicionar campo Departamento no formulário de criação
- [x] Adicionar campo Departamento no formulário de edição
- [x] Campos aparecem apenas quando perfil é Líder ou Colaborador

## Bug Reportado - Campos de Departamento e Líder
- [x] Investigar por que campos de Departamento e Líder não aparecem no formulário
- [x] Verificar se selectedRole está funcionando corretamente
- [x] Verificar se a condição de exibição está correta
- [x] Criar departamentos de teste no banco de dados
- [x] Criar novo checkpoint para atualizar publicação

## Bug Crítico - Campos Não Aparecem Após Seleção
- [x] Investigar por que campos não aparecem mesmo após selecionar Líder/Colaborador
- [x] Verificar se watch("role") está capturando a mudança do Select
- [x] Verificar se há problema com o componente Select do shadcn/ui
- [x] Adicionar value prop no Select de criação para tornar componente controlado
- [x] Correção aplicada: Select agora é controlado com value={selectedRole}

## Implementação da Página de Departamentos
- [x] Verificar procedures tRPC de departamentos no backend
- [x] Criar página /departamentos com layout DashboardLayout
- [x] Implementar listagem de departamentos com busca e filtros
- [x] Implementar formulário de criação de departamento
- [x] Implementar formulário de edição de departamento
- [x] Implementar exclusão de departamento com modal de confirmação
- [x] Implementar toggle de status (ativo/inativo)
- [x] Adicionar rota /departamentos no App.tsx
- [x] Adicionar link de navegação no DashboardLayout

## Melhoria na Tabela de Usuários
- [x] Adicionar coluna "Departamento" na tabela de usuários
- [x] Exibir nome do departamento entre Cargo e Perfil
- [x] Criar função getDepartamentoNome para buscar nome do departamento

## Bug - Link de Departamentos Não Aparece no Menu
- [x] Adicionar link "Departamentos" no menu lateral do DashboardLayout
- [x] Adicionar ícone Building2 para Departamentos
- [x] Posicionado entre Usuários e Competências

## Bug Crítico - Erro ao Selecionar Departamento
- [x] Investigar erro "Failed to execute 'removeChild' on 'Node'" ao selecionar departamento
- [x] Adicionar value prop no Select de Departamento (formulário de criação)
- [x] Adicionar value prop no Select de Líder (formulário de criação)
- [x] Adicionar watches para selectedDepartamentoId e selectedLeaderId
- [x] Tornar ambos os Selects controlados com value={...?.toString()}

## Correção Definitiva - Usar Controller do react-hook-form
- [x] Importar Controller do react-hook-form
- [x] Adicionar control ao useForm
- [x] Refatorar Select de Perfil usando Controller com field.value e field.onChange
- [x] Refatorar Select de Departamento usando Controller com field.value e field.onChange
- [x] Refatorar Select de Líder usando Controller com field.value e field.onChange
- [x] Remover watches manuais (selectedDepartamentoId, selectedLeaderId) - não mais necessários

## Bug Reportado + Regra de Negócio - Departamento e Líder
- [x] Verificar se erro ao selecionar departamento ainda existe após refatoração com Controller
- [x] Implementar validação backend: departamento do usuário DEVE ser igual ao departamento do líder (create)
- [x] Implementar validação backend: departamento do usuário DEVE ser igual ao departamento do líder (update)
- [x] Filtrar lista de líderes no frontend: mostrar apenas líderes do departamento selecionado
- [x] Desabilitar campo Líder até que departamento seja selecionado
- [x] Adicionar mensagem "Nenhum líder disponível neste departamento" quando não houver líderes
- [x] Adicionar useEffect para resetar líder quando departamento mudar
- [x] Mensagem de erro clara no backend: "O usuário deve estar no mesmo departamento do seu líder"

## Correção de Entendimento - PDI e Ações
- [ ] Reescrever análise completa com modelo correto
- [ ] Validar que backend implementa regra: 1 PDI por colaborador por ciclo
- [ ] Implementar cálculo automático de status do PDI baseado em ações
- [ ] Remover possibilidade de Admin alterar status do PDI manualmente
- [ ] Status do PDI muda para "concluido" apenas quando todas as evidências são aprovadas

## Documentação Visual do Sistema
- [x] Criar diagrama de arquitetura (entidades e relacionamentos)
- [x] Criar fluxograma de status de ações (todos os 12 status)
- [x] Documentar impacto de cada status no PDI
- [x] Documentar impacto de cada status no ciclo de desenvolvimento
- [x] Explicar regras de transição entre status

## Sistema de Solicitação de Ajuste de Ações
- [x] Criar tabela `acoes_historico` no schema para registrar todas as alterações
- [x] Adicionar procedure tRPC para colaborador solicitar ajuste
- [x] Adicionar procedure tRPC para admin aprovar ajuste
- [x] Adicionar procedure tRPC para admin reprovar ajuste
- [x] Implementar atualização automática de status para `em_discussao`
- [x] Implementar notificação para Admin quando solicitação é feita
- [x] Implementar notificação informativa para Líder quando solicitação é feita
- [x] Implementar registro de histórico em todas as alterações de ação
- [x] Documentar fluxo completo de solicitação de ajuste
- [x] Criar testes unitários para procedures de solicitação de ajuste (7 testes passando)

## Bug Reportado - Página de PDI em Branco
- [x] Investigar qual rota de PDI está sendo acessada
- [x] Verificar se existe página PDI implementada
- [x] Verificar se rota está registrada no App.tsx
- [x] Verificar se há erros no console do navegador
- [x] Implementar página de PDI se não existir
- [x] Corrigir erros se página existir mas não carregar
- [x] Página completa de gestão de PDIs implementada com sucesso

## Página de Ações com Seleção Hierárquica de Competências
- [x] Verificar página de Ações existente
- [x] Implementar seleção hierárquica de competências (Bloco → Macro → Micro)
- [x] Adicionar validação de prazo dentro do ciclo do PDI
- [x] Implementar filtros por PDI e status
- [x] Adicionar busca por nome de ação
- [x] Implementar criação de nova ação
- [x] Implementar edição de ação existente
- [x] Implementar exclusão de ação com confirmação
- [x] Adicionar visualização detalhada de ação
- [x] Atualizar getAllActions no db.ts com joins para PDI e competências
- [x] Registrar rota /acoes no App.tsx
- [x] Testar funcionalidade completa no navegador

## Botão "✨ Sugerir com IA" para Ações
- [x] Adicionar botão "Sugerir com IA" no formulário de criação de ação
- [x] Implementar procedure tRPC para gerar sugestões com LLM
- [x] Gerar nome da ação baseado nas competências selecionadas
- [x] Gerar descrição detalhada da ação baseado nas competências
- [x] Adicionar loading state durante geração
- [x] Permitir edição das sugestões geradas
- [x] Adicionar tratamento de erros
- [x] Botão aparece apenas após selecionar as 3 competências
- [x] Preenchimento automático dos campos nome e descrição
- [x] Toast de sucesso/erro após geração

## Painel de Solicitações de Ajuste para Admin
- [x] Criar página de pendências (/pendencias)
- [x] Listar todas as solicitações pendentes
- [x] Mostrar campos originais vs campos propostos
- [x] Exibir histórico de alterações
- [x] Implementar botão de aprovar solicitação
- [x] Implementar botão de reprovar solicitação com motivo
- [x] Card de solicitação com informações completas (ID, ação, solicitante, justificativa)
- [x] Badge de status "Pendente" com ícone
- [x] Modal de detalhes com comparação lado a lado
- [x] Dialog de confirmação de aprovação
- [x] Dialog de reprovação com campo de justificativa obrigatório
- [x] Loading states e tratamento de erros
- [x] Estado vazio com mensagem amigável

## Bugs Reportados pelo Usuário

### Bug 1: Link de Ações não está no menu de navegação
- [x] Adicionar link "Ações" no DashboardLayout
- [x] Verificar se rota /acoes está funcionando
- [x] Testar navegação para página de Ações
- [x] Link "Ações" aparece no menu de navegação
- [x] Página de Ações carrega corretamente ao clicar no link

### Bug 2: Validação de PDI duplicado não está funcionando
- [x] Verificar procedure de criação de PDI no routers.ts
- [x] Adicionar validação para impedir PDI duplicado (mesmo colaborador + mesmo ciclo)
- [x] Retornar erro claro quando tentar criar PDI duplicado
- [x] Testar criação de PDI duplicado e verificar se erro é exibido
- [x] Remover PDIs duplicados existentes no banco de dados
- [x] PDI duplicado excluído com sucesso
- [x] Agora resta apenas 1 PDI para MANEZINHO DA SILVA no Ciclo Teste PDI

## Bug Reportado - Não há como cadastrar ações para um PDI específico
- [x] Adicionar botão "Adicionar Ação" no modal de visualização do PDI
- [x] Implementar navegação para página de Ações com PDI pré-selecionado via query param
- [x] Exibir lista de ações vinculadas ao PDI no modal de visualização
- [x] Adicionar botão de visualizar ação individual
- [x] Implementar pré-seleção de PDI na página de Ações quando vier com query param
- [x] Implementar abertura automática de modal de visualização quando vier com acaoId
- [x] Testar fluxo completo de criação de ação a partir do PDI
- [x] Modal de criação abre automaticamente com PDI pré-selecionado
- [x] PDI "DESENVOLVIMENTO PESSOAL - teste" aparece selecionado no dropdown
- [x] Formulário completo pronto para preenchimento
- [x] Fluxo intuitivo e funcional

## Ajustes no Formulário de Criação de Ações
- [x] Renomear campo "Descrição" para "Ação a ser realizada"
- [x] Atualizar botão IA para refletir novo nome do campo
- [ ] Corrigir carregamento de opções no select de Bloco de Competência
- [ ] Corrigir carregamento de opções no select de Macrocompetência
- [ ] Corrigir carregamento de opções no select de Microcompetência
- [ ] Substituir select de PDI por combobox com campo de busca/pesquisa
- [ ] Testar seleção de PDI com busca (simular 200+ PDIs)
- [ ] Testar seleção hierárquica de competências
- [ ] Testar botão IA no campo "Ação a ser realizada"

## Refazer Formulário de Cadastro de Ação (do zero)
- [x] Atualizar procedure tRPC para retornar todas as microcompetências com bloco e macro
- [x] Reescrever formulário de criação com select único de microcompetência
- [x] Adicionar campo de busca no select de PDI
- [x] Adicionar campo de busca no select de microcompetência
- [x] Exibir informação de Bloco e Macro após selecionar micro (apenas visual)
- [x] Manter botão "✨ Sugerir com IA" funcionando
- [x] Validar prazo dentro do ciclo do PDI
- [x] Testar formulário completo sem erros
- [x] Formulário funcionando perfeitamente com selects nativos
- [x] Campo de busca para PDI operacional
- [x] Campo de busca para Microcompetência operacional
- [x] Select único de microcompetência mostrando formato correto
- [x] Informação de ciclo do PDI exibida corretamente
- [x] Validação de prazo funcionando
- [x] Sem erros de TypeScript
- [x] Sem problemas de z-index

## Filtros Avançados na Página de Ações
- [x] Adicionar filtro por Usuário/Colaborador
- [x] Adicionar filtro por Líder
- [x] Adicionar filtro por Departamento
- [x] Adicionar filtro por Bloco de Competência
- [x] Adicionar filtro por Macrocompetência
- [x] Adicionar filtro por Microcompetência
- [x] Manter filtro por Status (já existe)
- [x] Atualizar query de ações para suportar todos os filtros
- [x] Atualizar getAllActions no db.ts com joins de colaborador e departamento
- [x] Reorganizar dados em objetos aninhados no backend
- [x] Implementar lógica de filtros no frontend
- [x] Testar filtros combinados
- [x] Todos os 8 filtros implementados e visíveis na interface
- [x] Grid responsivo com 3 colunas e 3 linhas
- [x] Filtros funcionando corretamente (Buscar, Usuário, Líder, Departamento, Bloco, Macro, Micro, Status)
- [x] Interface limpa e organizada

## Melhorias nos Cards e Modal de Ações
- [x] Adicionar nome do usuário/colaborador no card da ação
- [x] Adicionar nome do líder no card da ação
- [x] Adicionar nome do departamento no card da ação
- [x] Adicionar barra de rolagem no modal de visualização para textos longos
- [x] Adicionar botão de editar ação no card (já existia)
- [x] Adicionar botão de editar ação no modal de visualização
- [x] Testar todas as melhorias
- [x] Nome do colaborador aparecendo nos cards
- [x] Líder e departamento implementados (aparecem quando cadastrados)
- [x] Barra de rolagem funcionando no modal de visualização
- [x] Botão "Editar" aparecendo no modal de visualização
- [x] Botão "Fechar" funcionando
- [x] Texto longo com scroll visível e funcional

## Bug Reportado - Lista de macros não atualiza automaticamente após criar
- [x] Acessar página de Competências
- [x] Verificar se macrocompetências cadastradas estão no banco de dados
- [x] Identificar problema: lista não atualiza automaticamente, precisa recarregar página
- [x] Adicionar invalidação de cache do tRPC após criar macrocompetência
- [x] Substituir invalidate() por refetch() para atualização imediata
- [x] Aplicar mesma correção para blocos e microcompetências
- [x] Aplicar em create, update e delete de todas as competências
- [ ] Testar criação e verificar se lista atualiza automaticamente

## Correção de Auto-Atualização de Listas
- [x] Corrigir problema de auto-atualização nas listas de Blocos após criação
- [x] Corrigir problema de auto-atualização nas listas de Macros após criação
- [x] Corrigir problema de auto-atualização nas listas de Micros após criação
- [x] Implementar setTimeout antes de refetch para resolver problema de timing

## Bug Crítico - Status Inicial de Ações
- [x] Investigar por que ações estão sendo criadas com status "em_andamento" ao invés de "pendente_aprovacao_lider"
- [x] Corrigir status inicial no backend (procedure de criação)
- [x] Corrigir status inicial no frontend (formulário de criação)
- [x] Validar que ações novas sempre começam com "pendente_aprovacao_lider"
- [x] Corrigir mapeamento de status no frontend para reconhecer todos os 12 status
- [x] Corrigir status da "Ação Teste" no banco de dados

## Validação de Solicitações de Ajuste
- [x] Criar função countAdjustmentRequestsByAction no db.ts
- [x] Criar função getPendingAdjustmentRequestsByAction no db.ts
- [x] Adicionar validação: apenas 1 solicitação pendente por vez
- [x] Adicionar validação: máximo 5 solicitações totais por ação
- [x] Testar validações com casos de uso
- [x] Atualizar mensagens de erro para serem claras e informativas

## Aviso de Limitações no Formulário de Solicitação de Ajuste
- [x] Criar procedure para buscar estatísticas de solicitações por ação
- [x] Adicionar Alert/Banner informativo no formulário mostrando solicitações utilizadas
- [x] Exibir aviso se há solicitação pendente (bloqueando formulário)
- [x] Mostrar contador visual (ex: "2/5 solicitações utilizadas")
- [x] Testar exibição do aviso em diferentes cenários
- [x] Criar componente SolicitarAjusteDialog completo com todos os avisos

## Contador de Ajustes nos Cards de Ações
- [x] Modificar procedure de listagem de ações para incluir contagem de solicitações
- [x] Adicionar badge visual "X/5 ajustes" nos cards
- [x] Aplicar cores diferentes baseado na quantidade (verde: 0-2, amarelo: 3-4, vermelho: 5)
- [x] Testar exibição em diferentes cenários

## Estender Contador de Ajustes para Todas as Queries
- [x] Adicionar adjustmentCount em getActionsByColaboradorId (área do colaborador)
- [x] Adicionar adjustmentCount em getActionsByPDIId (visualização de PDI)
- [x] Adicionar adjustmentCount em getPendingActionsForLeader (área do líder)

## Bloqueio de Solicitação de Ajustes Após Limite
- [x] Verificar validação existente no backend (procedure solicitarAjuste)
- [x] Adicionar feedback visual no componente SolicitarAjusteDialog quando limite atingido
- [x] Desabilitar botão de envio quando adjustmentCount >= 5
- [x] Testar bloqueio tentando criar 6ª solicitação
- [x] Validar mensagem de erro retornada pelo backend

## Sistema de Aprovação de Solicitações de Ajuste
- [x] Criar tabela adjustment_comments no schema para comentários
- [x] Criar procedures para adicionar/listar comentários
- [x] Criar procedure reprovarAjuste com campo justificativa obrigatório
- [x] Criar página /solicitacoes-ajuste para Admin gerenciar solicitações
- [x] Adicionar visualização de detalhes da solicitação com histórico de comentários
- [x] Implementar formulário de aprovação/reprovação para Admin
- [x] Criar página /solicitacoes-equipe para Líder visualizar solicitações da equipe
- [x] Adicionar campo de comentários para Líder dar feedback
- [x] Testar fluxo completo: solicitar → comentar → aprovar/reprovar
- [x] Adicionar notificações quando há novos comentários

## Bug: Campos de Departamento na Página ConfigurarUsuario
- [ ] Remover campos de Departamento e Líder da página ConfigurarUsuario
- [ ] Garantir que apenas o campo Perfil (role) seja salvo
- [ ] Testar fluxo: Criar usuário → Definir perfil Líder → Ir em Departamentos → Atribuir líder

## Ajuste ConfigurarUsuario - Perfil + Departamento (sem Líder)
- [x] Modificar ConfigurarUsuario para ter seleção de PERFIL + DEPARTAMENTO
- [x] Remover campo de seleção de líder (líder vem automaticamente do departamento)
- [x] Líder é definido na página de Departamentos e sincronizado automaticamente
- [x] Inserir 20 líderes e departamentos conforme lista fornecida

## Bug de Layout - Página Departamentos
- [x] Corrigir espaço branco à esquerda da página
- [x] Evitar corte da tabela no lado direito
- [x] Melhorar responsividade e padding da página

## Bug de Layout - Páginas Competências e Ciclos
- [x] Aplicar overflow-x-auto nas tabelas de Competências
- [x] Aplicar overflow-x-auto nas tabelas de Ciclos
- [x] Garantir consistência de layout em todas as páginas

## Bug Crítico - ConfigurarUsuario
- [x] Tentativa 1: Adicionar keys em elementos condicionais (NÃO funcionou)
- [x] Tentativa 2: Adicionar keys nas telas principais (NÃO funcionou)
- [x] Tentativa 3: Refatorar para usar navegação + toast (NÃO funcionou)
- [x] Tentativa 4: Forçar remontagem completa usando key={userId} no wrapper do App.tsx

## Bug - Validação de Líder na ConfigurarUsuario
- [x] Remover validação que exige seleção manual de líder
- [x] Líder deve vir automaticamente do departamento selecionado
- [x] Buscar leaderId do departamento e atribuir automaticamente

## Feature - Editar Dados do Usuário
- [x] Adicionar botão "Editar" na tabela de usuários
- [x] Criar modal/dialog para edição de dados básicos (nome, email, CPF, cargo)
- [x] Implementar validação de CPF duplicado (backend já valida)
- [x] Implementar validação de email válido (HTML5 type="email")
- [x] Testar fluxo completo de edição

## Feature - PDI para Líderes com Validação Hierárquica
- [x] Permitir que líderes tenham PDI próprio (estrutura já suporta)
- [x] Ajustar mensagem de erro para ser genérica ("usuário" ao invés de "colaborador")
- [x] Implementar validação hierárquica na aprovação de ações
- [x] Validar que apenas líder direto ou admin pode aprovar ações
- [x] Criar procedure teamPDIs para líder ver PDIs da equipe
- [x] Procedure myPDIs já retorna PDI do usuário logado (colaborador ou líder)
- [x] Admin vê TODOS os PDIs e ações via procedure list
- [ ] Criar interface frontend para visualização de PDI próprio + equipe
- [ ] Testar fluxo completo: Colaborador → Líder → Líder Superior → Admin

## Feature - Líder Acompanha Solicitações de Ajuste da Equipe
- [x] Ajustar notificações para incluir justificativa do admin (aprovação/reprovação)
- [x] Incluir nome do colaborador e campos alterados nas notificações
- [x] Criar procedure teamAdjustmentRequests para líder buscar solicitações pendentes da equipe
- [ ] Criar interface frontend para líder visualizar solicitações com detalhes
- [ ] Mostrar: colaborador, ação, justificativa, status, resposta do admin

## BUG - Líder não vê aba "PDIs da Equipe" no menu
- [ ] Adicionar link "PDIs da Equipe" no menu lateral do DashboardLayout (apenas para líderes)
- [ ] Criar rota /pdis-equipe no App.tsx
- [ ] Criar página PDIsEquipe.tsx para visualizar PDIs dos subordinados
- [ ] Usar procedure teamPDIs já criado no backend
- [ ] Mostrar: colaborador, ciclo, título, status, ações vinculadas

## BUG RESOLVIDO - Líder agora vê aba "PDIs da Equipe"
- [x] Adicionar link "PDIs da Equipe" no menu lateral do DashboardLayout (apenas para líderes)
- [x] Criar rota /pdis-equipe no App.tsx
- [x] Criar página PDIsEquipe.tsx para visualizar PDIs dos subordinados
- [x] Usar procedure teamPDIs já criado no backend
- [x] Mostrar: colaborador, ciclo, título, status, ações vinculadas
- [x] Adicionar também link "Meu PDI" para líder ver seu próprio PDI

## Verificação do Menu - Concluída
- [x] Sistema voltou a funcionar após rollback para cf0cfb68
- [x] Menu do admin com 9 itens verificado e funcionando
- [x] Página de usuários carregando corretamente
- [x] Sem erros 404
- [x] Layout e navegação funcionando
- [x] Sistema pronto para criar checkpoint final

## FEATURE - Importação em Massa de Colaboradores
- [ ] Analisar estrutura do arquivo Excel (149 colaboradores)
- [ ] Criar procedure backend para importação em massa
- [ ] Validar e limpar dados (CPF, email, perfil)
- [ ] Criar departamentos automaticamente
- [ ] Estabelecer hierarquia (vincular colaboradores aos líderes)
- [ ] Criar página frontend de importação com upload
- [ ] Processar arquivo e importar dados
- [ ] Testar importação completa
- [ ] Validar hierarquia criada

## Criar Ciclo 2026
- [ ] Criar ciclo "1º CICLO DE 2026" de 01/01/2026 a 30/06/2026

## ✅ Importação Concluída
- [x] Processar arquivo Excel com 149 colaboradores
- [x] Criar 20 departamentos automaticamente
- [x] Criar 18 líderes e vincular aos departamentos
- [x] Criar 131 colaboradores e vincular aos líderes
- [x] Criar ciclo "1º CICLO DE 2026" (01/01/2026 a 30/06/2026)

## Melhorias de UX/UI - Layout Responsivo
- [x] Otimizar layout da tabela de usuários (remover colunas CPF e Cargo)
- [x] Truncar textos longos de departamento com tooltip
- [ ] Melhorar visualização em telas menores

## Bug Crítico - Erro insertBefore ao Configurar Usuário
- [x] Corrigir erro insertBefore ao selecionar departamento na página ConfigurarUsuario
- [x] Adicionar keys estáveis em elementos condicionais
- [x] Simplificar atualizações de estado no formulário
- [x] Adicionar campo de seleção de líder na página ConfigurarUsuario
- [x] Adicionar coluna Líder na tabela de usuários para visualização

## Bug - Líderes Não Aparecem na Seleção
- [x] Investigar dados de Dina Makiyama no banco (role, departamentoId)
- [x] Verificar lógica de filtro availableLeaders em ConfigurarUsuario
- [x] Corrigir inconsistência entre departamento.leaderId e user.departamentoId

## Correção de Erros TypeScript para Publicação
- [x] Corrigir erro: Types of property leaderId are incompatible (number | null vs number | undefined)
- [x] Corrigir erro: Property importBulk does not exist em ImportarUsuarios.tsx
- [x] Testar build de produção sem erros

- [x] Corrigir erro insertBefore ao selecionar líder no dropdown (adicionar key estável)

- [x] Implementar solução definitiva insertBefore: usar flushSync + select sempre renderizado (não condicional)
- [ ] Adicionar indicador de carregamento (spinner) no botão Salvar Configuração
- [x] Implementar importação em massa de competências via CSV (Bloco, Macro, Micro)
- [x] Implementar solução definitiva com window.location.reload() para erro removeChild
- [x] Implementar solução correta: remover reset do onSuccess e usar invalidate

## Correção de Bug Crítico - Erro removeChild
- [x] Investigar causa raiz do erro removeChild ao criar competências
- [x] Identificar conflito entre Dialog e Select (Radix UI) durante desmontagem
- [x] Implementar solução: delay de 100ms antes de fechar Dialog
- [x] Implementar solução: onOpenAutoFocus={(e) => e.preventDefault()} nos DialogContent
- [x] Implementar solução: position="popper" nos SelectContent para estabilizar portal
- [x] Testar criação de Bloco sem erro
- [x] Testar criação de Macro (com Select) sem erro
- [x] Testar criação de Micro (com 2 Selects) sem erro
- [x] Validar console limpo em todos os cenários

## BUG CRÍTICO - Erro removeChild Persiste Após Primeira Correção
- [ ] Investigar por que setTimeout + onOpenAutoFocus não resolveu completamente
- [ ] Analisar se problema está no invalidate após mutation
- [ ] Implementar solução mais robusta (possivelmente remover invalidate ou usar flushSync)
- [ ] Testar em ambiente de desenvolvimento
- [ ] Validar na versão publicada

## BUG - Select de Ciclo Não Abre no Dialog de Criação de PDI
- [x] Aplicar correção onCloseAutoFocus no DialogContent de PDIs
- [x] Aplicar correções recomendadas (remover reset do onSuccess, usar invalidate, normalizar watch)
- [x] Adicionar position="popper" nos SelectContent
- [x] Testar Select de Colaborador (funciona perfeitamente)
- [ ] Investigar erro 500 no backend que impede Select de Ciclo de carregar dados
