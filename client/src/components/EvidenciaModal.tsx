import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertTriangle, Upload, X, FileText, Link2, ChevronRight, ChevronLeft, Trophy, Sparkles, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface EvidenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionId: number;
  actionNome: string;
  macrocompetencia?: string;
  descricao?: string;
  prazo?: string | Date | null;
  onSuccess: () => void;
}

const TIPOS_EVIDENCIA = [
  { value: 'certificado', label: 'Certificado / Diploma', icon: '📜' },
  { value: 'relatorio', label: 'Relatório / Documento', icon: '📄' },
  { value: 'projeto', label: 'Projeto Realizado', icon: '🏗️' },
  { value: 'apresentacao', label: 'Apresentação / Palestra', icon: '🎤' },
  { value: 'evento', label: 'Evento / Workshop', icon: '📅' },
  { value: 'mentoria', label: 'Mentoria / Coaching', icon: '🤝' },
  { value: 'outro', label: 'Outro', icon: '📎' },
] as const;

type TipoEvidencia = typeof TIPOS_EVIDENCIA[number]['value'];

interface UploadedFile {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  fileKey: string;
}

function getImpactoFaixa(valor: number): { cor: string; label: string; descricao: string } {
  if (valor <= 20) return { cor: 'text-red-600', label: 'Muito Baixo', descricao: 'Realizei a ação, mas ainda não consegui aplicar na prática.' };
  if (valor <= 40) return { cor: 'text-orange-500', label: 'Baixo', descricao: 'Comecei a aplicar alguns conceitos, mas o impacto ainda é limitado.' };
  if (valor <= 60) return { cor: 'text-yellow-600', label: 'Moderado', descricao: 'Já aplico regularmente e percebo melhorias no meu trabalho.' };
  if (valor <= 80) return { cor: 'text-blue-600', label: 'Alto', descricao: 'A aplicação gerou resultados visíveis e reconhecidos pela equipe.' };
  return { cor: 'text-green-600', label: 'Muito Alto', descricao: 'Transformou significativamente minha atuação e gerou resultados mensuráveis.' };
}

