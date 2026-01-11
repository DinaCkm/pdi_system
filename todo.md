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
- [x] Implementar CRUD de Competências Bloco
- [x] Implementar CRUD de Competências Macro
- [x] Implementar CRUD de Competências Micro
- [x] Implementar hierarquia Bloco → Macro → Micro

## Ciclos Semestrais
- [x] Implementar CRUD de ciclos semestrais
- [x] Implementar validação de datas (fim > início)
- [x] Implementar bloqueio de sobreposição de ciclos

## PDI e Ações
- [ ] Implementar criação de PDI por Admin
- [ ] Implementar criação de ações dentro do PDI
- [ ] Implementar validação de prazo dentro do ciclo
- [ ] Implementar 11 status de ações
- [ ] Implementar edição de ações pelo Admin
- [ ] Implementar exclusão de ações pelo Admin

## Fluxo de Aprovação
- [ ] Implementar aprovação de ações pelo Líder
- [ ] Implementar reprovação de ações pelo Líder
- [ ] Implementar execução de ações pelo Colaborador
- [ ] Implementar envio de evidências (arquivos + textos)
- [ ] Implementar avaliação de evidências pelo Admin (aprovar/reprovar/solicitar correção)

## Solicitações de Ajuste
- [ ] Implementar solicitação de ajuste por Colaborador
- [ ] Implementar solicitação de ajuste por Líder
- [ ] Implementar aprovação/reprovação de ajustes pelo Admin
- [ ] Implementar edição manual de ação após aprovação de ajuste

## Sistema de Notificações
- [x] Implementar notificações in-app (estrutura base)
- [ ] Implementar notificações para criação de ações
- [ ] Implementar notificações para aprovação/reprovação
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
