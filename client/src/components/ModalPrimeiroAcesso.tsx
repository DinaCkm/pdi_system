import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, CheckCircle2 } from "lucide-react";

export function ModalPrimeiroAcesso() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: versaoData } = trpc.normasRegras.versaoAtual.useQuery();
  const { data: vizData, isLoading } = trpc.normasRegras.verificarVisualizacao.useQuery();
  const marcarVisto = trpc.normasRegras.marcarComoVisto.useMutation();

  useEffect(() => {
    if (!isLoading && versaoData && vizData) {
      const versaoAtual = versaoData.versao;
      const versaoVista = vizData.viuNormasVersao;
      // Mostra o modal se há normas (versao > 0) e o usuário não viu a versão atual
      if (versaoAtual > 0 && versaoVista < versaoAtual) {
        setOpen(true);
      }
    }
  }, [isLoading, versaoData, vizData]);

  const handleVerNormas = () => {
    if (versaoData) {
      marcarVisto.mutate({ versao: versaoData.versao });
    }
    setOpen(false);
    setLocation("/normas-regras");
  };

  const handleFechar = () => {
    if (versaoData) {
      marcarVisto.mutate({ versao: versaoData.versao });
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleFechar(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Bem-vindo ao Sistema de Gestão de PDI!
          </DialogTitle>
          <DialogDescription className="text-center mt-2 text-base">
            Antes de começar, é importante que você conheça as{" "}
            <strong className="text-foreground">Normas e Regras</strong> do Ciclo PDI 2026.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">O que você vai encontrar:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>Regras gerais do PDI e prazos importantes</li>
                <li>Fluxo completo do ciclo de desenvolvimento</li>
                <li>Orientações sobre ações e competências</li>
                <li>Informações sobre avaliação e acompanhamento</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleFechar}
            className="sm:flex-1"
          >
            Ver depois
          </Button>
          <Button
            onClick={handleVerNormas}
            className="sm:flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Ver Normas e Regras
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
