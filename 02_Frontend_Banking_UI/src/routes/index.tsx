import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Users, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { LangToggle, NexusMark, OrbitalArt } from "@/components/nexus/Shell";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { t, lang } = useLang();
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden nexus-ambient">
      <OrbitalArt />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NexusMark size={44} />
            <div>
              <div className="font-display text-sm font-semibold text-foreground">
                {t("appName")}
              </div>
              <div className="text-xs text-muted-foreground">VoiceOps · Banking AI</div>
            </div>
          </div>
          <LangToggle />
        </header>

        <main className="mt-16 flex flex-1 flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent nexus-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            {lang === "ar" ? "منصة مصرفية صوتية" : "Voice-first banking platform"}
          </span>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight text-foreground sm:text-6xl nexus-fade-in">
            {lang === "ar" ? (
              <>
                عمليات مصرفية <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">صوتية</span> بذكاء اصطناعي مفسَّر
              </>
            ) : (
              <>
                Banking operations, <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">spoken</span> and explained.
              </>
            )}
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground nexus-fade-in">
            {t("tagline")}
          </p>

          <div className="mt-14 grid w-full gap-5 sm:grid-cols-2">
            {[
              {
                role: "customer" as const,
                title: t("customerPortal"),
                desc: t("customerPortalDesc"),
                icon: <ShieldCheck className="h-5 w-5" />,
                path: "/login?role=customer",
              },
              {
                role: "employee" as const,
                title: t("employeeWorkspace"),
                desc: t("employeeWorkspaceDesc"),
                icon: <Users className="h-5 w-5" />,
                path: "/login?role=employee",
              },
            ].map((card) => (
              <button
                key={card.role}
                onClick={() => router.navigate({ to: card.path })}
                className="group nexus-glass relative overflow-hidden rounded-3xl p-8 text-start transition hover:-translate-y-1 hover:nexus-glow"
              >
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full nexus-aurora opacity-20 blur-2xl transition group-hover:opacity-40" />
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-xl nexus-aurora text-primary-foreground">
                    {card.icon}
                  </div>
                  <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{card.desc}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
                    {t("enter")}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 rtl:rotate-180" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>

        <footer className="mt-16 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Nexus AI · Synthetic banking data</span>
          <Link to="/login" search={{ role: "employee" }} className="hover:text-foreground">
            {t("employeeWorkspace")} →
          </Link>
        </footer>
      </div>
    </div>
  );
}
