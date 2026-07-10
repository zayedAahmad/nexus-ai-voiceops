import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useLang, type Lang } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { writeSession } from "@/lib/session";

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 p-1 text-xs font-medium">
      {(["en", "ar"] as Lang[]).map((code) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`rounded-full px-3 py-1 transition ${
            lang === code
              ? "nexus-aurora text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {code === "en" ? "EN" : "عربي"}
        </button>
      ))}
    </div>
  );
}

export function NexusMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-2xl nexus-aurora nexus-glow font-display font-bold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      N
    </div>
  );
}

export function TopBar({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const { session } = useSession();
  const router = useRouter();
  const { t } = useLang();
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border/60 bg-card/40 px-6 py-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <NexusMark size={40} />
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-semibold text-foreground sm:text-lg">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {right}
        <LangToggle />
        {session ? (
          <button
            onClick={() => {
              writeSession(null);
              router.navigate({ to: "/" });
            }}
            className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            {t("signOut")}
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function Sidebar({
  items,
}: {
  items: Array<{ to: string; label: string; icon?: ReactNode }>;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active
                ? "nexus-glass text-foreground"
                : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
            }`}
          >
            <span
              className={`grid h-7 w-7 place-items-center rounded-lg text-xs ${
                active ? "nexus-aurora text-primary-foreground" : "bg-muted/60"
              }`}
            >
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function OrbitalArt() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full nexus-aurora opacity-30 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
      <div className="absolute inset-0 nexus-grid-bg opacity-40" />
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full border border-accent/20 nexus-orbit">
          <span className="absolute -left-1.5 top-1/2 h-3 w-3 rounded-full bg-accent nexus-glow" />
        </div>
        <div
          className="absolute inset-10 rounded-full border border-primary/30 nexus-orbit"
          style={{ animationDirection: "reverse", animationDuration: "36s" }}
        >
          <span className="absolute right-0 top-1/3 h-2 w-2 rounded-full bg-primary" />
        </div>
        <div
          className="absolute inset-24 rounded-full border border-accent/15 nexus-orbit"
          style={{ animationDuration: "18s" }}
        >
          <span className="absolute left-1/2 -top-1 h-2 w-2 rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}
