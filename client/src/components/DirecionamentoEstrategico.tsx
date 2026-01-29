import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function DirecionamentoEstrategico() {
  const { user } = useAuth();
  const { data: top3, isLoading } = trpc.competencias.getTop3CompetenciasComGaps.useQuery(undefined, {
    enabled: user?.role === "admin" || user?.role === "gerente",
  });

  // Renderizar apenas se for admin ou gerente
  if (user?.role !== "admin" && user?.role !== "gerente") {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-emerald-600 bg-gradient-to-br from-emerald-50 to-blue-50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-emerald-600" />
          <CardTitle className="text-lg text-emerald-900">Direcionamento Estratégico</CardTitle>
        </div>
        <CardDescription className="text-sm text-emerald-700">
          Este indicador reflete as competências priorizadas para desenvolvimento e serve como guia para nossas futuras trilhas de capacitação.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-emerald-100 rounded animate-pulse" />
            ))}
          </div>
        ) : top3 && top3.length > 0 ? (
          <div className="space-y-3">
            {top3.map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-200 hover:border-emerald-400 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-emerald-900">{item.nome}</p>
                    <p className="text-xs text-emerald-600">
                      {item.totalAcoes} acao{item.totalAcoes !== 1 ? "es" : ""} ({item.percentual}% do total)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <span className="font-bold text-lg">{item.percentual}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-emerald-600">
            <p className="text-sm">Nenhuma ação em desenvolvimento no momento.</p>
          </div>
        )}

        <div className="mt-4 p-3 bg-emerald-100 rounded-lg border border-emerald-300">
          <p className="text-xs text-emerald-800 font-medium">
            💡 <strong>Dica:</strong> Este é um indicador confidencial. Use-o para preparar suas trilhas de capacitação antes de comunicar aos líderes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
