import { useMemo, useState } from "react";
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
import { PASSWORD_POLICY_TEXT, validatePasswordStrength } from "@/lib/passwordPolicy";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
      setIsLoading(false);

      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao redefinir senha");
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      return toast.error("Link inválido ou sem token de redefinição.");
    }

    if (!newPassword.trim()) {
      return toast.error("Informe a nova senha.");
    }

    const passwordError = validatePasswordStrength(newPassword);

    if (passwordError) {
      return toast.error(passwordError);
    }

    if (!confirmPassword.trim()) {
      return toast.error("Confirme a nova senha.");
    }

    if (newPassword !== confirmPassword) {
      return toast.error("A confirmação da senha não confere.");
    }

    setIsLoading(true);
    resetPasswordMutation.mutate({
      token,
      newPassword,
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
            Cadastre sua nova senha de acesso
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!token ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600">
                Este link de redefinição está inválido.
              </p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  window.location.href = "/login";
                }}
              >
                Voltar para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Digite a nova senha"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {PASSWORD_POLICY_TEXT}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme a nova senha"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Salvar nova senha"
                )}
              </Button>
            </form>
          )}
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
