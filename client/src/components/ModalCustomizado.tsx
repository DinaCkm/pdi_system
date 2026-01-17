import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const ModalCustomizado: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  onConfirm,
  confirmText = 'Salvar',
  cancelText = 'Cancelar',
  isLoading = false
}) => {
  useEffect(() => {
    if (isOpen) {
      // Bloqueia o scroll do fundo mas garante que eventos de clique funcionem
      document.body.style.overflow = 'hidden';
      document.body.style.pointerEvents = 'auto';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
      style={{ zIndex: 9999, pointerEvents: 'auto' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-2xl text-gray-400 hover:text-black"
            disabled={isLoading}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer com Botões */}
        {onConfirm && (
          <div className="flex items-center justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button 
              onClick={onConfirm}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? `${confirmText}...` : confirmText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
