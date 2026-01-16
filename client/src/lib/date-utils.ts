/**
 * Utilitários de Formatação de Datas
 * Converte datas para formato MySQL (YYYY-MM-DD HH:mm:ss)
 */

/**
 * Formata uma data para o formato MySQL (YYYY-MM-DD HH:mm:ss)
 * @param date - Data a ser formatada (Date, string ou undefined)
 * @returns String no formato YYYY-MM-DD HH:mm:ss ou string vazia se inválida
 */
export function formatDateForMySQL(date: Date | string | undefined | null): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
      return '';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Formata uma data para exibição em português (DD/MM/YYYY)
 * @param date - Data a ser formatada
 * @returns String no formato DD/MM/YYYY
 */
export function formatDateBR(date: Date | string | undefined | null): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
      return '';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Formata uma data com hora para exibição em português (DD/MM/YYYY HH:mm)
 * @param date - Data a ser formatada
 * @returns String no formato DD/MM/YYYY HH:mm
 */
export function formatDateTimeBR(date: Date | string | undefined | null): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
      return '';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Converte uma string de data (YYYY-MM-DD) para objeto Date
 * @param dateString - String no formato YYYY-MM-DD
 * @returns Objeto Date ou null se inválido
 */
export function stringToDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;

  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      return null;
    }
    return d;
  } catch (error) {
    console.error('Error converting string to date:', error);
    return null;
  }
}

/**
 * Valida se uma data está dentro de um intervalo
 * @param date - Data a validar
 * @param startDate - Data de início do intervalo
 * @param endDate - Data de fim do intervalo
 * @returns true se a data está dentro do intervalo, false caso contrário
 */
export function isDateWithinRange(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    return d >= start && d <= end;
  } catch (error) {
    console.error('Error validating date range:', error);
    return false;
  }
}
