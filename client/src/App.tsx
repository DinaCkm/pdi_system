import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import ProvaUticRealtimeGuard from "./components/ProvaUticRealtimeGuard";
import ProvaUticIdentityGuard from "./components/ProvaUticIdentityGuard";
import AdminAvaliacoesShortcut from "./components/AdminAvaliacoesShortcut";
import Home from "./pages/Home";
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
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
import Avaliacoes from "./pages/Avaliacoes";
import Evolucao from "./pages/Evolucao";
import AdminEixosTecnicos from "./pages/AdminEixosTecnicos";
import AdminAvaliacoes from "./pages/AdminAvaliacoes";
import AdminResultadosUtic from "./pages/AdminResultadosUtic";
import ProvaSeguraUtic from "./pages/ProvaSeguraUtic";

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
import ControleExecucao from './pages/ControleExecucao';

function Router() {
  return (
    <Switch>
      <Route path={"/setup"} component={NotFound} />
      <Route path={"/login"} component={Login} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/change-password"} component={ChangePassword} />
      <Route path={"/?"} component={Home} />
      <Route path={"/avaliacoes/utic/prova-segura"}>
        <ProvaUticRealtimeGuard>
          <ProvaUticIdentityGuard>
            <ProvaSeguraUtic />
          </ProvaUticIdentityGuard>
        </ProvaUticRealtimeGuard>
      </Route>
      <Route path={"/dashboard"}><DashboardLayout><Dashboard /></DashboardLayout></Route>
      <Route path={"/central-comando"}><DashboardLayout><CentralComando /></DashboardLayout></Route>
      <Route path={"/404"} component={NotFound} />
      <Route path={"/usuarios"}><DashboardLayout><Users /></DashboardLayout></Route>
      <Route path={"/usuarios/:id/configurar"}>{(params) => (<DashboardLayout><ConfigurarUsuario key={params.id} /></DashboardLayout>)}</Route>
      <Route path={"/importar-usuarios"}><DashboardLayout><ImportarUsuarios /></DashboardLayout></Route>
      <Route path={"/competencias"}><DashboardLayout><Competencias /></DashboardLayout></Route>
      <Route path={"/importar-competencias"}><DashboardLayout><ImportarCompetencias /></DashboardLayout></Route>
      <Route path={"/departamentos"}><DashboardLayout><Departamentos /></DashboardLayout></Route>
      <Route path={"/ciclos"}><DashboardLayout><Ciclos /></DashboardLayout></Route>
      <Route path={"/pdis"}><DashboardLayout><PDIs /></DashboardLayout></Route>
      <Route path={"/pdis/:id"}>{(params) => (<DashboardLayout><PDIDetalhes key={params.id} /></DashboardLayout>)}</Route>
      <Route path={"/meu-pdi"}><DashboardLayout><MeuPDI /></DashboardLayout></Route>
      <Route path={"/pdis-equipe"}><DashboardLayout><PDIsEquipe /></DashboardLayout></Route>
      <Route path={"/acoes-equipe"}><DashboardLayout><AcoesEquipe /></DashboardLayout></Route>
      <Route path={"/acoes"}><DashboardLayout><Acoes /></DashboardLayout></Route>
      <Route path={"/acoes/nova"}><DashboardLayout><AcoesNova /></DashboardLayout></Route>
      <Route path={"/acoes/:id"}>{(params) => (<DashboardLayout><AcoesDetalhes key={params.id} /></DashboardLayout>)}</Route>
      <Route path={"/acoes/editar/:id"}>{(params) => (<DashboardLayout><AcoesEditar key={params.id} /></DashboardLayout>)}</Route>
      <Route path={"/minhas-pendencias"}><DashboardLayout><MinhasPendencias /></DashboardLayout></Route>
      <Route path={"/minhas-acoes"}><DashboardLayout><MinhasPendencias /></DashboardLayout></Route>
      <Route path={"/relatorios"}><DashboardLayout><Relatorios /></DashboardLayout></Route>
      <Route path={"/importacao"}><DashboardLayout><Importacao /></DashboardLayout></Route>
      <Route path={"/avaliacoes"}><DashboardLayout><Avaliacoes /></DashboardLayout></Route>
      <Route path={"/evolucao"}><DashboardLayout><Evolucao /></DashboardLayout></Route>
      <Route path={"/admin-eixos-tecnicos"}><DashboardLayout><AdminEixosTecnicos /></DashboardLayout></Route>
      <Route path={"/admin-avaliacoes"}><DashboardLayout><AdminAvaliacoes /></DashboardLayout></Route>
      <Route path={"/admin-avaliacoes/utic/resultados"}><DashboardLayout><AdminResultadosUtic /></DashboardLayout></Route>
      <Route path={"/evidencias-equipe"}><DashboardLayout><EvidenciasEquipe /></DashboardLayout></Route>
      <Route path={"/solicitacoes-equipe"}><DashboardLayout><SolicitacoesEquipe /></DashboardLayout></Route>
      <Route path={"/solicitacoes-admin"}><DashboardLayout><SolicitacoesAdmin /></DashboardLayout></Route>
      <Route path={"/historico-alteracoes"}><DashboardLayout><HistoricoAlteracoes /></DashboardLayout></Route>
      <Route path={"/minhas-solicitacoes"}><DashboardLayout><MinhasSolicitacoes /></DashboardLayout></Route>
      <Route path={"/auditoria"}><DashboardLayout><Auditoria /></DashboardLayout></Route>
      <Route path={"/auditoria-exclusoes"}><DashboardLayout><AuditoriaExclusoes /></DashboardLayout></Route>
      <Route path={"/relatorio-acoes-vencidas"}><DashboardLayout><RelatorioAcoesVencidas /></DashboardLayout></Route>
      <Route path={"/admin-dashboard"}><DashboardLayout><AdminDashboard /></DashboardLayout></Route>
      <Route path={"/analise-lideranca"}><DashboardLayout><AnaliseLideranca /></DashboardLayout></Route>
      <Route path={"/solicitacoes-acoes"}><DashboardLayout><SolicitacoesAcoes /></DashboardLayout></Route>
      <Route path={"/normas-regras"}><DashboardLayout><NormasRegras /></DashboardLayout></Route>
      <Route path={"/admin-normas-regras"}><DashboardLayout><AdminNormasRegras /></DashboardLayout></Route>
      <Route path={"/gestao-gerente"}><DashboardLayout><GestaoGerente /></DashboardLayout></Route>
      <Route path={"/controle-execucao"}><DashboardLayout><ControleExecucao /></DashboardLayout></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const ensurePointerEvents = () => {
      if (document.body.style.pointerEvents !== "auto") document.body.style.pointerEvents = "auto";
    };
    ensurePointerEvents();
    const interval = setInterval(ensurePointerEvents, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <Toaster />
        <AdminAvaliacoesShortcut />
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;