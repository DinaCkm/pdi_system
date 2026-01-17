import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChevronDown } from "lucide-react";
import { ModalCustomizado } from "@/components/ModalCustomizado";
import { ImportarCompetencias } from "@/components/ImportarCompetencias";
import { MatrizCompetenciasConsolidada } from "@/components/MatrizCompetenciasConsolidada";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Competencias() {
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery();
  const isAdmin = user?.role === "admin";

  // Dados
  const { data: blocos } = trpc.competencias.listBlocos.useQuery();
  const { data: macros } = trpc.competencias.listAllMacros.useQuery();

  // Estados dos Formulários
  const [nomeBloco, setNomeBloco] = useState("");
  const [descricaoBloco, setDescricaoBloco] = useState("");
  const [nomeMacro, setNomeMacro] = useState("");
  const [descricaoMacro, setDescricaoMacro] = useState("");
  const [blocoSelecionadoMacro, setBlocoSelecionadoMacro] = useState<number | undefined>();
  const [nomeMicro, setNomeMicro] = useState("");
  const [descricaoMicro, setDescricaoMicro] = useState("");
  const [macroSelecionadaMicro, setMacroSelecionadaMicro] = useState<number | undefined>();

  // Estados dos Modais
  const [showNovoBloco, setShowNovoBloco] = useState(false);
  const [showNovaMacro, setShowNovaMacro] = useState(false);
  const [showNovoMicro, setShowNovoMicro] = useState(false);

  // Mutações
  const criarBloco = trpc.competencias.criarBloco.useMutation({
    onSuccess: () => {
      toast.success("Bloco criado com sucesso!");
      setShowNovoBloco(false);
      setNomeBloco("");
      setDescricaoBloco("");
      utils.competencias.invalidate();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const criarMacro = trpc.competencias.criarMacro.useMutation({
    onSuccess: () => {
      toast.success("Macro criada com sucesso!");
      setShowNovaMacro(false);
      setNomeMacro("");
      setDescricaoMacro("");
      setBlocoSelecionadoMacro(undefined);
      utils.competencias.invalidate();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const criarMicro = trpc.competencias.criarMicro.useMutation({
    onSuccess: () => {
      toast.success("Micro criada com sucesso!");
      setShowNovoMicro(false);
      setNomeMicro("");
      setDescricaoMicro("");
      setMacroSelecionadaMicro(undefined);
      utils.competencias.invalidate();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handleCriarBloco = async () => {
    if (!nomeBloco.trim()) {
      toast.error("Nome do bloco é obrigatório");
      return;
    }
    criarBloco.mutate({ nome: nomeBloco, descricao: descricaoBloco || undefined });
  };

  const handleCriarMacro = async () => {
    if (!nomeMacro.trim()) {
      toast.error("Nome da macro é obrigatório");
      return;
    }
    if (!blocoSelecionadoMacro) {
      toast.error("Selecione um bloco");
      return;
    }
    criarMacro.mutate({ 
      nome: nomeMacro, 
      descricao: descricaoMacro || undefined,
      blocoId: blocoSelecionadoMacro
    });
  };

  const handleCriarMicro = async () => {
    if (!nomeMicro.trim()) {
      toast.error("Nome da micro é obrigatório");
      return;
    }
    if (!macroSelecionadaMicro) {
      toast.error("Selecione uma macro");
      return;
    }
    criarMicro.mutate({ 
      nome: nomeMicro, 
      descricao: descricaoMicro || undefined,
      macroId: macroSelecionadaMicro
    });
  };

  // Filtrar macros pelo bloco selecionado
  const macrosFiltradas = blocoSelecionadoMacro
    ? macros?.filter(m => m.blocoId === blocoSelecionadoMacro)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Competências</h1>
          <p className="text-gray-600 mt-1">Visualização consolidada: Bloco → Macro → Micro</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Competência
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowNovoBloco(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Bloco
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowNovaMacro(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Macro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowNovoMicro(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Micro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Importação em Massa */}
      {isAdmin && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">📥 Importação em Massa</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportarCompetencias />
          </CardContent>
        </Card>
      )}

      {/* Tabela Consolidada */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Competências</CardTitle>
        </CardHeader>
        <CardContent>
          <MatrizCompetenciasConsolidada />
        </CardContent>
      </Card>

      {/* Modal - Novo Bloco */}
      <ModalCustomizado
        isOpen={showNovoBloco}
        onClose={() => setShowNovoBloco(false)}
        title="Criar Novo Bloco"
        onConfirm={handleCriarBloco}
        confirmText="Criar"
        isLoading={criarBloco.isPending}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="nome-bloco">Nome do Bloco *</Label>
            <Input
              id="nome-bloco"
              value={nomeBloco}
              onChange={(e) => setNomeBloco(e.target.value)}
              placeholder="Ex: Comportamental, Técnico"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="descricao-bloco">Descrição</Label>
            <Input
              id="descricao-bloco"
              value={descricaoBloco}
              onChange={(e) => setDescricaoBloco(e.target.value)}
              placeholder="Descrição do bloco (opcional)"
            />
          </div>
        </div>
      </ModalCustomizado>

      {/* Modal - Nova Macro */}
      <ModalCustomizado
        isOpen={showNovaMacro}
        onClose={() => setShowNovaMacro(false)}
        title="Criar Nova Macro"
        onConfirm={handleCriarMacro}
        confirmText="Criar"
        isLoading={criarMacro.isPending}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="bloco-macro">Bloco *</Label>
            <Select 
              value={blocoSelecionadoMacro?.toString()} 
              onValueChange={(value) => setBlocoSelecionadoMacro(parseInt(value))}
            >
              <SelectTrigger id="bloco-macro">
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
            <Label htmlFor="nome-macro">Nome da Macro *</Label>
            <Input
              id="nome-macro"
              value={nomeMacro}
              onChange={(e) => setNomeMacro(e.target.value)}
              placeholder="Ex: Gestão de Pessoas"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="descricao-macro">Descrição</Label>
            <Input
              id="descricao-macro"
              value={descricaoMacro}
              onChange={(e) => setDescricaoMacro(e.target.value)}
              placeholder="Descrição da macro (opcional)"
            />
          </div>
        </div>
      </ModalCustomizado>

      {/* Modal - Nova Micro */}
      <ModalCustomizado
        isOpen={showNovoMicro}
        onClose={() => setShowNovoMicro(false)}
        title="Criar Nova Micro"
        onConfirm={handleCriarMicro}
        confirmText="Criar"
        isLoading={criarMicro.isPending}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="macro-micro">Macro *</Label>
            <Select 
              value={macroSelecionadaMicro?.toString()} 
              onValueChange={(value) => setMacroSelecionadaMicro(parseInt(value))}
            >
              <SelectTrigger id="macro-micro">
                <SelectValue placeholder="Selecione uma macro" />
              </SelectTrigger>
              <SelectContent>
                {macros?.map((macro) => (
                  <SelectItem key={macro.id} value={macro.id.toString()}>
                    {macro.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="nome-micro">Nome da Micro *</Label>
            <Input
              id="nome-micro"
              value={nomeMicro}
              onChange={(e) => setNomeMicro(e.target.value)}
              placeholder="Ex: Recrutamento"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="descricao-micro">Descrição</Label>
            <Input
              id="descricao-micro"
              value={descricaoMicro}
              onChange={(e) => setDescricaoMicro(e.target.value)}
              placeholder="Descrição da micro (opcional)"
            />
          </div>
        </div>
      </ModalCustomizado>
    </div>
  );
}
