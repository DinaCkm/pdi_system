import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SimilarItem {
  id: number;
  nome: string;
  similarity: number;
}

interface SimilarityWarningProps {
  items: SimilarItem[];
  type: "Bloco" | "Macro" | "Micro";
  isLoading?: boolean;
}

export default function SimilarityWarning({ items, type, isLoading }: SimilarityWarningProps) {
  if (isLoading) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
          Verificando competências similares...
        </AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-sm text-green-900 dark:text-green-100">
          ✅ Nenhuma competência similar encontrada. Pode criar!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/30">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription>
        <p className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
          ⚠️ Encontramos {items.length} {type}{items.length > 1 ? 's' : ''} similar{items.length > 1 ? 'es' : ''} já cadastrad{items.length > 1 ? 'os' : 'o'}:
        </p>
        <div className="space-y-2 mt-3">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-gray-900 rounded border border-orange-200 dark:border-orange-800"
            >
              <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                {item.nome}
              </span>
              <Badge 
                variant="outline" 
                className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700"
              >
                {Math.round(item.similarity * 100)}% similar
              </Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-orange-700 dark:text-orange-300 mt-3">
          💡 Considere usar uma das competências acima antes de criar uma nova para evitar duplicatas.
        </p>
      </AlertDescription>
    </Alert>
  );
}
