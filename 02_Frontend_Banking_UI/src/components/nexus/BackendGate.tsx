import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLang } from "@/lib/i18n";
import { Loader2, ServerCrash } from "lucide-react";

export function BackendGate({ children }: { children: (state: NonNullable<Awaited<ReturnType<typeof api.state>>>) => ReactNode }) {
  const { t } = useLang();
  const q = useQuery({
    queryKey: ["state"],
    queryFn: api.state,
    retry: 0,
    refetchInterval: 8000,
  });

  if (q.isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="nexus-glass max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/20 text-destructive">
            <ServerCrash className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            {t("backendOffline")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("backendOfflineDesc")}</p>
          <button
            onClick={() => q.refetch()}
            className="mt-5 inline-flex items-center rounded-full nexus-aurora px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return <>{children(q.data)}</>;
}
