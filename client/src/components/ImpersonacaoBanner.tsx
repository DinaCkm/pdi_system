import { useEffect, useState } from "react";
import { Eye, LogOut } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Aviso fixo exibido quando um administrador está em "Acessar como".
 * Moldura laranja na tela + barra com o nome do empregado e botão para voltar.
 */
export function ImpersonacaoBanner() {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const impersonadoPor = (meQuery.data as any)?.impersonadoPor as { id: number; name: string; expiraEm: number } | null | undefined;
  const nomeEmpregado = String((meQuery.data as any)?.name ?? "");
  const [agora, setAgora] = useState(Date.now());

  const pararMutation = trpc.auth.pararAcessoComo.useMutation({
    onSettled: () => {
      window.location.href = "/usuarios";
    },
  });

  useEffect(() => {
    if (!impersonadoPor) return;
    const timer = setInterval(() => setAgora(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [impersonadoPor]);

  // Expirou: volta automaticamente para a conta do admin.
  useEffect(() => {
    if (impersonadoPor?.expiraEm && agora >= impersonadoPor.expiraEm && !pararMutation.isPending) {
      pararMutation.mutate();
    }
  }, [agora, impersonadoPor, pararMutation]);

  if (!impersonadoPor) return null;

  const minutos = Math.max(0, Math.ceil((impersonadoPor.expiraEm - agora) / 60000));

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[9998] border-4 border-orange-500" />
      <div className="fixed bottom-4 left-1/2 z-[9999] flex w-[calc(100%-32px)] max-w-3xl -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-xl bg-orange-600 px-4 py-3 text-sm text-white shadow-2xl">
        <span className="flex items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            Visualizando como <strong>{nomeEmpregado}</strong> — SOMENTE LEITURA
            <span className="ml-2 opacity-80">({minutos} min restantes)</span>
          </span>
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 font-semibold text-orange-700 hover:bg-orange-50"
          disabled={pararMutation.isPending}
          onClick={() => pararMutation.mutate()}
        >
          <LogOut className="h-4 w-4" />
          {pararMutation.isPending ? "Voltando..." : "Voltar para minha conta"}
        </button>
      </div>
    </>
  );
}

/** Botão/ação para o admin iniciar o "Acessar como" um empregado. */
export function useAcessarComo() {
  const mutation = trpc.auth.acessarComo.useMutation({
    onSuccess: () => {
      // Recarrega do início para montar o menu e as telas do empregado.
      window.location.href = "/";
    },
    onError: error => window.alert(error.message),
  });
  const acessarComo = (userId: number, nome: string) => {
    if (!window.confirm(`Visualizar o sistema como ${nome}?\n\nModo somente leitura, por 30 minutos. Nenhuma ação será gravada em nome do empregado.`)) return;
    mutation.mutate({ userId });
  };
  return { acessarComo, isPending: mutation.isPending };
}
