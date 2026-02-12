import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  GripVertical,
  Eye,
  EyeOff,
  RefreshCw,
  PlusCircle,
  Calendar,
  Wrench,
  GitBranch,
  CheckCircle,
  ClipboardList,
  FileEdit,
  Search,
  Settings,
  Shield,
  AlertCircle,
  Info,
  Upload,
  X,
  ImageIcon,
} from "lucide-react";

const iconOptions = [
  { value: "RefreshCw", label: "Atualizar/Substituir", icon: RefreshCw },
  { value: "Trash2", label: "Excluir/Lixeira", icon: Trash2 },
  { value: "PlusCircle", label: "Adicionar/Incluir", icon: PlusCircle },
  { value: "Calendar", label: "Calendário/Prazo", icon: Calendar },
  { value: "Wrench", label: "Ferramenta/Ajuste", icon: Wrench },
  { value: "GitBranch", label: "Fluxo/Processo", icon: GitBranch },
  { value: "CheckCircle", label: "Aprovação/Check", icon: CheckCircle },
  { value: "BookOpen", label: "Livro/Regras", icon: BookOpen },
  { value: "ClipboardList", label: "Lista/Checklist", icon: ClipboardList },
  { value: "FileEdit", label: "Editar/Documento", icon: FileEdit },
  { value: "Search", label: "Buscar/Analisar", icon: Search },
  { value: "Settings", label: "Configurações", icon: Settings },
  { value: "Shield", label: "Segurança/Proteção", icon: Shield },
  { value: "AlertCircle", label: "Alerta/Atenção", icon: AlertCircle },
  { value: "Info", label: "Informação", icon: Info },
];

const categoriaOptions = [
  { value: "regras", label: "Regras" },
  { value: "fluxo", label: "Fluxo do Ciclo" },
  { value: "geral", label: "Geral" },
];

const categoryColors: Record<string, string> = {
  regras: "bg-orange-100 text-orange-700",
  fluxo: "bg-blue-100 text-blue-700",
  geral: "bg-emerald-100 text-emerald-700",
};

interface FormData {
  titulo: string;
  subtitulo: string;
  conteudo: string;
  categoria: string;
  icone: string;
  ordem: number;
  ativo: boolean;
  imagemUrl: string;
}

const emptyForm: FormData = {
  titulo: "",
  subtitulo: "",
  conteudo: "",
  categoria: "regras",
  icone: "BookOpen",
  ordem: 0,
  ativo: true,
  imagemUrl: "",
};

