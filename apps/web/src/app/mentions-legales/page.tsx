export const metadata = { title: "Mentions légales — Port'ForYou" };

export default function MentionsLegales() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="display" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>
          Mentions légales
        </h1>
        <div style={{ display: 'grid', gap: '1.6rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Éditeur du site</h2>
            <p>
              Port’ForYou, plateforme de création de portfolios pour artistes visuels.
              <br />
              Projet étudiant réalisé dans le cadre d’une formation (Ynov) — aucune entité juridique
              commerciale : le service n’est pas exploité à des fins commerciales.
              <br />
              Immatriculation (SIREN / SIRET) : non applicable (projet étudiant non immatriculé).
              <br />
              TVA intracommunautaire : non applicable.
              <br />
              Directeur de la publication : le mainteneur du projet (voir contact ci-dessous).
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Contact</h2>
            <p>Email : valetnina.sp@gmail.com</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Hébergement</h2>
            <p>
              Le site et les portfolios créés via la plateforme sont hébergés sur Google Cloud
              Platform — Google Cloud EMEA Limited / Google Ireland Limited, Gordon House, Barrow
              Street, Dublin 4, Irlande. Les données sont hébergées en région europe-west1 (Belgique
              / Union européenne).
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Propriété intellectuelle</h2>
            <p>
              Les œuvres, textes et images présentés sur les portfolios créés via la plateforme
              restent la propriété exclusive de leurs auteurs (les artistes clients). La marque, le
              nom et l’interface Port’ForYou sont protégés et ne peuvent être réutilisés sans
              autorisation.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Traitement des données</h2>
            <p>
              Les modalités de collecte et de traitement des données personnelles sont décrites dans
              notre{' '}
              <a href="/confidentialite" style={{ textDecoration: 'underline' }}>
                politique de confidentialité
              </a>
              . Les conditions d’utilisation du service figurent dans les{' '}
              <a href="/cgv" style={{ textDecoration: 'underline' }}>
                conditions générales de vente
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
