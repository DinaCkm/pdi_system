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
import { PASSWORD_POLICY_TEXT, validatePasswordStrength } from "@/lib/passwordPolicy";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...parsedUser,
              mustChangePassword: false,
            })
          );
        }
      } catch {
        // sem problema se não conseguir ler
      }

      toast.success("Senha alterada com sucesso!");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    },
    onError: (error) => {
      setIsLoading(false);
      toast.error(error.message || "Erro ao alterar senha");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      return toast.error("Informe a senha atual.");
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

    const currentNormalized = currentPassword.normalize("NFKC").trim();
    const newNormalized = newPassword.normalize("NFKC").trim();

    if (currentNormalized === newNormalized) {
      return toast.error("A nova senha deve ser diferente da atual.");
    }

    setIsLoading(true);
    changePasswordMutation.mutate({
      currentPassword,
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
            Por segurança, altere sua senha temporária antes de continuar
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Digite a senha atual"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

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
        </CardContent>
      </Card>
    </div>
  );
}
