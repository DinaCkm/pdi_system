import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      console.log("[Login] Sucesso! Data recebida:", data);
      
      if (data?.token) {
        // 1. Salva o Token no localStorage
        localStorage.setItem('token', data.token);
        console.log("[Login] Token salvo no localStorage");
        
        // 2. Salva dados do usuário
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          console.log("[Login] Usuário salvo no localStorage:", data.user);
        }
        
        // 3. Mostra mensagem de sucesso
        toast.success("Login realizado com sucesso!");
        
        // 4. Aguarda um pouco e redireciona para o dashboard
        console.log("[Login] Redirecionando para /dashboard em 500ms...");
        setTimeout(() => {
          console.log("[Login] Executando redirecionamento...");
          window.location.href = "/dashboard";
        }, 500);
      } else {
        console.error("[Login] Erro: token não recebido", data);
        toast.error("Erro: token não recebido do servidor");
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error("[Login] Erro de autenticação:", error);
      toast.error(error.message || "Erro ao fazer login");
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !cpf) return toast.error("Preencha todos os campos");

    console.log("[Login] Iniciando login com email:", email);
    setIsLoading(true);
    
    // Limpa CPF antes de enviar
    const cpfLimpo = cpf.replace(/\D/g, "");
    console.log("[Login] CPF limpo:", cpfLimpo);
    
    loginMutation.mutate({ email, cpf: cpfLimpo });
  };

  // Formatação visual do CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{3})/, "$1.$2");
    setCpf(v);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663192322263/Uksxtg83ZJDkZPJL3fCmwT/logo-bem-cerebro_582bcb56.png" alt="B.E.M - Ecossistema de Desenvolvimento" className="h-20 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-600">Gestão de PDI</CardTitle>
          <CardDescription>Entre com seu e-mail e CPF</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Corporativo</Label>
              <Input 
                id="email" type="email" placeholder="nome@empresa.com" required 
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input 
                id="cpf" placeholder="000.000.000-00" required 
                value={cpf} onChange={handleCpfChange}
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Rodapé Fixo */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-gray-100 border-t border-gray-200 flex items-center justify-center">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} B.E.M - Ecossistema de Desenvolvimento do B.E.M. - Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
