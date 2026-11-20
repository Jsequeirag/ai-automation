import "server-only";
import { NextResponse } from "next/server";

/** Errores de la API siempre como {error: "mensaje en español"}. */
export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export const unauthorized = () => jsonError(401, "Tienes que iniciar sesión.");
