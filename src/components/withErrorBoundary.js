import React from "react";
import ErrorBoundary from "./ErrorBoundary";

/**
 * Wrap a screen in its own error boundary.
 *
 * §5.2 gives the app a root boundary, but a root-only boundary means one bad
 * tournament record takes down the WHOLE app — the user loses their navigation
 * stack and has to start over. A per-screen boundary contains the failure to
 * the screen that caused it, so Back still works and the rest of the app keeps
 * running.
 *
 * Applied to the screens most exposed to the schema migrations that cause these
 * crashes (sportSelections replacing selectedCategories, matchResult replacing
 * result.finalScore) — the tournament/match renderers.
 *
 *   export default withErrorBoundary(TournamentViewer, "this tournament");
 */
export default function withErrorBoundary(Component, label) {
  const Wrapped = (props) => (
    <ErrorBoundary label={label}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || "Screen"
  })`;
  return Wrapped;
}
