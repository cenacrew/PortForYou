export const metadata = { title: "Mentions légales — Port'ForYou" };

export default function MentionsLegales() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="display" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>
          Mentions légales
        </h1>
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <p>
            <strong>Éditeur</strong> — Port’ForYou, plateforme de création de portfolios pour
            artistes visuels. [Raison sociale, adresse et SIREN à compléter avant mise en production
            commerciale.]
          </p>
          <p>
            <strong>Hébergement</strong> — Google Cloud Platform (Google Ireland Limited, Gordon
            House, Barrow Street, Dublin 4, Irlande). Données hébergées en région europe-west1
            (Belgique).
          </p>
          <p>
            <strong>Contact</strong> — contact@portforyou.example (adresse à compléter).
          </p>
          <p>
            <strong>Propriété intellectuelle</strong> — Les œuvres présentées sur les portfolios
            créés via la plateforme restent la propriété exclusive de leurs artistes.
          </p>
        </div>
      </div>
    </section>
  );
}
