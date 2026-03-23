# Como o IIP é Exibido em Cada Perfil

## 1. Página do Administrador (Dashboard)

**Rota:** `/dashboard`
**Componente:** `IIPDashboard` com `compact = false` (visão completa)

O administrador vê a **versão completa** do IIP com:

- **Gauge semicircular grande** com o IIP geral (percentual + classificação: Excelente/Bom/Regular/Baixo/Crítico)
- **KPIs:** Evidências Avaliadas, Colaboradores com IIP, Maior IIP Individual
- **Médias separadas:** Média Empregado vs Média Admin
- **Texto explicativo:** "Este indicador mede o impacto prático das ações entregues no dia a dia do empregado..."
- **Ranking IIP por Colaborador:** Gráfico de barras horizontal com os top 10 colaboradores + lista detalhada abaixo com posição, nome, quantidade de evidências, média empregado (E), média admin (A) e IIP final
- **Filtro por departamento:** O admin pode filtrar o IIP por departamento usando o seletor do Dashboard

---

## 2. Página do Gerente/Líder (Gestão Gerente)

**Rota:** `/gestao-gerente`
**Componente:** `IIPDashboard` com `compact = true` e `userRole = "gerente"`

O gerente/líder vê a **versão compacta** do IIP com:

- **Gauge semicircular médio** com o IIP geral
- **Evidências avaliadas:** Quantidade total
- **Colaboradores:** Quantidade de colaboradores com IIP
- **Filtro por departamento:** O gerente pode filtrar por departamento

A versão compacta **não exibe** o ranking por colaborador, as médias separadas (empregado vs admin) nem o texto explicativo. É um card resumido que ocupa menos espaço na tela.

---

## 3. Página do Empregado/Aluno (Minhas Pendências)

**Rota:** `/minhas-pendencias`
**Componente:** `IIPDashboard` com `compact = true`, `userRole = "colaborador"` e `colaboradorId = userId`

O empregado vê a **versão compacta pessoal** do IIP com:

- **Gauge semicircular médio** com o **seu IIP individual** (não o geral)
- **Evidências avaliadas:** Quantidade de evidências dele que foram avaliadas
- **Colaboradores:** Mostra 1 (ele mesmo)

A versão compacta do empregado é filtrada pelo seu próprio ID, mostrando apenas o impacto prático das suas ações pessoais.

---

## Resumo Comparativo

| Aspecto | Admin | Gerente/Líder | Empregado |
|---|---|---|---|
| **Versão** | Completa | Compacta | Compacta |
| **Gauge** | Grande | Médio | Médio |
| **Dados** | Geral (todos) | Geral (filtro depto) | Pessoal (só dele) |
| **Ranking** | Sim (top 10) | Não | Não |
| **Médias separadas** | Sim (E vs A) | Não | Não |
| **Texto explicativo** | Sim | Não | Não |
| **Filtro departamento** | Sim | Sim | Não |

---

## Observações

- Quando **não há evidências aprovadas** com impacto validado, todos os perfis veem a mensagem: "Ainda não há evidências aprovadas com impacto validado para calcular o IIP."
- O IIP só é calculado quando o **administrador avalia** a evidência e valida o impacto prático.
- Quando o empregado **não declara impacto**, este cálculo não é considerado na entrega da ação concluída.
- As cores do gauge seguem a escala: Verde (80-100%), Azul (60-79%), Amarelo (40-59%), Laranja (20-39%), Vermelho (0-19%).
