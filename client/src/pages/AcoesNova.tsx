import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';

export function AcoesNova() {
  const [, navigate] = useLocation();
  const searchString = useSearch(); 

  const [formData, setFormData] = useState({
    pdiId: '',
    macroId: '',
    microcompetencia: '', 
    titulo: '',
    descricao: '',
    prazo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscando dados do Backend
  const { data: pdis = [] } = trpc.pdis.list.useQuery();
  const { data: macros = [] } = trpc.competencias.listAllMacros.useQuery();
  
  // Tenta pegar o ID do PDI da URL automaticamente
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlPdiId = params.get('pdiId');
    if (urlPdiId) {
      setFormData(prev => ({ ...prev, pdiId: urlPdiId }));
    }
  }, [searchString]);
  
  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      setTimeout(() => navigate('/acoes'), 300);
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.pdiId) newErrors.pdiId = 'Selecione o PDI vinculado';
    if (!formData.macroId) newErrors.macroId = 'Selecione a competência (Macro)';
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

    const pdiIdNumerico = Number(formData.pdiId);
    const macroIdNumerico = Number(formData.macroId);

    if (!pdiIdNumerico || isNaN(pdiIdNumerico)) {
      setErrors({ submit: 'Erro: PDI inválido ou não selecionado.' });
      return;
    }

    if (!macroIdNumerico || isNaN(macroIdNumerico)) {
      setErrors({ submit: 'Erro: Competência inválida.' });
      return;
    }

    createMutation.mutate({
      pdiId: pdiIdNumerico,
      macroId: macroIdNumerico, 
      microcompetencia: formData.microcompetencia || undefined,
      titulo: formData.titulo,
      descricao: formData.descricao,
      prazo: new Date(formData.prazo),
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Nova Ação</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PDI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="pdiId" style={{ fontWeight: '500' }}>Vincular ao PDI de: *</label>
            <select
              id="pdiId"
              name="pdiId"
              value={formData.pdiId}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: errors.pdiId ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">Selecione um Colaborador/PDI</option>
              {pdis.map((pdi: any) => (
                <option key={pdi.id} value={pdi.id}>
                  {pdi.titulo} - {pdi.colaboradorNome}
                </option>
              ))}
            </select>
            {errors.pdiId && <span style={{ color: 'red', fontSize: '12px' }}>{errors.pdiId}</span>}
          </div>

          {/* Competência MACRO - SEMPRE VISÍVEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="macroId" style={{ fontWeight: '500' }}>Competência (Macro) *</label>
            <select
              id="macroId"
              name="macroId"
              value={formData.macroId}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: errors.macroId ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">Selecione...</option>
              {macros.map((macro: any) => (
                <option key={macro.id} value={String(macro.id)}>{macro.nome}</option>
              ))}
            </select>
            {errors.macroId && <span style={{ color: 'red', fontSize: '12px' }}>{errors.macroId}</span>}
          </div>

          {/* Competência MICRO - SEMPRE VISÍVEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="microcompetencia" style={{ fontWeight: '500' }}>Competência Específica (Micro) - Opcional</label>
            <input
              type="text"
              id="microcompetencia"
              name="microcompetencia"
              placeholder="Digite o nome da competência específica..."
              value={formData.microcompetencia}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* Título */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="titulo" style={{ fontWeight: '500' }}>O que será feito? (Título) *</label>
            <input
              id="titulo"
              name="titulo"
              type="text"
              value={formData.titulo}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: errors.titulo ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            />
            {errors.titulo && <span style={{ color: 'red', fontSize: '12px' }}>{errors.titulo}</span>}
          </div>

          {/* Descrição */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="descricao" style={{ fontWeight: '500' }}>Detalhes da ação</label>
            <textarea
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              rows={4}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* Prazo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="prazo" style={{ fontWeight: '500' }}>Prazo de conclusão *</label>
            <input
              id="prazo"
              name="prazo"
              type="date"
              value={formData.prazo}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: errors.prazo ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            />
            {errors.prazo && <span style={{ color: 'red', fontSize: '12px' }}>{errors.prazo}</span>}
          </div>

          {errors.submit && (
            <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', fontSize: '14px' }}>
              {errors.submit}
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', paddingTop: '16px' }}>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{ flex: 1, padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar Ação'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/acoes')}
              style={{ flex: 1, padding: '10px 16px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
