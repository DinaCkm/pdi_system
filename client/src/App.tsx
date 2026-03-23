import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import Users from "./pages/Users";
import ConfigurarUsuario from "./pages/ConfigurarUsuario";
import Competencias from "./pages/Competencias";
import Departamentos from "./pages/Departamentos";
import Ciclos from "./pages/Ciclos";
import PDIs from "./pages/PDIs";
import PDIDetalhes from "./pages/PDIDetalhes";
import Acoes from "./pages/Acoes";
import MinhasPendencias from "./pages/MinhasPendencias";
import Relatorios from "./pages/Relatorios";
import Importacao from "./pages/Importacao";

import PDIsEquipe from "./pages/PDIsEquipe";
import MeuPDI from "./pages/MeuPDI";
import ImportarUsuarios from "./pages/ImportarUsuarios";
import ImportarCompetencias from "./pages/ImportarCompetencias";
// import EvidenciasPendentes from "./pages/EvidenciasPendentes"; // REMOVIDO - duplicado com Admin Dashboard
import EvidenciasEquipe from "./pages/EvidenciasEquipe";
// import MinhasAcoes from "./pages/MinhasAcoes"; // DESATUALIZADO
import HistoricoAlteracoes from "./pages/HistoricoAlteracoes";
import MinhasSolicitacoes from "./pages/MinhasSolicitacoes";
import Auditoria from "./pages/Auditoria";
import AuditoriaExclusoes from "./pages/AuditoriaExclusoes";
import { Dashboard } from "./pages/Dashboard";
import { AcoesNova } from "./pages/AcoesNova";
import AcoesEditar from "./pages/AcoesEditar";
import AcoesDetalhes from "./pages/AcoesDetalhes";
import AcoesEquipe from "./pages/AcoesEquipe";
import SolicitacoesEquipe from "./pages/SolicitacoesEquipe";
import SolicitacoesAdmin from "./pages/SolicitacoesAdmin";
import CentralComando from "./pages/CentralComando";
import AdminDashboard from "./pages/AdminDashboard";
import RelatorioAcoesVencidas from "./pages/RelatorioAcoesVencidas";
import AnaliseLideranca from './pages/AnaliseLideranca';
import SolicitacoesAcoes from './pages/SolicitacoesAcoes';
import NormasRegras from './pages/NormasRegras';
import AdminNormasRegras from './pages/AdminNormasRegras';
import GestaoGerente from './pages/GestaoGerente';

