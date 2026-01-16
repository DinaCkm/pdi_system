import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Target, Boxes, Loader2 } from "lucide-react";
import { ModalCustomizado } from "@/components/ModalCustomizado";

export default function Competencias() {

  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("macros");

  // Estados dos Formulários
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [blocoId, setBlocoId] = useState<string>("");
  const [macroId, setMacroId] = useState<string>("");

  // Estados dos Modais
  const [showNovoBloco, setShowNovoBloco] = useState(false);
  const [showNovaMacro, setShowNovaMacro] = useState(false);
  const [showNovaMicro, setShowNovaMicro] = useState(false);

  // Queries e Segurança
  const { data: user } = trpc.auth.me.useQuery();
  const isAdmin = user?.role === "admin";
  const { data: blocos } = trpc.competencias.listarBlocos.useQuery();
  const { data: macros } = trpc.competencias.listarMacros.useQuery();
  const { data: micros } = trpc.competencias.listarMicros.useQuery();

  // Função de Limpeza de Form
  const resetForms = () => {
    setNome("");
    setDescricao("");
    setBlocoId("");
    setMacroId("");
  };

  // Mutações (Fluxo de Estabilidade)
  const mutationOptions = (msg: string, closeFn: () => void) => ({
    onSuccess: () => {
      toast.success(msg);
      closeFn();
      resetForms();
      utils.competencias.invalidate();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const criarBloco = trpc.competencias.criarBloco.useMutation(mutationOptions("Bloco criado.", () => setShowNovoBloco(false)));
  const criarMacro = trpc.competencias.criarMacro.useMutation(mutationOptions("Macrocompetência criada.", () => setShowNovaMacro(false)));
  const criarMicro = trpc.competencias.criarMicro.useMutation(mutationOptions("Microcompetência criada.", () => setShowNovaMicro(false)));

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Matriz de Competências</h1>
          <p className="text-gray-500">Defina os critérios de avaliação de talentos.</p>
        </div>
        
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowNovoBloco(true)} variant="outline"><Plus className="w-4 h-4 mr-2" /> Bloco</Button>
            <Button onClick={() => setShowNovaMacro(true)} variant="outline"><Plus className="w-4 h-4 mr-2" /> Macro</Button>
            <Button onClick={() => setShowNovaMicro(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Micro</Button>
          </div>
        )}
      </div>

      {/* Abas Nativa (Garante que o clique funcione 100%) */}
      <div className="flex gap-4 border-b mb-8">
        <button 
          onClick={() => {
            console.log('[DEBUG] Mudando para Macrocompetências');
            setActiveTab("macros");
          }}
          className={`pb-3 px-6 text-sm font-semibold transition-all ${activeTab === "macros" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
        >
          Macrocompetências
        </button>
        <button 
          onClick={() => {
            console.log('[DEBUG] Mudando para Microcompetências');
            setActiveTab("micros");
          }}
          className={`pb-3 px-6 text-sm font-semibold transition-all ${activeTab === "micros" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
        >
          Microcompetências
        </button>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === "macros" ? (
          macros?.map((m) => (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700"><Target className="w-5 h-5" /> {m.nome}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-gray-600 leading-relaxed">{m.descricao || "Sem descrição disponível."}</p></CardContent>
            </Card>
          ))
        ) : (
          micros?.map((mi) => (
            <Card key={mi.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-700"><Boxes className="w-5 h-5" /> {mi.nome}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-gray-600 leading-relaxed">{mi.descricao || "Sem descrição disponível."}</p></CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MODAIS CUSTOMIZADOS (Implementação de Segurança) */}
      
      {/* Modal Bloco */}
      <ModalCustomizado isOpen={showNovoBloco} onClose={() => setShowNovoBloco(false)} title="Novo Bloco de Competências">
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nome do Bloco</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Soft Skills" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional" />
          </div>
          <Button className="w-full" disabled={criarBloco.isPending} onClick={() => criarBloco.mutate({ nome, descricao })}>
            {criarBloco.isPending ? <Loader2 className="animate-spin" /> : "Criar Bloco"}
          </Button>
        </div>
      </ModalCustomizado>

      {/* Modal Macro */}
      <ModalCustomizado isOpen={showNovaMacro} onClose={() => setShowNovaMacro(false)} title="Adicionar Macrocompetência">
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Vincular ao Bloco</Label>
            <Select onValueChange={setBlocoId} value={blocoId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o Bloco..." /></SelectTrigger>
              <SelectContent style={{ zIndex: 10005 }}>
                {blocos?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Comunicação Assertiva" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional" />
          </div>
          <Button className="w-full" disabled={criarMacro.isPending} onClick={() => criarMacro.mutate({ nome, descricao, blocoId: Number(blocoId) })}>
            {criarMacro.isPending ? <Loader2 className="animate-spin" /> : "Salvar Macrocompetência"}
          </Button>
        </div>
      </ModalCustomizado>

      {/* Modal Micro */}
      <ModalCustomizado isOpen={showNovaMicro} onClose={() => setShowNovaMicro(false)} title="Adicionar Microcompetência">
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Vincular à Macro</Label>
            <Select onValueChange={setMacroId} value={macroId}>
              <SelectTrigger><SelectValue placeholder="Selecione a Macro..." /></SelectTrigger>
              <SelectContent style={{ zIndex: 10005 }}>
                {macros?.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Escuta Ativa" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional" />
          </div>
          <Button className="w-full bg-blue-600" disabled={criarMicro.isPending} onClick={() => criarMicro.mutate({ nome, descricao, macroId: Number(macroId) })}>
            {criarMicro.isPending ? <Loader2 className="animate-spin" /> : "Salvar Microcompetência"}
          </Button>
        </div>
      </ModalCustomizado>
    </div>
  );
}
