import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { ModalCustomizado } from "@/components/ModalCustomizado";
import { ImportarCompetencias } from "@/components/ImportarCompetencias";
import { MatrizCompetenciasConsolidada } from "@/components/MatrizCompetenciasConsolidada";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Competencias() {
  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery();
  const isAdmin = user?.role === "admin";

  // Estados dos Formulários
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  
  // Estados dos Modais
  const [showNovoBloco, setShowNovoBloco] = useState(false);

  // Mutações
  const criarBloco = trpc.competencias.criarBloco.useMutation({
    onSuccess: () => {
      toast.success("Bloco criado com sucesso!");
      setShowNovoBloco(false);
      setNome("");
      setDescricao("");
      utils.competencias.invalidate();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handleCriarBloco = async () => {
    if (!nome.trim()) {
      toast.error("Nome do bloco é obrigatório");
      return;
    }
    criarBloco.mutate({ nome, descricao: descricao || undefined });
  };

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
            <Button
              onClick={() => setShowNovoBloco(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Bloco
            </Button>
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
            <Label htmlFor="nome">Nome do Bloco *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Comportamental, Técnico"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição do bloco (opcional)"
            />
          </div>
        </div>
      </ModalCustomizado>
    </div>
  );
}
