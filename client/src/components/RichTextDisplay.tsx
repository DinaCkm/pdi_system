import DOMPurify from 'dompurify';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

/**
 * Renderiza conteúdo HTML sanitizado (Rich Text).
 * Compatível com texto plain text antigo (sem tags HTML).
 */
export default function RichTextDisplay({ content, className = '' }: RichTextDisplayProps) {
  if (!content) return null;

  // Se o conteúdo não contém tags HTML, é plain text — renderizar normalmente
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (!isHtml) {
    return <span className={className}>{content}</span>;
  }

  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['style'],
  });

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

/**
 * Remove todas as tags HTML de um texto, retornando apenas o texto puro.
 * Útil para contextos onde HTML não é suportado (ex: link mailto, emails plain text).
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  // Se não contém tags HTML, retornar como está
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  // Criar elemento temporário para extrair texto
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
