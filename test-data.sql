-- Verificar departamentos existentes
SELECT id, nome, leaderId FROM departamentos LIMIT 5;

-- Verificar usuários existentes
SELECT id, name, email, cpf, role, departamentoId, leaderId FROM users WHERE role IN ('admin', 'lider') LIMIT 5;

-- Verificar ciclos existentes
SELECT id, nome, dataInicio, dataFim FROM ciclos WHERE dataInicio <= date('now') AND dataFim >= date('now') LIMIT 1;
