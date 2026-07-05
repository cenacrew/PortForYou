export const metadata = { title: "CGV — Port'ForYou" };

export default function CGV() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="display" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>
          Conditions générales de vente
        </h1>
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <p>
            <strong>Objet</strong> — Port’ForYou fournit un service de création et d’hébergement de
            portfolios en ligne pour artistes visuels, par abonnement mensuel.
          </p>
          <p>
            <strong>Prix</strong> — tarification à l’usage, par site et par mois : 5 € TTC
            d’abonnement + 1 € TTC de nom de domaine + le coût réel d’infrastructure consommée
            (calculé sur les métriques d’utilisation et les tarifs publics de Google Cloud, détail
            consultable dans l’espace client), le tout majoré de 10 % au titre de la maintenance.
            Sans engagement de durée. Le paiement est géré par Stripe. [Version démo : paiements en
            mode test uniquement, aucun débit réel.]
          </p>
          <p>
            <strong>Résiliation</strong> — L’abonnement peut être résilié à tout moment depuis
            l’espace client (portail de facturation). Le site reste en ligne jusqu’à la fin de la
            période payée.
          </p>
          <p>
            <strong>Contenu</strong> — L’artiste est seul responsable des contenus publiés sur son
            portfolio et garantit disposer des droits nécessaires.
          </p>
          <p>
            <strong>Disponibilité</strong> — Le service est fourni « en l’état » ; Port’ForYou met
            en œuvre des moyens raisonnables pour garantir sa disponibilité sans obligation de
            résultat.
          </p>
        </div>
      </div>
    </section>
  );
}
