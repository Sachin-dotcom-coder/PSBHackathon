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
import { IntroPage } from "../components/phantom/IntroPage";
import { PhantomLogo } from "../components/phantom/PhantomLogo";
import {
  LayoutDashboard,
  Users,
  Network,
  LogOut,
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
] as const;

function GlobalNav({ onOpenIntro }: { onOpenIntro: () => void }) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/[0.08] bg-[#090a0f]/95 px-10 py-4 backdrop-blur-md">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-3 group z-10">
        <PhantomLogo className="h-7 w-7 text-white" />
        <span className="text-mono text-[14px] font-extrabold tracking-[0.2em] text-white">
          PHANTOM
        </span>
      </Link>

      {/* Nav Links — Centered in Middle */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to || (to !== "/" && currentPath.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
                isActive
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-muted-foreground hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-[color:var(--cyan)]" : ""}`} />
              <span className="hidden sm:block tracking-wide">{label}</span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-lg border border-[color:var(--cyan)]/40"
                  transition={{ duration: 0.2 }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Exit Button — Returns to Intro Screen */}
      <button
        onClick={onOpenIntro}
        className="z-10 flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all"
        title="Return to System Overview"
      >
        <LogOut className="h-3.5 w-3.5 text-white/70" />
        <span className="hidden sm:inline">Exit</span>
      </button>
    </nav>
  );
}

type BootStage = "splash" | "intro" | "dashboard";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [bootStage, setBootStage] = useState<BootStage>(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("phantom_sentinel_booted")) {
      return "splash";
    }
    return "dashboard";
  });

  return (
    <QueryClientProvider client={queryClient}>
      {bootStage === "splash" && (
        <SplashScreen
          onComplete={() => setBootStage("intro")}
        />
      )}

      {bootStage === "intro" && (
        <IntroPage
          onEnterDashboard={() => {
            sessionStorage.setItem("phantom_sentinel_booted", "true");
            setBootStage("dashboard");
          }}
        />
      )}

      {bootStage === "dashboard" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <GlobalNav onOpenIntro={() => setBootStage("intro")} />
          <Outlet />
        </motion.div>
      )}
    </QueryClientProvider>
  );
}
