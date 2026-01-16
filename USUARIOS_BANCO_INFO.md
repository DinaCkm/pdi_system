# Informações de Usuários do Banco de Dados

**Data:** 16 de Janeiro de 2026  
**Total de Usuários:** 495

---

## ⚠️ Problema Identificado

O banco de dados contém **495 usuários**, o que é muito mais do que o esperado. Isso sugere que:

1. **Dados de teste não foram limpos** durante o desenvolvimento
2. **Múltiplas importações de dados** podem ter ocorrido
3. **Sistema foi usado extensivamente** com dados de teste

---

## 🔍 Investigação Necessária

Para encontrar o usuário admin correto (`relacionamento@ckmtalents.net`), você precisa:

### Opção 1: Usar o Management UI do Manus
1. Clique no botão "Management UI" (ícone de engrenagem)
2. Vá para a aba "Database"
3. Selecione a tabela "users"
4. Filtro por email: `relacionamento@ckmtalents.net`
5. Copie o CPF exato

### Opção 2: Usar SQL Direto
```sql
SELECT id, name, email, cpf, role, status, cargo 
FROM users 
WHERE email = 'relacionamento@ckmtalents.net';
```

---

## 🛠️ Próximos Passos Recomendados

1. **Limpar banco de dados de teste:**
   - Deletar todos os usuários exceto admins necessários
   - Deletar dados de teste de PDIs, ciclos, ações, etc.

2. **Reconstruir banco limpo:**
   - Fazer backup dos dados importantes
   - Executar migrations do zero
   - Recriar apenas dados necessários

3. **Verificar CPF do admin:**
   - Confirmar se CPF está com máscara ou sem máscara
   - Normalizar formato para sem máscara (apenas dígitos)

---

## 📊 Estatísticas do Banco

| Métrica | Valor |
|---------|-------|
| Total de Usuários | 495 |
| Query Executada | SELECT id, name, email, cpf, role, status, cargo FROM users ORDER BY id |
| Tempo de Execução | 142ms |
| Conexão | Ativa |

---

## 🔐 Segurança

⚠️ **AVISO:** Este arquivo contém informações sensíveis sobre usuários. Mantenha-o seguro e não compartilhe publicamente.

