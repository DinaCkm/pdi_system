import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Competencias() {
  const utils = trpc.useUtils();
  
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

  // Queries
  const { data: blocos, isLoading: loadingBlocos } = trpc.competencias.listBlocos.useQuery();
  const { data: macros, isLoading: loadingMacros } = trpc.competencias.listAllMacros.useQuery();
  const { data: micros, isLoading: loadingMicros } = trpc.competencias.listAllMicros.useQuery();

  // Mutations - Blocos
  const createBlocoMutation = trpc.competencias.createBloco.useMutation({
    onSuccess: () => {
      toast.success("Bloco criado com sucesso!");
      utils.competencias.listBlocos.invalidate();
      setBlocoDialogOpen(false);
      setBlocoForm({ nome: "", descricao: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateBlocoMutation = trpc.competencias.updateBloco.useMutation({
    onSuccess: () => {
      toast.success("Bloco atualizado com sucesso!");
      utils.competencias.listBlocos.invalidate();
      setBlocoDialogOpen(false);
      setEditingBloco(null);
      setBlocoForm({ nome: "", descricao: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteBlocoMutation = trpc.competencias.deleteBloco.useMutation({
    onSuccess: () => {
      toast.success("Bloco excluído com sucesso!");
      utils.competencias.listBlocos.invalidate();
      utils.competencias.listMacros.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Mutations - Macros
  const createMacroMutation = trpc.competencias.createMacro.useMutation({
    onSuccess: () => {
      toast.success("Macro criada com sucesso!");
      utils.competencias.listMacros.invalidate();
      setMacroDialogOpen(false);
      setMacroForm({ nome: "", descricao: "", blocoId: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMacroMutation = trpc.competencias.updateMacro.useMutation({
    onSuccess: () => {
      toast.success("Macro atualizada com sucesso!");
      utils.competencias.listMacros.invalidate();
      setMacroDialogOpen(false);
      setEditingMacro(null);
      setMacroForm({ nome: "", descricao: "", blocoId: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMacroMutation = trpc.competencias.deleteMacro.useMutation({
    onSuccess: () => {
      toast.success("Macro excluída com sucesso!");
      utils.competencias.listMacros.invalidate();
      utils.competencias.listMicros.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Mutations - Micros
  const createMicroMutation = trpc.competencias.createMicro.useMutation({
    onSuccess: () => {
      toast.success("Micro criada com sucesso!");
      utils.competencias.listMicros.invalidate();
      setMicroDialogOpen(false);
      setMicroForm({ nome: "", descricao: "", macroId: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMicroMutation = trpc.competencias.updateMicro.useMutation({
    onSuccess: () => {
      toast.success("Micro atualizada com sucesso!");
      utils.competencias.listMicros.invalidate();
      setMicroDialogOpen(false);
      setEditingMicro(null);
      setMicroForm({ nome: "", descricao: "", macroId: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMicroMutation = trpc.competencias.deleteMicro.useMutation({
    onSuccess: () => {
      toast.success("Micro excluída com sucesso!");
      utils.competencias.listMicros.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Handlers - Blocos
  const handleCreateBloco = () => {
    if (!blocoForm.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    createBlocoMutation.mutate(blocoForm);
  };

  const handleUpdateBloco = () => {
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
  const handleCreateMacro = () => {
    if (!macroForm.nome.trim() || !macroForm.blocoId) {
      toast.error("Nome e Bloco são obrigatórios");
      return;
    }
    createMacroMutation.mutate({ ...macroForm, blocoId: parseInt(macroForm.blocoId) });
  };

  const handleUpdateMacro = () => {
    if (!macroForm.nome.trim() || !macroForm.blocoId) {
      toast.error("Nome e Bloco são obrigatórios");
      return;
    }
    updateMacroMutation.mutate({ id: editingMacro.id, nome: macroForm.nome, descricao: macroForm.descricao });
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
  const handleCreateMicro = () => {
    if (!microForm.nome.trim() || !microForm.macroId) {
      toast.error("Nome e Macro são obrigatórios");
      return;
    }
    createMicroMutation.mutate({ ...microForm, macroId: parseInt(microForm.macroId) });
  };

  const handleUpdateMicro = () => {
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

        <Tabs defaultValue="blocos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="blocos">Blocos</TabsTrigger>
            <TabsTrigger value="macros">Macros</TabsTrigger>
            <TabsTrigger value="micros">Micros</TabsTrigger>
          </TabsList>

          {/* TAB BLOCOS */}
          <TabsContent value="blocos" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Competências Bloco</CardTitle>
                  <CardDescription>Nível mais alto da hierarquia de competências</CardDescription>
                </div>
                <Dialog open={blocoDialogOpen} onOpenChange={(open) => {
                  setBlocoDialogOpen(open);
                  if (!open) {
                    setEditingBloco(null);
                    setBlocoForm({ nome: "", descricao: "" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-orange-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Bloco
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingBloco ? "Editar Bloco" : "Novo Bloco"}</DialogTitle>
                      <DialogDescription>
                        {editingBloco ? "Atualize as informações do bloco" : "Crie um novo bloco de competências"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
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
                      <Button
                        onClick={editingBloco ? handleUpdateBloco : handleCreateBloco}
                        className="w-full bg-gradient-to-r from-blue-600 to-orange-600"
                        disabled={createBlocoMutation.isPending || updateBlocoMutation.isPending}
                      >
                        {(createBlocoMutation.isPending || updateBlocoMutation.isPending) ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                        ) : (
                          editingBloco ? "Atualizar" : "Criar"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blocos && blocos.length > 0 ? (
                        blocos.map((bloco) => (
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
                            Nenhum bloco cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB MACROS */}
          <TabsContent value="macros" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Competências Macro</CardTitle>
                  <CardDescription>Nível intermediário - vinculadas a blocos</CardDescription>
                </div>
                <Dialog open={macroDialogOpen} onOpenChange={(open) => {
                  setMacroDialogOpen(open);
                  if (!open) {
                    setEditingMacro(null);
                    setMacroForm({ nome: "", descricao: "", blocoId: "" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-orange-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Macro
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMacro ? "Editar Macro" : "Nova Macro"}</DialogTitle>
                      <DialogDescription>
                        {editingMacro ? "Atualize as informações da macro" : "Crie uma nova macro de competências"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="macro-bloco">Bloco *</Label>
                        <Select
                          value={macroForm.blocoId}
                          onValueChange={(value) => setMacroForm({ ...macroForm, blocoId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um bloco" />
                          </SelectTrigger>
                          <SelectContent>
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
                      <Button
                        onClick={editingMacro ? handleUpdateMacro : handleCreateMacro}
                        className="w-full bg-gradient-to-r from-blue-600 to-orange-600"
                        disabled={createMacroMutation.isPending || updateMacroMutation.isPending}
                      >
                        {(createMacroMutation.isPending || updateMacroMutation.isPending) ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                        ) : (
                          editingMacro ? "Atualizar" : "Criar"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        <TableHead>Bloco</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {macros && macros.length > 0 ? (
                        macros.map((macro) => (
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
                            Nenhuma macro cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB MICROS */}
          <TabsContent value="micros" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Competências Micro</CardTitle>
                  <CardDescription>Nível mais específico - vinculadas a macros</CardDescription>
                </div>
                <Dialog open={microDialogOpen} onOpenChange={(open) => {
                  setMicroDialogOpen(open);
                  if (!open) {
                    setEditingMicro(null);
                    setMicroForm({ nome: "", descricao: "", macroId: "" });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-orange-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Micro
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMicro ? "Editar Micro" : "Nova Micro"}</DialogTitle>
                      <DialogDescription>
                        {editingMicro ? "Atualize as informações da micro" : "Crie uma nova micro de competências"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="micro-macro">Macro *</Label>
                        <Select
                          value={microForm.macroId}
                          onValueChange={(value) => setMicroForm({ ...microForm, macroId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma macro" />
                          </SelectTrigger>
                          <SelectContent>
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
                      <Button
                        onClick={editingMicro ? handleUpdateMicro : handleCreateMicro}
                        className="w-full bg-gradient-to-r from-blue-600 to-orange-600"
                        disabled={createMicroMutation.isPending || updateMicroMutation.isPending}
                      >
                        {(createMicroMutation.isPending || updateMicroMutation.isPending) ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                        ) : (
                          editingMicro ? "Atualizar" : "Criar"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        <TableHead>Macro</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {micros && micros.length > 0 ? (
                        micros.map((micro) => (
                          <TableRow key={micro.id}>
                            <TableCell className="font-medium text-orange-600">{getMacroNome(micro.macroId)}</TableCell>
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
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhuma micro cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
