import { createTRPCReact } from "@trpc/react-query";
import type { RootRouter } from "../../../server/rootRouter";

export const trpc = createTRPCReact<RootRouter>();
