import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface HistoryModalProps {
  isOpen: boolean;
  actionId: number;
  onClose: () => void;
}

export function HistoryModal({ isOpen, actionId, onClose }: HistoryModalProps) {
  // Busca o histórico apenas quando o modal está aberto
  const { data: historico, isLoading } = trpc.actions.getHistory.useQuery(
    { actionId },
    { enabled: isOpen && !!actionId }
  );

  // Função auxiliar para formatar a data da alteração (o rodapé do card)
  const formatarDataEvento = (dataString: string) => {
    try {
      if (!dataString) return "-";
      return new Date(dataString).toLocaleString('pt-BR');
    } catch (e) {
      return dataString;
    }
  };

  // Função PRINCIPAL que corrige o erro "Invalid Date" nos valores
  const renderValor = (campo: string, valor: string | null) => {
    if (!valor) return <span className="text-gray-400 italic">(vazio)</span>;

    // LÓGICA CORRIGIDA: Só formata se for PRAZO
    if (campo === 'Prazo') {
      // Se já vier formatado do backend (ex: 15/03/2026), mostra direto
      if (valor.includes('/')) return valor;
      
      // Se vier formato ISO (2026-03-15...), tenta formatar
      try {
        const date = new Date(valor);
        if (isNaN(date.getTime())) return valor; // Se falhar, devolve o texto original
        return date.toLocaleDateString('pt-BR');
      } catch {
        return valor;
      }
    }

    // Para Título, Descrição e outros: Retorna texto puro (sem tentar converter para data)
    return valor;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !historico || historico.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma alteração registrada para esta ação.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historico.map((item: any, index: number) => (
              <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-2 border-b pb-2">
                  <div>
                    <span className="text-sm text-gray-500 mr-1">Usuário alterou</span>
                    <span className="font-bold text-blue-600">{item.campo}</span>
                  </div>
                  {/* Data da alteração corrigida */}
                  <div className="text-xs text-gray-400">
                    {formatarDataEvento(item.createdAt || item.data)}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm mt-2">
                  <div className="flex-1 p-2 bg-red-50 rounded border border-red-100 text-red-700 line-through break-all">
                    {renderValor(item.campo, item.valorAnterior)}
                  </div>
                  
                  <div className="text-gray-400">➜</div>
                  
                  <div className="flex-1 p-2 bg-green-50 rounded border border-green-100 text-green-700 font-medium break-all">
                    {renderValor(item.campo, item.valorNovo)}
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-400 text-right">
                  Alterado por: {item.autorNome || item.userName || 'Sistema'}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
