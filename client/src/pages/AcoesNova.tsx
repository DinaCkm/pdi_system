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

  // Buscando dados
  const { data: pdis = [], isLoading: loadingPdis } = trpc.pdis.list.useQuery();
  const { data: macros = [], isLoading: loadingMacros } = trpc.competencias.listAllMacros.useQuery();
  
  // Preencher se vier da URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlPdiId = params.get('pdiId');
    if (urlPdiId) {
      setFormData(prev => ({ ...prev, pdiId: urlPdiId }));
    }
  }, [searchString]);
  
  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      // Sucesso! Volta para a lista
      navigate('/acoes');
    },
    onError: (error) => {
      setErrors({ submit: `Erro do Servidor: ${error.message}` });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '', submit: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.pdiId) newErrors.pdiId = 'Selecione o PDI vinculado';
    if (!formData.macroId) newErrors.macroId = 'Selecione a competência Macro';
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

    // Conversão segura
    const pdiIdNumerico = Number(formData.pdiId);
    const macroIdNumerico = Number(formData.macroId);

    // Validação final de segurança
    if (!pdiIdNumerico || isNaN(pdiIdNumerico)) {
      setErrors({ submit: 'Erro Interno: ID do PDI inválido. Recarregue a página.' });
      return;
    }

    // Validar e garantir que prazo seja string ISO (YYYY-MM-DD)
    let prazoFormatado = formData.prazo;
    if (formData.prazo instanceof Date) {
      prazoFormatado = formData.prazo.toISOString().split('T')[0];
    }
    
    createMutation.mutate({
      pdiId: pdiIdNumerico,
      macroId: macroIdNumerico, 
      microcompetencia: formData.microcompetencia || undefined,
      titulo: formData.titulo,
      descricao: formData.descricao,
      prazo: prazoFormatado,
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Nova Ação</h1>
          <p style={{ color: '#666' }}>Preencha os dados da ação de desenvolvimento</p>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          
          {/* 1. SELEÇÃO DE PDI (CORRIGIDA: pdi.pdiId) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="pdiId" style={{ fontWeight: 'bold', color: '#2563eb' }}>1. Vincular ao PDI de quem? *</label>
            {loadingPdis ? (
              <span style={{ fontSize: '14px', color: '#666' }}>Carregando lista de colaboradores...</span>
            ) : (
              <select
                id="pdiId"
                name="pdiId"
                value={formData.pdiId}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', border: errors.pdiId ? '2px solid red' : '1px solid #ccc', borderRadius: '4px', fontSize: '15px' }}
              >
                <option value="">-- Clique para selecionar --</option>
                {pdis.map((pdi: any) => (
                  // AQUI ESTAVA O ERRO: Mudamos de pdi.id para pdi.pdiId
                  <option key={pdi.pdiId} value={pdi.pdiId}>
                    {pdi.colaboradorNome} - {pdi.titulo}
                  </option>
                ))}
              </select>
            )}
            {errors.pdiId && <span style={{ color: 'red', fontSize: '12px' }}>{errors.pdiId}</span>}
          </div>

          {/* 2. COMPETÊNCIA (MACRO) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="macroId" style={{ fontWeight: '500' }}>2. Competência Geral (Macro) *</label>
            <select
              id="macroId"
              name="macroId"
              value={formData.macroId}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: errors.macroId ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">Selecione...</option>
              {macros.map((macro: any) => (
                <option key={macro.id} value={String(macro.id)}>{macro.nome}</option>
              ))}
            </select>
            {errors.macroId && <span style={{ color: 'red', fontSize: '12px' }}>{errors.macroId}</span>}
          </div>

          {/* 3. COMPETÊNCIA (MICRO) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="microcompetencia" style={{ fontWeight: '500' }}>3. Competência Específica (Texto) - Opcional</label>
            <input
              type="text"
              id="microcompetencia"
              name="microcompetencia"
              placeholder="Ex: Melhorar comunicação no Slack..."
              value={formData.microcompetencia}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* 4. TÍTULO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="titulo" style={{ fontWeight: '500' }}>4. O que será feito? (Título) *</label>
            <input
              id="titulo"
              name="titulo"
              type="text"
              value={formData.titulo}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: errors.titulo ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            />
            {errors.titulo && <span style={{ color: 'red', fontSize: '12px' }}>{errors.titulo}</span>}
          </div>

          {/* 5. DESCRIÇÃO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="descricao" style={{ fontWeight: '500' }}>Detalhes da ação</label>
            <textarea
              id="descricao"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              rows={4}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* 6. PRAZO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label htmlFor="prazo" style={{ fontWeight: '500' }}>5. Prazo de conclusão *</label>
            <input
              id="prazo"
              name="prazo"
              type="date"
              value={formData.prazo}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: errors.prazo ? '2px solid red' : '1px solid #ccc', borderRadius: '4px' }}
            />
            {errors.prazo && <span style={{ color: 'red', fontSize: '12px' }}>{errors.prazo}</span>}
          </div>

          {/* MENSAGEM DE ERRO DO SERVIDOR */}
          {errors.submit && (
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              {errors.submit}
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', paddingTop: '16px' }}>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{ flex: 1, padding: '12px', backgroundColor: '#2563eb', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar Ação'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/acoes')}
              style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
