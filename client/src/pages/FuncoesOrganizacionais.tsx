import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function FuncoesOrganizacionais() {
  const [organizacaoId, setOrganizacaoId] = useState<string>("");
  const [orgNome, setOrgNome] = useState("");
  const [orgCodigo, setOrgCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargoReferencia, setCargoReferencia] = useState("");
  const [descricao, setDescricao] = useState("");
  const [filtro, setFiltro] = useState("");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string>("");
  const [funcaoSelecionada, setFuncaoSelecionada] = useState<string>("");

  const organizacoes = trpc.funcoesOrganizacionais.organizacoes.useQuery();
  const cargaInicial = trpc.funcoesOrganizacionais.prepararCargaInicial.useQuery();
  const funcoes = trpc.funcoesOrganizacionais.listar.useQuery(
    organizacaoId ? { organizacaoId: Number(organizacaoId) } : undefined,
  );
  const usuarios = trpc.funcoesOrganizacionais.usuarios.useQuery();

  const criarOrganizacao = trpc.funcoesOrganizacionais.criarOrganizacao.useMutation();
  const criarFuncao = trpc.funcoesOrganizacionais.criar.useMutation();
  const vincular = trpc.funcoesOrganizacionais.vincularPrincipal.useMutation();
  const aplicarCargaInicial = trpc.funcoesOrganizacionais.aplicarCargaInicial.useMutation();

  const organizacoesAtivas = organizacoes.data?.filter((x) => x.ativa) ?? [];

  const funcoesFiltradas = useMemo(() => {
    const termo = filtro.trim().toLocaleLowerCase("pt-BR");
    const dados = funcoes.data ?? [];
    if (!termo) return dados;
    return dados.filter((f) =>
      [f.nome, f.codigo, f.cargoReferencia, f.departamentoNome]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("pt-BR").includes(termo)),
    );
  }, [funcoes.data, filtro]);

  const executarCargaInicial = async () => {
    const confirmado = window.confirm(
      "Esta ação criará as 7 funções iniciais e vinculará os 187 empregados com base no cargo padronizado. Vínculos principais já existentes serão preservados. Deseja continuar?",
    );
    if (!confirmado) return;

    try {
      const resultado = await aplicarCargaInicial.mutateAsync({
        confirmar: "CARGA_INICIAL_187",
      });
      toast.success(
        `Carga inicial concluída: ${resultado.vinculosCriados} vínculos criados e ${resultado.vinculosPrincipaisPreservados} preservados.`,
      );
      await Promise.all([
        cargaInicial.refetch(),
        organizacoes.refetch(),
        funcoes.refetch(),
        usuarios.refetch(),
      ]);
    } catch (error: any) {
      toast.error(error.message || "Não foi possível executar a carga inicial.");
    }
  };

  const criarOrg = async () => {
    if (!orgNome.trim() || !orgCodigo.trim()) {
      toast.error("Informe nome e código da organização.");
      return;
    }
    try {
      await criarOrganizacao.mutateAsync({
        nome: orgNome.trim(),
        codigo: orgCodigo.trim(),
      });
      toast.success("Organização criada.");
      setOrgNome("");
      setOrgCodigo("");
      await organizacoes.refetch();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível criar a organização.");
    }
  };

  const criar = async () => {
    if (!organizacaoId || !nome.trim()) {
      toast.error("Selecione a organização e informe o nome da função.");
      return;
    }
    try {
      await criarFuncao.mutateAsync({
        organizacaoId: Number(organizacaoId),
        departamentoId: null,
        nome: nome.trim(),
        codigo: codigo.trim() || null,
        cargoReferencia: cargoReferencia.trim() || null,
        descricao: descricao.trim() || null,
      });
      toast.success("Função organizacional criada.");
      setNome("");
      setCodigo("");
      setCargoReferencia("");
      setDescricao("");
      await funcoes.refetch();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível criar a função.");
    }
  };

  const vincularUsuario = async () => {
    if (!usuarioSelecionado || !funcaoSelecionada) {
      toast.error("Selecione o empregado e a função.");
      return;
    }
    try {
      await vincular.mutateAsync({
        usuarioId: Number(usuarioSelecionado),
        funcaoOrganizacionalId: Number(funcaoSelecionada),
      });
      toast.success("Função principal vinculada ao empregado.");
      setUsuarioSelecionado("");
      setFuncaoSelecionada("");
      await usuarios.refetch();
    } catch (error: any) {
      toast.error(error.message || "Não foi possível vincular a função.");
    }
  };

  return (
    <div className="flex-1 w-full min-w-0 space-y-6 p-2 md:p-6">
      <div>
        <h1 className="text-3xl font-bold">Funções Organizacionais</h1>
        <p className="text-muted-foreground">
          As funções organizacionais são válidas para toda a organização, independentemente da unidade ou regional do empregado.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Carga inicial pelas funções derivadas dos cargos padronizados</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta carga cria 7 funções iniciais válidas para todas as unidades e regionais e vincula os 187 empregados.
            A função inicial poderá ser refinada depois pela análise da função real no Bloco 1.
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <div><span className="text-xs text-muted-foreground">Usuários</span><div className="font-semibold">{cargaInicial.data?.totalUsuarios ?? "..."}</div></div>
            <div><span className="text-xs text-muted-foreground">Não mapeados</span><div className="font-semibold">{cargaInicial.data?.naoMapeados.length ?? "..."}</div></div>
            <div><span className="text-xs text-muted-foreground">Vínculos principais existentes</span><div className="font-semibold">{cargaInicial.data?.vinculosPrincipaisAtivosExistentes ?? "..."}</div></div>
            <div><span className="text-xs text-muted-foreground">Situação</span><div className="font-semibold">{cargaInicial.data?.apto ? "Apto para carga" : "Aguardando validação"}</div></div>
          </div>
          <Button
            onClick={executarCargaInicial}
            disabled={!cargaInicial.data?.apto || aplicarCargaInicial.isPending}
          >
            Executar carga inicial dos 187 empregados
          </Button>
        </CardContent>
      </Card>

      {organizacoesAtivas.length === 0 && (
        <Card>
          <CardHeader><CardTitle>1. Cadastrar organização</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Nome</Label>
              <Input value={orgNome} onChange={(e) => setOrgNome(e.target.value)} placeholder="Ex.: Sebrae Tocantins" />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={orgCodigo} onChange={(e) => setOrgCodigo(e.target.value)} placeholder="Ex.: SEBRAE-TO" />
            </div>
            <div className="flex items-end">
              <Button onClick={criarOrg} disabled={criarOrganizacao.isPending}>Cadastrar organização</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {organizacoesAtivas.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle>1. Criar função</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Organização</Label>
                <Select value={organizacaoId} onValueChange={setOrganizacaoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {organizacoesAtivas.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Abrangência</Label>
                <Input value="Todas as unidades e regionais" disabled />
              </div>
              <div>
                <Label>Nome da função</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Analista de Atendimento Empresarial" />
              </div>
              <div>
                <Label>Código da função</Label>
                <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <Label>Cargo de referência</Label>
                <Input value={cargoReferencia} onChange={(e) => setCargoReferencia(e.target.value)} placeholder="Ex.: Analista Técnico I" />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição resumida</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva a finalidade da função, sem transformar a descrição em lista de competências." />
              </div>
              <div className="md:col-span-2">
                <Button onClick={criar} disabled={criarFuncao.isPending}>Criar função</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>2. Funções cadastradas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar função, unidade, código ou cargo de referência..." />
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Função</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Cargo de referência</TableHead>
                      <TableHead>Versão</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcoesFiltradas.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma função cadastrada.</TableCell></TableRow>
                    ) : funcoesFiltradas.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome}</TableCell>
                        <TableCell>{f.departamentoNome || "Todas as unidades e regionais"}</TableCell>
                        <TableCell>{f.cargoReferencia || "—"}</TableCell>
                        <TableCell>{f.versao}</TableCell>
                        <TableCell><Badge variant={f.ativa ? "default" : "secondary"}>{f.ativa ? "Ativa" : "Inativa"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>3. Vincular função principal ao empregado</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Empregado</Label>
                <Select value={usuarioSelecionado} onValueChange={setUsuarioSelecionado}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(usuarios.data ?? []).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} — {u.cargo}{u.funcaoNome ? ` — atual: ${u.funcaoNome}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Função organizacional</Label>
                <Select value={funcaoSelecionada} onValueChange={setFuncaoSelecionada}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(funcoes.data ?? []).filter((f) => f.ativa).map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.nome}{f.departamentoNome ? ` — ${f.departamentoNome}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={vincularUsuario} disabled={vincular.isPending}>Vincular função</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
