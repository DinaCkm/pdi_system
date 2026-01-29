import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

export default function AcoesEditar() {
  const [, navigate] = useLocation();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const acaoId = parseInt(pathname.split('/').pop() || '0');

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    prazo: '',
    status: '',
    macroId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Queries
  const { data: acao } = trpc.actions.getById.useQuery({ id: acaoId }, { enabled: !!acaoId });
  const { data: macros = [] } = trpc.competencias.listAllMacros.useQuery();
  const { data: historico = [] } = trpc.actions.getHistory.useQuery({ actionId: acaoId }, { enabled: !!acaoId });

  // Utils para invalidar cache
  const utils = trpc.useUtils();

  // Mutations
  const updateMutation = trpc.actions.update.useMutation({
    onSuccess: () => {
      // Invalidar a lista para recarregar
      utils.actions.list.invalidate();
      setTimeout(() => navigate('/acoes'), 300);
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  // Carregar dados da ação
  useEffect(() => {
    if (acao) {
      setFormData({
        titulo: acao.titulo || '',
        descricao: acao.descricao || '',
        prazo: acao.prazo ? new Date(acao.prazo).toISOString().split('T')[0] : '',
        status: acao.status || '',
        macroId: acao.macroId?.toString() || '',
      });
    }
  }, [acao]);

  // ESTE CÓDIGO FORÇA A ATUALIZAÇÃO DOS CAMPOS:
  useEffect(() => {
    if (acao) {
      setFormData({
        titulo: acao.titulo,
        descricao: acao.descricao || "",
        prazo: acao.prazo ? new Date(acao.prazo).toISOString().split('T')[0] : "",
        competenciaId: acao.macroId?.toString() || "",
        status: acao.status
      });
    }
  }, [acao]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.titulo.trim()) newErrors.titulo = 'Título é obrigatório';
    if (!formData.prazo) newErrors.prazo = 'Prazo é obrigatório';
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateMutation.mutate({
      id: acaoId,
      titulo: formData.titulo,
      descricao: formData.descricao,
      prazo: formData.prazo, // Enviar como string no formato YYYY-MM-DD
      status: formData.status,
      macroId: formData.macroId ? parseInt(formData.macroId) : undefined,
    });
  };

  // Funcao para formatar valores do historico
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

  if (!acao) {
    return <div style={{ padding: '24px' }}>Carregando...</div>;
  }

  return (
    <div key={acaoId} style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Editar Ação</h1>
          <p style={{ color: '#666' }}>Atualize os dados da ação</p>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Título */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="titulo" style={{ fontWeight: '500' }}>Título *</label>
            <input
              id="titulo"
              name="titulo"
              type="text"
              value={formData.titulo}
              onChange={handleChange}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: errors.titulo ? '2px solid red' : '1px solid #ccc', 
                borderRadius: '4px', 
                backgroundColor: 'white', 
                color: 'black', 
                fontSize: '14px' 
              }}
            />
            {errors.titulo && <span style={{ color: 'red', fontSize: '12px' }}>{errors.titulo}</span>}
          </div>

          {/* Descrição */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="descricao" style={{ fontWeight: '500' }}>Descrição</label>
            <textarea
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              rows={3}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: '1px solid #ccc', 
                borderRadius: '4px', 
                backgroundColor: 'white', 
                color: 'black', 
                fontSize: '14px', 
                fontFamily: 'inherit' 
              }}
            />
          </div>

          {/* Competência */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="macroId" style={{ fontWeight: '500' }}>Competência</label>
            <select
              id="macroId"
              name="macroId"
              value={formData.macroId}
              onChange={handleChange}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: '1px solid #ccc', 
                borderRadius: '4px', 
                backgroundColor: 'white', 
                color: 'black', 
                fontSize: '14px' 
              }}
            >
              <option value="">Selecione uma competência</option>
              {macros.map((macro: any) => (
                <option key={macro.id} value={macro.id}>
                  {macro.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Prazo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="prazo" style={{ fontWeight: '500' }}>Prazo *</label>
            <input
              id="prazo"
              name="prazo"
              type="date"
              value={formData.prazo}
              onChange={handleChange}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: errors.prazo ? '2px solid red' : '1px solid #ccc', 
                borderRadius: '4px', 
                backgroundColor: 'white', 
                color: 'black', 
                fontSize: '14px' 
              }}
            />
            {errors.prazo && <span style={{ color: 'red', fontSize: '12px' }}>{errors.prazo}</span>}
          </div>

          {/* Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="status" style={{ fontWeight: '500' }}>Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: '1px solid #ccc', 
                borderRadius: '4px', 
                backgroundColor: 'white', 
                color: 'black', 
                fontSize: '14px' 
              }}
            >
              <option value="">Selecione um status</option>
              <option value="nao_iniciada">Não Iniciada</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="atrasada">Atrasada</option>
            </select>
          </div>

          {/* Erro de submit */}
          {errors.submit && (
            <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', fontSize: '14px' }}>
              {errors.submit}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: '16px', paddingTop: '16px' }}>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              style={{ 
                flex: 1, 
                padding: '10px 16px', 
                backgroundColor: '#2563eb', 
                color: 'white', 
                borderRadius: '4px', 
                border: 'none', 
                cursor: updateMutation.isPending ? 'not-allowed' : 'pointer', 
                opacity: updateMutation.isPending ? 0.5 : 1 
              }}
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/acoes')}
              style={{ 
                flex: 1, 
                padding: '10px 16px', 
                border: '1px solid #ccc', 
                borderRadius: '4px', 
                backgroundColor: 'white', 
                color: 'black', 
                cursor: 'pointer' 
              }}
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* SEÇÃO DE HISTÓRICO */}
        {historico && historico.length > 0 && (
          <div style={{ marginTop: '32px', backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Histórico de Alterações</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {historico.map((item: any, index: number) => (
                <div key={index} style={{ paddingBottom: '16px', borderBottom: index < historico.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#333' }}>{item.campo}</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '-'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
                    <span style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '4px 8px', borderRadius: '4px' }}>
                      {formatarValor(item.valorAnterior, item.campo)}
                    </span>
                    <span style={{ color: '#666' }}>→</span>
                    <span style={{ color: '#388e3c', backgroundColor: '#e8f5e9', padding: '4px 8px', borderRadius: '4px' }}>
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
          </div>
        )}
      </div>
    </div>
  );
}
