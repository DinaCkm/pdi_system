import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SolicitarAjusteModalMelhoradoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: string;
  actionTitle: string;
  currentData: {
    titulo?: string;
    descricao?: string;
    prazo?: string;
    macroCompetencia?: string;
  };
  hasPendingRequest: boolean;
  onSuccess?: () => void;
}

export function SolicitarAjusteModalMelhorado({
  open,
  onOpenChange,
  actionId,
  actionTitle,
  currentData,
  hasPendingRequest,
  onSuccess,
}: SolicitarAjusteModalMelhoradoProps) {
  const [justificativa, setJustificativa] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Checkboxes para selecionar quais campos o colaborador quer alterar
  const [camposSelecionados, setCamposSelecionados] = useState({
    titulo: false,
    descricao: false,
    prazo: false,
    macroCompetencia: false,
  });

  // Resetar campos quando o modal abre com uma nova ação
  useEffect(() => {
    if (open) {
      setJustificativa("");
      setSuccess(false);
      setCamposSelecionados({
        titulo: false,
        descricao: false,
        prazo: false,
        macroCompetencia: false,
      });
    }
  }, [open, actionId]);

  const createMutation = trpc.adjustmentRequests.create.useMutation();

  const handleCheckboxChange = (campo: keyof typeof camposSelecionados) => {
    setCamposSelecionados(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
  };

  const getCamposSelecionadosArray = () => {
    const campos: string[] = [];
    if (camposSelecionados.titulo) campos.push("Título");
    if (camposSelecionados.descricao) campos.push("Descrição");
    if (camposSelecionados.prazo) campos.push("Prazo");
    if (camposSelecionados.macroCompetencia) campos.push("Macro Competência");
    return campos;
  };

  const handleSubmit = async () => {
    const camposArray = getCamposSelecionadosArray();
    
    if (camposArray.length === 0) {
      toast.error("Selecione pelo menos um campo que deseja alterar");
      return;
    }

    if (justificativa.trim().length < 10) {
      toast.error("Justificativa deve ter no mínimo 10 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      await createMutation.mutateAsync({
        actionId: parseInt(actionId),
        // Salvar os campos selecionados no camposAjustar
        camposAjustar: JSON.stringify({ camposSelecionados: camposArray }),
        justificativa: justificativa,
        tipoSolicitante: "colaborador",
      });

      setSuccess(true);
      toast.success("✅ Solicitação de ajuste enviada com sucesso!");
      
      // Chamar callback de sucesso para invalidar cache
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setJustificativa("");
        setCamposSelecionados({
          titulo: false,
          descricao: false,
          prazo: false,
          macroCompetencia: false,
        });
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao enviar solicitação:", error);
      const errorMessage = error?.message || "Erro ao enviar solicitação de ajuste";
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-center mb-2">
              Solicitação Enviada!
            </h2>
            <p className="text-center text-sm text-gray-600">
              Sua solicitação de ajuste foi enviada com sucesso. O administrador
              analisará e você receberá uma notificação quando for avaliada.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Formatar prazo para exibição
  const formatPrazo = (prazo?: string) => {
    if (!prazo) return "Não definido";
    try {
      return new Date(prazo).toLocaleDateString("pt-BR");
    } catch {
      return prazo;
    }
  };

  const nenhumCampoSelecionado = !camposSelecionados.titulo && !camposSelecionados.descricao && 
    !camposSelecionados.prazo && !camposSelecionados.macroCompetencia;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Alteração</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Ação - Somente Leitura */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Info className="h-4 w-4" />
              <span className="text-sm font-medium">Dados atuais da ação (somente leitura)</span>
            </div>
            
            <div className="grid gap-3">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Título</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {currentData.titulo || "Não definido"}
                </p>
              </div>
              
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Descrição</span>
                <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">
                  {currentData.descricao || "Não definida"}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Prazo</span>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {formatPrazo(currentData.prazo)}
                  </p>
                </div>
                
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Macro Competência</span>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {currentData.macroCompetencia || "Não definida"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {hasPendingRequest && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Você já possui uma solicitação de ajuste pendente de análise.
                Aguarde a avaliação do administrador antes de enviar uma nova
                solicitação.
              </AlertDescription>
            </Alert>
          )}

          {/* Seleção de Campos a Alterar */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium">
              Quais campos você deseja alterar? *
            </Label>
            <p className="text-xs text-gray-500 mb-3">
              Selecione um ou mais campos que você gostaria de solicitar alteração
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="campo-titulo"
                  checked={camposSelecionados.titulo}
                  onCheckedChange={() => handleCheckboxChange('titulo')}
                  disabled={hasPendingRequest}
                />
                <label
                  htmlFor="campo-titulo"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Título
                </label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="campo-descricao"
                  checked={camposSelecionados.descricao}
                  onCheckedChange={() => handleCheckboxChange('descricao')}
                  disabled={hasPendingRequest}
                />
                <label
                  htmlFor="campo-descricao"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Descrição
                </label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="campo-prazo"
                  checked={camposSelecionados.prazo}
                  onCheckedChange={() => handleCheckboxChange('prazo')}
                  disabled={hasPendingRequest}
                />
                <label
                  htmlFor="campo-prazo"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Prazo
                </label>
              </div>
              
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <Checkbox
                  id="campo-competencia"
                  checked={camposSelecionados.macroCompetencia}
                  onCheckedChange={() => handleCheckboxChange('macroCompetencia')}
                  disabled={hasPendingRequest}
                />
                <label
                  htmlFor="campo-competencia"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Macro Competência
                </label>
              </div>
            </div>
            
            {nenhumCampoSelecionado && (
              <p className="text-xs text-orange-600 mt-2">
                Selecione pelo menos um campo para continuar
              </p>
            )}
          </div>

          {/* Campo de Justificativa */}
          <div className="border-t pt-4">
            <Label htmlFor="justificativa" className="text-sm font-medium">
              Descreva detalhadamente o que você gostaria de alterar *
            </Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder={`Explique o que você gostaria de alterar nos campos selecionados. Por exemplo:\n\n• Se selecionou Prazo: "Gostaria de alterar o prazo de 15/03/2026 para 30/04/2026 porque..."\n• Se selecionou Título: "Solicito alteração do título para 'Novo Título' porque..."`}
              disabled={hasPendingRequest}
              className="mt-2 min-h-[120px]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Mínimo 10 caracteres. Seja específico sobre o que deseja alterar e o motivo.
            </p>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Como funciona:</strong> Sua solicitação será analisada pelo administrador. 
              Se aprovada, o administrador fará as alterações necessárias na ação. 
              Você receberá uma notificação quando ela for avaliada.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || hasPendingRequest}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || hasPendingRequest || nenhumCampoSelecionado}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
