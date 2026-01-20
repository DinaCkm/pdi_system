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
      // Feedback visual simples e redirecionamento
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação Básica
    if (!formData.pdiId) {
      setErrors({ pdiId: 'Selecione um PDI na lista.' });
      return;
    }
    if (!formData.titulo) {
      setErrors({ titulo: 'Digite um título.' });
      return;
    }
    if (!formData.prazo) {
      setErrors({ prazo: 'Selecione uma data.' });
      return;
    }

    // Conversão segura
    const pdiNumber = Number(formData.pdiId);
    const macroNumber = Number(formData.macroId);

    // Se o ID do PDI não for número, tentamos passar como string se o backend aceitar,
    // caso contrário, alertamos. Mas aqui o foco é não quebrar a tela.
    const payload: any = {
      pdiId: isNaN(pdiNumber) ? formData.pdiId : pdiNumber,
      macroId: isNaN(macroNumber) ? undefined : macroNumber,
      titulo: formData.titulo,
      descricao: formData.descricao,
      prazo: new Date(formData.prazo),
      // Envia microcompetencia se preenchida
      microcompetencia: formData.microcompetencia || undefined
    };

    createMutation.mutate(payload);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold' }}>Nova Ação</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. SELEÇÃO DE PDI BLINDADA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: 'bold', color: '#2563eb' }}>1. Vincular ao PDI de quem? *</label>
            <select
              name="pdiId"
              value={formData.pdiId}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">-- Clique para selecionar --</option>
              {pdis.map((pdi: any, index: number) => {
                // CORREÇÃO DO CRASH: Usamos o ID se existir, senão usamos o index
                // Isso impede que o React encontre chaves duplicadas (que causam o erro insertBefore)
                const safeKey = pdi.id ? String(pdi.id) : `temp-key-${index}`;
                const safeValue = pdi.id ? String(pdi.id) : ''; 
                
                return (
                  <option key={safeKey} value={safeValue}>
                    {pdi.colaboradorNome || 'Sem Nome'} {pdi.id ? `(ID: ${pdi.id})` : '(ID INVÁLIDO/VAZIO)'}
                  </option>
                );
              })}
            </select>
            {errors.pdiId && <span style={{ color: 'red' }}>{errors.pdiId}</span>}
          </div>

          {/* 2. COMPETÊNCIA (MACRO) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '500' }}>2. Competência Geral (Macro) *</label>
            <select
              name="macroId"
              value={formData.macroId}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">Selecione...</option>
              {macros.map((macro: any) => (
                <option key={macro.id} value={String(macro.id)}>{macro.nome}</option>
              ))}
            </select>
          </div>

          {/* 3. COMPETÊNCIA (MICRO) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '500' }}>3. Competência Específica (Texto) - Opcional</label>
            <input
              type="text"
              name="microcompetencia"
              placeholder="Ex: Comunicação..."
              value={formData.microcompetencia}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* 4. TÍTULO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '500' }}>4. Título *</label>
            <input
              name="titulo"
              type="text"
              value={formData.titulo}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            {errors.titulo && <span style={{ color: 'red' }}>{errors.titulo}</span>}
          </div>

          {/* 5. DESCRIÇÃO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '500' }}>Detalhes</label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              rows={3}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {/* 6. PRAZO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '500' }}>5. Prazo *</label>
            <input
              name="prazo"
              type="date"
              value={formData.prazo}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
             {errors.prazo && <span style={{ color: 'red' }}>{errors.prazo}</span>}
          </div>

          {/* MENSAGEM DE ERRO DO SERVIDOR */}
          {errors.submit && (
            <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '4px' }}>
              {errors.submit}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{ flex: 1, padding: '12px', backgroundColor: '#2563eb', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
            >
              {createMutation.isPending ? 'ENVIANDO...' : 'SALVAR AÇÃO'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/acoes')}
              style={{ flex: 1, padding: '12px', border: '1px solid #ccc', backgroundColor: 'white' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
