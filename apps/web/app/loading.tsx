export default function Loading() {
  return (
    <section className="magma-intro" role="status" aria-live="polite" aria-busy="true">
      <div className="magma-intro-grid" aria-hidden="true" />
      <div className="magma-intro-sweep magma-intro-sweep-one" aria-hidden="true" />
      <div className="magma-intro-sweep magma-intro-sweep-two" aria-hidden="true" />
      <div className="magma-intro-corner magma-intro-corner-tl" aria-hidden="true" />
      <div className="magma-intro-corner magma-intro-corner-br" aria-hidden="true" />
      <div className="magma-intro-core">
        <picture className="magma-intro-mascot">
          <source media="(prefers-reduced-motion: reduce)" srcSet="/images/magmablaze-mascota-circular-estatico.svg" />
          <img src="/images/magmablaze-mascota-circular-animado.svg" alt="" />
        </picture>
        <div className="magma-intro-name" aria-label="Magma Blaze"><span aria-hidden="true">MAGMA</span><span aria-hidden="true">BLAZE</span></div>
        <p className="magma-intro-tagline">Prepárate para encender tu estilo.</p>
        <div className="magma-intro-progress" role="progressbar" aria-label="Cargando la experiencia Magma Blaze"><span /></div>
        <div className="magma-intro-status"><span className="magma-intro-spinner" aria-hidden="true"><i /></span><p>Preparando tu experiencia</p></div>
      </div>
    </section>
  );
}