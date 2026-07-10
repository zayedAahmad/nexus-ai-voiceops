import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck, Users, Lock } from "lucide-react";
import { api, type UserAccount } from "@/lib/api";
import { fromAccount, writeSession } from "@/lib/session";
import { useLang } from "@/lib/i18n";
import { LangToggle, NexusMark, OrbitalArt } from "@/components/nexus/Shell";
import { BackendGate } from "@/components/nexus/BackendGate";

const searchSchema = z.object({
  role: z.enum(["customer", "employee"]).catch("customer"),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Nexus AI VoiceOps" },
      { name: "description", content: "Sign in to Nexus AI VoiceOps as a customer or employee." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { role } = Route.useSearch();
  const { t, lang } = useLang();
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");

  return (
    <div className="relative min-h-screen overflow-hidden nexus-ambient">
      <OrbitalArt />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <NexusMark size={40} />
            <div>
              <div className="font-display text-sm font-semibold text-foreground">
                {t("appName")}
              </div>
              <div className="text-xs text-muted-foreground">VoiceOps · Banking AI</div>
            </div>
          </Link>
          <LangToggle />
        </header>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> {t("back")}
          </Link>
        </div>

        <main className="mt-8 grid flex-1 items-start gap-8 lg:grid-cols-[1fr_1.4fr]">
          <section className="nexus-glass rounded-3xl p-8">
            <div className="grid h-12 w-12 place-items-center rounded-2xl nexus-aurora text-primary-foreground">
              {role === "employee" ? <Users className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <h1 className="mt-5 font-display text-2xl font-semibold text-foreground">
              {role === "employee" ? t("employeeWorkspace") : t("customerPortal")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {role === "employee" ? t("employeeWorkspaceDesc") : t("customerPortalDesc")}
            </p>

            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-3 text-xs text-muted-foreground">
              <Lock className="h-4 w-4 text-accent" />
              {lang === "ar"
                ? "بيئة تجريبية — بدون كلمة مرور. يتم اختيار الحساب من الجانب."
                : "Sandbox — no password. Choose an account on the right."}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              {(["customer", "employee"] as const).map((r) => (
                <Link
                  key={r}
                  to="/login"
                  search={{ role: r }}
                  className={`rounded-2xl border p-3 text-sm transition ${
                    r === role
                      ? "border-accent/50 bg-accent/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "customer" ? t("customerPortal") : t("employeeWorkspace")}
                </Link>
              ))}
            </div>
          </section>

          <section className="nexus-glass rounded-3xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t("chooseAccount")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("chooseAccountDesc")}</p>

            <BackendGate>
              {(state) => (
                <AccountsList
                  users={(state.users || []).filter((u) => (u.type || u.role) === role)}
                  selected={selected}
                  onSelect={setSelected}
                  onSubmit={(user) => {
                    writeSession(fromAccount(role, user));
                    router.navigate({ to: role === "employee" ? "/workspace/command" : "/portal" });
                  }}
                  submitLabel={t("continueBtn")}
                />
              )}
            </BackendGate>
          </section>
        </main>
      </div>
    </div>
  );
}

function AccountsList({
  users,
  selected,
  onSelect,
  onSubmit,
  submitLabel,
}: {
  users: UserAccount[];
  selected: string;
  onSelect: (id: string) => void;
  onSubmit: (u: UserAccount) => void;
  submitLabel: string;
}) {
  const active = useMemo(() => users.find((u) => u.userId === selected), [users, selected]);
  return (
    <div className="mt-6 space-y-4">
      {users.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/30 p-6 text-center text-sm text-muted-foreground">
          No accounts of this role yet.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {users.map((u) => (
            <li key={u.userId}>
              <button
                onClick={() => onSelect(u.userId)}
                className={`w-full rounded-2xl border p-4 text-start transition ${
                  selected === u.userId
                    ? "border-accent/60 bg-accent/10 nexus-glow"
                    : "border-border bg-card/40 hover:border-accent/40"
                }`}
              >
                <div className="font-display text-sm font-semibold text-foreground">
                  {u.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{u.email}</div>
                {u.customerId || u.linkedCustomerId ? (
                  <div className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    #{u.customerId || u.linkedCustomerId}
                  </div>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        disabled={!active}
        onClick={() => active && onSubmit(active)}
        className="w-full rounded-2xl nexus-aurora py-3 text-sm font-medium text-primary-foreground transition disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </div>
  );
}
