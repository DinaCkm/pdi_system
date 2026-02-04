import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Sparkles, Loader2, Search, ChevronDown, X, Check } from 'lucide-react';

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
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  // Estado para busca de competências
  const [macroSearchTerm, setMacroSearchTerm] = useState('');
  const [macroDropdownOpen, setMacroDropdownOpen] = useState(false);
  const macroDropdownRef = useRef<HTMLDivElement>(null);

  // Buscando dados
  const { data: pdis = [], isLoading: loadingPdis } = trpc.pdis.list.useQuery();
  const { data: macros = [], isLoading: loadingMacros } = trpc.competencias.listAllMacros.useQuery();
  
  // Filtrar macros baseado na busca
  const filteredMacros = useMemo(() => {
    if (!macroSearchTerm.trim()) return macros;
    const term = macroSearchTerm.toLowerCase();
    return macros.filter((macro: any) => 
      macro.nome.toLowerCase().includes(term)
    );
  }, [macros, macroSearchTerm]);
  
  // Obter nome da macro selecionada
  const selectedMacroName = useMemo(() => {
    if (!formData.macroId) return '';
    const macro = macros.find((m: any) => String(m.id) === formData.macroId);
    return macro ? macro.nome : '';
  }, [formData.macroId, macros]);
  
  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (macroDropdownRef.current && !macroDropdownRef.current.contains(event.target as Node)) {
        setMacroDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Mutation para sugestão com IA
  const sugerirAcaoMutation = trpc.ia.sugerirAcao.useMutation({
    onSuccess: (data) => {
      if (data.success && data.sugestao) {
        setFormData(prev => ({
          ...prev,
          titulo: data.sugestao.titulo,
          descricao: data.sugestao.detalhes,
        }));
        setSugestaoGerada(true);
      }
      setIsSuggesting(false);
    },
    onError: (error) => {
      console.error('Erro ao gerar sugestão:', error);
      setErrors({ submit: 'Erro ao gerar sugestão com IA. Tente novamente.' });
      setIsSuggesting(false);
    },
  });
  
  // Preencher se vier da URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlPdiId = params.get('pdiId');
    if (urlPdiId) {
      setFormData(prev => ({ ...prev, pdiId: urlPdiId }));
    }
  }, [searchString]);
  
  const utils = trpc.useUtils();
  
  const createMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      utils.actions.list.invalidate();
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
  
  const handleSelectMacro = (macroId: string, macroNome: string) => {
    setFormData(prev => ({ ...prev, macroId }));
    setMacroSearchTerm('');
    setMacroDropdownOpen(false);
    setErrors(prev => ({ ...prev, macroId: '', submit: '' }));
  };

  const handleSugerirComIA = () => {
    if (!formData.macroId) {
      setErrors({ macroId: 'Selecione uma competência Macro primeiro' });
      return;
    }

    const macroSelecionada = macros.find((m: any) => String(m.id) === formData.macroId);
    if (!macroSelecionada) {
      setErrors({ submit: 'Competência não encontrada' });
      return;
    }

    setIsSuggesting(true);
    setErrors({});
    
    sugerirAcaoMutation.mutate({
      competenciaMacro: macroSelecionada.nome,
      competenciaMicro: formData.microcompetencia || undefined,
    });
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

  const canSuggest = formData.macroId && !isSuggesting;
  const [sugestaoGerada, setSugestaoGerada] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>Nova Ação</h1>
          <p style={{ color: '#666' }}>Preencha os dados da ação de desenvolvimento</p>
        </div>

        <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          
          {/* 1. SELEÇÃO DE PDI */}
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
                  <option key={pdi.pdiId} value={pdi.pdiId}>
                    {pdi.colaboradorNome} - {pdi.titulo}
                  </option>
                ))}
              </select>
            )}
            {errors.pdiId && <span style={{ color: 'red', fontSize: '12px' }}>{errors.pdiId}</span>}
          </div>

          {/* 2. COMPETÊNCIA (MACRO) COM BUSCA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '500' }}>2. Competência Geral (Macro) *</label>
            <div ref={macroDropdownRef} style={{ position: 'relative' }}>
              {/* Campo de seleção/busca */}
              <div
                onClick={() => setMacroDropdownOpen(!macroDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: errors.macroId ? '2px solid red' : macroDropdownOpen ? '2px solid #2563eb' : '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  minHeight: '42px'
                }}
              >
                {formData.macroId ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedMacroName}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, macroId: '' }));
                      }}
                      style={{ 
                        marginLeft: 'auto', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={16} style={{ color: '#9ca3af' }} />
                    </button>
                  </div>
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: '14px' }}>Clique para buscar e selecionar...</span>
                )}
                <ChevronDown size={18} style={{ color: '#6b7280', flexShrink: 0, transform: macroDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              
              {/* Dropdown com busca */}
              {macroDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 50,
                  maxHeight: '350px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Campo de busca */}
                  <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                      <input
                        type="text"
                        placeholder="Digite para buscar competência..."
                        value={macroSearchTerm}
                        onChange={(e) => setMacroSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '10px 10px 10px 38px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                      {macroSearchTerm && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMacroSearchTerm('');
                          }}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <X size={16} style={{ color: '#9ca3af' }} />
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                      {filteredMacros.length} competência(s) encontrada(s)
                    </div>
                  </div>
                  
                  {/* Lista de opções */}
                  <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
                    {loadingMacros ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                        <span style={{ marginTop: '8px', display: 'block' }}>Carregando...</span>
                      </div>
                    ) : filteredMacros.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        Nenhuma competência encontrada para "{macroSearchTerm}"
                      </div>
                    ) : (
                      filteredMacros.map((macro: any) => (
                        <div
                          key={macro.id}
                          onClick={() => handleSelectMacro(String(macro.id), macro.nome)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            backgroundColor: formData.macroId === String(macro.id) ? '#eff6ff' : 'white',
                            borderLeft: formData.macroId === String(macro.id) ? '3px solid #2563eb' : '3px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (formData.macroId !== String(macro.id)) {
                              e.currentTarget.style.backgroundColor = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.macroId !== String(macro.id)) {
                              e.currentTarget.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          {formData.macroId === String(macro.id) && (
                            <Check size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                          )}
                          <span style={{ 
                            fontSize: '14px', 
                            color: formData.macroId === String(macro.id) ? '#2563eb' : '#374151',
                            fontWeight: formData.macroId === String(macro.id) ? '500' : '400'
                          }}>
                            {macro.nome}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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

          {/* BOTÃO DE SUGESTÃO COM IA */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '8px', 
            border: '1px solid #bae6fd',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} style={{ color: '#0284c7' }} />
              <span style={{ fontWeight: '600', color: '#0284c7' }}>Assistente de IA</span>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
              Selecione a competência Macro (e opcionalmente a Micro) e clique no botão abaixo para receber uma sugestão de ação de desenvolvimento.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSugerirComIA}
                disabled={!canSuggest}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px', 
                  backgroundColor: canSuggest ? '#0284c7' : '#94a3b8', 
                  color: 'white', 
                  borderRadius: '6px', 
                  border: 'none', 
                  cursor: canSuggest ? 'pointer' : 'not-allowed',
                  fontSize: '15px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  flex: sugestaoGerada ? '1' : 'auto'
                }}
              >
                {isSuggesting ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Gerando sugestão...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    ✨ Sugerir Ação com IA
                  </>
                )}
              </button>
              
              {sugestaoGerada && !isSuggesting && (
                <button
                  type="button"
                  onClick={handleSugerirComIA}
                  disabled={!canSuggest}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 20px', 
                    backgroundColor: '#f59e0b', 
                    color: 'white', 
                    borderRadius: '6px', 
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                    flex: '1'
                  }}
                >
                  🔄 Gerar outra sugestão
                </button>
              )}
            </div>
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
              placeholder="Ex: Participar do curso de Liderança"
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
              rows={8}
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', whiteSpace: 'pre-wrap' }}
            />
            <span style={{ fontSize: '12px', color: '#666' }}>
              A descrição inclui: o que fazer, aviso de flexibilidade e evidência esperada.
            </span>
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
              onClick={() => {
                const returnUrl = sessionStorage.getItem('acoes_return_url') || '/acoes';
                navigate(returnUrl);
              }}
              style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* CSS para animação de spin */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
