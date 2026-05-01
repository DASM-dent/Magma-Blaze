import AdminTrapClient from './AdminTrapClient';

export default function AdminTrapPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#050403] px-6 text-white">
      <AdminTrapClient path="/admin" />
      <section className="max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-white/35">404</p>
        <h1 className="mt-3 text-4xl font-black">Pagina no encontrada</h1>
        <p className="mt-4 text-sm text-white/45">La pagina solicitada no existe o ya no esta disponible.</p>
      </section>
    </main>
  );
}