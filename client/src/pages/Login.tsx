import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...data.user,
              mustChangePassword: !!data.mustChangePassword,
            })
          );
        }

        toast.success("Login realizado com sucesso!");

        setTimeout(() => {
          window.location.href = data.mustChangePassword
            ? "/change-password"
            : "/dashboard";
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.18),_transparent_34%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm lg:grid-cols-2">
          <div className="hidden lg:flex flex-col justify-center border-r border-white/10 bg-gradient-to-br from-purple-500/20 via-cyan-400/10 to-teal-300/40 p-10">
            <div className="max-w-xl">
              <div className="mb-8">
                <img
                  src="https://i.ibb.co/HTWppQBP/eco-do-bem-logo-cropped-564da75a.png"
                  alt="Eco do Bem"
                  className="w-[300px] max-w-full h-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                />
              </div>

              <h1 className="text-4xl font-bold leading-tight text-white">
                Bem-vindo(a)!
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-center p-4 sm:p-8 lg:p-10">
            <Card className="w-full max-w-md rounded-3xl border border-white/10 bg-white shadow-2xl">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-8 text-center lg:hidden">
                  <div className="flex justify-center">
                   <div className="rounded-full bg-white shadow-2xl p-8 flex items-center justify-center w-[240px] h-[240px]">
  <img
    src="https://i.ibb.co/271MBKsS/eco-5.png"
    alt="Eco do Bem"
    className="w-[150px] h-[150px] object-contain"
  />
</div>
                  </div>
                </div>

                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    Acesse sua conta
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Entre com seu e-mail corporativo e sua senha para acessar a
                    plataforma. <i>Caso seja seu primeiro acesso, clique em:
                    Esqueci minha senha.</i>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-700"
                    >
                      E-mail corporativo
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nome@empresa.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="password"
                        className="text-sm font-medium text-slate-700"
                      >
                        Senha
                      </Label>

                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={isSendingReset}
                        className="text-xs font-semibold text-teal-700 transition hover:text-teal-800 disabled:opacity-60"
                      >
                        {isSendingReset ? "Enviando link..." : "Esqueci minha senha"}
                      </button>
                    </div>

                    <Input
                      id="password"
                      type="password"
                      placeholder="Digite sua senha"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-teal-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>

                <div className="mt-8 rounded-2xl bg-slate-50 px-4 py-3 text-center">
                  <p className="text-xs leading-5 text-slate-500">
                    Ambiente corporativo de desenvolvimento e acompanhamento de
                    ações, evidências e evolução profissional.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <footer className="relative z-10 border-t border-white/10 bg-black/20 px-4 py-4 backdrop-blur-sm">
        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Eco do B.E.M. - Ecossistema de Desenvolvimento - Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