export default function AdminNormasRegras() {
  // toast importado de sonner
  const utils = trpc.useUtils();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: normas, isLoading } = trpc.normasRegras.list.useQuery();

  const createMutation = trpc.normasRegras.create.useMutation({
    onSuccess: () => {
      utils.normasRegras.list.invalidate();
      setShowDialog(false);
      setForm(emptyForm);
      toast.success("Norma criada com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao criar norma");
    },
  });

  const updateMutation = trpc.normasRegras.update.useMutation({
    onSuccess: () => {
      utils.normasRegras.list.invalidate();
      setShowDialog(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Norma atualizada com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar norma");
    },
  });

  const deleteMutation = trpc.normasRegras.delete.useMutation({
    onSuccess: () => {
      utils.normasRegras.list.invalidate();
      setDeleteConfirm(null);
      toast.success("Norma excluída com sucesso!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao excluir norma");
    },
  });

  const toggleMutation = trpc.normasRegras.update.useMutation({
    onSuccess: () => {
      utils.normasRegras.list.invalidate();
    },
  });

  const uploadMutation = trpc.normasRegras.uploadImagem.useMutation();

  function handleEdit(norma: any) {
    setEditingId(norma.id);
    setForm({
      titulo: norma.titulo,
      subtitulo: norma.subtitulo || "",
      conteudo: norma.conteudo,
      categoria: norma.categoria,
      icone: norma.icone,
      ordem: norma.ordem,
      ativo: norma.ativo,
      imagemUrl: norma.imagemUrl || "",
    });
    setShowDialog(true);
  }

  function handleNew() {
    setEditingId(null);
    const maxOrdem = normas?.reduce((max: number, n: any) => Math.max(max, n.ordem), 0) || 0;
    setForm({ ...emptyForm, ordem: maxOrdem + 1 });
    setShowDialog(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas arquivos de imagem são permitidos");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadMutation.mutateAsync({
          fileName: file.name,
          fileType: file.type,
          fileBase64: base64,
        });
        setForm((prev) => ({ ...prev, imagemUrl: result.url }));
        toast.success("Imagem enviada com sucesso!");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao enviar imagem");
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast.error("Preencha título e conteúdo");
      return;
    }
    const payload = {
      ...form,
      imagemUrl: form.imagemUrl || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleToggleAtivo(norma: any) {
    toggleMutation.mutate({ id: norma.id, ativo: !norma.ativo });
  }

  const sortedNormas = [...(normas || [])].sort((a: any, b: any) => a.ordem - b.ordem);

  const SelectedIcon = iconOptions.find((i) => i.value === form.icone)?.icon || BookOpen;

  return (
    <DashboardLayout>
      <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Normas e Regras</h1>
              <p className="text-sm text-gray-500">
                Cadastre e edite os cards de normas visíveis para todos os usuários
              </p>
            </div>
          </div>
          <Button onClick={handleNew} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Norma
          </Button>
        </div>

        {/* Lista de normas */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : sortedNormas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhuma norma cadastrada ainda.</p>
              <Button onClick={handleNew} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Criar primeira norma
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedNormas.map((norma: any) => {
              const IconComp =
                iconOptions.find((i) => i.value === norma.icone)?.icon || BookOpen;
              return (
                <Card
                  key={norma.id}
                  className={`transition-all ${!norma.ativo ? "opacity-50" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <GripVertical className="w-5 h-5 text-gray-300 shrink-0" />
                      {norma.imagemUrl ? (
                        <img src={norma.imagemUrl} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0" />
                      ) : (
                        <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                          <IconComp className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{norma.titulo}</h3>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${categoryColors[norma.categoria] || ""}`}
                          >
                            {categoriaOptions.find((c) => c.value === norma.categoria)?.label ||
                              norma.categoria}
                          </Badge>
                          <span className="text-xs text-gray-400">Ordem: {norma.ordem}</span>
                          {!norma.ativo && (
                            <Badge variant="outline" className="text-xs text-gray-400">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        {norma.subtitulo && (
                          <p className="text-sm text-gray-500 truncate">{norma.subtitulo}</p>
                        )}
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {norma.conteudo.substring(0, 120)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleAtivo(norma)}
                          title={norma.ativo ? "Desativar" : "Ativar"}
                        >
                          {norma.ativo ? (
                            <Eye className="w-4 h-4 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(norma)}
                        >
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(norma.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de criação/edição */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Norma" : "Nova Norma"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    placeholder="Ex: Alterar ou Substituir uma Ação"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo</Label>
                  <Input
                    value={form.subtitulo}
                    onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
                    placeholder="Ex: Só acontece com a aprovação do gestor."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Conteúdo *</Label>
                <Textarea
                  value={form.conteudo}
                  onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                  placeholder="Descreva os passos e o resultado..."
                  className="min-h-[200px] overflow-auto"
                />
                <p className="text-xs text-gray-400">
                  Use "Passo X:" para passos e "Resultado:" para o resultado. Cada linha será formatada automaticamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => setForm({ ...form, categoria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriaOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select
                    value={form.icone}
                    onValueChange={(v) => setForm({ ...form, icone: v })}
                  >
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <SelectedIcon className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((opt) => {
                        const IC = opt.icon;
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <IC className="w-4 h-4" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={form.ordem}
                    onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>

              {/* Upload de Imagem */}
              <div className="space-y-2">
                <Label>Imagem do Card (opcional)</Label>
                <div className="flex items-center gap-4">
                  {form.imagemUrl ? (
                    <div className="relative">
                      <img
                        src={form.imagemUrl}
                        alt="Preview"
                        className="w-32 h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imagemUrl: "" })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
                        <Upload className="w-4 h-4" />
                        {uploading ? "Enviando..." : "Enviar imagem"}
                      </div>
                    </label>
                    <p className="text-xs text-gray-400 mt-1">Máx. 5MB (JPG, PNG, GIF)</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
                <Label>Norma ativa (visível para todos)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : editingId
                  ? "Atualizar"
                  : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação de exclusão */}
        <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">
              Tem certeza que deseja excluir esta norma? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && deleteMutation.mutate({ id: deleteConfirm })}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
