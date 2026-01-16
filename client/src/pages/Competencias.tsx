import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { ModalCustomizado } from "@/components/ModalCustomizado";

export default function Competencias() {
  const utils = trpc.useUtils();
  
  // Estado de aba ativa (customizado, sem Radix)
  const [activeTab, setActiveTab] = useState<"blocos" | "macros" | "micros">("blocos");
  
  // Estados para diálogos
  const [blocoDialogOpen, setBlocoDialogOpen] = useState(false);
  const [macroDialogOpen, setMacroDialogOpen] = useState(false);
  const [microDialogOpen, setMicroDialogOpen] = useState(false);
  
  // Estados para edição
  const [editingBloco, setEditingBloco] = useState<any>(null);
  const [editingMacro, setEditingMacro] = useState<any>(null);
  const [editingMicro, setEditingMicro] = useState<any>(null);
  
  // Estados para formulários
  const [blocoForm, setBlocoForm] = useState({ nome: "", descricao: "" });
  const [macroForm, setMacroForm] = useState({ nome: "", descricao: "", blocoId: "" });
  const [microForm, setMicroForm] = useState({ nome: "", descricao: "", macroId: "" });
  
  // Estados para busca
  const [searchBloco, setSearchBloco] = useState("");
  const [searchMacro, setSearchMacro] = useState("");
  const [searchMicro, setSearchMicro] = useState("");

  // Estados para ordenação
  type SortDirection = 'asc' | 'desc' | null;
  const [blocoSortField, setBlocoSortField] = useState<string | null>(null);
  const [blocoSortDirection, setBlocoSortDirection] = useState<SortDirection>(null);
  const [macroSortField, setMacroSortField] = useState<string | null>(null);
  const [macroSortDirection, setMacroSortDirection] = useState<SortDirection>(null);
  const [microSortField, setMicroSortField] = useState<string | null>(null);
  const [microSortDirection, setMicroSortDirection] = useState<SortDirection>(null);

  // Queries
  const { data: blocos, isLoading: loadingBlocos } = trpc.competencias.listBlocos.useQuery();
  const { data: macros, isLoading: loadingMacros } = trpc.competencias.listAllMacros.useQuery();
  const { data: micros, isLoading: loadingMicros } = trpc.competencias.listAllMicros.useQuery();

  // Mutations - Blocos
  const createBlocoMutation = trpc.competencias.createBloco.useMutation({
    onSuccess: async () => {
      toast.success("Bloco criado com sucesso!");
      await utils.competencias.listBlocos.invalidate();
      setBlocoDialogOpen(false);
      setBlocoForm({ nome: "", descricao: "" });
      setEditingBloco(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateBlocoMutation = trpc.competencias.updateBloco.useMutation({
    onSuccess: async () => {
      toast.success("Bloco atualizado com sucesso!");
      await utils.competencias.listBlocos.invalidate();
      setBlocoDialogOpen(false);
      setBlocoForm({ nome: "", descricao: "" });
      setEditingBloco(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteBlocoMutation = trpc.competencias.deleteBloco.useMutation({
    onSuccess: async () => {
      toast.success("Bloco excluído com sucesso!");
      await utils.competencias.listBlocos.invalidate();
      await utils.competencias.listAllMacros.invalidate();
      await utils.competencias.listAllMicros.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Mutations - Macros
  const createMacroMutation = trpc.competencias.createMacro.useMutation({
    onSuccess: async () => {
      toast.success("Macro criada com sucesso!");
      await utils.competencias.listAllMacros.invalidate();
      setMacroDialogOpen(false);
      setMacroForm({ nome: "", descricao: "", blocoId: "" });
      setEditingMacro(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMacroMutation = trpc.competencias.updateMacro.useMutation({
    onSuccess: async () => {
      toast.success("Macro atualizada com sucesso!");
      await utils.competencias.listAllMacros.invalidate();
      setMacroDialogOpen(false);
      setMacroForm({ nome: "", descricao: "", blocoId: "" });
      setEditingMacro(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMacroMutation = trpc.competencias.deleteMacro.useMutation({
    onSuccess: async () => {
      toast.success("Macro excluída com sucesso!");
      await utils.competencias.listAllMacros.invalidate();
      await utils.competencias.listAllMicros.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Mutations - Micros
  const createMicroMutation = trpc.competencias.createMicro.useMutation({
    onSuccess: async () => {
      toast.success("Micro criada com sucesso!");
      await utils.competencias.listAllMicros.invalidate();
      setMicroDialogOpen(false);
      setMicroForm({ nome: "", descricao: "", macroId: "" });
      setEditingMicro(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMicroMutation = trpc.competencias.updateMicro.useMutation({
    onSuccess: async () => {
      toast.success("Micro atualizada com sucesso!");
      await utils.competencias.listAllMicros.invalidate();
      setMicroDialogOpen(false);
      setMicroForm({ nome: "", descricao: "", macroId: "" });
      setEditingMicro(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMicroMutation = trpc.competencias.deleteMicro.useMutation({
    onSuccess: async () => {
      toast.success("Micro excluída com sucesso!");
      await utils.competencias.listAllMicros.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Handlers - Blocos
  const handleCreateBloco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blocoForm.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    createBlocoMutation.mutate(blocoForm);
  };

  const handleUpdateBloco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blocoForm.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    updateBlocoMutation.mutate({ id: editingBloco.id, ...blocoForm });
  };

  const handleEditBloco = (bloco: any) => {
    setEditingBloco(bloco);
    setBlocoForm({ nome: bloco.nome, descricao: bloco.descricao || "" });
    setBlocoDialogOpen(true);
  };

  const handleDeleteBloco = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este bloco? Todas as macros e micros vinculadas serão excluídas.")) {
      deleteBlocoMutation.mutate({ id });
    }
  };

  // Handlers - Macros
  const handleCreateMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!macroForm.nome.trim() || !macroForm.blocoId) {
      toast.error("Nome e Bloco são obrigatórios");
      return;
    }
    createMacroMutation.mutate({ ...macroForm, blocoId: parseInt(macroForm.blocoId) });
  };

  const handleUpdateMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!macroForm.nome.trim() || !macroForm.blocoId) {
      toast.error("Nome e Bloco são obrigatórios");
      return;
    }
    updateMacroMutation.mutate({
      id: editingMacro.id,
      nome: macroForm.nome,
      descricao: macroForm.descricao,
      blocoId: parseInt(macroForm.blocoId),
    } as any);
  };

  const handleEditMacro = (macro: any) => {
    setEditingMacro(macro);
    setMacroForm({ nome: macro.nome, descricao: macro.descricao || "", blocoId: macro.blocoId.toString() });
    setMacroDialogOpen(true);
  };

  const handleDeleteMacro = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta macro? Todas as micros vinculadas serão excluídas.")) {
      deleteMacroMutation.mutate({ id });
    }
  };

  // Handlers - Micros
  const handleCreateMicro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!microForm.nome.trim() || !microForm.macroId) {
      toast.error("Nome e Macro são obrigatórios");
      return;
    }
    createMicroMutation.mutate({ ...microForm, macroId: parseInt(microForm.macroId) });
  };

  const handleUpdateMicro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!microForm.nome.trim() || !microForm.macroId) {
      toast.error("Nome e Macro são obrigatórios");
      return;
    }
    updateMicroMutation.mutate({ id: editingMicro.id, nome: microForm.nome, descricao: microForm.descricao });
  };

  const handleEditMicro = (micro: any) => {
    setEditingMicro(micro);
    setMicroForm({ nome: micro.nome, descricao: micro.descricao || "", macroId: micro.macroId.toString() });
    setMicroDialogOpen(true);
  };

  const handleDeleteMicro = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta micro?")) {
      deleteMicroMutation.mutate({ id });
    }
  };

  const getBlocoNome = (blocoId: number) => {
    return blocos?.find(b => b.id === blocoId)?.nome || "N/A";
  };

  const getMacroNome = (macroId: number) => {
    return macros?.find(m => m.id === macroId)?.nome || "N/A";
  };

  const getBlocoNomeFromMacro = (macroId: number) => {
    const macro = macros?.find(m => m.id === macroId);
    if (!macro) return "N/A";
    return getBlocoNome(macro.blocoId);
  };

  // Funções de ordenação
  const handleSort = (field: string, currentField: string | null, currentDirection: SortDirection, setField: (f: string | null) => void, setDirection: (d: SortDirection) => void) => {
    if (currentField === field) {
      if (currentDirection === 'asc') {
        setDirection('desc');
      } else if (currentDirection === 'desc') {
        setField(null);
        setDirection(null);
      }
    } else {
      setField(field);
      setDirection('asc');
    }
  };

  const sortData = <T extends Record<string, any>>(data: T[], sortField: string | null, sortDirection: SortDirection, getExtraField?: (item: T) => string): T[] => {
    if (!sortField || !sortDirection) return data;
    
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (getExtraField && sortField === 'extra') {
        aValue = getExtraField(a);
        bValue = getExtraField(b);
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (field: string, currentField: string | null, currentDirection: SortDirection) => {
    if (currentField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    if (currentDirection === 'asc') return <ArrowUp className="h-4 w-4 ml-1 inline" />;
    if (currentDirection === 'desc') return <ArrowDown className="h-4 w-4 ml-1 inline" />;
    return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
  };

  // Filtrar e ordenar competências
  const filteredBlocos = sortData(
    blocos?.filter(bloco =>
      bloco.nome.toLowerCase().includes(searchBloco.toLowerCase()) ||
      (bloco.descricao && bloco.descricao.toLowerCase().includes(searchBloco.toLowerCase()))
    ) || [],
    blocoSortField,
    blocoSortDirection
  );

  const filteredMacros = sortData(
    macros?.filter(macro =>
      macro.nome.toLowerCase().includes(searchMacro.toLowerCase()) ||
      (macro.descricao && macro.descricao.toLowerCase().includes(searchMacro.toLowerCase()))
    ) || [],
    macroSortField === 'bloco' ? 'extra' : macroSortField,
    macroSortDirection,
    macroSortField === 'bloco' ? (macro: any) => getBlocoNome(macro.blocoId) : undefined
  );

  const filteredMicros = sortData(
    micros?.filter(micro =>
      micro.nome.toLowerCase().includes(searchMicro.toLowerCase()) ||
      (micro.descricao && micro.descricao.toLowerCase().includes(searchMicro.toLowerCase()))
    ) || [],
    microSortField === 'bloco' ? 'extra' : microSortField === 'macro' ? 'extra' : microSortField,
    microSortDirection,
    microSortField === 'bloco' ? (micro: any) => getBlocoNomeFromMacro(micro.macroId) : 
    microSortField === 'macro' ? (micro: any) => getMacroNome(micro.macroId) : undefined
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-600 bg-clip-text text-transparent">
            Gestão de Competências
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie a hierarquia de competências: Blocos → Macros → Micros
          </p>
        </div>

        {/* Abas Customizadas (buttons nativos com console.log para debug) */}
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => {
                console.log('[DEBUG] Mudando para Blocos');
                setActiveTab("blocos");
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "blocos"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Blocos
            </button>
            <button
              onClick={() => {
                console.log('[DEBUG] Mudando para Macros');
                setActiveTab("macros");
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "macros"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Macros
            </button>
            <button
              onClick={() => {
                console.log('[DEBUG] Mudando para Micros');
                setActiveTab("micros");
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "micros"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Micros
            </button>
          </div>

          {/* TAB BLOCOS */}
          {activeTab === "blocos" && (
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between mb-4">
                  <div>
                    <CardTitle>Competências Bloco</CardTitle>
                    <CardDescription>Nível mais alto da hierarquia de competências ({filteredBlocos.length} {searchBloco && 'filtrados'})</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar blocos..."
                      value={searchBloco}
                      onChange={(e) => setSearchBloco(e.target.value)}
                      className="w-64"
                    />
                    <Button 
                      onClick={() => {
                        setEditingBloco(null);
                        setBlocoForm({ nome: "", descricao: "" });
                        setBlocoDialogOpen(true);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-orange-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Bloco
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingBlocos ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleSort('nome', blocoSortField, blocoSortDirection, setBlocoSortField, setBlocoSortDirection)}
                        >
                          Nome {getSortIcon('nome', blocoSortField, blocoSortDirection)}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleSort('descricao', blocoSortField, blocoSortDirection, setBlocoSortField, setBlocoSortDirection)}
                        >
                          Descrição {getSortIcon('descricao', blocoSortField, blocoSortDirection)}
                        </TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBlocos && filteredBlocos.length > 0 ? (
                        filteredBlocos.map((bloco) => (
                          <TableRow key={bloco.id}>
                            <TableCell className="font-medium">{bloco.nome}</TableCell>
                            <TableCell>{bloco.descricao || "-"}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBloco(bloco)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBloco(bloco.id)}
                                disabled={deleteBlocoMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            {searchBloco ? 'Nenhum bloco encontrado com esse filtro' : 'Nenhum bloco cadastrado'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB MACROS */}
          {activeTab === "macros" && (
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between mb-4">
                  <div>
                    <CardTitle>Competências Macro</CardTitle>
                    <CardDescription>Nível intermediário - vinculadas a blocos ({filteredMacros.length} {searchMacro && 'filtrados'})</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar macros..."
                      value={searchMacro}
                      onChange={(e) => setSearchMacro(e.target.value)}
                      className="w-64"
                    />
                    <Button 
                      onClick={() => {
                        setEditingMacro(null);
                        setMacroForm({ nome: "", descricao: "", blocoId: "" });
                        setMacroDialogOpen(true);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-orange-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Macro
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMacros ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleSort('bloco', macroSortField, macroSortDirection, setMacroSortField, setMacroSortDirection)}
                        >
                          Bloco {getSortIcon('bloco', macroSortField, macroSortDirection)}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleSort('nome', macroSortField, macroSortDirection, setMacroSortField, setMacroSortDirection)}
                        >
                          Nome {getSortIcon('nome', macroSortField, macroSortDirection)}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleSort('descricao', macroSortField, macroSortDirection, setMacroSortField, setMacroSortDirection)}
                        >
                          Descrição {getSortIcon('descricao', macroSortField, macroSortDirection)}
                        </TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMacros && filteredMacros.length > 0 ? (
                        filteredMacros.map((macro) => (
                          <TableRow key={macro.id}>
                            <TableCell className="font-medium text-blue-600">{getBlocoNome(macro.blocoId)}</TableCell>
                            <TableCell className="font-medium">{macro.nome}</TableCell>
                            <TableCell>{macro.descricao || "-"}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMacro(macro)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMacro(macro.id)}
                                disabled={deleteMacroMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            {searchMacro ? 'Nenhuma macro encontrada com esse filtro' : 'Nenhuma macro cadastrada'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB MICROS */}
          {activeTab === "micros" && (
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between mb-4">
                  <div>
                    <CardTitle>Competências Micro</CardTitle>
                    <CardDescription>Nível mais específico - vinculadas a macros ({filteredMicros.length} {searchMicro && 'filtrados'})</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar micros..."
                      value={searchMicro}
                      onChange={(e) => setSearchMicro(e.target.value)}
                      className="w-64"
                    />
                    <Button 
                      onClick={() => {
                        setEditingMicro(null);
                        setMicroForm({ nome: "", descricao: "", macroId: "" });
                        setMicroDialogOpen(true);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-orange-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Micro
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingMicros ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleSort('bloco', microSortField, microSortDirection, setMicroSortField, setMicroSortDirection)}
                        >
                          Bloco {getSortIcon('bloco', microSortField, microSortDirection)}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleSort('macro', microSortField, microSortDirection, setMicroSortField, setMicroSortDirection)}
                        >
                          Macro {getSortIcon('macro', microSortField, microSortDirection)}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleSort('nome', microSortField, microSortDirection, setMicroSortField, setMicroSortDirection)}
                        >
                          Nome {getSortIcon('nome', microSortField, microSortDirection)}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50" 
                          onClick={() => handleSort('descricao', microSortField, microSortDirection, setMicroSortField, setMicroSortDirection)}
                        >
                          Descrição {getSortIcon('descricao', microSortField, microSortDirection)}
                        </TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMicros && filteredMicros.length > 0 ? (
                        filteredMicros.map((micro) => (
                          <TableRow key={micro.id}>
                            <TableCell className="font-medium text-blue-600">{getBlocoNomeFromMacro(micro.macroId)}</TableCell>
                            <TableCell className="font-medium text-purple-600">{getMacroNome(micro.macroId)}</TableCell>
                            <TableCell className="font-medium">{micro.nome}</TableCell>
                            <TableCell>{micro.descricao || "-"}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMicro(micro)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMicro(micro.id)}
                                disabled={deleteMicroMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            {searchMicro ? 'Nenhuma micro encontrada com esse filtro' : 'Nenhuma micro cadastrada'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Bloco */}
      <ModalCustomizado
        isOpen={blocoDialogOpen}
        onClose={() => {
          setBlocoDialogOpen(false);
          setEditingBloco(null);
          setBlocoForm({ nome: "", descricao: "" });
        }}
        title={editingBloco ? "Editar Bloco" : "Novo Bloco"}
        description={editingBloco ? "Atualize as informações do bloco" : "Crie um novo bloco de competências"}
        onSubmit={editingBloco ? handleUpdateBloco : handleCreateBloco}
        submitButtonText={editingBloco ? "Atualizar" : "Criar"}
        isLoading={createBlocoMutation.isPending || updateBlocoMutation.isPending}
      >
        <form className="space-y-4">
          <div>
            <Label htmlFor="bloco-nome">Nome *</Label>
            <Input
              id="bloco-nome"
              value={blocoForm.nome}
              onChange={(e) => setBlocoForm({ ...blocoForm, nome: e.target.value })}
              placeholder="Ex: Competências Técnicas"
            />
          </div>
          <div>
            <Label htmlFor="bloco-descricao">Descrição</Label>
            <Input
              id="bloco-descricao"
              value={blocoForm.descricao}
              onChange={(e) => setBlocoForm({ ...blocoForm, descricao: e.target.value })}
              placeholder="Descrição opcional"
            />
          </div>
        </form>
      </ModalCustomizado>

      {/* Modal Macro */}
      <ModalCustomizado
        isOpen={macroDialogOpen}
        onClose={() => {
          setMacroDialogOpen(false);
          setEditingMacro(null);
          setMacroForm({ nome: "", descricao: "", blocoId: "" });
        }}
        title={editingMacro ? "Editar Macro" : "Nova Macro"}
        description={editingMacro ? "Atualize as informações da macro" : "Crie uma nova macro de competências"}
        onSubmit={editingMacro ? handleUpdateMacro : handleCreateMacro}
        submitButtonText={editingMacro ? "Atualizar" : "Criar"}
        isLoading={createMacroMutation.isPending || updateMacroMutation.isPending}
      >
        <form className="space-y-4">
          <div>
            <Label htmlFor="macro-bloco">Bloco *</Label>
            <Select
              value={macroForm.blocoId || undefined}
              onValueChange={(value) => setMacroForm({ ...macroForm, blocoId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um bloco" />
              </SelectTrigger>
              <SelectContent sideOffset={4}>
                {blocos?.map((bloco) => (
                  <SelectItem key={bloco.id} value={bloco.id.toString()}>
                    {bloco.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="macro-nome">Nome *</Label>
            <Input
              id="macro-nome"
              value={macroForm.nome}
              onChange={(e) => setMacroForm({ ...macroForm, nome: e.target.value })}
              placeholder="Ex: Programação"
            />
          </div>
          <div>
            <Label htmlFor="macro-descricao">Descrição</Label>
            <Input
              id="macro-descricao"
              value={macroForm.descricao}
              onChange={(e) => setMacroForm({ ...macroForm, descricao: e.target.value })}
              placeholder="Descrição opcional"
            />
          </div>
        </form>
      </ModalCustomizado>

      {/* Modal Micro */}
      <ModalCustomizado
        isOpen={microDialogOpen}
        onClose={() => {
          setMicroDialogOpen(false);
          setEditingMicro(null);
          setMicroForm({ nome: "", descricao: "", macroId: "" });
        }}
        title={editingMicro ? "Editar Micro" : "Nova Micro"}
        description={editingMicro ? "Atualize as informações da micro" : "Crie uma nova micro de competências"}
        onSubmit={editingMicro ? handleUpdateMicro : handleCreateMicro}
        submitButtonText={editingMicro ? "Atualizar" : "Criar"}
        isLoading={createMicroMutation.isPending || updateMicroMutation.isPending}
      >
        <form className="space-y-4">
          <div>
            <Label htmlFor="micro-macro">Macro *</Label>
            <Select
              value={microForm.macroId || undefined}
              onValueChange={(value) => setMicroForm({ ...microForm, macroId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma macro" />
              </SelectTrigger>
              <SelectContent sideOffset={4}>
                {macros?.map((macro) => (
                  <SelectItem key={macro.id} value={macro.id.toString()}>
                    {macro.nome} ({getBlocoNome(macro.blocoId)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="micro-nome">Nome *</Label>
            <Input
              id="micro-nome"
              value={microForm.nome}
              onChange={(e) => setMicroForm({ ...microForm, nome: e.target.value })}
              placeholder="Ex: JavaScript ES6+"
            />
          </div>
          <div>
            <Label htmlFor="micro-descricao">Descrição</Label>
            <Input
              id="micro-descricao"
              value={microForm.descricao}
              onChange={(e) => setMicroForm({ ...microForm, descricao: e.target.value })}
              placeholder="Descrição opcional"
            />
          </div>
        </form>
      </ModalCustomizado>
    </DashboardLayout>
  );
}
