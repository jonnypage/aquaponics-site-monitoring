import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireGuest } from "~/api/session";
import { useLoginMutate } from "~/hooks/useAPI";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => requireGuest(context),
  component: LoginPage
});

function LoginPage() {
  const navigate = useNavigate();
  const { mutateAsync: mutateLogin, isPending: isLoginPending } = useLoginMutate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await mutateLogin({ email, password });
      await navigate({ to: "/sites" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoginPending}
          className="w-full rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isLoginPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
