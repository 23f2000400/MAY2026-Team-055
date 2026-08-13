// ROUTE: Used internally via ErrorState, not a direct route
// Render <Forbidden /> anywhere you need a 403 experience,
// or use <ErrorState kind="403" /> directly.
import ErrorState from "@/components/nirog/ErrorState";

export default function Forbidden() {
  return <ErrorState kind="403" />;
}
