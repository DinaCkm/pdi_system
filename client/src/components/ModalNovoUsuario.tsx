import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ModalNovoUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    cpf: string;
    cargo: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Modal customizado para criar novo usuário
 * Implementação sem Radix UI para evitar conflitos de eventos
 * 
 * Características:
 * - Z-index: 50 (modal) e 40 (overlay)
 * - Bloqueia scroll do body quando aberto
 * - Fecha ao clicar fora (overlay)
 * - Fecha ao pressionar ESC
 * - Limpa estado ao fechar
 */
export function ModalNovoUsuario({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: ModalNovoUsuarioProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    cargo: "",
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Query para validar CPF duplicado (apenas quando CPF tem 11 dígitos)
  const cpfLimpo = formData.cpf.replace(/\D/g, "");
  const { data: cpfExistente, isLoading: validandoCpf } = trpc.users.buscarPorCpf.useQuery(
    { cpf: cpfLimpo },
    { enabled: cpfLimpo.length === 11 }
  );

  const cpfDuplicado = !!cpfExistente;

  // Gerenciar scroll do body
  useEffect(() => {
    if (isOpen) {
      // Bloquear scroll
      document.body.style.overflow = "hidden";
      document.body.style.pointerEvents = "auto"; // Garantir que body aceita eventos
    } else {
      // Restaurar scroll
      document.body.style.overflow = "auto";
      document.body.style.pointerEvents = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
      document.body.style.pointerEvents = "auto";
    };
  }, [isOpen]);

  // Gerenciar tecla ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  const handleClose = () => {
    // Limpar formulário
    setFormData({
      name: "",
      email: "",
      cpf: "",
      cargo: "",
    });
    // Chamar callback
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Fechar apenas se clicar no overlay, não no modal
    if (e.target === overlayRef.current) {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Validar campos obrigatórios
      if (!formData.name.trim()) {
        toast.error("Nome é obrigatório");
        return;
      }
      if (!formData.email.trim()) {
        toast.error("Email é obrigatório");
        return;
      }
      if (!formData.cpf.trim()) {
        toast.error("CPF é obrigatório");
        return;
      }
      if (!formData.cargo.trim()) {
        toast.error("Cargo é obrigatório");
        return;
      }

      // Chamar callback de submit
      await onSubmit(formData);

      // Fechar modal após sucesso
      handleClose();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast.error(error.message || "Erro ao criar usuário");
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    if (field === "cpf") {
      setFormData({ ...formData, [field]: formatCPF(value) });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - z-index 40 */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200"
        style={{
          pointerEvents: "auto",
        }}
      />

      {/* Modal - z-index 50 */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          pointerEvents: "auto",
        }}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Criar Novo Usuário
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Preencha os dados básicos. Configure perfil e hierarquia depois.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
              aria-label="Fechar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="modal-name" className="text-sm font-medium text-gray-700">
                Nome Completo *
              </Label>
              <Input
                id="modal-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Ex: João Silva"
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="modal-email" className="text-sm font-medium text-gray-700">
                E-mail *
              </Label>
              <Input
                id="modal-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Ex: joao@empresa.com"
                disabled={isLoading}
                className="w-full"
              />
            </div>

            {/* CPF */}
            <div className="space-y-2">
              <Label htmlFor="modal-cpf" className="text-sm font-medium text-gray-700">
                CPF *
              </Label>
              <Input
                id="modal-cpf"
                type="text"
                value={formData.cpf}
                onChange={(e) => handleInputChange("cpf", e.target.value)}
                placeholder="000.000.000-00"
                disabled={isLoading || validandoCpf}
                className="w-full"
              />
              {cpfDuplicado && (
                <p className="text-xs text-red-500 mt-1 font-medium animate-pulse">
                  Este CPF ja esta cadastrado no sistema.
                </p>
              )}
              {validandoCpf && cpfLimpo.length === 11 && (
                <p className="text-xs text-blue-500 mt-1 font-medium">
                  Validando CPF...
                </p>
              )}
            </div>

            {/* Cargo */}
            <div className="space-y-2">
              <Label htmlFor="modal-cargo" className="text-sm font-medium text-gray-700">
                Cargo *
              </Label>
              <Input
                id="modal-cargo"
                type="text"
                value={formData.cargo}
                onChange={(e) => handleInputChange("cargo", e.target.value)}
                placeholder="Ex: Desenvolvedor"
                disabled={isLoading}
                className="w-full"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading || validandoCpf || cpfDuplicado}
              className="flex-1 bg-gradient-to-r from-blue-600 to-orange-600 hover:from-blue-700 hover:to-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : validandoCpf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validando CPF...
                </>
              ) : cpfDuplicado ? (
                "CPF Duplicado"
              ) : (
                "Criar Usuário"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
