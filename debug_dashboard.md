# Debug Dashboard do Admin

## Problema
O Dashboard do Admin mostra 0 solicitações mesmo havendo 3 solicitações no banco de dados.

## Dados no banco
- 3 solicitações de ajuste existem na tabela adjustment_requests
- Query SQL confirma os dados

## Análise
A função getPendingAdjustmentRequests() foi modificada para usar Drizzle ORM em vez de SQL raw.
Preciso verificar se a query está funcionando corretamente.

## Próximos passos
1. Verificar logs do servidor
2. Testar a query diretamente
3. Verificar se há erros de TypeScript
