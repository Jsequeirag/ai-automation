import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span className="font-semibold">Asistente de documentos</span>
        <Suspense>
          <UserMenu />
        </Suspense>
      </header>
      <Suspense fallback={<p className="p-4 text-sm text-zinc-500">Cargando…</p>}>
        <Guard>{children}</Guard>
      </Suspense>
    </div>
  );
}

// Segunda comprobación en el servidor: proxy.ts solo es optimista.
async function Guard({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}

async function UserMenu() {
  const { user } = await getUser();
  if (!user) return null;
  return (
    <form action={signOut} className="flex items-center gap-3 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{user.email}</span>
      <button type="submit" className="underline">
        Salir
      </button>
    </form>
  );
}
