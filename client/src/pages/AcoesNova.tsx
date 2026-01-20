import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';

export function AcoesNova() {
  const [, navigate] = useLocation();
  const searchString = useSearch(); // Pega os parametros da URL (ex: ?pdiId=1)

  const [formData, setFormData] = useState({
    pdiId: '',
    macroId: '',
    microcompetencia: '',
    titulo: '',
    descricao: '',
    prazo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Queries
  const { data: pdis = [] } = trpc.pdis.list.useQuery();
  const { data: macros = [] } = trpc.competencias.listAllMacros.useQuery();
  
  // Tenta pegar o ID do PDI da URL ao carregar
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlPdiId = params.get('pdiId');
    if (urlPdiId) {
      setFormData(prev => ({ ...prev, pdiId: urlPdiId }));
    }
  }, [searchString]);
  
  // Mutations
  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      // Volta para a lista ou para o PDI anterior
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
    
    if (!formData.pdiId) newErrors.pdiId = 'PDI é obrigatório';
    if (!formData.macroId) newErrors.macroId = 'Competência (Macro) é obrigatória';
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

    // Prepara o payload
    const pdiId = parseInt(formData.pdiId, 10);
    const macroId = parseInt(formData.macroId, 10);

    if (isNaN(pdiId) || isNaN(macroId)) {
      setErrors({ submit: 'Erro: IDs inválidos.' });
      return;
    }

    createMutation.mutate({
      pdiId,
      macroId,
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
          <p style={{ color: '#666' }}>Defina o PDI, a competência e o prazo.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PDI - Agora tenta pegar da URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="pdiId" style={{ fontWeight: '500' }}>PDI Vinculado *</label>
            <select
              id="pdiId"
              name="pdiId"
              value={formData.pdiId}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: errors.pdiId ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">Selecione um PDI</option>
              {pdis.map((pdi: any) => (
                <option key={pdi.id} value={pdi.id}>
                  {pdi.titulo} ({pdi.colaboradorNome})
                </option>
              ))}
            </select>
            {errors.pdiId && <span style={{ color: 'red', fontSize: '12px' }}>{errors.pdiId}</span>}
          </div>

          {/* Competência Macro (Obrigatória) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="macroId" style={{ fontWeight: '500' }}>Competência a desenvolver (Macro) *</label>
            <select
              id="macroId"
              name="macroId"
              value={formData.macroId}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px 12px', border: errors.macroId ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">Selecione uma competência...</option>
              {macros.map((macro: any) => (
                <option key={macro.id} value={String(macro.id)}>
                  {macro.nome}
                </option>
              ))}
            </select>
            {errors.macroId && <span style={{ color: 'red', fontSize: '12px' }}>{errors.macroId}</span>}
          </div>

          {/* Competência Micro (Opcional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="microcompetencia" style={{ fontWeight: '500' }}>Competência específica (Micro)</label>
            <input
              id="microcompetencia"
              name="microcompetencia"
              type="text"
              placeholder="Ex: Liderança Técnica, Comunicação Assertiva... (opcional)"
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
              placeholder="Ex: Realizar curso de React Avançado"
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
              placeholder="Descreva como será feita a ação..."
              value={formData.descricao}
              onChange={handleChange}
              rows={4}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'inherit' }}
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
              disabled={createMutation.isPending}
              style={{ flex: 1, padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', borderRadius: '4px', border: 'none', cursor: createMutation.isPending ? 'not-allowed' : 'pointer', opacity: createMutation.isPending ? 0.7 : 1 }}
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar Ação'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/acoes')}
              style={{ flex: 1, padding: '10px 16px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', color: 'black', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
