import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { ModalCustomizado } from "@/components/ModalCustomizado";

export default function Competencias() {
  const utils = trpc.useUtils();
  
  // Estados dos Formulários
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [blocoId, setBlocoId] = useState<string>("");
  const [macroId, setMacroId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados dos Modais
  const [showNovoBloco, setShowNovoBloco] = useState(false);
  const [showNovaMacro, setShowNovaMacro] = useState(false);
  const [showNovaMicro, setShowNovaMicro] = useState(false);
  
  // Estados de Expansão (Accordion)
  const [expandedBlocos, setExpandedBlocos] = useState<Set<number>>(new Set());
  const [expandedMacros, setExpandedMacros] = useState<Set<number>>(new Set());
  
  // Filtro de Status
  const [filterStatus, setFilterStatus] = useState<'ativas' | 'inativas' | 'todas'>('ativas');
  
  // Estados de Confirmação de Exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "bloco" | "macro" | "micro";
    id: number;
    nome: string;
  } | null>(null);

  // Queries e Segurança
  const { data: user } = trpc.auth.me.useQuery();
  const isAdmin = user?.role === "admin";
  const { data: blocos } = trpc.competencias.listBlocos.useQuery();
  const { data: macros } = trpc.competencias.listAllMacros.useQuery();
  const { data: micros } = trpc.competencias.listMicros.useQuery();

  // Função de Limpeza de Form
  const resetForms = () => {
    setNome("");
    setDescricao("");
    setBlocoId("");
    setMacroId("");
  };

  // Mutações
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
  
  const deletarBloco = trpc.competencias.deletarBloco.useMutation({
    onSuccess: () => {
      toast.success("Bloco marcado como inativo.");
      setDeleteConfirm(null);
      utils.competencias.invalidate();
    },
    onError: (e: any) => toast.error(e.message)
  });
  
  const deletarMacro = trpc.competencias.deletarMacro.useMutation({
    onSuccess: () => {
      toast.success("Macrocompetência marcada como inativa.");
      setDeleteConfirm(null);
      utils.competencias.invalidate();
    },
    onError: (e: any) => toast.error(e.message)
  });
  
  const deletarMicro = trpc.competencias.deletarMicro.useMutation({
    onSuccess: () => {
      toast.success("Microcompetência marcada como inativa.");
      setDeleteConfirm(null);
      utils.competencias.invalidate();
    },
    onError: (e: any) => toast.error(e.message)
  });

  // Filtrar competências por termo de busca E status
  const filteredBlocos = blocos?.filter(b => {
    const matchesSearch = b.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'ativas') return matchesSearch && b.status === 'ativo';
    if (filterStatus === 'inativas') return matchesSearch && b.status === 'inativo';
    return matchesSearch; // 'todas'
  }) || [];

  const filteredMacros = (blocoId: number) =>
    macros?.filter(m => {
      const matchesSearch = m.blocoId === parseInt(blocoId) &&
        (m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.descricao?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (filterStatus === 'ativas') return matchesSearch && m.status === 'ativo';
      if (filterStatus === 'inativas') return matchesSearch && m.status === 'inativo';
      return matchesSearch; // 'todas'
    }) || [];

  const filteredMicros = (macroId: number) =>
    micros?.filter(m => {
      const matchesSearch = m.macroId === parseInt(macroId) &&
        (m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.descricao?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (filterStatus === 'ativas') return matchesSearch && m.status === 'ativo';
      if (filterStatus === 'inativas') return matchesSearch && m.status === 'inativo';
      return matchesSearch; // 'todas'
    }) || [];

  // Contar competências ativas e inativas
  const contarAtivas = (items: any[]) => items?.filter(i => i.status === 'ativo').length || 0;
  const contarInativas = (items: any[]) => items?.filter(i => i.status === 'inativo').length || 0;

  const toggleBlocoExpanded = (blocoId: number) => {
    const newSet = new Set(expandedBlocos);
    if (newSet.has(blocoId)) {
      newSet.delete(blocoId);
    } else {
      newSet.add(blocoId);
    }
    setExpandedBlocos(newSet);
  };

  const toggleMacroExpanded = (macroId: number) => {
    const newSet = new Set(expandedMacros);
    if (newSet.has(macroId)) {
      newSet.delete(macroId);
    } else {
      newSet.add(macroId);
    }
    setExpandedMacros(newSet);
  };

  const handleDeleteClick = (type: "bloco" | "macro" | "micro", id: number, nome: string) => {
    setDeleteConfirm({ type, id, nome });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === "bloco") {
      deletarBloco.mutate({ id: deleteConfirm.id });
    } else if (deleteConfirm.type === "macro") {
      deletarMacro.mutate({ id: deleteConfirm.id });
    } else if (deleteConfirm.type === "micro") {
      deletarMicro.mutate({ id: deleteConfirm.id });
    }
  };

  const getDeleteMessage = () => {
    if (!deleteConfirm) return "";
    
    if (deleteConfirm.type === "bloco") {
      return `ATENÇÃO: Este bloco possui Macros e Micros vinculadas. Ao confirmar, TODA a árvore será marcada como inativa. Esta ação é irreversível. Confirma?`;
    } else if (deleteConfirm.type === "macro") {
      return `ATENÇÃO: Todas as Microcompetências desta Macro serão marcadas como inativas. PDIs ativos que utilizam esta competência manterão o registro histórico, mas a competência sairá da matriz. Confirma?`;
    } else {
      return `Tem certeza que deseja marcar esta Microcompetência como inativa? PDIs que a utilizam manterão o registro histórico.`;
    }
  };

  return (
    <div className="w-full min-h-full space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      {/* Filtro de Busca e Status */}
      <div className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Buscar por termo em Blocos, Macros ou Micros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-4"
          />
        </div>
        
        {/* Botões de Filtro de Status */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterStatus === 'ativas' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('ativas')}
            className={filterStatus === 'ativas' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            ✓ Ativas ({contarAtivas(blocos || [])})
          </Button>
          <Button
            variant={filterStatus === 'inativas' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('inativas')}
            className={filterStatus === 'inativas' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            ✗ Inativas ({contarInativas(blocos || [])})
          </Button>
          <Button
            variant={filterStatus === 'todas' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('todas')}
          >
            Todas ({(blocos || []).length})
          </Button>
        </div>
      </div>

      {/* Listagem Hierárquica (Accordion) */}
      <div className="space-y-3">
        {filteredBlocos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma competência encontrada com os filtros selecionados.</p>
          </div>
        )}
        {filteredBlocos.length > 0 && filteredBlocos.map((bloco) => {
          const macrosDoBloco = filteredMacros(bloco.id);
          const isExpanded = expandedBlocos.has(bloco.id);
          
          return (
            <div key={bloco.id} className="border rounded-lg overflow-hidden bg-white">
              {/* Bloco Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleBlocoExpanded(bloco.id)}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">📦 {bloco.nome}</h3>
                    {bloco.descricao && (
                      <p className="text-sm text-gray-600 truncate">{bloco.descricao}</p>
                    )}
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="flex gap-2 flex-shrink-0 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteClick("bloco", bloco.id, bloco.nome)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Macros (Expandível) */}
              {isExpanded && macrosDoBloco.length > 0 && (
                <div className="bg-white border-t">
                  {macrosDoBloco.map((macro) => {
                    const microsDaMacro = filteredMicros(macro.id);
                    const isMacroExpanded = expandedMacros.has(macro.id);
                    
                    return (
                      <div key={macro.id} className="border-b last:border-b-0">
                        {/* Macro Header */}
                        <div className="flex items-center justify-between p-4 pl-12 bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <button
                              onClick={() => toggleMacroExpanded(macro.id)}
                              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
                            >
                              {isMacroExpanded ? (
                                <ChevronDown className="w-5 h-5 text-blue-600" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-blue-600" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-800 truncate">📂 {macro.nome}</h4>
                              {macro.descricao && (
                                <p className="text-sm text-gray-600 truncate">{macro.descricao}</p>
                              )}
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <div className="flex gap-2 flex-shrink-0 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteClick("macro", macro.id, macro.nome)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Micros (Expandível) */}
                        {isMacroExpanded && microsDaMacro.length > 0 && (
                          <div className="bg-white">
                            {microsDaMacro.map((micro) => (
                              <div key={micro.id} className="flex items-center justify-between p-4 pl-20 border-b last:border-b-0 hover:bg-blue-50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-gray-700 truncate">📄 {micro.nome}</h5>
                                  {micro.descricao && (
                                    <p className="text-sm text-gray-600 truncate">{micro.descricao}</p>
                                  )}
                                </div>
                                
                                {isAdmin && (
                                  <div className="flex gap-2 flex-shrink-0 ml-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteClick("micro", micro.id, micro.nome)}
                                      className="text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAIS */}
      
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

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {getDeleteMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deletarBloco.isPending || deletarMacro.isPending || deletarMicro.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletarBloco.isPending || deletarMacro.isPending || deletarMicro.isPending ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : null}
              Confirmar Exclusão
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
