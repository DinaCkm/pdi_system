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
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, Target, FileText, BarChart, Building2, CheckSquare, MessageSquarePlus, Upload, ClipboardCheck, History, Trash2, AlertTriangle, TrendingUp, ChevronDown, ChevronRight, Send, BookOpen, ExternalLink, Lock } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { ModalPrimeiroAcesso } from "./ModalPrimeiroAcesso";
import { SystemLockBanner } from "./SystemLockBanner";

type MenuItem = {
  icon: any;
  label: string;
  path: string;
  section?: string;
  external?: boolean;
  tooltipText?: string;
};

const ADMIN_SECTION_LABELS: Record<string, string> = {
  visao: "Visão Geral",
  desenvolvimento: "Desenvolvimento e PDI",
  pessoas: "Gestão de Pessoas e Estrutura",
  acompanhamento: "Acompanhamento e Resultados",
  solicitacoes: "Solicitações e Alterações",
  administracao: "Administração do Sistema",
  normas: "Normas e Governança",
};

const ADMIN_SECTION_ORDER = [
  "visao",
  "desenvolvimento",
  "pessoas",
  "acompanhamento",
  "solicitacoes",
  "administracao",
  "normas",
];

const getMenuItems = (userRole: string) => {
  const items: MenuItem[] = [];
  
  if (userRole === "admin") {
    items.push(
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", section: "visao" },

      { icon: Target, label: "Competências", path: "/competencias", section: "desenvolvimento" },
      { icon: ClipboardCheck, label: "Avaliações", path: "/avaliacoes", section: "desenvolvimento" },
      { icon: FileText, label: "PDIs", path: "/pdis", section: "desenvolvimento" },
      { icon: CheckSquare, label: "Ações", path: "/acoes", section: "desenvolvimento" },
      { icon: TrendingUp, label: "Evolução", path: "/evolucao", section: "desenvolvimento" },

      { icon: Users, label: "Usuários", path: "/usuarios", section: "pessoas" },
      { icon: Building2, label: "Departamentos", path: "/departamentos", section: "pessoas" },
      { icon: Lock, label: "Controle de Execução do PDI", path: "/controle-execucao", section: "pessoas" },

      { icon: TrendingUp, label: "Análise de Liderança", path: "/analise-lideranca", section: "acompanhamento" },
      { icon: ClipboardCheck, label: "Admin Dashboard", path: "/admin-dashboard", section: "acompanhamento" },
      { icon: BarChart, label: "Relatórios", path: "/relatorios", section: "acompanhamento" },
      { icon: AlertTriangle, label: "Relatório de Ações Vencidas", path: "/relatorio-acoes-vencidas", section: "acompanhamento" },

      { icon: MessageSquarePlus, label: "Ações Solicitadas por Empregados", path: "/solicitacoes-acoes", section: "solicitacoes" },
      { icon: History, label: "Histórico de Alteração nas Ações", path: "/solicitacoes-admin", section: "solicitacoes" },

      { icon: Building2, label: "Central de Comando", path: "/central-comando", section: "administracao" },
      { icon: Upload, label: "Importação em Massa", path: "/importacao", section: "administracao" },
      { icon: Trash2, label: "Auditoria de Exclusões", path: "/auditoria-exclusoes", section: "administracao" },

      { icon: BookOpen, label: "Normas e Regras", path: "/normas-regras", section: "normas" },
      { icon: BookOpen, label: "Gerenciar Normas e Regras", path: "/admin-normas-regras", section: "normas" },
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
    items.push(
      { icon: BookOpen, label: "Normas e Regras", path: "/normas-regras" },
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: TrendingUp, label: "Análise de Liderança", path: "/analise-lideranca" },
      { icon: FileText, label: "PDIs", path: "/pdis" },
      { icon: CheckSquare, label: "Ações", path: "/acoes" },
      { icon: ClipboardCheck, label: "Gestão de Ações e Evidências", path: "/gestao-gerente" },
      { icon: History, label: "Histórico de Alterações", path: "/solicitacoes-admin" },
      { icon: AlertTriangle, label: "Relatório de Ações Vencidas", path: "/relatorio-acoes-vencidas" },
      { icon: FileText, label: "Ações Solicitadas por Empregados", path: "/solicitacoes-acoes" },
      { icon: Lock, label: "Controle de Execução do PDI", path: "/controle-execucao" },
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

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Faça login para continuar
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              O acesso a esta área exige autenticação. Faça login para continuar.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = "/";
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Ir para o login
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
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuItems = getMenuItems(user?.role || "colaborador");
  const activeMenuItem = menuItems.find((item: any) => {
    if (item.path.includes('?')) {
      return (location + window.location.search) === item.path;
    }
    return item.path === location;
  });
  const isMobile = useIsMobile();

  const activeAdminSection = user?.role === "admin"
    ? menuItems.find((item) => item.path === location)?.section
    : undefined;

  const [adminSectionsOpen, setAdminSectionsOpen] = useState<Record<string, boolean>>({
    visao: true,
    desenvolvimento: false,
    pessoas: false,
    acompanhamento: false,
    solicitacoes: false,
    administracao: false,
    normas: false,
  });

  useEffect(() => {
    if (user?.role === "admin" && activeAdminSection) {
      setAdminSectionsOpen((current) => ({
        ...current,
        [activeAdminSection]: true,
      }));
    }
  }, [user?.role, activeAdminSection]);
  
  const { data: pendenciesSummary } = trpc.notifications.getPendenciesSummary.useQuery(
    undefined,
    { 
      refetchInterval: 30000,
      enabled: Boolean(user)
    }
  );

  const { data: unreadCounts } = trpc.notifications.getUnreadCounts.useQuery(
    undefined,
    { 
      refetchInterval: 30000,
      enabled: Boolean(user)
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

  const renderAdminItem = (item: MenuItem) => {
    const isActive = location === item.path;
    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => setLocation(item.path)}
          tooltip={item.label}
          className="h-9 transition-all font-normal"
        >
          <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
          <span className="text-sm">{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

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
            {user?.role === "admin" && (
              <SidebarMenu className="px-2 py-1">
                {isCollapsed
                  ? menuItems.map(renderAdminItem)
                  : ADMIN_SECTION_ORDER.map((section) => {
                      const sectionItems = menuItems.filter((item) => item.section === section);
                      if (sectionItems.length === 0) return null;
                      const isOpen = adminSectionsOpen[section] ?? false;
                      const sectionHasActive = sectionItems.some((item) => item.path === location);

                      return (
                        <div key={section} className="mb-1">
                          <button
                            type="button"
                            onClick={() => setAdminSectionsOpen((current) => ({ ...current, [section]: !isOpen }))}
                            className={`w-full flex items-center justify-between rounded-md px-2 py-2 text-left text-xs font-semibold transition-colors hover:bg-accent ${sectionHasActive ? "text-primary" : "text-muted-foreground"}`}
                            aria-expanded={isOpen}
                          >
                            <span>{ADMIN_SECTION_LABELS[section]}</span>
                            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                          {isOpen && (
                            <div className="pl-1">
                              {sectionItems.map(renderAdminItem)}
                            </div>
                          )}
                        </div>
                      );
                    })}
              </SidebarMenu>
            )}
            
            {user?.role !== "admin" && (
              <SidebarMenu className="px-2 py-1">
                {menuItems.map((item: any) => {
                  const isActive = item.external ? false : item.path.includes('?')
                    ? (location + window.location.search) === item.path
                    : location === item.path;
                  let badgeCount = 0;

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
                            const [pathname] = item.path.split('?');
                            setLocation(pathname);
                            window.history.replaceState(null, '', item.path);
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
                  onClick={async () => {
                    await logout();
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
        <SystemLockBanner enabled={Boolean(user)} />
        <main className="flex-1 max-w-full overflow-x-hidden">{children}</main>
      </SidebarInset>
      <ModalPrimeiroAcesso />
    </>
  );
}
