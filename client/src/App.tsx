import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Competencias from "./pages/Competencias";
import Departamentos from "./pages/Departamentos";
import Ciclos from "./pages/Ciclos";
import PDIs from "./pages/PDIs";
import MinhasPendencias from "./pages/MinhasPendencias";
import Relatorios from "./pages/Relatorios";

function Router() {  return (
    <Switch>
      <Route path={"/setup"} component={Setup} />
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      
      {/* Rotas protegidas com DashboardLayout */}
      <Route path={"/usuarios"}>
        <DashboardLayout>
          <Users />
        </DashboardLayout>
      </Route>
      
      <Route path={"/competencias"}>
        <DashboardLayout>
          <Competencias />
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
      
      <Route path={"/pendencias"}>
        <DashboardLayout>
          <MinhasPendencias />
        </DashboardLayout>
      </Route>
      
      <Route path={"/relatorios"}>
        <DashboardLayout>
          <Relatorios />
        </DashboardLayout>
      </Route>
      
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
