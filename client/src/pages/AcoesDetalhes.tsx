import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
// import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, XCircle, FileText, Upload, Send, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function AcoesDetalhes() {
  const [location, setLocation] = useLocation();
  const { data: user } = trpc.users.me.useQuery();
  
  const actionId = parseInt(location.split('/').pop() || '0');

  const [descricaoEvidencia, setDescricaoEvidencia] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    }
  });

  const aprovarMutation = trpc.evidences.aprovar.useMutation({
    onSuccess: () => {
      toast.success("Ação Concluída com Sucesso!");
      refetch();
    }
  });

  const reprovarMutation = trpc.evidences.reprovar.useMutation({
    onSuccess: () => {
      toast.info("Status voltado para Em Andamento. Abrindo e-mail...");
      refetch();
    }
  });

  const handleRecusar = (evidenceId: number) => {
    if (!colaborador?.email) {
      toast.error("E-mail do colaborador não encontrado.");
      return;
    }

    reprovarMutation.mutate({ evidenceId });

    const subject = `Correção Necessária: Ação #${acao?.id} - ${acao?.titulo}`;
    const body = `Olá ${colaborador.name},\n\nAnalisei sua evidência para a ação "${acao?.titulo}" e preciso que faça alguns ajustes:\n\n[ESCREVA AQUI O MOTIVO]\n\nPor favor, envie uma nova evidência após corrigir.\n\nAtenciosamente,\n${user?.name}`;
    
    window.location.href = `mailto:${colaborador.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loadingAcao || !acao) return <div style={{ padding: '32px', textAlign: 'center' }}><Loader2 style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }} /></div>;

  const isAdmin = user?.role === 'admin';
  const isDono = user?.id === pdi?.colaboradorId;
  const podeEnviar = isDono && (acao.status === 'em_andamento' || acao.status === 'nao_iniciada' || acao.status === 'atrasada');
  const podeAvaliar = isAdmin && acao.status === 'aguardando_avaliacao';

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => setLocation('/acoes')} style={{ fontSize: '14px', color: '#666', marginBottom: '8px', cursor: 'pointer', background: 'none', border: 'none' }}>
          ← Voltar para Lista
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>{acao.titulo}</h1>
          <span style={{ 
            padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase',
            backgroundColor: acao.status === 'concluida' ? '#dcfce7' : acao.status === 'aguardando_avaliacao' ? '#fef9c3' : '#e0f2fe',
            color: acao.status === 'concluida' ? '#166534' : acao.status === 'aguardando_avaliacao' ? '#854d0e' : '#0369a1'
          }}>
            {acao.status?.replace('_', ' ')}
          </span>
        </div>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>{acao.descricao || "Sem descrição."}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' }}>Colaborador</span>
          <div style={{ fontWeight: '600', color: '#111827' }}>{colaborador?.name || "Carregando..."}</div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>{colaborador?.email}</div>
        </div>
        <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' }}>Prazo Final</span>
          <div style={{ fontWeight: '600', color: '#111827' }}>
            {acao.prazo ? new Date(acao.prazo).toLocaleDateString('pt-BR') : '--'}
          </div>
        </div>
      </div>

      <hr style={{ borderColor: '#e5e7eb', marginBottom: '32px' }} />

      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Evidências e Entregas</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {evidencias.length === 0 && <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Nenhuma evidência anexada ainda.</p>}
        
        {evidencias.map((ev: any) => (
          <div key={ev.id} style={{ padding: '16px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ fontSize: '14px' }}>Enviado em: {new Date(ev.createdAt).toLocaleDateString()}</strong>
              {ev.status === 'aprovada' && <span style={{ color: 'green', display: 'flex', gap: '4px' }}><CheckCircle size={16}/> Aprovada</span>}
              {ev.status === 'reprovada' && <span style={{ color: 'red', display: 'flex', gap: '4px' }}><XCircle size={16}/> Recusada</span>}
            </div>
            <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px' }}>{ev.descricao}</p>

            {podeAvaliar && ev.status === 'aguardando_avaliacao' && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => aprovarMutation.mutate({ evidenceId: ev.id })}
                  style={{ flex: 1, backgroundColor: '#16a34a', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <CheckCircle size={18} /> Validar e Concluir
                </button>
                
                <button
                  onClick={() => handleRecusar(ev.id)}
                  style={{ flex: 1, backgroundColor: '#dc2626', color: 'white', padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Mail size={18} /> Recusar (Enviar E-mail)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {podeEnviar && (
        <div style={{ backgroundColor: '#eff6ff', padding: '24px', borderRadius: '8px', border: '1px dashed #3b82f6' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={20} /> Enviar Nova Evidência
          </h3>
          
          <textarea
            placeholder="Descreva o que foi feito ou cole o link do trabalho..."
            value={descricaoEvidencia}
            onChange={(e) => setDescricaoEvidencia(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #93c5fd', marginBottom: '12px', fontFamily: 'inherit' }}
          />

          <button
            onClick={() => enviarEvidencia.mutate({ actionId, descricao: descricaoEvidencia })}
            disabled={!descricaoEvidencia.trim() || enviarEvidencia.isPending}
            style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {enviarEvidencia.isPending ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
            Enviar para Análise
          </button>
        </div>
      )}

      {acao.status === 'aguardando_avaliacao' && isDono && (
        <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#fffbeb', borderRadius: '8px', color: '#92400e', marginTop: '24px' }}>
          <strong>Sua evidência está em análise.</strong><br/>
          Aguarde o retorno do administrador ou líder.
        </div>
      )}

    </div>
  );
}