function Router() {
  return (
    <Switch>
      <Route path={"/setup"} component={Setup} />
      <Route path={"/login"} component={Login} />
      <Route path={"/?"} component={Home} />
      
      <Route path={"/dashboard"}>
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      
      <Route path={"/central-comando"}>
        <DashboardLayout>
          <CentralComando />
        </DashboardLayout>
      </Route>
      
      <Route path={"/404"} component={NotFound} />
      
      {/* Rotas protegidas com DashboardLayout */}
      <Route path={"/usuarios"}>
        <DashboardLayout>
          <Users />
        </DashboardLayout>
      </Route>
      
      <Route path={"/usuarios/:id/configurar"}>
        {(params) => (
          <DashboardLayout>
            <ConfigurarUsuario key={params.id} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/importar-usuarios"}>
        <DashboardLayout>
          <ImportarUsuarios />
        </DashboardLayout>
      </Route>
      
      <Route path={"/competencias"}>
        <DashboardLayout>
          <Competencias />
        </DashboardLayout>
      </Route>
      
      <Route path={"/importar-competencias"}>
        <DashboardLayout>
          <ImportarCompetencias />
        </DashboardLayout>
      </Route>
      
      <Route path={"/departamentos"}>
        <DashboardLayout>
          <Departamentos />
        </DashboardLayout>
      </Route>
      
      <Route path={"/ciclos"}>
        <DashboardLayout>
          <Ciclos />
        </DashboardLayout>
      </Route>
      
      <Route path={"/pdis"}>
        <DashboardLayout>
          <PDIs />
        </DashboardLayout>
      </Route>
      
      <Route path={"/pdis/:id"}>
        {(params) => (
          <DashboardLayout>
            <PDIDetalhes key={params.id} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/meu-pdi"}>
        <DashboardLayout>
          <MeuPDI />
        </DashboardLayout>
      </Route>
      
      <Route path={"/pdis-equipe"}>
        <DashboardLayout>
          <PDIsEquipe />
        </DashboardLayout>
      </Route>
      
      <Route path={"/acoes-equipe"}>
        <DashboardLayout>
          <AcoesEquipe />
        </DashboardLayout>
      </Route>
      
      <Route path={"/acoes"}>
        <DashboardLayout>
          <Acoes />
        </DashboardLayout>
      </Route>
      
      <Route path={"/acoes/nova"}>
        <DashboardLayout>
          <AcoesNova />
        </DashboardLayout>
      </Route>
      
      <Route path={"/acoes/:id"}>
        {(params) => (
          <DashboardLayout>
            <AcoesDetalhes key={params.id} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/acoes/editar/:id"}>
        {(params) => (
          <DashboardLayout>
            <AcoesEditar key={params.id} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/minhas-pendencias"}>
        <DashboardLayout>
          <MinhasPendencias />
        </DashboardLayout>
      </Route>
      
      <Route path={"/minhas-acoes"}>
        <DashboardLayout>
          <MinhasPendencias />
        </DashboardLayout>
      </Route>
      
      <Route path={"/relatorios"}>
        <DashboardLayout>
          <Relatorios />
        </DashboardLayout>
      </Route>
      
      <Route path={"/importacao"}>
        <DashboardLayout>
          <Importacao />
        </DashboardLayout>
      </Route>
      
      {/* Rota evidencias-pendentes removida - funcionalidade consolidada no Admin Dashboard */}
      
      <Route path={"/evidencias-equipe"}>
        <DashboardLayout>
          <EvidenciasEquipe />
        </DashboardLayout>
      </Route>
      
      <Route path={"/solicitacoes-equipe"}>
        <DashboardLayout>
          <SolicitacoesEquipe />
        </DashboardLayout>
      </Route>
      
      <Route path={"/solicitacoes-admin"}>
        <DashboardLayout>
          <SolicitacoesAdmin />
        </DashboardLayout>
      </Route>
      
      <Route path={"/historico-alteracoes"}>
        <DashboardLayout>
          <HistoricoAlteracoes />
        </DashboardLayout>
      </Route>
      
      <Route path={"/minhas-solicitacoes"}>
        <DashboardLayout>
          <MinhasSolicitacoes />
        </DashboardLayout>
      </Route>
      
      <Route path={"/auditoria"}>
        <DashboardLayout>
          <Auditoria />
        </DashboardLayout>
      </Route>
      
      <Route path={"/auditoria-exclusoes"}>
        <DashboardLayout>
          <AuditoriaExclusoes />
        </DashboardLayout>
      </Route>
      
      <Route path={"/relatorio-acoes-vencidas"}>
        <DashboardLayout>
          <RelatorioAcoesVencidas />
        </DashboardLayout>
      </Route>
      
      <Route path={"/admin-dashboard"}>
        <DashboardLayout>
          <AdminDashboard />
        </DashboardLayout>
      </Route>
      
      <Route path={"/analise-lideranca"}>
        <DashboardLayout>
          <AnaliseLideranca />
        </DashboardLayout>
      </Route>
      
      <Route path={"/solicitacoes-acoes"}>
        <DashboardLayout>
          <SolicitacoesAcoes />
        </DashboardLayout>
      </Route>
      
      <Route path={"/normas-regras"}>
        <DashboardLayout>
          <NormasRegras />
        </DashboardLayout>
      </Route>
      
      <Route path={"/admin-normas-regras"}>
        <DashboardLayout>
          <AdminNormasRegras />
        </DashboardLayout>
      </Route>
      
      <Route path={"/gestao-gerente"}>
        <DashboardLayout>
          <GestaoGerente />
        </DashboardLayout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Garantir que pointer-events está sempre em 'auto' ao carregar páginas
  useEffect(() => {
    const ensurePointerEvents = () => {
      if (document.body.style.pointerEvents !== "auto") {
        document.body.style.pointerEvents = "auto";
      }
    };

    // Executar na montagem
    ensurePointerEvents();

    // Executar periodicamente para garantir que nenhum outro código bloqueie
    const interval = setInterval(ensurePointerEvents, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <Toaster />
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
