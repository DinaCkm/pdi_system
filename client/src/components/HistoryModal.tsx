import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface HistoryModalProps {
  isOpen: boolean;
  actionId: number | null;
  onClose: () => void;
}

export function HistoryModal({ isOpen, actionId, onClose }: HistoryModalProps) {
  const { data: historico, isLoading } = trpc.actions.getHistory.useQuery(
    { actionId: actionId || 0 },
    { enabled: isOpen && !!actionId }
  );

  // LÓGICA BLINDADA: Só formata se for REALMENTE data
  const renderValor = (campo: string, valor: string | null) => {
    if (!valor || valor === 'null' || valor === 'undefined') return <span className="text-gray-400 italic">(vazio)</span>;

    // Se o campo for Prazo, tentamos formatar. Se der erro, devolvemos o texto original.
    if (campo === 'Prazo') {
       if (valor.includes('/')) return valor; // Já formatado
       if (!valor.includes('-')) return valor; // Não parece ISO date
       try {
         return new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
       } catch {
         return valor;
       }
    }
    
    // Para Título, Descrição e Competência: NUNCA tente formatar data.
    return valor;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Histórico</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : !historico?.length ? (
          <p className="text-center text-gray-500 py-8">Sem histórico.</p>
        ) : (
          <div className="space-y-4">
            {historico.map((item: any, i: number) => (
              <div key={i} className="border-b pb-4">
                 <div className="font-semibold text-sm mb-2">
                   {item.autorNome || 'Sistema'} alterou <span className="text-blue-600">{item.campo}</span>
                 </div>
                 <div className="flex gap-4 text-sm bg-gray-50 p-2 rounded">
                   <div className="flex-1 text-red-600 line-through">{renderValor(item.campo, item.valorAnterior)}</div>
                   <div className="text-gray-400">➜</div>
                   <div className="flex-1 text-green-600 font-medium">{renderValor(item.campo, item.valorNovo)}</div>
                 </div>
                 <div className="text-xs text-gray-400 mt-1">
                   {new Date(item.createdAt || item.data).toLocaleString('pt-BR')}
                 </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
