import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;
  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
  return globalThis.fetch(input, {
    ...(init ?? {}),
    credentials: "include",
    headers: init?.headers,
  }).then(async (response) => {
          // Tratar respostas não-JSON (ex: rate limiting retorna texto puro)
          if (!response.ok) {
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
              const text = await response.text();
              let friendlyMessage = 'Erro inesperado no servidor. Tente novamente em instantes.';
              if (text.toLowerCase().includes('rate exceeded') || text.toLowerCase().includes('rate limit') || response.status === 429) {
                friendlyMessage = 'Muitas tentativas de acesso. Por favor, aguarde alguns instantes e tente novamente.';
              } else if (response.status === 502 || response.status === 503 || response.status === 504) {
                friendlyMessage = 'O servidor está temporariamente indisponível. Tente novamente em alguns instantes.';
              }
              // Retornar uma resposta JSON válida com o erro para o tRPC processar
              return new Response(
                JSON.stringify([{ error: { message: friendlyMessage, code: -1, data: { code: 'INTERNAL_SERVER_ERROR' } } }]),
                { status: response.status, headers: { 'content-type': 'application/json' } }
              );
            }
          }
          return response;
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
