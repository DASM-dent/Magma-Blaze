import type { Metadata } from "next";
import Link from "next/link";
import DropLockScreen from "@/components/drop/DropLockScreen";
import { dropApi } from "@/services/api";

export const metadata: Metadata = {
  title: "Drops — Magma Blaze",
  description: "Próximos lanzamientos limitados de Magma Blaze.",
};

async function getDrop() {
  try {
    const { data } = await dropApi.active();
    return data?.drop ?? null;
  } catch {
    return null;
  }
}

export default async function DropsPage() {
  const activeDrop = await getDrop();

  if (!activeDrop) {
    return (
      <main className="grid min-h-[70vh] place-items-center px-6 py-24 text-center text-white">
        <div className="max-w-xl">
          <div className="mb-6 inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-200">
            Drops
          </div>
          <h1 className="text-4xl font-black md:text-6xl">No hay drop activo</h1>
          <p className="mx-auto mt-5 max-w-md text-white/55">
            Aún no se ha establecido el próximo lanzamiento. Cuando haya uno activo, aquí aparecerá el contador oficial.
          </p>
          <Link href="/" className="mt-8 inline-flex rounded-full bg-orange-500 px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-orange-400">
            Volver a la tienda
          </Link>
        </div>
      </main>
    );
  }

  return <DropLockScreen drop={activeDrop} showBack />;
}
