// ROUTE: /* → NotFound (catch-all)
// Add to App.js:
//   import NotFound from "@/pages/NotFound";
//   Add as last Route: <Route path="*" element={<NotFound />} />
import ErrorState from "@/components/nirog/ErrorState";

export default function NotFound() {
  return <ErrorState kind="404" />;
}
