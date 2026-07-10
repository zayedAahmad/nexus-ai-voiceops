import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Radar,
  Inbox,
  Cpu,
  Workflow,
  History,
  Users2,
  RotateCcw,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useLang } from "@/lib/i18n";
import { TopBar, Sidebar } from "@/components/nexus/Shell";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Employee Workspace — Nexus AI VoiceOps" },
      { name: "description", content: "Operations inbox, AI agents, automations and audit trail for bank operators." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { session, ready } = useSession();
  const router = useRouter();
  const { t } = useLang();
  const qc = useQueryClient();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.navigate({ to: "/login", search: { role: "employee" } });
    else if (session.role !== "employee") router.navigate({ to: "/portal" });
  }, [ready, session, router]);

  const resetMut = useMutation({
    mutationFn: api.reset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["state"] }),
  });

  if (!ready || !session) return null;

  const nav = [
    { to: "/workspace/command", label: t("commandCenter"), icon: <Radar className="h-3.5 w-3.5" /> },
    { to: "/workspace/requests", label: t("serviceRequests"), icon: <Inbox className="h-3.5 w-3.5" /> },
    { to: "/workspace/agents", label: t("agentsTrace"), icon: <Cpu className="h-3.5 w-3.5" /> },
    { to: "/workspace/automations", label: t("automations"), icon: <Workflow className="h-3.5 w-3.5" /> },
    { to: "/workspace/audit", label: t("auditTrail"), icon: <History className="h-3.5 w-3.5" /> },
    { to: "/workspace/committee", label: t("committee"), icon: <Users2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen nexus-ambient">
      <TopBar
        title={t("employeeWorkspace")}
        subtitle={session.name}
        right={
          <button
            onClick={() => resetMut.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            title={t("resetDemo")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("resetDemo")}
          </button>
        }
      />
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="nexus-glass sticky top-6 h-fit rounded-3xl">
          <Sidebar items={nav} />
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
