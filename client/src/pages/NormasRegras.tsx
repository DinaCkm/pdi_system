import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Trash2,
  PlusCircle,
  Calendar,
  Wrench,
  GitBranch,
  CheckCircle,
  BookOpen,
  ClipboardList,
  FileEdit,
  Search,
  Settings,
  Shield,
  AlertCircle,
  Info,
  ChevronRight,
} from "lucide-react";

// Mapeamento de ícones por nome
const iconMap: Record<string, any> = {
  RefreshCw,
  Trash2,
  PlusCircle,
  Calendar,
  Wrench,
  GitBranch,
  CheckCircle,
  BookOpen,
  ClipboardList,
  FileEdit,
  Search,
  Settings,
  Shield,
  AlertCircle,
  Info,
};

// Cores por categoria
const categoryColors: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
  regras: {
    bg: "bg-gradient-to-br from-orange-50 to-amber-50",
    border: "border-l-orange-500",
    badge: "bg-orange-100 text-orange-700",
    icon: "text-orange-600",
  },
  fluxo: {
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    border: "border-l-blue-500",
    badge: "bg-blue-100 text-blue-700",
    icon: "text-blue-600",
  },
  geral: {
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    border: "border-l-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "text-emerald-600",
  },
};

// Componente de card de norma
function NormaCard({ norma }: { norma: any }) {
  const [expanded, setExpanded] = useState(false);
  const [imgExpanded, setImgExpanded] = useState(false);
  const colors = categoryColors[norma.categoria] || categoryColors.geral;
  const IconComponent = iconMap[norma.icone] || BookOpen;

  // Processar conteúdo: separar por linhas e formatar
  const lines = norma.conteudo.split("\n").filter((l: string) => l.trim());

  return (
    <>
    <Card
      className={`${colors.bg} border-l-4 ${colors.border} shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-0">
        {/* Imagem de capa (se houver) */}
        {norma.imagemUrl && (
          <div
            className="relative w-full h-48 overflow-hidden cursor-zoom-in"
            onClick={(e) => {
              e.stopPropagation();
              setImgExpanded(true);
            }}
          >
            <img
              src={norma.imagemUrl}
              alt={norma.titulo}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            {!norma.imagemUrl && (
              <div className={`p-3 rounded-xl bg-white shadow-sm shrink-0`}>
                <IconComponent className={`w-6 h-6 ${colors.icon}`} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-lg font-bold text-gray-900">{norma.titulo}</h3>
                <Badge variant="secondary" className={`text-xs ${colors.badge} border-0`}>
                  {norma.categoria === "regras" ? "Regra" : norma.categoria === "fluxo" ? "Fluxo" : "Geral"}
                </Badge>
              </div>
              {norma.subtitulo && (
                <p className="text-sm text-gray-500 font-medium">{norma.subtitulo}</p>
              )}
            </div>
            <ChevronRight
              className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </div>

          {/* Preview (sempre visível) */}
          {!expanded && lines.length > 0 && (
            <p className={`mt-3 text-sm text-gray-600 line-clamp-2 ${norma.imagemUrl ? '' : 'pl-16'}`}>
              {lines[0]}
            </p>
          )}

          {/* Conteúdo expandido */}
          {expanded && (
            <div className={`mt-4 ${norma.imagemUrl ? '' : 'pl-16'} space-y-2`}>
              {lines.map((line: string, idx: number) => {
                // Detectar passos
                if (line.startsWith("Passo")) {
                  const [label, ...rest] = line.split(":");
                  return (
                    <div key={idx} className="flex gap-2">
                      <span className="font-bold text-gray-800 shrink-0">{label}:</span>
                      <span className="text-gray-700">{rest.join(":").trim()}</span>
                    </div>
                  );
                }
                // Detectar resultado
                if (line.startsWith("Resultado:")) {
                  return (
                    <div key={idx} className="mt-2 p-3 bg-white/70 rounded-lg border border-gray-200">
                      <span className="font-bold text-emerald-700">Resultado: </span>
                      <span className="text-gray-700">{line.replace("Resultado:", "").trim()}</span>
                    </div>
                  );
                }
                // Detectar subtítulos de seção (ex: "ALTERAÇÃO MENOR QUE 30 DIAS")
                if (line.startsWith("---")) {
                  return <hr key={idx} className="border-gray-200 my-2" />;
                }
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <p key={idx} className="font-bold text-gray-800 mt-2">
                      {line.replace(/\*\*/g, "")}
                    </p>
                  );
                }
                // Texto normal
                return (
                  <p key={idx} className="text-gray-700 text-sm leading-relaxed">
                    {line}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Modal de imagem expandida */}
    {imgExpanded && norma.imagemUrl && (
      <div
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        onClick={() => setImgExpanded(false)}
      >
        <img
          src={norma.imagemUrl}
          alt={norma.titulo}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <button
          className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70"
          onClick={() => setImgExpanded(false)}
        >
          ✕
        </button>
      </div>
    )}
    </>
  );
}

// Componente de timeline para o fluxo
function FluxoTimeline({ normas }: { normas: any[] }) {
  const fluxoNormas = normas.filter((n) => n.categoria === "fluxo");
  if (fluxoNormas.length === 0) return null;

  // Combinar todo o conteúdo de fluxo em fases
  const fases = [
    {
      numero: 1,
      titulo: "Fase de Ajustes/Início",
      descricao:
        "O colaborador entra no sistema e revisa suas ações. O ideal é que ele faça e discuta isso com seu gestor direto. Caso precise mudar algo, ele pode pedir via plataforma: Alteração, substituição ou exclusão de ações e Ajuste de prazos.",
      cor: "from-red-500 to-orange-500",
      icone: FileEdit,
    },
    {
      numero: 2,
      titulo: "Validação das Mudanças",
      descricao:
        'A responsabilidade passa para o gestor, que deve filtrar o que faz sentido para o desenvolvimento do colaborador. Ele acessa o menu de "Solicitações de Alteração" e analisa cada pedido individualmente, inserindo um comentário aprovando ou não.',
      cor: "from-orange-500 to-amber-500",
      icone: Search,
    },
    {
      numero: 3,
      titulo: "Operacionalização",
      descricao:
        "A equipe da CKM entra em cena para garantir que o sistema reflita exatamente o que foi combinado entre líder e liderado. O setor processa as alterações validadas pelo gestor e organiza toda a estrutura do PDI para que ele esteja pronto em sua versão final.",
      cor: "from-amber-500 to-yellow-500",
      icone: Settings,
    },
    {
      numero: 4,
      titulo: "Aprovação Final",
      descricao:
        "O gestor acessa a seção correspondente aos PDIs de sua equipe e realiza o clique de aprovação final. A partir deste momento, o status do PDI passa a ser considerado oficialmente aprovado.",
      cor: "from-yellow-500 to-green-500",
      icone: CheckCircle,
    },
    {
      numero: 5,
      titulo: "Manutenção e Pós-Aprovação",
      descricao:
        "O colaborador já pode começar a enviar suas evidências e comprovações. O PDI é um documento vivo, mas após a aprovação final, alterações permanecem liberadas mas como exceção à regra, e passa a exigir uma justificativa clara e um novo aceite do gestor.",
      cor: "from-green-500 to-emerald-500",
      icone: Shield,
    },
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <GitBranch className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Fluxo do Ciclo 2026/01 – Passo a Passo</h2>
          <p className="text-sm text-gray-500">As 5 etapas do ciclo de PDI</p>
        </div>
      </div>

      {/* Timeline horizontal em desktop, vertical em mobile */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {fases.map((fase) => {
          const IconComp = fase.icone;
          return (
            <div key={fase.numero} className="relative group">
              {/* Número grande */}
              <div
                className={`bg-gradient-to-br ${fase.cor} text-white rounded-t-xl p-4 text-center`}
              >
                <span className="text-4xl font-black opacity-30 absolute top-2 right-3">
                  {fase.numero}
                </span>
                <IconComp className="w-8 h-8 mx-auto mb-2" />
                <h3 className="font-bold text-sm leading-tight">{fase.titulo}</h3>
              </div>
              {/* Descrição */}
              <div className="bg-amber-50 border border-amber-200 rounded-b-xl p-4 flex-1">
                <p className="text-xs text-gray-700 leading-relaxed">{fase.descricao}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function NormasRegras() {
  const { user } = useAuth();
  const { data: normas, isLoading } = trpc.normasRegras.list.useQuery();

  const regras = normas?.filter((n: any) => n.categoria === "regras") || [];
  const gerais = normas?.filter((n: any) => n.categoria === "geral") || [];
  const fluxo = normas?.filter((n: any) => n.categoria === "fluxo") || [];

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
        {/* Header com fundo laranja inspirado na apresentação */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 p-6 md:p-8 text-white shadow-lg">
          {/* Padrão decorativo de fundo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-8 text-6xl">📚</div>
            <div className="absolute top-12 right-16 text-4xl">✏️</div>
            <div className="absolute bottom-4 left-1/3 text-5xl">📋</div>
            <div className="absolute bottom-8 right-8 text-3xl">🎯</div>
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8" />
              <h1 className="text-2xl md:text-3xl font-black">
                Normas e Regras do PDI
              </h1>
            </div>
            <p className="text-white/90 text-sm md:text-base max-w-2xl">
              Informações e Fluxo do PDI – Ciclo 2026. Consulte as regras para inclusão, alteração e exclusão de ações, além do passo a passo do ciclo.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Seção: Regras para Inclusão, Alteração e Exclusão */}
            {regras.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ClipboardList className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Regras para Inclusão, Alteração e Exclusão
                    </h2>
                    <p className="text-sm text-gray-500">
                      Clique em cada card para ver os detalhes completos
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {regras.map((norma: any) => (
                    <NormaCard key={norma.id} norma={norma} />
                  ))}
                </div>
              </div>
            )}

            {/* Seção: Cards gerais */}
            {gerais.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Info className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Informações Gerais</h2>
                    <p className="text-sm text-gray-500">Orientações adicionais sobre o PDI</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {gerais.map((norma: any) => (
                    <NormaCard key={norma.id} norma={norma} />
                  ))}
                </div>
              </div>
            )}

            {/* Seção: Fluxo do Ciclo (Timeline) */}
            <FluxoTimeline normas={normas || []} />

            {/* Mensagem vazia */}
            {(!normas || normas.length === 0) && (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500">
                  Nenhuma norma ou regra cadastrada
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  O administrador ainda não cadastrou as normas e regras do PDI.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
