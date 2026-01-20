import { trpc } from '@/lib/trpc';

interface HistoryModalProps {
  actionId: number | null;
  onClose: () => void;
}

export function HistoryModal({ actionId, onClose }: HistoryModalProps) {
  // Se não tiver ID, nem renderiza
  if (!actionId) return null;

  const { data: historico, isLoading } = trpc.actions.getHistory.useQuery({ actionId });

  // FUNÇÃO QUE CONSERTA O "DATA INVÁLIDA"
  const formatarValor = (campo: string, valor: string | null) => {
    if (!valor) return <em>(vazio)</em>;
    
    // Só formata como data SE o campo for Prazo
    if (campo === 'Prazo') {
      try {
        // Tenta formatar ISO ou YYYY-MM-DD
        return new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      } catch {
        return valor; // Se falhar, mostra o texto original
      }
    }
    // Para Título, Descrição, Status: retorna o texto normal
    return valor;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Histórico de Alterações</h2>
          <button onClick={onClose} style={{ fontWeight: 'bold', cursor: 'pointer', background: 'none', border: 'none' }}>X</button>
        </div>

        {isLoading ? (
          <p>Carregando...</p>
        ) : historico?.length === 0 ? (
          <p style={{ color: '#666' }}>Nenhuma alteração registrada.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {historico?.map((item: any) => (
              <div key={item.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', fontSize: '14px' }}>
                <p>
                  <strong>{item.autorNome || 'Usuário'}</strong> alterou 
                  <span style={{ color: '#2563eb', fontWeight: 'bold' }}> {item.campo} </span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', marginTop: '4px' }}>
                  <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>
                    {formatarValor(item.campo, item.valorAnterior)}
                  </span>
                  <span>→</span>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                    {formatarValor(item.campo, item.valorNovo)}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  {new Date(item.data).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        )}
        
        <button 
          onClick={onClose}
          style={{ marginTop: '20px', width: '100%', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
