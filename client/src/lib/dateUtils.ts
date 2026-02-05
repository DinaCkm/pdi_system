/**
 * Utilitários para formatação de datas
 * 
 * IMPORTANTE: Todas as datas no sistema são armazenadas em UTC no banco de dados.
 * Para evitar problemas de timezone, sempre usamos os métodos UTC para extrair
 * os componentes da data (dia, mês, ano).
 */

/**
 * Formata uma data para exibição no formato DD/MM/YYYY usando UTC
 * Isso garante que a data exibida seja sempre a mesma, independente do fuso horário do usuário
 */
export function formatDateDisplay(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '--/--/----';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '--/--/----';
    
    // Usa UTC para evitar conversão de timezone
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return '--/--/----';
  }
}

/**
 * Formata uma data para uso em input type="date" (formato YYYY-MM-DD) usando UTC
 */
export function formatDateForInput(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '';
  
  try {
    // Se já estiver no formato YYYY-MM-DD, retorna diretamente
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    // Usa UTC para evitar conversão de timezone
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Converte uma data do input (YYYY-MM-DD) para ISO string mantendo a data em UTC
 * Isso evita que a data seja alterada ao salvar no banco
 */
export function parseInputDateToISO(dateString: string): string {
  if (!dateString) return '';
  
  // Se já for ISO string, retorna
  if (dateString.includes('T')) return dateString;
  
  // Adiciona horário meio-dia UTC para evitar problemas de timezone
  // Usar 12:00:00 UTC garante que mesmo com conversões de timezone,
  // a data não vai "pular" para o dia anterior ou seguinte
  return `${dateString}T12:00:00.000Z`;
}
