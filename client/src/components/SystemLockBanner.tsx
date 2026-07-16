import { useEffect, useState } from "react";
import { Lock, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSystemLock } from "@/_core/hooks/useSystemLock";

const POPUP_SESSION_KEY = "pdi-lock-popup-seen";

/**
 * Exibe, para TODOS os usuários logados, o aviso de encerramento do período de execução:
 * - um pop-up ao entrar (uma vez por sessão), e
 * - um banner fixo no topo enquanto o sistema estiver encerrado.
 */
export function SystemLockBanner({ enabled = true }: { enabled?: boolean }) {
  const { locked, message } = useSystemLock(enabled);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (!locked) {
      // Sistema reaberto: limpa a marca para que o pop-up volte a aparecer num próximo encerramento
      try {
        sessionStorage.removeItem(POPUP_SESSION_KEY);
      } catch {}
      return;
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem(POPUP_SESSION_KEY) === "1";
    } catch {}
    if (!seen) setPopupOpen(true);
  }, [locked]);

  const handleClosePopup = () => {
    try {
      sessionStorage.setItem(POPUP_SESSION_KEY, "1");
    } catch {}
    setPopupOpen(false);
  };

  if (!locked) return null;

  return (
    <>
      {/* Banner fixo no topo */}
      <div className="w-full bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-2.5 flex items-center gap-2 justify-center text-center sticky top-0 z-30">
        <Lock className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="text-sm font-medium">{message}</span>
      </div>

      {/* Pop-up ao entrar (uma vez por sessão) */}
      <Dialog open={popupOpen} onOpenChange={(v) => { if (!v) handleClosePopup(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <Info className="w-7 h-7 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg">Aviso Importante</DialogTitle>
            <DialogDescription className="text-center text-base text-gray-700 pt-2">
              {message}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center text-sm text-muted-foreground px-2">
            O sistema está disponível apenas para consulta e visualização. O envio de
            documentos e as solicitações de alteração estão temporariamente indisponíveis.
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleClosePopup} className="min-w-32">Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
