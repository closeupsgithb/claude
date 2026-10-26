import { neon } from "@neondatabase/serverless";

/** Cliente SQL de Neon. Devuelve null si no hay DATABASE_URL (el dashboard en vivo sigue funcionando). */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export type Sql = NonNullable<ReturnType<typeof getSql>>;
