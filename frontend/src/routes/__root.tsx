import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SplashScreen } from "../components/phantom/SplashScreen";
import { PhantomLogo } from "../components/phantom/PhantomLogo";
import {
  LayoutDashboard,
  Users,
  Network,
  Terminal,
} from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
      { title: "PHANTOM — Autonomous Trust & Threat Engine" },
      { name: "description", content: "AI-powered insider threat detection for enterprise banking." },
      { name: "author", content: "PHANTOM" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" },
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

const NAV_ITEMS = [
  { to: "/", label: "SOC Overview", icon: LayoutDashboard },
  { to: "/leaderboard", label: "Leaderboard", icon: Users },
  { to: "/investigation", label: "Graph Viz", icon: Network },
  { to: "/simulator", label: "Simulator", icon: Terminal },
] as const;

function GlobalNav() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/95 px-8 py-3 backdrop-blur-md">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-3 group">
        <PhantomLogo className="h-7 w-7 text-white" />
        <span className="text-mono text-[14px] font-extrabold tracking-[0.2em] text-white">
          PHANTOM
        </span>
      </Link>

      {/* Nav Links */}
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to || (to !== "/" && currentPath.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-surface-2 text-white"
                  : "text-muted-foreground hover:text-white hover:bg-surface/50"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[color:var(--cyan)]" : ""}`} />
              <span className="hidden sm:block">{label}</span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-md border border-[color:var(--cyan)]/30"
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-mono text-[11px] text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--emerald)]/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--emerald)]" />
        </span>
        <span className="hidden sm:block uppercase tracking-widest font-semibold text-emerald-400">Live</span>
      </div>
    </nav>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("phantom_sentinel_booted")) {
      setShowSplash(true);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen
            onComplete={() => {
              sessionStorage.setItem("phantom_sentinel_booted", "true");
              setShowSplash(false);
            }}
          />
        )}
      </AnimatePresence>
      <GlobalNav />
      <Outlet />
    </QueryClientProvider>
  );
}
