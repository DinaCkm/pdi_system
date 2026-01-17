import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DirecionamentoEstrategico } from "@/components/DirecionamentoEstrategico";
import { DataTablePDIs } from "@/components/DataTablePDIs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PDIs() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirecionar se não for Admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      if (user.role === "lider") {
        setLocation("/pdis-equipe");
      } else {
        setLocation("/meu-pdi");
      }
    }
  }, [user, setLocation]);

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              Gestão de PDIs
            </h1>
            <p className="text-muted-foreground mt-1">
              Central de controle de Planos de Desenvolvimento Individual
            </p>
          </div>
          <Button className="bg-gradient-to-r from-blue-600 to-orange-500">
            <Plus className="w-4 h-4 mr-2" />
            Novo PDI
          </Button>
        </div>

        {/* Widget Direcionamento Estratégico (apenas para admin) */}
        {user?.role === "admin" && (
          <div>
            <DirecionamentoEstrategico />
          </div>
        )}

        {/* DataTable de PDIs */}
        <div>
          <DataTablePDIs />
        </div>
      </div>
    </DashboardLayout>
  );
}
