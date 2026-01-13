import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SolicitarAjusteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: number;
  actionNome: string;
  currentValues: {
    nome: string;
    descricao: string;
    prazo: string;
  };
}

export function SolicitarAjusteDialog({
  open,
  onOpenChange,
  actionId,
  actionNome,
  currentValues,
}: SolicitarAjusteDialogProps) {
  const [justificativa, setJustificativa] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoPrazo, setNovoPrazo] = useState("");

  // Buscar estatísticas de solicitações
  const { data: stats, isLoading: loadingStats } = trpc.actions.getAdjustmentStats.useQuery(
    { actionId },
    { enabled: open }
  );

  const solicitarMutation = trpc.actions.solicitarAjuste.useMutation({
    onSuccess: () => {
      toast.success("Solicitação de ajuste enviada com sucesso!");
      onOpenChange(false);
      setJustificativa("");
      setNovoNome("");
      setNovaDescricao("");
      setNovoPrazo("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (!justificativa.trim()) {
      toast.error("Justificativa é obrigatória");
      return;
    }

    if (justificativa.length < 10) {
      toast.error("Justificativa deve ter pelo menos 10 caracteres");
      return;
    }

    const camposAjustar: any = {};
    if (novoNome) camposAjustar.nome = novoNome;
    if (novaDescricao) camposAjustar.descricao = novaDescricao;
    if (novoPrazo) camposAjustar.prazo = novoPrazo;

    if (Object.keys(camposAjustar).length === 0) {
      toast.error("Informe pelo menos um campo para ajustar");
      return;
    }

    solicitarMutation.mutate({
      actionId,
      justificativa,
      camposAjustar,
    });
  };

  const renderAlert = () => {
    if (loadingStats) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Carregando...</AlertTitle>
          <AlertDescription>Verificando disponibilidade de solicitações...</AlertDescription>
        </Alert>
      );
    }

    if (!stats) return null;

    // Caso 1: Há solicitação pendente
    if (stats.motivoBloqueio === 'pending') {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Solicitação Pendente</AlertTitle>
          <AlertDescription>
            Você já possui uma solicitação de ajuste pendente para esta ação. 
            Aguarde a avaliação do Admin antes de solicitar um novo ajuste.
          </AlertDescription>
        </Alert>
      );
    }

    // Caso 2: Limite de 5 atingido
    if (stats.motivoBloqueio === 'limit') {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Limite Atingido</AlertTitle>
          <AlertDescription>
            Você atingiu o limite de 5 solicitações de ajuste para esta ação. 
            Não é possível solicitar mais ajustes.
          </AlertDescription>
        </Alert>
      );
    }

    // Caso 3: Pode solicitar (mostrar contador)
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Solicitações Disponíveis</AlertTitle>
        <AlertDescription className="text-blue-700">
          <div className="space-y-1">
            <p>
              <strong>{stats.restantes} de 5</strong> solicitações disponíveis
            </p>
            <p className="text-sm">
              Você já utilizou {stats.total} solicitação{stats.total !== 1 ? 'ões' : ''} para esta ação.
            </p>
            {stats.restantes <= 2 && stats.restantes > 0 && (
              <p className="text-sm font-medium mt-2">
                ⚠️ Atenção: Restam apenas {stats.restantes} solicitação{stats.restantes !== 1 ? 'ões' : ''}. Use com sabedoria!
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  const isBlocked = stats?.motivoBloqueio !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Ajuste na Ação</DialogTitle>
          <DialogDescription>
            Ação: <strong>{actionNome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Aviso de Limitações */}
          {renderAlert()}

          {/* Formulário (desabilitado se bloqueado) */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="justificativa">
                Justificativa da Solicitação <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="justificativa"
                placeholder="Explique por que você precisa deste ajuste (mínimo 10 caracteres)..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={4}
                disabled={isBlocked}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {justificativa.length}/10 caracteres mínimos
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Campos que Deseja Ajustar</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Preencha apenas os campos que você deseja modificar. Deixe em branco os que não precisam de alteração.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="novoNome">Novo Nome da Ação</Label>
                  <Input
                    id="novoNome"
                    placeholder={`Atual: ${currentValues.nome}`}
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    disabled={isBlocked}
                  />
                </div>

                <div>
                  <Label htmlFor="novaDescricao">Nova Descrição</Label>
                  <Textarea
                    id="novaDescricao"
                    placeholder={`Atual: ${currentValues.descricao.substring(0, 100)}...`}
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    rows={3}
                    disabled={isBlocked}
                  />
                </div>

                <div>
                  <Label htmlFor="novoPrazo">Novo Prazo</Label>
                  <Input
                    id="novoPrazo"
                    type="date"
                    value={novoPrazo}
                    onChange={(e) => setNovoPrazo(e.target.value)}
                    disabled={isBlocked}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Prazo atual: {new Date(currentValues.prazo).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isBlocked || solicitarMutation.isPending}
          >
            {solicitarMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
