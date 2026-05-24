import Link from 'next/link';
import { Leaf } from 'lucide-react';

export const metadata = {
  title: "Conditions Générales d'Utilisation — EnviroTrack",
  description:
    "Droits et obligations de la plateforme EnviroTrack et de ses utilisateurs (bureaux d'études, experts indépendants, agents terrain).",
};

const LAST_UPDATED = '24 mai 2026';

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        {title}
      </h2>
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
      <div className="space-y-2 pl-3 border-l-2 border-gray-100">{children}</div>
    </div>
  );
}

const NAV = [
  { id: 'objet', label: '1. Objet' },
  { id: 'definitions', label: '2. Définitions' },
  { id: 'plateforme', label: '3. La Plateforme' },
  { id: 'bureau', label: "4. Bureau d'études" },
  { id: 'expert', label: '5. Expert indépendant' },
  { id: 'terrain', label: '6. Agent terrain' },
  { id: 'acces', label: '7. Accès & Compte' },
  { id: 'tarifs', label: '8. Tarifs & Paiements' },
  { id: 'donnees', label: '9. Données personnelles' },
  { id: 'responsabilite', label: '10. Responsabilité' },
  { id: 'pi', label: '11. Propriété intellectuelle' },
  { id: 'resiliation', label: '12. Résiliation' },
  { id: 'droit', label: '13. Droit applicable' },
];

