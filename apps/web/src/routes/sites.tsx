import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "~/api/session";

export const Route = createFileRoute("/sites")({
  beforeLoad: ({ context }) => requireAuth(context),
  component: () => (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-800">Sites</h1>
      <p className="mt-2 text-slate-600">Site list and charts are coming in milestone 2.</p>
    </main>
  )
});
