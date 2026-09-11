import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BarChart3, ClipboardCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminAvaliacoesShortcut() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  const isAdmin = user?.role === "admin" || user?.role === "Administrador";
  const emResultados = location === "/admin-avaliacoes/utic/resultados";
  const emAdministracao = location === "/admin-avaliacoes";
  const ocultar =
    loading ||
    !isAdmin ||
    location.startsWith("/avaliacoes/utic/prova-segura") ||
    location === "/login" ||
    location === "/reset-password" ||
    location === "/change-password";

  if (ocultar) return null;

  if (emAdministracao) {
    return (
      <div className="fixed bottom-6 right-6 z-[90]">
        <Button
          size="lg"
          className="shadow-xl"
          onClick={() => setLocation("/admin-avaliacoes/utic/resultados")}
          title="Abrir os resultados da Avaliação Técnica UTIC"
        >
          <BarChart3 className="mr-2 h-5 w-5" />
          RESULTADOS UTIC
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[90]">
      <Button
        size="lg"
        className="shadow-xl"
        onClick={() => setLocation("/admin-avaliacoes")}
        title="Abrir o painel de controle das avaliações em andamento"
      >
        <ClipboardCheck className="mr-2 h-5 w-5" />
        {emResultados ? "VOLTAR À ADMINISTRAÇÃO DAS AVALIAÇÕES" : "ADMINISTRAÇÃO DAS AVALIAÇÕES"}
      </Button>
    </div>
  );
}
