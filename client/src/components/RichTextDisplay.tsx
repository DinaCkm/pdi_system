import DOMPurify from "dompurify";

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

function decodeHtmlEntities(value: string): string {
  if (!value) return "";

  if (typeof window !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeRichTextContent(content: string): string {
  if (!content) return "";

  const decoded = decodeHtmlEntities(content).trim();

  return decoded
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<p[^>]*>/gi, '<p style="margin: 0 0 12px;">')
    .replace(/<ul[^>]*>/gi, '<ul style="margin: 0; padding-left: 18px;">')
    .replace(/<ol[^>]*>/gi, '<ol style="margin: 0; padding-left: 18px;">')
    .replace(/<li[^>]*>/gi, '<li style="margin: 0 0 8px;">');
}

/**
 * Renderiza conteúdo HTML sanitizado (Rich Text).
 * Compatível com:
 * - texto puro
 * - HTML real (<p>...</p>)
 * - HTML escapado (&lt;p&gt;...&lt;/p&gt;)
 */
export default function RichTextDisplay({
  content,
  className = "",
}: RichTextDisplayProps) {
  if (!content) return null;

  const normalized = normalizeRichTextContent(content);
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(normalized);

  if (!isHtml) {
    return <span className={className}>{normalized}</span>;
  }

  const sanitized = DOMPurify.sanitize(normalized, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "span", "ul", "ol", "li"],
    ALLOWED_ATTR: ["style"],
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
 * Também decodifica HTML escapado.
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  const decoded = decodeHtmlEntities(html);

  if (!/<[a-z][\s\S]*>/i.test(decoded)) return decoded;

  const doc = new DOMParser().parseFromString(decoded, "text/html");
  return doc.body.textContent || "";
}
