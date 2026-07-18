export const metadata = { title: "Confidentialité — Port'ForYou" };

export default function Confidentialite() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="display" style={{ fontSize: '2.4rem', marginBottom: '2rem' }}>
          Politique de confidentialité
        </h1>
        <div style={{ display: 'grid', gap: '1.6rem' }}>
          <p>
            Cette politique décrit comment Port’ForYou (le « responsable de traitement ») collecte
            et traite vos données personnelles, conformément au Règlement général sur la protection
            des données (RGPD) et à la loi Informatique et Libertés.
          </p>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>
              Responsable de traitement
            </h2>
            <p>
              [À COMPLÉTER : raison sociale et adresse — voir mentions légales]
              <br />
              Contact pour toute question relative à vos données : [À COMPLÉTER : email de contact /
              du référent RGPD ou DPO]
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Données collectées</h2>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>
                <strong>Compte client</strong> : nom d’affichage, adresse email, mot de passe
                (stocké uniquement sous forme de hachage bcrypt, jamais en clair).
                L’authentification est gérée par nos soins (email + mot de passe, ou connexion
                Google en option) ; nous n’utilisons pas de fournisseur d’identité tiers pour
                stocker vos identifiants.
              </li>
              <li>
                <strong>Commandes et abonnement</strong> : template choisi, nom du site (slug), nom
                d’artiste, email de contact, statut de la commande et de l’abonnement.
              </li>
              <li>
                <strong>Paiement</strong> : géré par Stripe. Nous ne stockons aucune donnée de carte
                bancaire ; nous conservons uniquement un identifiant client Stripe technique.
              </li>
              <li>
                <strong>Contenu de votre portfolio</strong> : les œuvres, images et textes que vous
                mettez en ligne pour votre site.
              </li>
              <li>
                <strong>Statistiques d’audience des portfolios</strong> : les sites créés mesurent
                leur fréquentation sans cookie et sans donnée personnelle — aucune adresse IP n’est
                conservée, les comptages sont anonymisés et agrégés par jour.
              </li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>
              Finalités et bases légales
            </h2>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>
                Fourniture du service (création, déploiement et hébergement de votre site) —{' '}
                <em>exécution du contrat</em>.
              </li>
              <li>
                Gestion de la facturation et de l’abonnement — <em>exécution du contrat</em> et{' '}
                <em>obligation légale</em> (conservation des factures).
              </li>
              <li>
                Emails transactionnels (confirmation de commande, site en ligne, réinitialisation de
                mot de passe, échec de paiement) — <em>exécution du contrat</em>.
              </li>
              <li>
                Sécurité, prévention de la fraude et journalisation technique —{' '}
                <em>intérêt légitime</em>.
              </li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Sous-traitants</h2>
            <p>Nous faisons appel aux prestataires suivants, agissant comme sous-traitants :</p>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>
                <strong>Google Cloud Platform</strong> (hébergement et base de données, région
                europe-west1, UE).
              </li>
              <li>
                <strong>Stripe</strong> (traitement des paiements et de l’abonnement).
              </li>
              <li>
                <strong>Resend</strong> (envoi des emails transactionnels).
              </li>
            </ul>
            <p>
              Ces prestataires sont susceptibles de traiter des données hors UE ; le cas échéant,
              ces transferts sont encadrés par des clauses contractuelles types de la Commission
              européenne.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Durées de conservation</h2>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>
                Données de compte et contenu du portfolio : conservés tant que le compte est actif.
              </li>
              <li>
                Après suppression du compte : anonymisation immédiate du profil, suspension puis
                effacement définitif des sites sous 30 jours.
              </li>
              <li>
                Données de facturation : conservées 10 ans conformément aux obligations comptables
                et fiscales (y compris chez Stripe pour ce qui le concerne).
              </li>
              <li>Journaux techniques : conservés [À COMPLÉTER : durée retenue, ex. 12 mois].</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Cookies</h2>
            <p>
              La plateforme n’utilise que des cookies strictement nécessaires à son fonctionnement :
              un cookie de session sécurisé (httpOnly) pour maintenir votre connexion. Aucun cookie
              publicitaire ni de mesure d’audience tierce n’est déposé, ni sur la plateforme, ni sur
              les portfolios créés.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez d’un droit d’accès, de rectification,
              d’effacement, de limitation, d’opposition et de portabilité de vos données.
              Concrètement :
            </p>
            <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: '1.2rem' }}>
              <li>
                <strong>Portabilité</strong> : vous pouvez exporter l’intégralité des données de
                votre compte (profil, sites, commandes) au format JSON depuis votre espace, page
                Profil.
              </li>
              <li>
                <strong>Effacement</strong> : vous pouvez supprimer votre compte directement depuis
                votre espace, page Profil.
              </li>
              <li>
                Pour les autres droits, ou pour toute réclamation, contactez-nous à [À COMPLÉTER :
                email de contact].
              </li>
            </ul>
            <p>
              Vous pouvez également introduire une réclamation auprès de la CNIL (
              <a href="https://www.cnil.fr" style={{ textDecoration: 'underline' }}>
                www.cnil.fr
              </a>
              ).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
