import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

/**
 * Cliente de Supabase con la sesión del usuario (cookies). Siempre la clave anon,
 * nunca la de servicio, para que RLS actúe además de los filtros del código.
 * Crear uno nuevo por petición.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: no se pueden escribir cookies.
            // proxy.ts ya refresca la sesión en cada petición.
          }
        },
      },
    },
  );
}

/** Cliente y usuario actual verificado con Supabase Auth (user = null si no hay sesión). */
export async function getUser() {
  // Supabase usa Date.now() para ver si el token caducó. Con Cache Components y
  // partialPrefetching eso no puede correr en el prerender (ni en el runtime prefetch,
  // donde las cookies ya están disponibles): connection() lo deja para la petición real.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
