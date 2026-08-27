import { Suspense } from "react";
import ResumeBuilderPage from "./builder-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading builder…</div>}>
      <ResumeBuilderPage />
    </Suspense>
  );
}
