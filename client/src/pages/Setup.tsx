import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PASSWORD_POLICY_TEXT, validatePasswordStrength } from "@/lib/passwordPolicy";

export default function Setup() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    cpf: "",
    newPassword: "",
    confirmPassword: "",
  });

  const setupMutation = trpc.auth.bootstrapAdminPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha inicial do administrador cadastrada com sucesso!");
      setLocation("/login");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar senha inicial");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validatePasswordStrength(formData.newPassword);

    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("A confirmação da senha não confere.");
      return;
    }

    setupMutation.mutate({
      email: formData.email.trim(),
      cpf: formData.cpf,
      newPassword: formData.newPassword,
    });
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) {
      if (value.length > 9) {
        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
      } else if (value.length > 6) {
        value = value.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
      } else if (value.length > 3) {
        value = value.replace(/(\d{3})(\d{0,3})/, "$1.$2");
      }
      setFormData({ ...formData, cpf: value });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              <span className="bg-gradient-to-r from-blue-600 to-orange-600 bg-clip-text text-transparent">
                Ativação Inicial do Administrador
              </span>
            </CardTitle>
            <CardDescription className="mt-2">
              Cadastre a primeira senha de acesso do administrador
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do Administrador</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={setupMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF do Administrador</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleCpfChange}
                required
                disabled={setupMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Digite a nova senha"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                required
                disabled={setupMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                {PASSWORD_POLICY_TEXT}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme a nova senha"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={setupMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-700 hover:to-orange-700"
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Cadastrar Senha Inicial"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Use o e-mail e o CPF do administrador já cadastrado no sistema.</p>
            <p className="mt-1">Depois disso, o acesso normal será feito pela tela de login com senha.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
