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
  const [loginType, setLoginType] = useState<"cpf" | "studentId">("cpf");
  const [cpf, setCpf] = useState("");
  const [studentId, setStudentId] = useState("");
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
      const msg = error.message || "Erro ao fazer login";
      // Tratar mensagens técnicas de rate limiting
      if (msg.includes('Rate exceeded') || msg.includes('rate limit') || msg.includes('Unexpected token')) {
        toast.error('Muitas tentativas de acesso. Por favor, aguarde alguns instantes e tente novamente.');
      } else {
        toast.error(msg);
      }
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!email) {
    return toast.error("Informe o e-mail");
  }

  if (loginType === "cpf") {
    if (!cpf) {
      return toast.error("Informe o CPF");
    }

    const cpfLimpo = cpf.replace(/\D/g, "");

    if (!cpfLimpo) {
      return toast.error("Informe o CPF");
    }

    setIsLoading(true);
    loginMutation.mutate({
      email,
      loginType: "cpf",
      cpf: cpfLimpo,
    });
    return;
  }

  if (loginType === "studentId") {
    const normalizedStudentId = studentId.trim();

    if (!normalizedStudentId) {
      return toast.error("Informe o ID do aluno");
    }

    setIsLoading(true);
    loginMutation.mutate({
      email,
      loginType: "studentId",
      studentId: normalizedStudentId,
    });
  }
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
        <CardHeader className="text-center pt-6 pb-2 gap-0">
          <div className="flex justify-center">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663192322263/Uksxtg83ZJDkZPJL3fCmwT/eco-do-bem-logo-cropped_564da75a.png" alt="Eco do Bem" className="w-[280px] h-auto" />
          </div>
          <CardTitle className="text-sm font-semibold text-blue-900 tracking-wide mt-2">Ecossistema de Desenvolvimento do B.E.M</CardTitle>
          <p className="text-sm font-bold text-amber-600 tracking-widest mt-0.5">EVOLUIR</p>
          <CardDescription className="mt-3 text-xs">
  Entre com seu e-mail e escolha CPF ou ID do aluno
</CardDescription>
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
  <Label htmlFor="loginType">Tipo de acesso</Label>
  <select
    id="loginType"
    value={loginType}
    onChange={(e) => setLoginType(e.target.value as "cpf" | "studentId")}
    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
  >
    <option value="cpf">CPF</option>
    <option value="studentId">ID do aluno</option>
  </select>
</div>
            {loginType === "cpf" ? (
  <div className="space-y-2">
    <Label htmlFor="cpf">CPF</Label>
    <Input
      id="cpf"
      placeholder="000.000.000-00"
      value={cpf}
      onChange={handleCpfChange}
      required
    />
  </div>
) : (
  <div className="space-y-2">
    <Label htmlFor="studentId">ID do Aluno</Label>
    <Input
      id="studentId"
      placeholder="Informe seu ID do aluno"
      value={studentId}
      onChange={(e) => setStudentId(e.target.value)}
      required
    />
  </div>
)}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Rodapé Fixo */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-gray-100 border-t border-gray-200 flex items-center justify-center">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} Eco do Bem - Ecossistema de Desenvolvimento - Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