export function EvidenciaModal({ open, onOpenChange, actionId, actionNome, macrocompetencia, descricao, prazo, onSuccess }: EvidenciaModalProps) {
  const [etapa, setEtapa] = useState(1);
  const [tipoEvidencia, setTipoEvidencia] = useState<TipoEvidencia | ''>('');
  const [dataRealizacao, setDataRealizacao] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState<number | ''>('');
  const [oQueRealizou, setOQueRealizou] = useState('');
  const [comoAplicou, setComoAplicou] = useState('');
  const [resultadoPratico, setResultadoPratico] = useState('');
  const [impactoPercentual, setImpactoPercentual] = useState(50);
  const [principalAprendizado, setPrincipalAprendizado] = useState('');
  const [linkExterno, setLinkExterno] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [evidenceId, setEvidenceId] = useState<number | null>(null);
  const { user } = useAuth();

  const uploadFileMutation = trpc.evidences.uploadFile.useMutation();
  const createEvidenceMutation = trpc.evidences.create.useMutation();

  const resetForm = useCallback(() => {
    setEtapa(1);
    setTipoEvidencia('');
    setDataRealizacao('');
    setCargaHoraria('');
    setOQueRealizou('');
    setComoAplicou('');
    setResultadoPratico('');
    setImpactoPercentual(50);
    setPrincipalAprendizado('');
    setLinkExterno('');
    setUploadedFiles([]);
    setUploading(false);
    setSubmitting(false);
    setSuccess(false);
    setEvidenceId(null);
  }, []);

  useEffect(() => {
    if (open) resetForm();
  }, [actionId, open, resetForm]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Arquivo "${file.name}" excede o limite de 10MB`);
          continue;
        }
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const result = await uploadFileMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileBase64: base64,
        });
        setUploadedFiles(prev => [...prev, result]);
        toast.success(`Arquivo "${file.name}" enviado com sucesso`);
      }
    } catch (error) {
      toast.error('Erro ao enviar arquivo. Tente novamente.');
      console.error('[EvidenciaModal] Erro upload:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!oQueRealizou.trim()) { toast.error('Descreva o que realizou'); return; }
    if (!comoAplicou.trim()) { toast.error('Descreva como aplicou na prática'); return; }
    if (!principalAprendizado.trim()) { toast.error('Descreva seu principal aprendizado'); return; }

    setSubmitting(true);
    try {
      const result = await createEvidenceMutation.mutateAsync({
        actionId,
        tipoEvidencia: tipoEvidencia || undefined,
        dataRealizacao: dataRealizacao || undefined,
        cargaHoraria: cargaHoraria ? Number(cargaHoraria) : undefined,
        oQueRealizou: oQueRealizou.trim(),
        comoAplicou: comoAplicou.trim(),
        resultadoPratico: resultadoPratico.trim() || undefined,
        impactoPercentual,
        principalAprendizado: principalAprendizado.trim(),
        linkExterno: linkExterno.trim() || undefined,
        files: uploadedFiles.length > 0 ? uploadedFiles : [],
      });
      setEvidenceId(result.evidenceId);
      setSuccess(true);
      onSuccess();
    } catch (error) {
      toast.error('Erro ao registrar evidência. Tente novamente.');
      console.error('[EvidenciaModal] Erro submit:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const canAdvanceEtapa1 = tipoEvidencia !== '' && oQueRealizou.trim().length > 0;
  const canAdvanceEtapa2 = comoAplicou.trim().length > 0 && principalAprendizado.trim().length > 0;

  if (!open) return null;

  const impactoFaixa = getImpactoFaixa(impactoPercentual);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-300" />
                Registrar Minha Conquista
              </h2>
              <p className="text-blue-100 text-sm mt-0.5 truncate max-w-md">
                {actionNome}
              </p>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-white/80 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Progress bar */}
          {!success && (
            <div className="flex gap-2 mt-3">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex-1 flex items-center gap-1">
                  <div className={`h-1.5 flex-1 rounded-full transition-colors ${etapa >= step ? 'bg-yellow-300' : 'bg-blue-400/40'}`} />
                  <span className={`text-xs font-medium ${etapa >= step ? 'text-yellow-200' : 'text-blue-300'}`}>
                    {step === 1 ? 'Relato' : step === 2 ? 'Impacto' : 'Confirmar'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            /* Tela de Sucesso */
            <div className="text-center py-8 space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-700">Conquista Registrada!</h3>
                <p className="text-gray-600 mt-2">
                  Sua evidência foi registrada com sucesso e está aguardando avaliação.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  ID: <strong className="text-green-600 font-mono">EV-{String(evidenceId).padStart(6, '0')}</strong>
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm text-blue-800">
                  <strong>Impacto informado por você:</strong> {impactoPercentual}%
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  O administrador irá avaliar sua evidência e validar o impacto prático. O índice IIP será calculado com base na avaliação do administrador.
                </p>
              </div>
              <button
                onClick={() => { resetForm(); onOpenChange(false); }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Fechar
              </button>
            </div>
          ) : etapa === 1 ? (
            /* Etapa 1: O que realizou */
            <div className="space-y-5">
              {/* Tipo de Evidência */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-2">
                  Tipo de Evidência <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TIPOS_EVIDENCIA.map(tipo => (
                    <button
                      key={tipo.value}
                      onClick={() => setTipoEvidencia(tipo.value)}
                      className={`p-2.5 rounded-lg border-2 text-left transition-all text-sm ${
                        tipoEvidencia === tipo.value
                          ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-lg mr-1">{tipo.icon}</span>
                      {tipo.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data e Carga Horária */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-800 block mb-1">Data de Realização</label>
                  <input
                    type="date"
                    value={dataRealizacao}
                    onChange={e => setDataRealizacao(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Quando você realizou esta ação?</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-800 block mb-1">Carga Horária (h)</label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={cargaHoraria}
                    onChange={e => setCargaHoraria(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex: 40"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Quantas horas dedicou?</p>
                </div>
              </div>

              {/* O que realizou */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-1">
                  O que você realizou? <span className="text-red-500">*</span>
                </label>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <p className="text-xs text-amber-800 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      Descreva detalhadamente o que fez: nome do curso/evento, instituição, conteúdo abordado, atividades realizadas. 
                      Quanto mais detalhes, melhor será a avaliação.
                    </span>
                  </p>
                </div>
                <textarea
                  value={oQueRealizou}
                  onChange={e => setOQueRealizou(e.target.value)}
                  rows={4}
                  placeholder="Ex: Concluí o curso 'Liderança Situacional' na plataforma Coursera, com duração de 40 horas. O curso abordou os 4 estilos de liderança..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          ) : etapa === 2 ? (
            /* Etapa 2: Impacto Prático */
            <div className="space-y-5">
              {/* Como aplicou */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-1">
                  Como você aplicou na prática? <span className="text-red-500">*</span>
                </label>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <p className="text-xs text-amber-800 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      Descreva situações reais em que aplicou o aprendizado no seu dia a dia de trabalho. 
                      Cite exemplos concretos: reuniões, projetos, interações com a equipe.
                    </span>
                  </p>
                </div>
                <textarea
                  value={comoAplicou}
                  onChange={e => setComoAplicou(e.target.value)}
                  rows={3}
                  placeholder="Ex: Após o curso, passei a adaptar meu estilo de liderança conforme a maturidade de cada membro da equipe. Na reunião semanal..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Resultado prático */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-1">Resultado prático observado</label>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <p className="text-xs text-amber-800 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      Quais mudanças ou melhorias você percebeu após aplicar o aprendizado? 
                      Pode ser qualitativo (melhor comunicação) ou quantitativo (aumento de X%).
                    </span>
                  </p>
                </div>
                <textarea
                  value={resultadoPratico}
                  onChange={e => setResultadoPratico(e.target.value)}
                  rows={3}
                  placeholder="Ex: A equipe passou a entregar 20% mais rápido e o clima organizacional melhorou conforme pesquisa interna..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Slider de Impacto */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-1">
                  Nível de Impacto Prático <span className="text-red-500">*</span>
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-2xl font-bold ${impactoFaixa.cor}`}>{impactoPercentual}%</span>
                    <span className={`text-sm font-semibold ${impactoFaixa.cor}`}>{impactoFaixa.label}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={impactoPercentual}
                    onChange={e => setImpactoPercentual(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 italic">{impactoFaixa.descricao}</p>
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded p-2">
                    <p className="text-xs text-blue-700">
                      <strong>Importante:</strong> Este é o impacto que <em>você</em> percebe. O administrador fará sua própria avaliação do impacto, que será usada no cálculo do IIP (Índice de Impacto Prático).
                    </p>
                  </div>
                </div>
              </div>

              {/* Principal Aprendizado */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-1">
                  Principal Aprendizado <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={principalAprendizado}
                  onChange={e => setPrincipalAprendizado(e.target.value)}
                  rows={3}
                  placeholder="Ex: Aprendi que não existe um único estilo de liderança ideal - o mais eficaz é aquele que se adapta ao contexto..."
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          ) : (
            /* Etapa 3: Anexos e Confirmação */
            <div className="space-y-5">
              {/* Upload de Arquivos */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-2">
                  Anexar Comprovantes <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-amber-800 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      Anexe certificados, relatórios, prints, fotos ou qualquer documento que comprove a realização. 
                      Formatos aceitos: PDF, imagens, documentos. Máximo 10MB por arquivo.
                    </span>
                  </p>
                </div>

                {/* Lista de arquivos */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2.5">
                        <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-800 truncate flex-1">{file.fileName}</span>
                        <span className="text-xs text-green-600">{(file.fileSize / 1024).toFixed(0)} KB</span>
                        <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 p-0.5">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                  {uploading ? (
                    <><Loader2 className="h-5 w-5 animate-spin text-blue-500" /> <span className="text-sm text-blue-600">Enviando...</span></>
                  ) : (
                    <><Upload className="h-5 w-5 text-gray-400" /> <span className="text-sm text-gray-600">Clique para selecionar arquivos</span></>
                  )}
                  <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.ppt,.pptx" />
                </label>
              </div>

              {/* Link Externo */}
              <div>
                <label className="text-sm font-semibold text-gray-800 block mb-1">
                  Link Externo <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="url"
                    value={linkExterno}
                    onChange={e => setLinkExterno(e.target.value)}
                    placeholder="https://exemplo.com/certificado"
                    className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Link para certificado online, portfólio, vídeo, etc.</p>
              </div>

              {/* Resumo */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  Resumo da Evidência
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-28 flex-shrink-0">Tipo:</span>
                    <span className="text-gray-800 font-medium">{TIPOS_EVIDENCIA.find(t => t.value === tipoEvidencia)?.label || '-'}</span>
                  </div>
                  {dataRealizacao && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-28 flex-shrink-0">Data:</span>
                      <span className="text-gray-800">{new Date(dataRealizacao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  {cargaHoraria && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 w-28 flex-shrink-0">Carga Horária:</span>
                      <span className="text-gray-800">{cargaHoraria}h</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-28 flex-shrink-0">Impacto:</span>
                    <span className={`font-bold ${impactoFaixa.cor}`}>{impactoPercentual}% ({impactoFaixa.label})</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-28 flex-shrink-0">Arquivos:</span>
                    <span className="text-gray-800">{uploadedFiles.length} arquivo(s)</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="text-gray-500 text-xs mb-1">O que realizou:</p>
                    <p className="text-gray-700 text-xs line-clamp-2">{oQueRealizou}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 bg-gray-50">
            <div>
              {etapa > 1 && (
                <button
                  onClick={() => setEtapa(e => e - 1)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancelar
              </button>
              {etapa < 3 ? (
                <button
                  onClick={() => setEtapa(e => e + 1)}
                  disabled={etapa === 1 ? !canAdvanceEtapa1 : !canAdvanceEtapa2}
                  className="flex items-center gap-1 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  Próximo <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || uploading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-bold transition-colors shadow-sm"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</>
                  ) : (
                    <><Trophy className="h-4 w-4" /> Registrar Conquista</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
