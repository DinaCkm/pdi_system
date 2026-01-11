import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle, Users as UsersIcon, Target, FileText, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Verificar se sistema precisa de setup
  const { data: setupData, isLoading: setupLoading } = trpc.auth.needsSetup.useQuery();

  useEffect(() => {
    // Aguardar verificação de setup e autenticação
    if (setupLoading || loading) return;
    
    // Se precisa de setup, redirecionar para /setup
    if (setupData?.needsSetup) {
      setLocation("/setup");
      return;
    }
    
    // Se não está autenticado, redirecionar para login
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    
    // Se está autenticado, redirecionar baseado no perfil
    if (user) {
      if (user.role === "admin") {
        setLocation("/usuarios");
      } else if (user.role === "lider") {
        setLocation("/pendencias");
      } else {
        setLocation("/pdis");
      }
    }
  }, [setupLoading, setupData, loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Sistema PDI
            </h1>
          </div>
          <Button onClick={() => setLocation("/login")}>
            Entrar <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-600 to-secondary bg-clip-text text-transparent">
            Gestão de Planos de Desenvolvimento Individual
          </h2>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Sistema completo para gerenciar o desenvolvimento de competências de colaboradores através de ações estruturadas, 
            com ciclos semestrais, aprovações hierárquicas e evidências de conclusão.
          </p>
          <Button size="lg" onClick={() => setLocation("/login")} className="text-lg px-8">
            Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <UsersIcon className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Múltiplos Perfis</CardTitle>
              <CardDescription>
                Sistema com 3 perfis de usuário: Administrador, Líder e Colaborador, cada um com permissões específicas.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-secondary transition-colors">
            <CardHeader>
              <Target className="w-12 h-12 text-secondary mb-4" />
              <CardTitle>Gestão de Competências</CardTitle>
              <CardDescription>
                Hierarquia estruturada de competências em 3 níveis: Bloco → Macro → Micro para organização eficiente.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <CheckCircle className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Fluxo de Aprovação</CardTitle>
              <CardDescription>
                Processo estruturado: Admin cria → Líder aprova → Colaborador executa → Envia evidências → Admin avalia.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-secondary transition-colors">
            <CardHeader>
              <FileText className="w-12 h-12 text-secondary mb-4" />
              <CardTitle>Evidências Completas</CardTitle>
              <CardDescription>
                Sistema de evidências com upload de arquivos e textos descritivos, avaliados em pacote único.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Bell className="w-12 h-12 text-primary mb-4" />
              <CardTitle>Notificações Automáticas</CardTitle>
              <CardDescription>
                Alertas em cada etapa do fluxo e notificações de vencimento 7 dias antes do prazo.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-secondary transition-colors">
            <CardHeader>
              <FileText className="w-12 h-12 text-secondary mb-4" />
              <CardTitle>Relatórios Detalhados</CardTitle>
              <CardDescription>
                Relatórios de acompanhamento para Admin com visão completa de PDIs, ações e progresso.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <Card className="bg-gradient-to-br from-primary to-secondary text-white border-0">
          <CardContent className="py-12 text-center">
            <h3 className="text-3xl font-bold mb-4">Pronto para começar?</h3>
            <p className="text-lg mb-6 text-white/90">
              Acesse o sistema e comece a gerenciar os planos de desenvolvimento da sua equipe.
            </p>
            <Button size="lg" variant="secondary" onClick={() => setLocation("/login")} className="text-lg px-8">
              Acessar Sistema <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm py-8">
        <div className="container text-center text-muted-foreground">
          <p>© 2025 Sistema de Gestão de PDI. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
