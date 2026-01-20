import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface HistoryModalProps {
  isOpen: boolean;
  actionId: number;
  onClose: () => void;
}

export function HistoryModal({ isOpen, actionId, onClose }: HistoryModalProps) {
  const { data: historico = [] } = trpc.actions.getHistory.useQuery(
    { actionId },
    { enabled: isOpen && !!actionId }
  );

  // Função para formatar valores do histórico
  const formatarValor = (valor: string | null | undefined, campo?: string) => {
    if (!valor) return '-';
    
    // Se for um campo de data (prazo), tenta formatar como data
    if (campo === 'prazo' || campo === 'Prazo') {
      try {
        const date = new Date(valor);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR');
        }
      } catch {}
    }
    
    // Para outros campos, retorna o valor como esta
    return valor;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          zIndex: 1000,
          padding: '24px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
            Histórico de Alterações
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        {historico && historico.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {historico.map((item: any, index: number) => (
              <div
                key={index}
                style={{
                  paddingBottom: '16px',
                  borderBottom:
                    index < historico.length - 1 ? '1px solid #e0e0e0' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontWeight: '600', color: '#333' }}>
                    {item.campo}
                  </span>
                  <span style={{ fontSize: '12px', color: '#999' }}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString('pt-BR')
                      : '-'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                  }}
                >
                  <span
                    style={{
                      color: '#d32f2f',
                      backgroundColor: '#ffebee',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {formatarValor(item.valorAnterior, item.campo)}
                  </span>
                  <span style={{ color: '#666' }}>→</span>
                  <span
                    style={{
                      color: '#388e3c',
                      backgroundColor: '#e8f5e9',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {formatarValor(item.valorNovo, item.campo)}
                  </span>
                </div>
                {item.alteradoPor && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                    Alterado por: {item.alteradoPor}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#999', textAlign: 'center', padding: '32px 0' }}>
            Nenhuma alteração registrada
          </div>
        )}
      </div>
    </>
  );
}
