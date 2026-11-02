import { Component, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router";
import { ErrorState } from "../components/ui/error-state";
import { Skeleton } from "../components/ui/skeleton";
import { RouteChunkLoadError } from "./RouteChunkLoadError";

class RouteChunkErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: unknown }
> {
  state = { hasError: false, error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (!(this.state.error instanceof RouteChunkLoadError)) throw this.state.error;
      return (
        <ErrorState
          title="This page has been updated. Reload to continue."
          description="Reload the page to load the latest version."
          retryLabel="Reload"
          onRetry={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}

function RoutePageSkeleton() {
  return (
    <main aria-busy="true" className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <p className="sr-only">Loading page…</p>
      <Skeleton className="h-9 max-w-sm" />
      <Skeleton lines={2} className="mt-4 max-w-xl" />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Skeleton shape="card" />
        <Skeleton shape="card" />
      </div>
    </main>
  );
}

export function RouteContent({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <RouteChunkErrorBoundary key={location.pathname}>
      <Suspense fallback={<RoutePageSkeleton />}>{children}</Suspense>
    </RouteChunkErrorBoundary>
  );
}
