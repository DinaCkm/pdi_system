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

  // Mutations
  const updateMutation = trpc.actions.update.useMutation({
    onSuccess: () => {
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
      prazo: new Date(formData.prazo),
      status: formData.status,
      macroId: formData.macroId ? parseInt(formData.macroId) : undefined,
    });
  };

  if (!acao) {
    return <div style={{ padding: '24px' }}>Carregando...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
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
      </div>
    </div>
  );
}
