import { trpc } from "@/lib/trpc";
import { PDI_LOCK_DEFAULT_MESSAGE } from "@shared/const";

/**
 * Hook que expõe o estado do "Período de Execução do PDI".
 * `locked` = true quando líderes/colaboradores estão em modo somente-leitura.
 */
export function useSystemLock(enabled: boolean = true) {
  const query = trpc.systemLock.getStatus.useQuery(undefined, {
    enabled,
    refetchInterval: 60000, // reavalia a cada 1 min (cobre encerramento agendado)
    refetchOnWindowFocus: true,
  });

  return {
    locked: query.data?.locked ?? false,
    manualLock: query.data?.manualLock ?? false,
    scheduledAt: query.data?.scheduledAt ?? null,
    message: query.data?.message ?? PDI_LOCK_DEFAULT_MESSAGE,
    updatedAt: query.data?.updatedAt ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
