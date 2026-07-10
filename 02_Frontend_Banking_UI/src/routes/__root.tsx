import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="nexus-ambient flex min-h-screen items-center justify-center px-4">
      <div className="nexus-glass max-w-md rounded-3xl p-10 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl nexus-aurora nexus-glow" />
        <h1 className="font-display text-6xl font-bold text-foreground">404</h1>
        <h2 className="mt-3 text-lg font-semibold text-foreground">Route not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for does not exist in this workspace.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full nexus-aurora px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  return (
    <div className="nexus-ambient flex min-h-screen items-center justify-center px-4">
      <div className="nexus-glass max-w-md rounded-3xl p-10 text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">
          Something interrupted the session
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try again or return to the entry portal. Your data is safe.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full nexus-aurora px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nexus AI VoiceOps — Voice-first banking operations" },
      {
        name: "description",
        content:
          "Nexus AI VoiceOps is a premium voice-first banking operations platform with an explainable AI agent workspace and a private customer portal.",
      },
      { name: "theme-color", content: "#05070f" },
      { property: "og:title", content: "Nexus AI VoiceOps — Voice-first banking operations" },
      {
        property: "og:description",
        content:
          "Nexus AI VoiceOps is a premium voice-first banking operations platform with an explainable AI agent workspace and a private customer portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Nexus AI VoiceOps — Voice-first banking operations" },
      { name: "twitter:description", content: "Nexus AI VoiceOps is a premium voice-first banking operations platform with an explainable AI agent workspace and a private customer portal." },
      { property: "og:image", content: "/favicon.ico" },
      { name: "twitter:image", content: "/favicon.ico" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
