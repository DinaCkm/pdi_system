import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: setupData, isLoading: setupLoading } = trpc.system.checkSetup.useQuery();

  useEffect(() => {
    // 1. Aguarda as checagens de segurança terminarem
    if (authLoading || setupLoading) return;

    // 2. Se não há banco configurado, vai para Setup
    if (setupData?.needsSetup) {
      setLocation("/setup");
      return;
    }

    // 3. Se NÃO está logado, manda para o Login
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    // 4. Se ESTÁ logado, manda para o Dashboard (Onde o erro está ocorrendo)
    if (isAuthenticated && user) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, authLoading, setupLoading, setupData, setLocation]);

  // Tela de transição (Dina verá isso por apenas 1 segundo agora)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h2 className="text-xl font-semibold">Iniciando Gestão de PDI...</h2>
      <p className="text-muted-foreground">Preparando seu ambiente seguro.</p>
    </div>
  );
}
