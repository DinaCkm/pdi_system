import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, Target, Calendar, FileText, Bell, BarChart, Building2, CheckSquare, MessageSquarePlus, Upload, ClipboardCheck, History, Trash2, AlertTriangle, TrendingUp, ChevronDown, ChevronRight, User, Send, BookOpen, ExternalLink } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { PendencyBadge } from "./PendencyBadge";
import { ModalPrimeiroAcesso } from "./ModalPrimeiroAcesso";

const getMenuItems = (userRole: string) => {
  const items: Array<{ icon: any; label: string; path: string; section?: string; external?: boolean; tooltipText?: string }> = [];
  
  if (userRole === "admin") {
    // Normas e Regras - primeiro item
    items.push(
      { icon: BookOpen, label: "Normas e Regras", path: "/normas-regras", section: "normas" },
      { icon: BookOpen, label: "Gerenciar Normas e Regras", path: "/admin-normas-regras", section: "normas" },
    );
    // Seção Estratégico
    items.push(
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", section: "estrategico" },
      { icon: TrendingUp, label: "Análise de Liderança", path: "/analise-lideranca", section: "estrategico" },
      { icon: BarChart, label: "Relatórios", path: "/relatorios", section: "estrategico" },
      { icon: AlertTriangle, label: "Relatório de Ações Vencidas", path: "/relatorio-acoes-vencidas", section: "estrategico" },
    );
    // Seção Operacional
    items.push(
      { icon: Building2, label: "Central de Comando", path: "/central-comando", section: "operacional" },
      { icon: ClipboardCheck, label: "Admin Dashboard", path: "/admin-dashboard", section: "operacional" },
      { icon: Users, label: "Usuários", path: "/usuarios", section: "operacional" },
      { icon: Building2, label: "Departamentos", path: "/departamentos", section: "operacional" },
      { icon: Target, label: "Competências", path: "/competencias", section: "operacional" },
      { icon: FileText, label: "PDIs", path: "/pdis", section: "operacional" },
      { icon: CheckSquare, label: "Ações", path: "/acoes", section: "operacional" },
      // { icon: ClipboardCheck, label: "Evidências Pendentes", path: "/evidencias-pendentes", section: "operacional" }, // REMOVIDO - consolidado no Admin Dashboard
      { icon: MessageSquarePlus, label: "Histórico de Alteração nas Ações", path: "/solicitacoes-admin", section: "operacional" },
      { icon: Upload, label: "Importação em Massa", path: "/importacao", section: "operacional" },
      { icon: Trash2, label: "Auditoria de Exclusões", path: "/auditoria-exclusoes", section: "operacional" },
    );
    // Seção Solicitações
    items.push(
      { icon: MessageSquarePlus, label: "Ações Solicitadas por Empregados", path: "/solicitacoes-acoes", section: "solicitacoes" },
    );
  } else if (userRole === "lider") {
    items.push(
      { icon: BookOpen, label: "Normas e Regras", path: "/normas-regras" },
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: FileText, label: "Meu PDI", path: "/meu-pdi" },
      { icon: CheckSquare, label: "Minhas Ações", path: "/minhas-acoes" },
      { icon: Send, label: "Minhas Solicitações de Ação", path: "/solicitacoes-acoes?aba=minhas" },
      { icon: Target, label: "PDIs da Equipe", path: "/pdis-equipe" },
      { icon: CheckSquare, label: "Ações da Equipe", path: "/acoes-equipe" },
      { icon: MessageSquarePlus, label: "Solicitações de Ajustes nas Ações/Equipe", path: "/solicitacoes-equipe" },
      { icon: Users, label: "Solicitações de Novas Ações/Equipe", path: "/solicitacoes-acoes?aba=equipe" },
      { icon: ExternalLink, label: "Ecossistema do Bem - Líderes e Sucessores", path: "https://ecolider.evoluirckm.com", external: true },
    );
  } else if (userRole === "gerente") {
    // Gerente tem acesso de leitura: Dashboard, PDIs, Ações, Histórico, Relatório de Vencidas
    items.push(
      { icon: BookOpen, label: "Normas e Regras", path: "/normas-regras" },
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: FileText, label: "PDIs", path: "/pdis" },
      { icon: CheckSquare, label: "Ações", path: "/acoes" },
      { icon: ClipboardCheck, label: "Gestão de Ações e Evidências", path: "/gestao-gerente" },
      { icon: History, label: "Histórico de Alterações", path: "/solicitacoes-admin" },
      { icon: AlertTriangle, label: "Relatório de Ações Vencidas", path: "/relatorio-acoes-vencidas" },
      { icon: FileText, label: "Ações Solicitadas por Empregados", path: "/solicitacoes-acoes" },
    );
  } else if (userRole === "colaborador") {
    items.push(
      { icon: BookOpen, label: "Normas e Regras", path: "/normas-regras" },
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: FileText, label: "Meu PDI", path: "/meu-pdi" },
      { icon: CheckSquare, label: "Minhas Ações", path: "/minhas-acoes" },
      { icon: History, label: "Minhas Solicitações", path: "/minhas-solicitacoes" },
      { icon: FileText, label: "Solicitar Ação", path: "/solicitacoes-acoes" },
      { icon: ExternalLink, label: "EcoLider - Líderes e Sucessores", path: "https://ecolider.evoluirckm.com", external: true, tooltipText: "Somente para participantes do banco de líderes sucessores" },
    );
  }
  
  return items;
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Cleanup de Portals removido - causava erro de removeChild

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuItems = getMenuItems(user?.role || "colaborador");
  const activeMenuItem = menuItems.find((item: any) => {
    // Para itens com query params, comparar o pathname base + query
    if (item.path.includes('?')) {
      return (location + window.location.search) === item.path;
    }
    return item.path === location;
  });
  const isMobile = useIsMobile();
  
  // Estados para seções colapsáveis do menu Admin
  const [estrategicoOpen, setEstrategicoOpen] = useState(true);
  const [operacionalOpen, setOperacionalOpen] = useState(true);

  // Cleanup de Portals removido - causava erro de removeChild
  
  // Carregar contagem de pendências (só se autenticado)
  const { data: pendenciesSummary } = trpc.notifications.getPendenciesSummary.useQuery(
    undefined,
    { 
      refetchInterval: 30000, // Atualizar a cada 30 segundos
      enabled: Boolean(user) // Só faz query se usuário está logado
    }
  );

  // Carregar contadores nao lidos por role (só se autenticado)
  const { data: unreadCounts } = trpc.notifications.getUnreadCounts.useQuery(
    undefined,
    { 
      refetchInterval: 30000, // Atualizar a cada 30 segundos
      enabled: Boolean(user) // Só faz query se usuário está logado
    }
  );

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-14 justify-center">
            <div className="flex items-center gap-2 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663192322263/Uksxtg83ZJDkZPJL3fCmwT/eco-do-bem-logo-cropped_564da75a.png" alt="Eco do Bem" className="h-8 w-auto" />
                  <span className="font-semibold text-blue-600 tracking-tight truncate text-sm">
                    Eco do Bem
                  </span>
                </div>
              ) : (
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663192322263/Uksxtg83ZJDkZPJL3fCmwT/eco-do-bem-logo-cropped_564da75a.png" alt="Eco do Bem" className="h-7 w-auto" />
              )}
            </div>
          </SidebarHeader>

          {/* Informações do Usuário - Card Compacto */}
          {!isCollapsed && user && (
            <div className="mx-3 my-2 px-3 py-2 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold text-gray-800 truncate leading-tight">
                    {user.name || "Usuário"}
                  </h3>
                  <span className="inline-block mt-0.5 px-1.5 py-0 text-[9px] uppercase tracking-wider font-bold rounded-full bg-blue-600 text-white leading-relaxed">
                    {user.role === "admin" ? "Administrador" : user.role === "lider" ? "Líder" : user.role === "gerente" ? "Gerente" : "Colaborador"}
                  </span>
                </div>
              </div>
              {/* Info compacta */}
              <div className="mt-1.5 pt-1.5 border-t border-blue-100 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
                  <span className="text-[11px] text-gray-600 truncate">
                    {user.departamentoNome || "Sem Departamento"}
                  </span>
                </div>
                {user.role !== "admin" && user.role !== "gerente" && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-orange-500 shrink-0" />
                    <span className="text-[11px] text-gray-600 truncate">
                      Líder: {user.leaderName || "Não definido"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <SidebarContent className="gap-0 overflow-y-auto flex-1">
            {/* Menu simples para Admin - lista direta sem separação */}
            {user?.role === "admin" && (
              <SidebarMenu className="px-2 py-1">
                {menuItems.map((item: any) => {
                  const isActive = location === item.path;
                  let badgeCount = 0;
                  
                  if (item.path === "/evidencias-pendentes") {
                    badgeCount = unreadCounts?.evidenciasPendentes || 0;
                  }
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-9 transition-all font-normal"
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                        />
                        <span className="text-sm">{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                            {badgeCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
            
            {/* Menu normal para outros roles */}
            {user?.role !== "admin" && (
              <SidebarMenu className="px-2 py-1">
                {menuItems.map((item: any) => {
                  // Para itens com query params, comparar pathname + search
                  const isActive = item.external ? false : item.path.includes('?')
                    ? (location + window.location.search) === item.path
                    : location === item.path;
                  let badgeCount = 0;
                  
                  if (item.path === "/evidencias-pendentes" && user?.role === "admin") {
                    badgeCount = unreadCounts?.evidenciasPendentes || 0;
                  }
                  // Badge para solicitações da equipe pendentes (Líder, CKM, Admin)
                  if (item.path === "/solicitacoes-acoes?aba=equipe" || item.path === "/solicitacoes-acoes") {
                    badgeCount = unreadCounts?.solicitacoesEquipePendentes || 0;
                  }
                  return (
                    <SidebarMenuItem key={item.path}>
                      {item.external && (
                        <div className="mx-2 my-1 border-t border-blue-200" />
                      )}
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => {
                          if (item.external) {
                            window.open(item.path, '_blank', 'noopener,noreferrer');
                          } else if (item.path.includes('?')) {
                            // Para itens com query params, usar window.location para navegar
                            const [pathname, search] = item.path.split('?');
                            setLocation(pathname);
                            // Atualizar query params via history API
                            window.history.replaceState(null, '', item.path);
                            // Disparar evento para que a página detecte a mudança
                            window.dispatchEvent(new Event('popstate'));
                          } else {
                            setLocation(item.path);
                          }
                        }}
                        tooltip={item.tooltipText || item.label}
                        title={item.tooltipText || ''}
                        className={`h-9 transition-all font-normal relative ${item.external ? 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg mt-1' : ''}`}
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive ? "text-primary" : item.external ? "text-blue-600" : ""}`}
                        />
                        <span className={item.external ? 'text-xs font-medium' : ''}>{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
                            {badgeCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarContent>

          <SidebarFooter className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-7 w-7 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-xs font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    // RESET NUCLEAR DO LOGOUT
                    localStorage.clear(); // Limpa tudo
                    window.location.href = '/'; // Força recarregamento para o login
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair e Fechar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 max-w-full overflow-x-hidden">{children}</main>
      </SidebarInset>
      <ModalPrimeiroAcesso />
    </>
  );
}
