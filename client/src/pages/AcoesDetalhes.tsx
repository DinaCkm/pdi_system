import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Loader2, CheckCircle, XCircle, FileText, Upload, Send, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AcoesDetalhes() {
  const [location, setLocation] = useLocation();
  
  const actionId = parseInt(location.split('/').pop() || '0');
  const [descricaoEvidencia, setDescricaoEvidencia] = useState("");

  const { data: acao, isLoading: loadingAcao, refetch } = trpc.actions.getById.useQuery({ id: actionId }, { enabled: !!actionId });
  const { data: evidencias = [] } = trpc.evidences.listByAction.useQuery({ actionId }, { enabled: !!actionId });
  
  const { data: pdi } = trpc.pdis.getById.useQuery({ id: acao?.pdiId || 0 }, { enabled: !!acao?.pdiId });
  const { data: colaborador } = trpc.users.getById.useQuery({ id: pdi?.colaboradorId || 0 }, { enabled: !!pdi?.colaboradorId });

  const utils = trpc.useUtils();

  const enviarEvidencia = trpc.evidences.create.useMutation({
    onSuccess: () => {
      toast.success("Evidência enviada!");
      setDescricaoEvidencia("");
      refetch();
      utils.evidences.listByAction.invalidate();
    },
    onError: (err) => toast.error("Erro ao enviar. Verifique se você é o dono da ação.")
  });

  const aprovarMutation = trpc.evidences.aprovar.useMutation({
    onSuccess: () => {
      toast.success("Ação Concluída!");
      refetch();
    },
    onError: () => toast.error("Erro: Apenas administradores podem aprovar.")
  });

  const reprovarMutation = trpc.evidences.reprovar.useMutation({
    onSuccess: () => {
      toast.info("Status resetado.");
      refetch();
    },
    onError: () => toast.error("Erro: Apenas administradores podem reprovar.")
  });

  const handleRecusar = (evidenceId: number) => {
    if (!colaborador?.email) {
      toast.error("E-mail do colaborador não encontrado.");
      return;
    }
    reprovarMutation.mutate({ evidenceId, justificativa: "Ver e-mail" });

    const subject = `Ajuste Necessário: Ação #${acao?.id} - ${acao?.titulo}`;
    const body = `Olá ${colaborador?.name},\n\nAnalisei sua evidência e preciso de ajustes:\n\n[ESCREVA O MOTIVO AQUI]\n\nPor favor, envie novamente.\n\nAtenciosamente.`;
    window.location.href = `mailto:${colaborador.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loadingAcao || !acao) return <div style={{ padding: '32px', textAlign: 'center' }}><Loader2 style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }} /></div>;

  const mostrarBotaoEnviar = (acao.status === 'em_andamento' || acao.status === 'nao_iniciada' || acao.status === 'atrasada');
  const mostrarBotoesAdmin = acao.status === 'aguardando_avaliacao';

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      
      <button onClick={() => setLocation('/acoes')} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}>
        <ArrowLeft size={16} /> Voltar para Lista
      </button>

      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0 }}>{acao.titulo}</h1>
            <p style={{ color: '#6b7280', marginTop: '4px' }}>{acao.descricao || "Sem descrição detalhada."}</p>
          </div>
          <span style={{ 
            padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase',
            backgroundColor: acao.status === 'concluida' ? '#dcfce7' : acao.status === 'aguardando_avaliacao' ? '#fef9c3' : '#dbeafe',
            color: acao.status === 'concluida' ? '#166534' : acao.status === 'aguardando_avaliacao' ? '#854d0e' : '#1e40af'
          }}>
            {acao.status?.replace('_', ' ')}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' }}>Colaborador</label>
            <div style={{ fontWeight: '600', color: '#1f2937' }}>{colaborador?.name || "Carregando..."}</div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>{colaborador?.email}</div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' }}>Prazo</label>
            <div style={{ fontWeight: '600', color: '#1f2937' }}>
              {acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-BR') : '--'}
            </div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={20} /> Entregas e Evidências
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {evidencias.map((ev: any) => (
          <div key={ev.id} style={{ padding: '20px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                Enviado em {new Date(ev.createdAt).toLocaleDateString()}
              </span>
              {ev.status === 'aprovada' && <span style={{ color: '#16a34a', display: 'flex', gap: '4px', fontSize: '14px', fontWeight: '600' }}><CheckCircle size={16}/> Aprovada</span>}
              {ev.status === 'reprovada' && <span style={{ color: '#dc2626', display: 'flex', gap: '4px', fontSize: '14px', fontWeight: '600' }}><XCircle size={16}/> Recusada</span>}
            </div>
            
            <p style={{ fontSize: '15px', color: '#374151', marginBottom: '12px' }}>{ev.descricao}</p>
            
            {ev.fileUrl && (
               <a href={ev.fileUrl} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '14px', padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', textDecoration: 'none' }}>
                 <FileText size={16} /> Ver Arquivo
               </a>
            )}

            {mostrarBotoesAdmin && ev.status === 'aguardando_avaliacao' && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => aprovarMutation.mutate({ evidenceId: ev.id })}
                  style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px', fontWeight: '600' }}
                >
                  <CheckCircle size={18} /> Validar e Concluir
                </button>
                <button
                  onClick={() => handleRecusar(ev.id)}
                  style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px', fontWeight: '600' }}
                >
                  <Mail size={18} /> Recusar e Enviar E-mail
                </button>
              </div>
            )}
          </div>
        ))}

        {evidencias.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #e5e7eb' }}>
            Nenhuma evidência enviada ainda.
          </div>
        )}

        {mostrarBotaoEnviar && (
          <div style={{ marginTop: '16px', backgroundColor: '#eff6ff', padding: '24px', borderRadius: '12px', border: '1px dashed #3b82f6' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={20} /> Enviar Nova Evidência
            </h3>
            <textarea
              placeholder="Descreva o que foi feito..."
              value={descricaoEvidencia}
              onChange={(e) => setDescricaoEvidencia(e.target.value)}
              rows={4}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '16px', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => enviarEvidencia.mutate({ actionId, descricao: descricaoEvidencia })}
              disabled={!descricaoEvidencia.trim() || enviarEvidencia.isPending}
              style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {enviarEvidencia.isPending ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
              Enviar para Análise
            </button>
          </div>
        )}

        {acao.status === 'aguardando_avaliacao' && (
          <div style={{ marginTop: '16px', padding: '20px', textAlign: 'center', backgroundColor: '#fffbeb', borderRadius: '8px', color: '#92400e', border: '1px solid #fcd34d' }}>
            <strong>Evidência em análise.</strong> Aguarde o administrador validar ou solicitar ajustes.
          </div>
        )}
      </div>
    </div>
  );
}
