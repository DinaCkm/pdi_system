import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, X } from "lucide-react";

export default function AlertaPDIPendente() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data: alertas } = trpc.dashboard.getAlertasPDI.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const temAlertaEmpregado = (alertas?.empregado?.length ?? 0) > 0;
  const temAlertaLider = (alertas?.lider?.length ?? 0) > 0;
  const temAlerta = temAlertaEmpregado || temAlertaLider;

  useEffect(() => {
    if (temAlerta && !dismissed) {
      setOpen(true);
    }
  }, [temAlerta, dismissed]);

  const handleClose = () => {
    setOpen(false);
    setDismissed(true);
  };

  if (!temAlerta) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()} // impede fechar clicando fora
        onEscapeKeyDown={(e) => e.preventDefault()}   // impede fechar com ESC
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle className="text-base font-semibold text-gray-900">
              Atenção: PDI aguardando aprovação
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* Alerta para o empregado */}
          {temAlertaEmpregado && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <Bell className="h-4 w-4 shrink-0" />
                Seu PDI ainda não foi aprovado pelo seu líder
              </p>
              <ul className="space-y-1">
                {alertas!.empregado.map((pdi) => (
                  <li key={pdi.id} className="text-sm text-amber-700 pl-6">
                    • <span className="font-medium">{pdi.titulo || `PDI #${pdi.id}`}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 pt-1">
                Fale com o seu líder e solicite a aprovação formal do plano.
              </p>
            </div>
          )}

          {/* Alerta para o líder */}
          {temAlertaLider && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Bell className="h-4 w-4 shrink-0" />
                Você tem {alertas!.lider.length} PDI{alertas!.lider.length > 1 ? "s" : ""} da sua equipe aguardando sua aprovação
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {alertas!.lider.map((pdi) => (
                  <li key={pdi.id} className="text-sm text-blue-700 pl-6">
                    • <span className="font-medium">{pdi.colaboradorNome}</span>
                    {pdi.titulo ? ` — ${pdi.titulo}` : ""}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-blue-600 pt-1">
                Acesse a lista de PDIs da sua equipe e realize a aprovação formal de cada plano.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleClose}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white"
          >
            <X className="h-4 w-4 mr-2" />
            Entendi, fechar aviso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
