import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data?.token) {
        localStorage.setItem("token", data.token);

        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        toast.success("Login realizado com sucesso!");

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      } else {
        toast.error("Erro: token não recebido do servidor");
        setIsLoading(false);
      }
    },
    onError: (error) => {
      const msg = error.message || "Erro ao fazer login";
      toast.error(msg);
      setIsLoading(false);
    },
  });

  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      toast.success(
        data?.message ||
          "Se existir uma conta com este e-mail, enviaremos um link de redefinição."
      );
      setIsSendingReset(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao solicitar redefinição de senha");
      setIsSendingReset(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      return toast.error("Informe o e-mail");
    }

    if (!password.trim()) {
      return toast.error("Informe a senha");
    }

    setIsLoading(true);
    loginMutation.mutate({
      email: email.trim(),
      password,
    });
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      return toast.error("Informe seu e-mail para receber o link de redefinição");
    }

    setIsSendingReset(true);
    forgotPasswordMutation.mutate({
      email: email.trim(),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pt-6 pb-2 gap-0">
          <div className="flex justify-center">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663192322263/Uksxtg83ZJDkZPJL3fCmwT/eco-do-bem-logo-cropped_564da75a.png"
              alt="Eco do Bem"
              className="w-[280px] h-auto"
            />
          </div>
          <CardTitle className="text-sm font-semibold text-blue-900 tracking-wide mt-2">
            Ecossistema de Desenvolvimento do B.E.M
          </CardTitle>
          <p className="text-sm font-bold text-amber-600 tracking-widest mt-0.5">
            EVOLUIR
          </p>
          <CardDescription className="mt-3 text-xs">
            Entre com seu e-mail corporativo e sua senha
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Corporativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isSendingReset}
              className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              {isSendingReset ? "Enviando link..." : "Esqueci minha senha"}
            </button>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-gray-100 border-t border-gray-200 flex items-center justify-center">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} Eco do Bem - Ecossistema de Desenvolvimento - Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
