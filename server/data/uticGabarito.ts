// Gabarito e parâmetros de comparação da UTIC. Este arquivo é SERVER-ONLY.
// Questão 12: normalizada a partir do bloco sem numeração explícita do documento-fonte.
// Questão 55: utilizada somente uma versão do bloco duplicado.
// Questão 54: adotada a alternativa B porque o comentário do documento-fonte registra
// explicitamente I (rastreabilidade) e II (conformidade) como verdadeiras. O item permanece
// identificado para revisão de conteúdo antes da aplicação definitiva aos empregados reais.

export const UTIC_GABARITO: Record<number, string> = {
  1: "q1_d",
  2: "q2_d",
  3: "q3_d",
  4: "q4_d",
  5: "q5_c",
  6: "q6_c",
  7: "q7_d",
  8: "q8_b",
  9: "q9_c",
  10: "q10_e",
  11: "q11_b",
  12: "q12_b",
  13: "q13_b",
  14: "q14_b",
  15: "q15_b",
  16: "q16_c",
  17: "q17_b",
  18: "q18_d",
  19: "q19_c",
  20: "q20_d",
  21: "q21_d",
  22: "q22_b",
  23: "q23_b",
  24: "q24_d",
  25: "q25_d",
  26: "q26_d",
  27: "q27_e",
  28: "q28_c",
  29: "q29_c",
  30: "q30_b",
  31: "q31_b",
  32: "q32_d",
  33: "q33_d",
  34: "q34_b",
  35: "q35_d",
  36: "q36_d",
  37: "q37_b",
  38: "q38_d",
  39: "q39_c",
  40: "q40_b",
  41: "q41_c",
  42: "q42_d",
  43: "q43_c",
  44: "q44_d",
  45: "q45_d",
  46: "q46_c",
  47: "q47_c",
  48: "q48_b",
  49: "q49_c",
  50: "q50_d",
  51: "q51_d",
  52: "q52_b",
  53: "q53_c",
  54: "q54_b",
  55: "q55_d",
  56: "q56_d",
  57: "q57_c",
  58: "q58_d",
  59: "q59_c",
  60: "q60_d",
};

export const UTIC_LINHA_BASE_DANIEL: Record<string, number | null> = {
  E01: 60,
  E02: 63,
  E03: 58,
  E04: null,
  E05: 70,
  E06: 55,
  E07: 65,
  E08: 50,
};

export const UTIC_FONTE_LINHA_BASE_DANIEL =
  "UTIC_RESULTADO CONSOLIDADO.xlsx / item 5 dos relatórios individuais — linha de base provisória";

export const UTIC_EIXOS: Record<string, string> = {
  E01: "Governança e Gestão de TI",
  E02: "Infraestrutura de TI",
  E03: "Segurança da Informação",
  E04: "Gestão de Incidentes e Continuidade",
  E05: "Sistemas Corporativos, Processos e Automação",
  E06: "Dados, BI e Inteligência Artificial",
  E07: "Suporte, Atendimento e Service Desk",
  E08: "Liderança e Competências Transversais",
};
