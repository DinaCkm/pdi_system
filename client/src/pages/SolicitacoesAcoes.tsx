import { useState, useMemo, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { useSearch } from 'wouter';
import { 
  FileText, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, 
  Search, ChevronDown, X, Check, Send, Eye, MessageSquare,
  Loader2, Filter, ChevronRight, User, Users, Mail, RotateCcw, History, Info
} from 'lucide-react';

// ============= STATUS HELPERS =============
const statusLabels: Record<string, string> = {
  aguardando_ckm: 'Aguardando Análise CKM',
  aguardando_gestor: 'Aguardando Decisão do Gestor',
  aguardando_rh: 'Aguardando Decisão do RH',
  aprovada: 'Aprovada e Incluída no PDI',
  vetada_gestor: 'Vetada pelo Gestor',
  vetada_rh: 'Vetada pelo RH',
  em_revisao: 'Em Revisão',
  encerrada_lider: 'Encerrada pelo Líder',
};

const statusColors: Record<string, string> = {
  aguardando_ckm: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  aguardando_gestor: 'bg-orange-100 text-orange-800 border-orange-300',
  aguardando_rh: 'bg-blue-100 text-blue-800 border-blue-300',
  aprovada: 'bg-green-100 text-green-800 border-green-300',
  vetada_gestor: 'bg-red-100 text-red-800 border-red-300',
  vetada_rh: 'bg-red-100 text-red-800 border-red-300',
  em_revisao: 'bg-purple-100 text-purple-800 border-purple-300',
  encerrada_lider: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusIcons: Record<string, any> = {
  aguardando_ckm: Clock,
  aguardando_gestor: Clock,
  aguardando_rh: Clock,
  aprovada: CheckCircle2,
  vetada_gestor: XCircle,
  vetada_rh: XCircle,
  em_revisao: RotateCcw,
  encerrada_lider: XCircle,
};

function formatDate(d: any) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR');
}

// ============= BOTÃO REENVIAR NOTIFICAÇÕES PENDENTES =============
function BotaoReenviarNotificacoes() {
  const [isLoading, setIsLoading] = useState(false);
  const [showResultado, setShowResultado] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const mutation = trpc.solicitacoesAcoes.reenviarNotificacoesPendentes.useMutation();

  const handleReenviar = async () => {
    if (!confirm('Deseja reenviar os e-mails de notificação para os líderes de todas as solicitações pendentes (aguardando parecer do gestor)?')) return;
    setIsLoading(true);
    try {
      const res = await mutation.mutateAsync();
      setResultado(res);
      setShowResultado(true);
      if (res.enviados > 0) {
        toast.success(`${res.enviados} e-mail(s) enviado(s) com sucesso!`);
      }
      if (res.falhas > 0) {
        toast.warning(`${res.falhas} e-mail(s) falharam.`);
      }
      if (res.total === 0) {
        toast.info('Nenhuma solicitação pendente encontrada.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao reenviar notificações');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleReenviar}
        disabled={isLoading}
        className="bg-amber-500 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-amber-600 flex items-center gap-2 shrink-0 disabled:opacity-50"
        title="Reenviar e-mails de notificação para líderes com solicitações pendentes"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {isLoading ? 'Enviando...' : 'Reenviar Notificações'}
      </button>

      {/* Modal de Resultado */}
      {showResultado && resultado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Resultado do Envio</h3>
                <button onClick={() => setShowResultado(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{resultado.total}</p>
                  <p className="text-xs text-blue-600">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{resultado.enviados}</p>
                  <p className="text-xs text-green-600">Enviados</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{resultado.falhas}</p>
                  <p className="text-xs text-red-600">Falhas</p>
                </div>
              </div>

              {resultado.detalhes?.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Colaborador</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Líder</th>
                        <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {resultado.detalhes.map((d: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">{d.colaborador}</td>
                          <td className="px-3 py-2 text-gray-700 text-xs">{d.lider}</td>
                          <td className="px-3 py-2 text-center">
                            {d.status === 'enviado' ? (
                              <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                <Check className="h-3 w-3" /> Enviado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
                                <XCircle className="h-3 w-3" /> Falha
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={() => setShowResultado(false)}
                className="mt-4 w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============= FORMULÁRIO DE NOVA SOLICITAÇÃO =============
function FormularioSolicitacao({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    pdiId: '',
    macroId: '',
    microcompetencia: '',
    titulo: '',
    descricao: '',
    prazo: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Dropdowns
  const [pdiSearchTerm, setPdiSearchTerm] = useState('');
  const [pdiDropdownOpen, setPdiDropdownOpen] = useState(false);
  const pdiDropdownRef = useRef<HTMLDivElement>(null);
  const [macroSearchTerm, setMacroSearchTerm] = useState('');
  const [macroDropdownOpen, setMacroDropdownOpen] = useState(false);
  const macroDropdownRef = useRef<HTMLDivElement>(null);

  const { data: meusPdis = [] } = trpc.pdis.myPDIs.useQuery();
  const { data: macros = [] } = trpc.competencias.listAllMacros.useQuery();
  
  const criarMutation = trpc.solicitacoesAcoes.criar.useMutation({
    onSuccess: () => {
      toast.success('Solicitação enviada com sucesso! Aguarde a análise.');
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredPdis = useMemo(() => {
    if (!pdiSearchTerm.trim()) return meusPdis;
    const term = pdiSearchTerm.toLowerCase();
    return meusPdis.filter((pdi: any) =>
      pdi.titulo?.toLowerCase().includes(term)
    );
  }, [meusPdis, pdiSearchTerm]);

  const filteredMacros = useMemo(() => {
    if (!macroSearchTerm.trim()) return macros;
    const term = macroSearchTerm.toLowerCase();
    return macros.filter((m: any) => m.nome.toLowerCase().includes(term));
  }, [macros, macroSearchTerm]);

  const selectedPdiInfo = useMemo(() => {
    if (!formData.pdiId) return null;
    return meusPdis.find((p: any) => String(p.id) === formData.pdiId);
  }, [formData.pdiId, meusPdis]);

  const selectedMacroName = useMemo(() => {
    if (!formData.macroId) return '';
    const m = macros.find((m: any) => String(m.id) === formData.macroId);
    return m ? m.nome : '';
  }, [formData.macroId, macros]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pdiDropdownRef.current && !pdiDropdownRef.current.contains(event.target as Node)) setPdiDropdownOpen(false);
      if (macroDropdownRef.current && !macroDropdownRef.current.contains(event.target as Node)) setMacroDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!formData.pdiId) e.pdiId = 'Selecione o PDI';
    if (!formData.macroId) e.macroId = 'Selecione a competência';
    if (!formData.titulo.trim()) e.titulo = 'Título é obrigatório';
    if (!formData.prazo) e.prazo = 'Prazo é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    criarMutation.mutate({
      pdiId: Number(formData.pdiId),
      macroId: Number(formData.macroId),
      microcompetencia: formData.microcompetencia || undefined,
      titulo: formData.titulo,
      descricao: formData.descricao || undefined,
      prazo: formData.prazo,
    });
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
          Nova Solicitação de Ação
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Preencha os campos abaixo com os mesmos dados de uma ação. Sua solicitação passará por análise da CKM, aprovação do seu Gestor e decisão final do RH.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* PDI */}
        <div ref={pdiDropdownRef} className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1">PDI de Destino *</label>
          <div
            className={`w-full border rounded-lg px-3 py-2.5 cursor-pointer flex items-center justify-between ${errors.pdiId ? 'border-red-400' : 'border-gray-300'}`}
            onClick={() => setPdiDropdownOpen(!pdiDropdownOpen)}
          >
            <span className={selectedPdiInfo ? 'text-gray-800' : 'text-gray-400'}>
              {selectedPdiInfo ? selectedPdiInfo.titulo : 'Selecione o PDI...'}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
          {pdiDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
              <div className="p-2 border-b sticky top-0 bg-white">
                <div className="flex items-center gap-2 px-2 py-1 border rounded-md">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={pdiSearchTerm}
                    onChange={(e) => setPdiSearchTerm(e.target.value)}
                    placeholder="Buscar PDI..."
                    className="w-full text-sm outline-none"
                    autoFocus
                  />
                </div>
              </div>
              {filteredPdis.map((pdi: any) => (
                <div
                  key={pdi.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${String(pdi.id) === formData.pdiId ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    setFormData({ ...formData, pdiId: String(pdi.id) });
                    setPdiDropdownOpen(false);
                    setPdiSearchTerm('');
                  }}
                >
                  <div>
                    <div className="text-sm font-medium">{pdi.titulo}</div>
                    <div className="text-xs text-gray-500">Ciclo: {pdi.cicloNome || '-'}</div>
                  </div>
                  {String(pdi.id) === formData.pdiId && <Check className="h-4 w-4 text-blue-600" />}
                </div>
              ))}
              {filteredPdis.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">Nenhum PDI encontrado</div>}
            </div>
          )}
          {errors.pdiId && <p className="text-xs text-red-500 mt-1">{errors.pdiId}</p>}
        </div>

        {/* Competência Macro */}
        <div ref={macroDropdownRef} className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Competência (Macro) *</label>
          <div
            className={`w-full border rounded-lg px-3 py-2.5 cursor-pointer flex items-center justify-between ${errors.macroId ? 'border-red-400' : 'border-gray-300'}`}
            onClick={() => setMacroDropdownOpen(!macroDropdownOpen)}
          >
            <span className={selectedMacroName ? 'text-gray-800' : 'text-gray-400'}>
              {selectedMacroName || 'Selecione a competência...'}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
          {macroDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
              <div className="p-2 border-b sticky top-0 bg-white">
                <div className="flex items-center gap-2 px-2 py-1 border rounded-md">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={macroSearchTerm}
                    onChange={(e) => setMacroSearchTerm(e.target.value)}
                    placeholder="Buscar competência..."
                    className="w-full text-sm outline-none"
                    autoFocus
                  />
                </div>
              </div>
              {filteredMacros.map((m: any) => (
                <div
                  key={m.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${String(m.id) === formData.macroId ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    setFormData({ ...formData, macroId: String(m.id) });
                    setMacroDropdownOpen(false);
                    setMacroSearchTerm('');
                  }}
                >
                  <span className="text-sm">{m.nome}</span>
                  {String(m.id) === formData.macroId && <Check className="h-4 w-4 text-blue-600" />}
                </div>
              ))}
              {filteredMacros.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">Nenhuma competência encontrada</div>}
            </div>
          )}
          {errors.macroId && <p className="text-xs text-red-500 mt-1">{errors.macroId}</p>}
        </div>

        {/* Microcompetência */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Foco / Microcompetência</label>
          <input
            type="text"
            value={formData.microcompetencia}
            onChange={(e) => setFormData({ ...formData, microcompetencia: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            placeholder="Ex: Comunicação assertiva em reuniões"
          />
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Título da Ação *</label>
          <input
            type="text"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm ${errors.titulo ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="Ex: Participar do curso de Liderança Situacional"
          />
          {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo}</p>}
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
          <textarea
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[100px] overflow-auto"
            placeholder="Descreva o que fazer, como fazer e como comprovar..."
          />
        </div>

        {/* Prazo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Prazo *</label>
          <input
            type="date"
            value={formData.prazo}
            onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm ${errors.prazo ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.prazo && <p className="text-xs text-red-500 mt-1">{errors.prazo}</p>}
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={criarMutation.isPending}
            className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {criarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Solicitação
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ============= CARD DE PARECER CKM =============
function ParecerCKMForm({ solicitacao, onSuccess }: { solicitacao: any; onSuccess: () => void }) {
  const [parecerTipo, setParecerTipo] = useState<'com_aderencia' | 'sem_aderencia' | ''>('');
  const [parecerTexto, setParecerTexto] = useState('');

  const mutation = trpc.solicitacoesAcoes.emitirParecerCKM.useMutation({
    onSuccess: () => {
      toast.success('Parecer emitido com sucesso!');
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="border-t border-yellow-200 pt-4 mt-4">
      <h4 className="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Emitir Parecer Técnico (CKM)
      </h4>
      <div className="space-y-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setParecerTipo('com_aderencia')}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              parecerTipo === 'com_aderencia'
                ? 'bg-green-100 border-green-400 text-green-800'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 inline mr-1" />
            Com Aderência
          </button>
          <button
            type="button"
            onClick={() => setParecerTipo('sem_aderencia')}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              parecerTipo === 'sem_aderencia'
                ? 'bg-red-100 border-red-400 text-red-800'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <XCircle className="h-4 w-4 inline mr-1" />
            Sem Aderência
          </button>
        </div>
        <textarea
          value={parecerTexto}
          onChange={(e) => setParecerTexto(e.target.value)}
          placeholder="Justifique seu parecer técnico..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[80px] overflow-auto"
        />
        <button
          onClick={() => {
            if (!parecerTipo) return toast.error('Selecione o tipo de parecer');
            if (!parecerTexto.trim()) return toast.error('Justificativa é obrigatória');
            mutation.mutate({ id: solicitacao.id, parecerTipo, parecerTexto });
          }}
          disabled={mutation.isPending}
          className="w-full bg-yellow-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Emitir Parecer
        </button>
      </div>
    </div>
  );
}

// ============= CARD DE DECISÃO DO GESTOR =============
function DecisaoGestorForm({ solicitacao, onSuccess }: { solicitacao: any; onSuccess: () => void }) {
  const [justificativa, setJustificativa] = useState('');

  const liderJaSolicitouRevisao = !!solicitacao.liderRevisaoSolicitada;

  const mutation = trpc.solicitacoesAcoes.decisaoGestor.useMutation({
    onSuccess: () => {
      toast.success('Decisão registrada com sucesso!');
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message),
  });

  function handleDeAcordo() {
    if (!justificativa.trim()) return toast.error('Justificativa é obrigatória');
    mutation.mutate({ id: solicitacao.id, decisao: 'aprovado', justificativa });
  }

  function handleSolicitarRevisao() {
    if (!justificativa.trim() || justificativa.trim().length < 10) {
      toast.error('Para solicitar revisão, preencha o campo acima com a justificativa (mínimo 10 caracteres) explicando o motivo da revisão.');
      return;
    }
    if (!confirm('Confirma a solicitação de esclarecimento? O texto do campo acima será enviado como justificativa e o processo voltará para o CKM/Admin reanalisar.')) return;
    mutation.mutate({ id: solicitacao.id, decisao: 'solicitar_revisao', justificativa, motivoRevisao: justificativa });
  }

  function handleEncerrar() {
    if (!justificativa.trim()) return toast.error('Justificativa é obrigatória');
    if (!confirm('Confirma o encerramento desta solicitação? Esta ação não poderá ser desfeita. O colaborador poderá abrir uma nova solicitação.')) return;
    mutation.mutate({ id: solicitacao.id, decisao: 'encerrada', justificativa });
  }

  return (
    <div className="border-t border-orange-200 pt-4 mt-4">
      <h4 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Decisão do Líder
      </h4>

      {/* Aviso quando já solicitou revisão antes (2a passagem) */}
      {liderJaSolicitouRevisao && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Revisão já foi solicitada anteriormente</p>
              <p className="text-xs text-amber-700 mt-1">Você já solicitou esclarecimento ao CKM nesta solicitação. Agora você pode escolher <strong>De Acordo</strong> ou <strong>Encerrar Solicitação</strong>. Caso necessário, encerre e oriente o colaborador a abrir uma nova solicitação.</p>
              {solicitacao.liderMotivoRevisao && (
                <p className="text-xs text-amber-600 mt-1 italic">Motivo anterior: "{solicitacao.liderMotivoRevisao}"</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <textarea
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder={liderJaSolicitouRevisao ? "Justifique sua decisão..." : "Justifique sua decisão... (caso solicite revisão, este campo será usado como justificativa)"}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[80px] overflow-auto"
        />

        <div className="flex gap-3">
          <button
            onClick={handleDeAcordo}
            disabled={mutation.isPending}
            className="flex-1 bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            De Acordo
          </button>

          {/* Solicitar Revisão - só na 1a passagem */}
          {!liderJaSolicitouRevisao && (
            <button
              onClick={handleSolicitarRevisao}
              disabled={mutation.isPending}
              className="flex-1 bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Solicito Revisão
            </button>
          )}

          {/* Encerrar Solicitação - só na 2a passagem */}
          {liderJaSolicitouRevisao && (
            <button
              onClick={handleEncerrar}
              disabled={mutation.isPending}
              className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Encerrar Solicitação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= CARD DE DECISÃO DO RH =============
function DecisaoRHForm({ solicitacao, onSuccess }: { solicitacao: any; onSuccess: () => void }) {
  const [justificativa, setJustificativa] = useState('');
  const [motivoRevisao, setMotivoRevisao] = useState('');
  const [showRevisaoForm, setShowRevisaoForm] = useState(false);

  const mutation = trpc.solicitacoesAcoes.decisaoRH.useMutation({
    onSuccess: (data) => {
      if (data.acaoId) {
        toast.success('Ação aprovada e incluída no PDI com sucesso!');
      } else {
        toast.success('Decisão registrada.');
      }
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  function handleDecisao(decisao: 'aprovado' | 'reprovado') {
    if (!justificativa.trim()) return toast.error('Justificativa é obrigatória');
    mutation.mutate({ id: solicitacao.id, decisao, justificativa });
  }

  function handleSolicitarRevisao() {
    if (!justificativa.trim()) return toast.error('Justificativa é obrigatória');
    if (!motivoRevisao.trim()) return toast.error('O motivo da revisão é obrigatório');
    if (!confirm('Confirma a solicitação de revisão? O processo voltará para o CKM/Admin emitir novo parecer (Rodada 2).')) return;
    mutation.mutate({ id: solicitacao.id, decisao: 'solicitar_revisao', justificativa, motivoRevisao });
  }

  const jaPassouPorRevisao = solicitacao.rodadaAtual >= 2;

  return (
    <div className="border-t border-blue-200 pt-4 mt-4">
      <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Decisão Final do RH {jaPassouPorRevisao && <span className="text-xs font-normal text-purple-600">(Rodada 2)</span>}
      </h4>

      {/* Aviso quando já passou por revisão - não pode solicitar nova */}
      {jaPassouPorRevisao && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-3">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Esta solicitação já passou por uma rodada de revisão.</p>
              <p className="mt-1">Não é possível solicitar nova revisão. Caso necessário, <strong>vete esta solicitação</strong> e oriente o colaborador a abrir uma nova.</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <textarea
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder="Justifique sua decisão..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-h-[80px] overflow-auto"
        />

        {/* Formulário de solicitação de revisão (só aparece na Rodada 1) */}
        {showRevisaoForm && !jaPassouPorRevisao && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <h5 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Solicitar Revisão
            </h5>
            <p className="text-xs text-purple-600 mb-2">O processo voltará para o CKM/Admin emitir novo parecer técnico (Rodada 2). Os pareceres da Rodada 1 serão preservados no histórico.</p>
            <textarea
              value={motivoRevisao}
              onChange={(e) => setMotivoRevisao(e.target.value)}
              placeholder="Descreva o motivo da solicitação de revisão (obrigatório)..."
              className="w-full border border-purple-300 rounded-lg px-3 py-2.5 text-sm min-h-[80px] overflow-auto"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSolicitarRevisao}
                disabled={mutation.isPending}
                className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Confirmar Solicitação de Revisão
              </button>
              <button
                onClick={() => { setShowRevisaoForm(false); setMotivoRevisao(''); }}
                className="bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleDecisao('aprovado')}
            disabled={mutation.isPending}
            className="flex-1 bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aprovar e Incluir no PDI
          </button>
          <button
            onClick={() => handleDecisao('reprovado')}
            disabled={mutation.isPending}
            className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Vetar
          </button>
          {/* Botão Solicitar Revisão: só aparece na Rodada 1 */}
          {!jaPassouPorRevisao && !showRevisaoForm && (
            <button
              onClick={() => setShowRevisaoForm(true)}
              disabled={mutation.isPending}
              className="flex-1 bg-purple-600 text-white rounded-lg px-4 py-2.5 text-sm font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Solicitar Revisão
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= CARD DE SOLICITAÇÃO =============
function SolicitacaoCard({ solicitacao, userRole, userId, onRefresh, isOwnRequest }: { 
  solicitacao: any; 
  userRole: string; 
  userId: number;
  onRefresh: () => void;
  isOwnRequest?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = statusIcons[solicitacao.statusGeral] || Clock;

  // Se é um Líder vendo sua própria solicitação, ele vê como colaborador (sem detalhes internos)
  const isColaboradorView = userRole === 'colaborador' || (userRole === 'lider' && isOwnRequest);
  const canEmitirParecer = userRole === 'admin' && solicitacao.statusGeral === 'aguardando_ckm';
  // Líder pode decidir como gestor APENAS para solicitações da equipe (não as suas próprias)
  const canDecidirGestor = (userRole === 'lider' || userRole === 'admin') && solicitacao.statusGeral === 'aguardando_gestor' && !isOwnRequest;
  const canDecidirRH = (userRole === 'gerente' || userRole === 'admin') && solicitacao.statusGeral === 'aguardando_rh';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[solicitacao.statusGeral]}`}>
                <StatusIcon className="h-3 w-3" />
                {statusLabels[solicitacao.statusGeral]}
              </span>
              {solicitacao.rodadaAtual >= 2 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                  <RotateCcw className="h-3 w-3" />
                  Rodada {solicitacao.rodadaAtual}
                </span>
              )}
              {isOwnRequest && userRole === 'lider' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                  <User className="h-3 w-3" />
                  Minha Solicitação
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-gray-800 truncate">{solicitacao.titulo}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
              <span>Solicitante: <strong className="text-gray-700">{solicitacao.solicitanteNome}</strong></span>
              {solicitacao.solicitanteDepartamento && (
                <span>Depto: <strong className="text-gray-700">{solicitacao.solicitanteDepartamento}</strong></span>
              )}
              <span>PDI: <strong className="text-gray-700">{solicitacao.pdiTitulo}</strong></span>
              <span>Prazo: <strong className="text-gray-700">{formatDate(solicitacao.prazo)}</strong></span>
              <span>Solicitado em: <strong className="text-gray-700">{formatDate(solicitacao.createdAt)}</strong></span>
            </div>
          </div>
          <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Conteúdo Expandido */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Dados da Ação */}
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-bold text-gray-700 mb-2">Dados da Ação Solicitada</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Competência:</span> <strong>{solicitacao.macroNome || '-'}</strong></div>
              <div><span className="text-gray-500">Foco:</span> <strong>{solicitacao.microcompetencia || '-'}</strong></div>
              <div className="md:col-span-2"><span className="text-gray-500">Descrição:</span> <p className="mt-1 text-gray-700 whitespace-pre-wrap">{solicitacao.descricao || 'Sem descrição'}</p></div>
            </div>
          </div>

          {/* Histórico de Rodadas Anteriores */}
          {solicitacao.historicoRodadas && (() => {
            let historico: any[] = [];
            try { historico = JSON.parse(solicitacao.historicoRodadas); } catch (e) { historico = []; }
            if (historico.length === 0) return null;
            return (
              <div className="mt-4">
                <details className="group">
                  <summary className="cursor-pointer flex items-center gap-2 text-sm font-bold text-purple-700 hover:text-purple-900 transition-colors">
                    <History className="h-4 w-4" />
                    Histórico de Rodadas Anteriores ({historico.length})
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 space-y-3">
                    {historico.map((rodada: any, idx: number) => (
                      <div key={idx} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-200 text-purple-800">
                            Rodada {rodada.rodada}
                          </span>
                          {rodada.motivoRevisao && (
                            <span className="text-xs text-purple-600 italic">Revisão solicitada</span>
                          )}
                        </div>

                        {/* Motivo da revisão */}
                        {rodada.motivoRevisao && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-2">
                            <p className="text-xs font-bold text-amber-700 mb-1">Motivo da Solicitação de Revisão:</p>
                            <p className="text-sm text-amber-800 whitespace-pre-wrap">{rodada.motivoRevisao}</p>
                          </div>
                        )}

                        {/* Parecer CKM da rodada */}
                        {rodada.ckm?.parecerTipo && (
                          <div className="mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Parecer CKM</p>
                            {!isColaboradorView && (
                              <>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${rodada.ckm.parecerTipo === 'com_aderencia' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                  {rodada.ckm.parecerTipo === 'com_aderencia' ? 'Com Aderência' : 'Sem Aderência'}
                                </span>
                                {rodada.ckm.parecerTexto && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{rodada.ckm.parecerTexto}</p>}
                                <p className="text-xs text-gray-400 mt-1">Em: {formatDate(rodada.ckm.em)}</p>
                              </>
                            )}
                          </div>
                        )}

                        {/* Decisão Gestor da rodada */}
                        {rodada.gestor?.decisao && (
                          <div className="mb-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Decisão do Gestor</p>
                            {!isColaboradorView && (
                              <>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${rodada.gestor.decisao === 'aprovado' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                  {rodada.gestor.decisao === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                                </span>
                                {rodada.gestor.justificativa && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{rodada.gestor.justificativa}</p>}
                                <p className="text-xs text-gray-400 mt-1">Em: {formatDate(rodada.gestor.em)}</p>
                              </>
                            )}
                          </div>
                        )}

                        {/* Decisão RH da rodada (solicitar_revisao) */}
                        {rodada.rh?.decisao && (
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Decisão do RH</p>
                            {!isColaboradorView && (
                              <>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 bg-purple-200 text-purple-800">
                                  Revisão Solicitada
                                </span>
                                {rodada.rh.justificativa && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{rodada.rh.justificativa}</p>}
                                <p className="text-xs text-gray-400 mt-1">Por: {rodada.rh.nome} em {formatDate(rodada.rh.em)}</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            );
          })()}

          {/* Instâncias de Aprovação (Rodada Atual) */}
          <div className="mt-4 space-y-3">
            {solicitacao.rodadaAtual >= 2 && (solicitacao.ckmParecerTipo || solicitacao.gestorDecisao || solicitacao.rhDecisao) && (
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300">
                  Rodada {solicitacao.rodadaAtual} — Análise Atual
                </span>
              </div>
            )}

            {/* 1. Parecer CKM */}
            {solicitacao.ckmParecerTipo && (
              <div className={`rounded-lg p-3 border ${solicitacao.ckmParecerTipo === 'com_aderencia' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">1. Parecer CKM {solicitacao.rodadaAtual >= 2 ? `(Rodada ${solicitacao.rodadaAtual})` : ''}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${solicitacao.ckmParecerTipo === 'com_aderencia' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {solicitacao.ckmParecerTipo === 'com_aderencia' ? 'Com Aderência' : 'Sem Aderência'}
                  </span>
                </div>
                {!isColaboradorView && <p className="text-sm text-gray-700 whitespace-pre-wrap">{solicitacao.ckmParecerTexto}</p>}
                {!isColaboradorView && <p className="text-xs text-gray-400 mt-1">Por: {solicitacao.ckmNome} em {formatDate(solicitacao.ckmParecerEm)}</p>}
              </div>
            )}

            {/* 2. Decisão Gestor */}
            {solicitacao.gestorDecisao && (
              <div className={`rounded-lg p-3 border ${solicitacao.gestorDecisao === 'aprovado' ? 'bg-green-50 border-green-200' : solicitacao.gestorDecisao === 'encerrada' ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">2. Decisão do Líder {solicitacao.rodadaAtual >= 2 ? `(Rodada ${solicitacao.rodadaAtual})` : ''}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${solicitacao.gestorDecisao === 'aprovado' ? 'bg-green-200 text-green-800' : solicitacao.gestorDecisao === 'encerrada' ? 'bg-gray-200 text-gray-800' : 'bg-red-200 text-red-800'}`}>
                    {solicitacao.gestorDecisao === 'aprovado' ? 'De Acordo' : solicitacao.gestorDecisao === 'encerrada' ? 'Encerrada' : 'Reprovado'}
                  </span>
                </div>
                {!isColaboradorView && <p className="text-sm text-gray-700 whitespace-pre-wrap">{solicitacao.gestorJustificativa}</p>}
                {!isColaboradorView && <p className="text-xs text-gray-400 mt-1">Por: {solicitacao.gestorNome} em {formatDate(solicitacao.gestorDecisaoEm)}</p>}
              </div>
            )}

            {/* 3. Decisão RH */}
            {solicitacao.rhDecisao && (
              <div className={`rounded-lg p-3 border ${solicitacao.rhDecisao === 'aprovado' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">3. Decisão do RH {solicitacao.rodadaAtual >= 2 ? `(Rodada ${solicitacao.rodadaAtual})` : ''}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${solicitacao.rhDecisao === 'aprovado' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                    {solicitacao.rhDecisao === 'aprovado' ? 'Aprovado e Incluído no PDI' : 'Vetado'}
                  </span>
                </div>
                {!isColaboradorView && <p className="text-sm text-gray-700 whitespace-pre-wrap">{solicitacao.rhJustificativa}</p>}
                {!isColaboradorView && <p className="text-xs text-gray-400 mt-1">Por: {solicitacao.rhNome} em {formatDate(solicitacao.rhDecisaoEm)}</p>}
              </div>
            )}
          </div>

          {/* Mensagem para Colaborador quando vetada */}
          {isColaboradorView && (solicitacao.statusGeral === 'vetada_gestor' || solicitacao.statusGeral === 'vetada_rh') && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium">Solicite feedback ao seu gestor sobre a motivação da decisão.</p>
            </div>
          )}

          {/* Formulários de Ação */}
          {canEmitirParecer && <ParecerCKMForm solicitacao={solicitacao} onSuccess={onRefresh} />}
          {canDecidirGestor && <DecisaoGestorForm solicitacao={solicitacao} onSuccess={onRefresh} />}
          {canDecidirRH && <DecisaoRHForm solicitacao={solicitacao} onSuccess={onRefresh} />}
        </div>
      )}
    </div>
  );
}

// ============= PÁGINA PRINCIPAL =============
export default function SolicitacoesAcoes() {
  const { user } = useAuth();
  const userRole = user?.role || 'colaborador';
  const userId = user?.id || 0;
  const [showForm, setShowForm] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<'recentes' | 'antigas'>('recentes');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'hoje' | 'semana' | 'mes' | 'trimestre'>('todos');
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false);
  // Para o Líder: controlar qual aba está ativa, lendo do query param
  const searchString = useSearch();
  const queryParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const abaFromUrl = queryParams.get('aba');
  const [abaLider, setAbaLider] = useState<'equipe' | 'minhas'>(
    abaFromUrl === 'minhas' ? 'minhas' : 'equipe'
  );

  // Sincronizar aba com query param quando muda (ex: clique no menu lateral)
  useEffect(() => {
    const handleAbaChange = () => {
      const params = new URLSearchParams(window.location.search);
      const aba = params.get('aba');
      if (aba === 'minhas') setAbaLider('minhas');
      else if (aba === 'equipe') setAbaLider('equipe');
    };
    window.addEventListener('popstate', handleAbaChange);
    return () => window.removeEventListener('popstate', handleAbaChange);
  }, []);

  const { data: solicitacoes = [], isLoading, refetch } = trpc.solicitacoesAcoes.listar.useQuery();

  // Separar solicitações do Líder: próprias vs da equipe
  const minhasSolicitacoes = useMemo(() => {
    if (userRole !== 'lider') return [];
    return solicitacoes.filter((s: any) => s.solicitanteId === userId);
  }, [solicitacoes, userRole, userId]);

  const solicitacoesEquipe = useMemo(() => {
    if (userRole !== 'lider') return solicitacoes;
    return solicitacoes.filter((s: any) => s.solicitanteId !== userId);
  }, [solicitacoes, userRole, userId]);

  // Determinar quais solicitações mostrar baseado na aba ativa
  const solicitacoesAtivas = useMemo(() => {
    if (userRole === 'lider') {
      return abaLider === 'minhas' ? minhasSolicitacoes : solicitacoesEquipe;
    }
    return solicitacoes;
  }, [userRole, abaLider, minhasSolicitacoes, solicitacoesEquipe, solicitacoes]);

  const filteredSolicitacoes = useMemo(() => {
    let result = solicitacoesAtivas;
    if (filtroStatus !== 'todos') {
      result = result.filter((s: any) => s.statusGeral === filtroStatus);
    }
    if (busca.trim()) {
      const term = busca.toLowerCase();
      result = result.filter((s: any) =>
        s.titulo?.toLowerCase().includes(term) ||
        s.solicitanteNome?.toLowerCase().includes(term) ||
        s.solicitanteDepartamento?.toLowerCase().includes(term)
      );
    }
    // Filtro por período
    if (filtroPeriodo !== 'todos') {
      const agora = new Date();
      let dataLimite: Date;
      switch (filtroPeriodo) {
        case 'hoje':
          dataLimite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
          break;
        case 'semana':
          dataLimite = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'mes':
          dataLimite = new Date(agora.getFullYear(), agora.getMonth() - 1, agora.getDate());
          break;
        case 'trimestre':
          dataLimite = new Date(agora.getFullYear(), agora.getMonth() - 3, agora.getDate());
          break;
        default:
          dataLimite = new Date(0);
      }
      result = result.filter((s: any) => {
        const dataCriacao = s.createdAt ? new Date(s.createdAt) : null;
        return dataCriacao && dataCriacao >= dataLimite;
      });
    }
    // Ordenação por data
    result = [...result].sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ordenacao === 'recentes' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [solicitacoesAtivas, filtroStatus, busca, filtroPeriodo, ordenacao]);

  const contadores = useMemo(() => {
    const c: Record<string, number> = { todos: solicitacoesAtivas.length };
    solicitacoesAtivas.forEach((s: any) => {
      c[s.statusGeral] = (c[s.statusGeral] || 0) + 1;
    });
    return c;
  }, [solicitacoesAtivas]);

  // Contadores globais para badges nas abas do Líder
  const contadoresGlobais = useMemo(() => {
    const equipePendentes = solicitacoesEquipe.filter((s: any) => s.statusGeral === 'aguardando_gestor').length;
    return { equipePendentes, minhasTotal: minhasSolicitacoes.length };
  }, [solicitacoesEquipe, minhasSolicitacoes]);

  const canCreateSolicitacao = userRole === 'colaborador' || userRole === 'lider';

  const pageTitle = userRole === 'colaborador' 
    ? 'Solicitar Ação' 
    : userRole === 'lider'
    ? (abaLider === 'minhas' ? 'Minhas Solicitações de Ação' : 'Solicitações da Equipe')
    : 'Ações Solicitadas por Empregados';
  
  const pageDescription = userRole === 'colaborador'
    ? 'Solicite novas ações para seu PDI. Sua solicitação passará por análise técnica e aprovação.'
    : userRole === 'lider'
    ? (abaLider === 'minhas' 
      ? 'Solicite novas ações para o seu próprio PDI.'
      : 'Gerencie as solicitações de ações da sua equipe.')
    : 'Gerencie as solicitações de ações dos empregados. Analise, aprove ou reprove conforme o fluxo de aprovação.';

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            {pageTitle}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{pageDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão Nova Solicitação: visível para Colaborador e Líder (na aba "Minhas") */}
          {canCreateSolicitacao && !showForm && (userRole === 'colaborador' || abaLider === 'minhas') && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Nova Solicitação
            </button>
          )}
          {/* Botão Reenviar Notificações: visível apenas para Admin */}
          {userRole === 'admin' && <BotaoReenviarNotificacoes />}
        </div>
      </div>



      {/* Mensagem orientativa para o Líder na aba Minhas Solicitações */}
      {userRole === 'lider' && abaLider === 'minhas' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Atenção — Este painel é para as suas ações pessoais</p>
              <p>
                Neste espaço você cria as ações que deseja <strong>para você</strong> e que foram acordadas pelo seu líder ou RH. 
                <strong>Nunca</strong> crie ações para os seus liderados aqui. Caso deseje criar uma ação para um liderado seu, 
                converse com ele e solicite que ele inclua a ação no próprio painel de inclusão de ações.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulário de Nova Solicitação */}
      {showForm && canCreateSolicitacao && (
        <FormularioSolicitacao onClose={() => setShowForm(false)} onSuccess={() => refetch()} />
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-col gap-3">
          {/* Linha 1: Busca + Status + Botão filtros avançados */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por título, solicitante ou departamento..."
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
              >
                <option value="todos">Todos ({contadores.todos || 0})</option>
                <option value="aguardando_ckm">Aguardando CKM ({contadores.aguardando_ckm || 0})</option>
                <option value="aguardando_gestor">Aguardando Gestor ({contadores.aguardando_gestor || 0})</option>
                <option value="aguardando_rh">Aguardando RH ({contadores.aguardando_rh || 0})</option>
                <option value="aprovada">Aprovadas ({contadores.aprovada || 0})</option>
                <option value="vetada_gestor">Vetadas Gestor ({contadores.vetada_gestor || 0})</option>
                <option value="vetada_rh">Vetadas RH ({contadores.vetada_rh || 0})</option>
                <option value="em_revisao">Em Revisão ({contadores.em_revisao || 0})</option>
                <option value="encerrada_lider">Encerrada pelo Líder ({contadores.encerrada_lider || 0})</option>
              </select>
            </div>
            <button
              onClick={() => setShowFiltrosAvancados(!showFiltrosAvancados)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                showFiltrosAvancados || filtroPeriodo !== 'todos' || ordenacao !== 'recentes'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFiltrosAvancados ? 'rotate-180' : ''}`} />
              Filtros
              {(filtroPeriodo !== 'todos' || ordenacao !== 'recentes') && (
                <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-blue-600"></span>
              )}
            </button>
          </div>

          {/* Linha 2: Filtros avançados (colapsável) */}
          {showFiltrosAvancados && (
            <div className="flex flex-col md:flex-row gap-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <select
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                >
                  <option value="todos">Todo período</option>
                  <option value="hoje">Hoje</option>
                  <option value="semana">Últimos 7 dias</option>
                  <option value="mes">Últimos 30 dias</option>
                  <option value="trimestre">Últimos 3 meses</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4 text-gray-400" />
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                >
                  <option value="recentes">Mais recentes primeiro</option>
                  <option value="antigas">Mais antigas primeiro</option>
                </select>
              </div>
              {(filtroPeriodo !== 'todos' || ordenacao !== 'recentes') && (
                <button
                  onClick={() => { setFiltroPeriodo('todos'); setOrdenacao('recentes'); }}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cards de resumo - visível para admin, gerente e líder (aba equipe) */}
      {(userRole === 'admin' || userRole === 'gerente' || (userRole === 'lider' && abaLider === 'equipe')) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700">{contadores.aguardando_ckm || 0}</div>
            <div className="text-xs text-yellow-600">Aguardando CKM</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-700">{contadores.aguardando_gestor || 0}</div>
            <div className="text-xs text-orange-600">Aguardando Gestor</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{contadores.aguardando_rh || 0}</div>
            <div className="text-xs text-blue-600">Aguardando RH</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{contadores.aprovada || 0}</div>
            <div className="text-xs text-green-600">Incluídas no PDI</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredSolicitacoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma solicitação encontrada</p>
          <p className="text-sm text-gray-400 mt-1">
            {(userRole === 'colaborador' || (userRole === 'lider' && abaLider === 'minhas'))
              ? 'Clique em "Nova Solicitação" para solicitar uma ação.'
              : 'Não há solicitações pendentes no momento.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSolicitacoes.map((s: any) => (
            <SolicitacaoCard
              key={s.id}
              solicitacao={s}
              userRole={userRole}
              userId={userId}
              onRefresh={() => refetch()}
              isOwnRequest={s.solicitanteId === userId}
            />
          ))}
        </div>
      )}

      <div className="mt-4 text-center text-sm text-gray-400">
        Total: {filteredSolicitacoes.length} solicitação(ões)
      </div>
    </div>
  );
}