export default function CguPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#123C24] flex items-center justify-center">
              <Leaf size={11} className="text-white" />
            </div>
            <span className="font-bold text-[#123C24] text-sm">EnviroTrack</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-900">
            Connexion
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 lg:flex lg:gap-12">
        {/* Sidebar TOC — desktop */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Sommaire
            </p>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-xs text-gray-500 hover:text-[#123C24] py-0.5 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Mise à jour</p>
              <p className="text-xs font-medium text-gray-600">{LAST_UPDATED}</p>
            </div>
          </div>
        </aside>

        {/* Content */}
        <article className="flex-1 max-w-3xl space-y-10">
          {/* Header */}
          <div>
            <div className="inline-flex items-center gap-1.5 bg-green-50 text-[#123C24] px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-green-100">
              Version en vigueur · {LAST_UPDATED}
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
              Conditions Générales d&apos;Utilisation
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Les présentes Conditions Générales d&apos;Utilisation (ci-après «&nbsp;CGU&nbsp;»)
              régissent l&apos;accès et l&apos;utilisation de la plateforme{' '}
              <strong className="text-gray-700">EnviroTrack</strong>, éditée par{' '}
              <strong className="text-gray-700">EnviroTrack SARL</strong>, société de droit togolais
              dont le siège est à Lomé, Togo. En créant un compte ou en utilisant le Service, vous
              acceptez sans réserve les présentes CGU.
            </p>
          </div>

          {/* 1 — Objet */}
          <Section id="objet" title="1. Objet et champ d'application">
            <p>
              EnviroTrack est une plateforme SaaS (logiciel en tant que service) dédiée à la
              réalisation, au suivi et à l&apos;archivage des Études d&apos;Impact Environnemental
              et Social (EIES) et des Plans de Gestion Environnementale et Sociale (PGES) au Togo,
              conformément à la Loi‑cadre n° 2008‑005 sur l&apos;environnement et au Décret n°
              2017‑040/PR portant procédures d&apos;études d&apos;impact sur l&apos;environnement.
            </p>
            <p>
              Les présentes CGU s&apos;appliquent à tout utilisateur du Service, quelle que soit sa
              qualité : Bureau d&apos;études, Expert indépendant ou Agent terrain.
            </p>
          </Section>

          {/* 2 — Définitions */}
          <Section id="definitions" title="2. Définitions">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  term: 'La Plateforme',
                  def: "EnviroTrack et l'ensemble de ses services accessibles via envirotrack.tg ou toute URL associée.",
                },
                {
                  term: "Bureau d'études",
                  def: "Personne morale ou physique agréée ANGE exerçant des activités d'évaluation environnementale et ayant souscrit un compte Organisation.",
                },
                {
                  term: 'Expert indépendant',
                  def: 'Consultant spécialisé (écologie, SIG, socio-économie, etc.) intervenant sur un ou plusieurs projets EIES sans nécessairement être rattaché à un Bureau.',
                },
                {
                  term: 'Agent terrain',
                  def: "Technicien ou enquêteur mandaté par un Bureau ou un Expert pour collecter des données de terrain dans le cadre d'un PGES.",
                },
                {
                  term: 'Projet',
                  def: 'Dossier créé sur la Plateforme correspondant à une activité nécessitant une EIES conformément au décret 2017-040/PR.',
                },
                {
                  term: 'Crédits',
                  def: 'Unité de valeur interne acquise par paiement ou coupon, utilisée pour activer les fonctionnalités payantes du Service.',
                },
              ].map((d) => (
                <div key={d.term} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                  <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide mb-1">
                    {d.term}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">{d.def}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 3 — La Plateforme */}
          <Section id="plateforme" title="3. Droits et obligations de la Plateforme">
            <Sub title="3.1 Ce que la Plateforme s'engage à fournir">
              <p>
                EnviroTrack met à disposition un environnement sécurisé permettant la rédaction
                guidée d&apos;EIES (9 sections réglementaires), le suivi trimestriel du PGES, la
                gestion des non-conformités et la génération de rapports PDF conformes aux exigences
                de l&apos;ANGE.
              </p>
              <p>
                La Plateforme assure la disponibilité du Service 24h/24 et 7j/7, avec un objectif de
                disponibilité de 99,5 % sur un mois calendaire, hors maintenances planifiées
                notifiées 48h à l&apos;avance.
              </p>
              <p>
                Les données des utilisateurs sont sauvegardées quotidiennement et conservées sur des
                serveurs conformes aux standards de sécurité ISO 27001.
              </p>
            </Sub>
            <Sub title="3.2 Limites du rôle de la Plateforme">
              <p>
                EnviroTrack est un <strong>outil d&apos;aide à la rédaction</strong> et non un
                organisme d&apos;agrément ou de certification. La responsabilité de la conformité
                réglementaire des études produites incombe exclusivement aux utilisateurs
                professionnels qui les signent.
              </p>
              <p>
                La Plateforme ne garantit pas l&apos;acceptation des rapports produits par
                l&apos;ANGE ou tout autre organe de contrôle.
              </p>
            </Sub>
            <Sub title="3.3 Modération et sanctions">
              <p>
                EnviroTrack se réserve le droit de suspendre ou de résilier tout compte qui
                utiliserait le Service à des fins frauduleuses, contraires aux lois togolaises ou
                portant atteinte aux droits de tiers. Toute suspension est notifiée par email dans
                les 24 heures.
              </p>
            </Sub>
          </Section>

          {/* 4 — Bureau d'études */}
          <Section id="bureau" title="4. Droits et obligations du Bureau d'études">
            <Sub title="4.1 Droits">
              <ul className="space-y-1 list-disc pl-4">
                <li>
                  Créer et gérer un nombre illimité de Projets EIES selon le forfait souscrit.
                </li>
                <li>
                  Inviter des membres d&apos;équipe (Experts, Agents terrain) avec des rôles définis
                  (Propriétaire, Administrateur, Membre).
                </li>
                <li>Générer et exporter les rapports EIES et PGES en format PDF.</li>
                <li>
                  Accéder au support technique prioritaire selon le forfait Bailleur international.
                </li>
                <li>
                  Demander le remboursement de Crédits non utilisés dans les 14 jours suivant
                  l&apos;achat (sous réserve d&apos;aucune activation de Projet).
                </li>
              </ul>
            </Sub>
            <Sub title="4.2 Obligations">
              <ul className="space-y-1 list-disc pl-4">
                <li>
                  <strong>Agrément :</strong> Le Bureau doit être titulaire ou en cours
                  d&apos;obtention d&apos;un agrément ANGE valide pour exercer des activités
                  d&apos;évaluation environnementale au Togo.
                </li>
                <li>
                  <strong>Exactitude des données :</strong> Le Bureau est seul responsable de
                  l&apos;exactitude, de l&apos;exhaustivité et de la véracité des informations
                  saisies dans les projets EIES.
                </li>
                <li>
                  <strong>Confidentialité :</strong> Le Bureau doit préserver la confidentialité des
                  données sensibles des projets de ses clients et ne pas les partager sans
                  consentement explicite.
                </li>
                <li>
                  <strong>Paiement :</strong> Le Bureau s&apos;engage à régler les Crédits
                  nécessaires à l&apos;activation de chaque Projet avant toute soumission à
                  l&apos;ANGE.
                </li>
                <li>
                  <strong>Gestion de l&apos;équipe :</strong> Le Bureau est responsable des actions
                  réalisées par les membres qu&apos;il a invités sur la Plateforme.
                </li>
              </ul>
            </Sub>
          </Section>

          {/* 5 — Expert indépendant */}
          <Section id="expert" title="5. Droits et obligations de l'Expert indépendant">
            <Sub title="5.1 Droits">
              <ul className="space-y-1 list-disc pl-4">
                <li>
                  Accéder aux sections de projets EIES auxquelles il a été affecté par un Bureau.
                </li>
                <li>
                  Rédiger, modifier et sauvegarder ses contributions aux sections EIES qui lui sont
                  assignées.
                </li>
                <li>
                  Créer ses propres projets en tant qu&apos;Expert autonome et en assurer le suivi
                  PGES.
                </li>
                <li>Télécharger les rapports des projets auxquels il participe.</li>
              </ul>
            </Sub>
            <Sub title="5.2 Obligations">
              <ul className="space-y-1 list-disc pl-4">
                <li>
                  <strong>Compétence :</strong> L&apos;Expert atteste disposer des qualifications
                  nécessaires dans sa spécialité (environnement, SIG, socio-économie, etc.) pour les
                  missions qu&apos;il accepte.
                </li>
                <li>
                  <strong>Intégrité des données :</strong> L&apos;Expert ne peut modifier ou
                  supprimer que les sections qui lui ont été explicitement attribuées.
                </li>
                <li>
                  <strong>Conflits d&apos;intérêts :</strong> L&apos;Expert doit informer le Bureau
                  mandant de tout conflit d&apos;intérêts potentiel avec le projet concerné.
                </li>
                <li>
                  <strong>Respect des délais :</strong> L&apos;Expert doit respecter les délais
                  convenus avec le Bureau pour la remise de ses contributions.
                </li>
              </ul>
            </Sub>
          </Section>

          {/* 6 — Agent terrain */}
          <Section id="terrain" title="6. Droits et obligations de l'Agent terrain">
            <Sub title="6.1 Droits">
              <ul className="space-y-1 list-disc pl-4">
                <li>
                  Accéder en lecture seule aux données du PGES du projet auquel il est rattaché.
                </li>
                <li>
                  Saisir les données de suivi terrain (mesures, photos, observations) via le module
                  Suivi Terrain.
                </li>
                <li>Consulter les fiches de non-conformité qui lui sont assignées.</li>
              </ul>
            </Sub>
            <Sub title="6.2 Obligations">
              <ul className="space-y-1 list-disc pl-4">
                <li>
                  <strong>Fiabilité des mesures :</strong> L&apos;Agent certifie que les données
                  saisies correspondent à des observations réelles effectuées sur le terrain aux
                  dates et lieux indiqués.
                </li>
                <li>
                  <strong>Confidentialité :</strong> L&apos;Agent ne peut ni divulguer ni exporter
                  les données du projet en dehors du cadre de sa mission.
                </li>
                <li>
                  <strong>Signalement :</strong> L&apos;Agent doit signaler sans délai toute
                  non-conformité grave constatée sur le terrain à son responsable hiérarchique et
                  via la Plateforme.
                </li>
                <li>
                  <strong>Équipements :</strong> L&apos;Agent est responsable de la sécurité de ses
                  identifiants d&apos;accès et doit les protéger contre tout usage non autorisé.
                </li>
              </ul>
            </Sub>
          </Section>

          {/* 7 — Accès & Compte */}
          <Section id="acces" title="7. Accès au Service et gestion du compte">
            <p>
              L&apos;accès au Service est conditionné à la création d&apos;un compte avec une
              adresse email valide vérifiée. Chaque utilisateur est responsable de la
              confidentialité de son mot de passe (minimum 10 caractères).
            </p>
            <p>
              L&apos;utilisateur doit notifier immédiatement EnviroTrack de tout accès non autorisé
              à son compte via{' '}
              <a href="mailto:security@envirotrack.tg" className="text-[#123C24] underline">
                security@envirotrack.tg
              </a>
              .
            </p>
            <p>
              EnviroTrack se réserve le droit de suspendre un compte inactif depuis plus de 12 mois
              après notification préalable de 30 jours.
            </p>
          </Section>

          {/* 8 — Tarifs & Paiements */}
          <Section id="tarifs" title="8. Tarifs, crédits et paiements">
            <p>
              Les tarifs en vigueur sont affichés sur la page{' '}
              <Link href="/#tarifs" className="text-[#123C24] underline">
                Tarifs
              </Link>{' '}
              de la Plateforme. EnviroTrack se réserve le droit de modifier ses tarifs avec un
              préavis de 30 jours.
            </p>
            <p>
              Les Crédits sont acquis en FCFA via Tmoney (Togocom) ou Flooz (Moov Africa). Ils sont
              non-remboursables après activation d&apos;un Projet, sauf cas de dysfonctionnement
              imputable à EnviroTrack dûment constaté.
            </p>
            <p>
              Les codes promotionnels (coupons) ont une durée de validité limitée et ne peuvent être
              utilisés qu&apos;une seule fois par compte. Ils ne sont ni cessibles ni remboursables.
            </p>
            <p>
              En cas de litige de paiement, l&apos;utilisateur dispose d&apos;un délai de 30 jours à
              compter de la transaction pour contacter{' '}
              <a href="mailto:billing@envirotrack.tg" className="text-[#123C24] underline">
                billing@envirotrack.tg
              </a>
              .
            </p>
          </Section>

          {/* 9 — Données personnelles */}
          <Section id="donnees" title="9. Données personnelles et confidentialité">
            <p>
              EnviroTrack traite les données personnelles de ses utilisateurs conformément à la{' '}
              <strong>
                Loi n° 2019-014 relative à la protection des données à caractère personnel
              </strong>{' '}
              au Togo et aux principes du RGPD européen.
            </p>
            <Sub title="9.1 Données collectées">
              <p>
                Coordonnées (email, nom), données de connexion (IP, user-agent), données
                professionnelles saisies dans les projets, et données de paiement (via les
                opérateurs mobile money — EnviroTrack ne stocke pas les numéros de portefeuille).
              </p>
            </Sub>
            <Sub title="9.2 Finalités">
              <ul className="space-y-1 list-disc pl-4">
                <li>Fourniture et amélioration du Service.</li>
                <li>Facturation et prévention de la fraude.</li>
                <li>Communications techniques et de support.</li>
                <li>Obligations légales et réglementaires.</li>
              </ul>
            </Sub>
            <Sub title="9.3 Droits des utilisateurs">
              <p>
                Tout utilisateur peut exercer ses droits d&apos;accès, de rectification, de
                portabilité et d&apos;effacement en écrivant à{' '}
                <a href="mailto:privacy@envirotrack.tg" className="text-[#123C24] underline">
                  privacy@envirotrack.tg
                </a>
                . EnviroTrack s&apos;engage à répondre dans un délai de 30 jours.
              </p>
            </Sub>
            <Sub title="9.4 Conservation">
              <p>
                Les données de compte sont conservées pendant la durée de vie du compte, puis 3 ans
                après résiliation pour satisfaire aux obligations légales. Les données de projets
                EIES/PGES sont conservées 10 ans conformément aux exigences de l&apos;ANGE.
              </p>
            </Sub>
          </Section>

          {/* 10 — Responsabilité */}
          <Section id="responsabilite" title="10. Responsabilité et garanties">
            <p>
              EnviroTrack met tout en œuvre pour assurer le bon fonctionnement du Service mais ne
              peut être tenu responsable des dommages indirects (perte de données, manque à gagner,
              préjudice commercial) résultant d&apos;une indisponibilité du Service.
            </p>
            <p>
              La responsabilité d&apos;EnviroTrack est plafonnée au montant des Crédits acquis par
              l&apos;utilisateur au cours des 12 mois précédant le dommage.
            </p>
            <p>
              Les utilisateurs sont seuls responsables de la qualité scientifique, technique et
              réglementaire des études produites via la Plateforme. EnviroTrack ne saurait être
              impliqué dans tout litige entre un Bureau/Expert et l&apos;ANGE ou un maître
              d&apos;ouvrage.
            </p>
          </Section>

          {/* 11 — Propriété intellectuelle */}
          <Section id="pi" title="11. Propriété intellectuelle">
            <p>
              La Plateforme EnviroTrack, son code source, son interface et ses contenus pédagogiques
              sont la propriété exclusive d&apos;EnviroTrack SARL et protégés par le droit togolais
              de la propriété intellectuelle.
            </p>
            <p>
              Les données et rapports produits par les utilisateurs via la Plateforme restent la
              propriété intellectuelle des utilisateurs (Bureau, Expert). EnviroTrack bénéficie
              d&apos;une licence non exclusive et anonymisée d&apos;utilisation de ces données à des
              fins d&apos;amélioration du Service.
            </p>
            <p>
              Il est interdit de reproduire, copier ou exploiter commercialement tout ou partie de
              la Plateforme sans autorisation écrite préalable d&apos;EnviroTrack.
            </p>
          </Section>

          {/* 12 — Résiliation */}
          <Section id="resiliation" title="12. Résiliation">
            <p>
              L&apos;utilisateur peut résilier son compte à tout moment depuis les paramètres ou en
              contactant{' '}
              <a href="mailto:support@envirotrack.tg" className="text-[#123C24] underline">
                support@envirotrack.tg
              </a>
              . Les Crédits non consommés sont perdus sans remboursement, sauf disposition contraire
              indiquée lors de l&apos;achat.
            </p>
            <p>
              EnviroTrack peut résilier un compte pour violation des présentes CGU, avec effet
              immédiat et sans préavis en cas de faute grave (fraude, accès non autorisé, violation
              de la réglementation EIES).
            </p>
            <p>
              Après résiliation, l&apos;utilisateur peut demander l&apos;export de ses données de
              projet dans les 30 jours suivant la date effective de résiliation.
            </p>
          </Section>

          {/* 13 — Droit applicable */}
          <Section id="droit" title="13. Droit applicable et règlement des litiges">
            <p>
              Les présentes CGU sont régies par le droit togolais. Tout litige relatif à leur
              interprétation ou exécution sera soumis à la compétence exclusive des tribunaux de
              Lomé (Togo), après tentative de résolution amiable dans un délai de 30 jours.
            </p>
            <p>
              Pour toute question relative aux présentes CGU :{' '}
              <a href="mailto:legal@envirotrack.tg" className="text-[#123C24] underline">
                legal@envirotrack.tg
              </a>
            </p>
          </Section>

          {/* Bottom CTA */}
          <div className="rounded-2xl bg-green-50 border border-green-100 p-6 text-center">
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Vous avez des questions sur ces CGU ?
            </p>
            <p className="text-xs text-gray-500 mb-4">Notre équipe répond sous 48h ouvrées.</p>
            <a
              href="mailto:legal@envirotrack.tg"
              className="inline-flex items-center gap-2 bg-[#123C24] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0f2d1c] transition-colors"
            >
              Nous contacter
            </a>
          </div>
        </article>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© 2026 EnviroTrack · Lomé, Togo</span>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-gray-600">
              Accueil
            </Link>
            <Link href="/auth/login" className="hover:text-gray-600">
              Connexion
            </Link>
            <Link href="/auth/signup" className="hover:text-gray-600">
              Inscription
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
