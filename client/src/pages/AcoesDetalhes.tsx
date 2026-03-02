import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { formatDateDisplay } from '@/lib/dateUtils';
import { Loader2, CheckCircle, XCircle, FileText, Upload, Send, Mail, ArrowLeft, User, Calendar, AlignLeft, Target, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import RichTextDisplay from '@/components/RichTextDisplay';

export default function AcoesDetalhes() {
  const [location, setLocation] = useLocation();
  const actionId = parseInt(location.split('/').pop() || '0');
  const [descricaoEvidencia, setDescricaoEvidencia] = useState("");

  // Queries
  const { data: acao, isLoading: loadingAcao, refetch } = trpc.actions.getById.useQuery({ id: actionId }, { enabled: !!actionId });
  const { data: evidencias = [] } = trpc.evidences.listByAction.useQuery({ actionId }, { enabled: !!actionId });
  
  // Buscas extras
  const { data: pdi } = trpc.pdis.getById.useQuery({ id: acao?.pdiId || 0 }, { enabled: !!acao?.pdiId });
  const { data: colaborador } = trpc.users.getById.useQuery({ id: pdi?.colaboradorId || 0 }, { enabled: !!pdi?.colaboradorId });
  
  // Buscar a competência macro
  const { data: macros = [] } = trpc.competencias.listAllMacros.useQuery();
  const macroCompetencia = macros.find((m: any) => m.id === acao?.macroId);
  
  // Busca o usuário logado para comparar
  const { data: currentUser } = trpc.auth.me.useQuery();

  const utils = trpc.useUtils();

  // Mutações
  const enviarEvidencia = trpc.evidences.create.useMutation({
    onSuccess: () => {
      toast.success("Evidência enviada!");
      setDescricaoEvidencia("");
      refetch();
      utils.evidences.listByAction.invalidate();
    },
    onError: () => toast.error("Erro ao enviar.")
  });

  const aprovarMutation = trpc.evidences.aprovar.useMutation({
    onSuccess: () => { toast.success("Ação Concluída!"); refetch(); }
  });

  const reprovarMutation = trpc.evidences.reprovar.useMutation({
    onSuccess: () => { toast.info("Status resetado."); refetch(); }
  });

  const handleRecusar = (evidenceId: number) => {
    if (!colaborador?.email) return toast.error("Sem e-mail cadastrado.");
    const justificativa = prompt("Informe o motivo da reprovação (mínimo 10 caracteres):");
    if (!justificativa || justificativa.length < 10) {
      toast.error("Justificativa deve ter pelo menos 10 caracteres");
      return;
    }
    reprovarMutation.mutate({ evidenceId, justificativa });
    window.location.href = `mailto:${colaborador.email}?subject=Ajuste Ação ${actionId}&body=${encodeURIComponent(justificativa)}`;
  };

  if (loadingAcao || !acao) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  // --- LÓGICA DE PERMISSÃO CORRIGIDA (BLINDADA) ---
  const isAdmin = currentUser?.role === 'admin';
  
  // Garante que ambos sejam números para comparar
  const isDono = currentUser && colaborador && (Number(currentUser.id) === Number(colaborador.id));
  
  // O dono só pode enviar se não estiver concluída ou em análise
  const podeEnviar = isDono && (acao.status === 'em_andamento' || acao.status === 'nao_iniciada' || acao.status === 'atrasada');
  
  // O Admin só avalia se tiver algo para avaliar
  const podeAvaliar = isAdmin && acao.status === 'aguardando_avaliacao';

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* Botão Voltar - Usa URL salva com filtros */}
      <button onClick={() => {
        const returnUrl = sessionStorage.getItem('acoes_return_url') || '/acoes';
        setLocation(returnUrl);
      }} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontWeight: '500' }}>
        <ArrowLeft size={18} /> Voltar para Lista
      </button>

      {/* --- ÁREA DE DETALHES DA AÇÃO --- */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: '32px' }}>
        
        {/* Cabeçalho do Card */}
        <div style={{ padding: '24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0', lineHeight: '1.2' }}>{acao.titulo}</h1>
            <div style={{ display: 'flex', gap: '16px', color: '#6b7280', fontSize: '14px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14}/> {colaborador?.name || '...'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14}/> {formatDateDisplay(acao.prazo)}</span>
            </div>
          </div>
          
          <span style={{ 
            padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px',
            backgroundColor: acao.status === 'concluida' ? '#dcfce7' : acao.status === 'aguardando_avaliacao' ? '#fef9c3' : '#dbeafe',
            color: acao.status === 'concluida' ? '#166534' : acao.status === 'aguardando_avaliacao' ? '#854d0e' : '#1e40af'
          }}>
            {acao.status?.replace('_', ' ')}
          </span>
        </div>

        {/* INFORMAÇÕES DA COMPETÊNCIA */}
        <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            
            {/* Competência Macro */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ padding: '10px', backgroundColor: '#dbeafe', borderRadius: '8px' }}>
                <Target size={20} style={{ color: '#2563eb' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Competência Macro</p>
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                  {macroCompetencia?.nome || 'Não definida'}
                </p>
              </div>
            </div>

            {/* Microcompetência */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ padding: '10px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
                <BookOpen size={20} style={{ color: '#16a34a' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Microcompetência</p>
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                  {acao.microcompetencia || 'Não definida'}
                </p>
              </div>
            </div>

            {/* Data de Conclusão */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ padding: '10px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                <Calendar size={20} style={{ color: '#d97706' }} />
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Prazo de Conclusão</p>
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                  {formatDateDisplay(acao.prazo) || 'Não definido'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* DESCRIÇÃO COMPLETA */}
        <div style={{ padding: '32px', backgroundColor: '#fff' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}>
            <AlignLeft size={16} /> Descrição Detalhada
          </h3>
          <div style={{ fontSize: '16px', lineHeight: '1.6', color: '#4b5563' }}>
            {acao.descricao ? <RichTextDisplay content={acao.descricao} /> : "Sem descrição informada."}
          </div>
        </div>
      </div>

      {/* --- ÁREA DE EVIDÊNCIAS --- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>Histórico de Entregas</h2>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* LISTA DO QUE JÁ FOI ENVIADO */}
        {evidencias.map((ev: any) => (
          <div key={ev.id} style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>
                {new Date(ev.createdAt).toLocaleDateString()} às {new Date(ev.createdAt).toLocaleTimeString().slice(0,5)}
              </span>
              {ev.status === 'aprovada' && <span style={{ color: '#16a34a', display: 'flex', gap: '6px', fontSize: '14px', fontWeight: '700' }}><CheckCircle size={18}/> APROVADA</span>}
              {ev.status === 'reprovada' && <span style={{ color: '#dc2626', display: 'flex', gap: '6px', fontSize: '14px', fontWeight: '700' }}><XCircle size={18}/> RECUSADA</span>}
            </div>
            
            <p style={{ fontSize: '15px', color: '#374151', marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>{ev.descricao}</p>
            
            {/* Motivo da Rejeição - Exibido quando a evidência foi reprovada */}
            {ev.status === 'reprovada' && ev.justificativaAdmin && (
              <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle size={16} /> Motivo da Rejeição:
                </p>
                <div style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: '1.5' }}>
                  <RichTextDisplay content={ev.justificativaAdmin} />
                </div>
              </div>
            )}
            
            {ev.fileUrl && (
               <a href={ev.fileUrl} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>
                 <FileText size={16} /> Ver Anexo
               </a>
            )}

            {/* BOTÕES DO ADMIN (Só aparecem se for Admin e status Aguardando) */}
            {podeAvaliar && ev.status === 'aguardando_avaliacao' && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '12px' }}>
                <button onClick={() => aprovarMutation.mutate({ evidenceId: ev.id })} style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <CheckCircle size={20} /> Aprovar
                </button>
                <button onClick={() => handleRecusar(ev.id)} style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', padding: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <Mail size={20} /> Recusar
                </button>
              </div>
            )}
          </div>
        ))}

        {evidencias.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
            <FileText size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
            <p>Nenhuma entrega realizada ainda.</p>
          </div>
        )}

        {/* --- FORMULÁRIO DE ENVIO (SÓ APARECE SE FOR O DONO MESMO) --- */}
        {podeEnviar && (
          <div style={{ marginTop: '24px', backgroundColor: '#eff6ff', padding: '24px', borderRadius: '12px', border: '2px solid #bfdbfe' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Upload size={22} /> Enviar Evidência
            </h3>
            
            <textarea
              placeholder="Descreva o que foi feito..."
              value={descricaoEvidencia}
              onChange={(e) => setDescricaoEvidencia(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #93c5fd', marginBottom: '16px', fontSize: '15px', outline: 'none', transition: 'border 0.2s' }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => enviarEvidencia.mutate({ actionId, descricao: descricaoEvidencia })}
                disabled={!descricaoEvidencia.trim() || enviarEvidencia.isPending}
                style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 32px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', opacity: enviarEvidencia.isPending ? 0.7 : 1 }}
              >
                {enviarEvidencia.isPending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                Enviar para Análise
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
