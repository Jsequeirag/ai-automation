import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Asistente RAG" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Asistente de documentos</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Entra con tu correo: te enviamos un enlace, sin contraseña.
          </p>
        </div>
        <Suspense>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  return <LoginForm linkError={error === "enlace"} />;
}
