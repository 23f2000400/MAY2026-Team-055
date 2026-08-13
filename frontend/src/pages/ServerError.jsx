// ROUTE: Used by ErrorBoundary as its fallback UI
// Import in ErrorBoundary.jsx: import ServerError from "@/pages/ServerError";
import ErrorState from "@/components/nirog/ErrorState";

export default function ServerError({ error }) {
  return <ErrorState kind="500" error={error} />;
}
