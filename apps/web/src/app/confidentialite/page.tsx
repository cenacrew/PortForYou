export const metadata = { title: "Confidentialité — Port'ForYou" };

export default function Confidentialite() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="display" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>
          Politique de confidentialité
        </h1>
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <p>
            <strong>Données collectées</strong> — Compte client : nom, email (Firebase
            Authentication). Facturation : gérée par Stripe, nous ne stockons aucune donnée de carte
            bancaire.
          </p>
          <p>
            <strong>Statistiques des portfolios</strong> — Les sites créés mesurent leur audience
            sans cookie et sans donnée personnelle : aucune adresse IP n’est conservée, les
            comptages sont anonymes et agrégés par jour.
          </p>
          <p>
            <strong>Durée de conservation</strong> — Les données de compte sont conservées tant que
            le compte est actif. La suppression du compte entraîne la suppression des données
            associées sous 30 jours.
          </p>
          <p>
            <strong>Vos droits</strong> — Accès, rectification, suppression : écrivez-nous à
            contact@portforyou.example. Vous pouvez supprimer votre compte directement depuis votre
            espace.
          </p>
        </div>
      </div>
    </section>
  );
}
