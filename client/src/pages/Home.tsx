import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // 1. Aguarda autenticação
    if (authLoading) return;

    // 2. Se NÃO está logado, manda para o Login
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    // 3. Se ESTÁ logado, manda para o Dashboard
    if (isAuthenticated && user) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, authLoading, setLocation]);

  // Tela de transição (Dina verá isso por apenas 1 segundo agora)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h2 className="text-xl font-semibold">Iniciando Gestão de PDI...</h2>
      <p className="text-muted-foreground">Preparando seu ambiente seguro.</p>
    </div>
  );
}
