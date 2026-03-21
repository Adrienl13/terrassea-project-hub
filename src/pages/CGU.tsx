import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const CGU = () => {
  const { t } = useTranslation();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-16 max-w-4xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            {t("legal.cgu")}
          </h1>
          <p className="text-muted-foreground mb-12">
            Dernière mise à jour : 21 mars 2026
          </p>

          <div className="prose prose-neutral max-w-none space-y-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:text-sm [&_ul]:text-muted-foreground [&_ol]:text-sm [&_ol]:text-muted-foreground [&_li]:leading-relaxed">

            {/* ── Préambule ───────────────────────────────────────────────── */}
            <section>
              <h2>Préambule</h2>
              <p>
                Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent
                l'accès et l'utilisation de la plateforme <strong>Terrassea</strong> (ci-après « la
                Plateforme »), éditée par <strong>Pros Import EURL</strong>, SIREN 988 269 981,
                dont le siège social est situé au 60 Rue François 1er, 75008 Paris, France.
              </p>
              <p>
                Terrassea est une plateforme d'intermédiation B2B spécialisée dans le sourcing de
                mobilier outdoor pour les professionnels de l'hôtellerie et de la restauration.
                Terrassea agit en qualité de mandataire au sens des articles 1984 et suivants du
                Code civil et ne vend pas directement les produits présentés sur la Plateforme.
              </p>
              <p>
                L'accès et l'utilisation de la Plateforme impliquent l'acceptation pleine et
                entière des présentes CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas
                utiliser la Plateforme.
              </p>
            </section>

            {/* ── Article 1 : Acceptation des conditions ─────────────────── */}
            <section>
              <h2>Article 1 — Acceptation des conditions</h2>
              <p>
                En créant un compte sur la Plateforme, l'Utilisateur reconnaît avoir lu, compris et
                accepté sans réserve les présentes CGU, les{" "}
                <Link to="/cgv" className="text-primary underline">
                  Conditions Générales de Vente (CGV)
                </Link>{" "}
                et la{" "}
                <Link to="/confidentialite" className="text-primary underline">
                  Politique de confidentialité
                </Link>
                .
              </p>
              <p>
                L'acceptation des CGU est matérialisée par une case à cocher lors de l'inscription.
                Aucun compte ne peut être créé sans cette acceptation préalable.
              </p>
            </section>

            {/* ── Article 2 : Règles relatives aux comptes ───────────────── */}
            <section>
              <h2>Article 2 — Comptes utilisateurs</h2>
              <h3>2.1 Exactitude des informations</h3>
              <p>
                L'Utilisateur s'engage à fournir des informations exactes, complètes et à jour lors
                de son inscription et tout au long de l'utilisation de la Plateforme. Toute
                information erronée ou frauduleuse pourra entraîner la suspension ou la suppression
                immédiate du compte.
              </p>
              <h3>2.2 Un compte par entité</h3>
              <p>
                Un seul compte est autorisé par entité juridique, identifiée par son numéro SIREN
                (ou identifiant équivalent pour les entreprises établies hors de France). La
                création de comptes multiples pour une même entité est interdite.
              </p>
              <h3>2.3 Numéro SIREN obligatoire</h3>
              <p>
                L'accès aux fonctionnalités de demande de devis et de commande est réservé aux
                professionnels. La fourniture d'un numéro SIREN valide (ou équivalent) est
                obligatoire pour accéder à l'ensemble des fonctionnalités de la Plateforme.
                Terrassea se réserve le droit de vérifier la validité du numéro SIREN communiqué.
              </p>
              <h3>2.4 Sécurité du compte</h3>
              <p>
                L'Utilisateur est responsable de la conservation confidentielle de ses identifiants
                de connexion. Toute utilisation de la Plateforme effectuée depuis le compte de
                l'Utilisateur est présumée effectuée par celui-ci. En cas de suspicion d'utilisation
                non autorisée, l'Utilisateur doit en informer immédiatement Terrassea à l'adresse{" "}
                <a href="mailto:contact@terrassea.com" className="text-primary underline">
                  contact@terrassea.com
                </a>
                .
              </p>
            </section>

            {/* ── Article 3 : Utilisations interdites ────────────────────── */}
            <section>
              <h2>Article 3 — Utilisations interdites</h2>
              <p>L'Utilisateur s'interdit de :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  utiliser la Plateforme à des fins frauduleuses, illicites ou contraires aux
                  présentes CGU ;
                </li>
                <li>
                  usurper l'identité d'un tiers ou fournir de fausses informations lors de
                  l'inscription ou de l'utilisation de la Plateforme ;
                </li>
                <li>
                  collecter, extraire ou aspirer (scraping) de manière automatisée des données
                  présentes sur la Plateforme, y compris les informations sur les produits, les prix
                  et les Fournisseurs ;
                </li>
                <li>
                  tenter de contourner les mesures de sécurité de la Plateforme ou d'accéder à des
                  données ou des fonctionnalités auxquelles il n'est pas autorisé ;
                </li>
                <li>
                  diffuser des contenus illicites, diffamatoires, injurieux, discriminatoires ou
                  contraires à l'ordre public et aux bonnes mœurs ;
                </li>
                <li>
                  utiliser la Plateforme pour contacter directement les Fournisseurs en dehors du
                  cadre prévu par la Plateforme, dans le but de contourner le système
                  d'intermédiation de Terrassea ;
                </li>
                <li>
                  introduire des virus, logiciels malveillants ou tout autre code nuisible sur la
                  Plateforme ;
                </li>
                <li>
                  perturber le fonctionnement normal de la Plateforme par des requêtes excessives
                  ou tout autre moyen technique.
                </li>
              </ul>
            </section>

            {/* ── Article 4 : Propriété intellectuelle ───────────────────── */}
            <section>
              <h2>Article 4 — Propriété intellectuelle</h2>
              <h3>4.1 Propriété de Terrassea</h3>
              <p>
                La marque <strong>Terrassea</strong>, le logo, l'identité visuelle, l'architecture
                de la Plateforme, les textes rédactionnels, les algorithmes de recommandation et
                tout autre élément créé par Terrassea sont la propriété exclusive de Pros Import
                EURL et sont protégés par le droit de la propriété intellectuelle.
              </p>
              <h3>4.2 Contenu des Fournisseurs</h3>
              <p>
                Les photographies de produits, fiches techniques, descriptions et tout autre contenu
                relatif aux produits présentés sur la Plateforme sont la propriété des Fournisseurs
                respectifs. Leur affichage sur la Plateforme est autorisé dans le cadre du mandat
                d'intermédiation.
              </p>
              <h3>4.3 Interdictions</h3>
              <p>
                Toute reproduction, représentation, modification, publication, transmission ou
                exploitation, totale ou partielle, des éléments de la Plateforme, par quelque moyen
                que ce soit, sans l'autorisation écrite préalable de Pros Import EURL ou du
                titulaire des droits concerné, est strictement interdite et constitue un délit de
                contrefaçon.
              </p>
            </section>

            {/* ── Article 5 : Suspension et résiliation ──────────────────── */}
            <section>
              <h2>Article 5 — Suspension et résiliation de compte</h2>
              <h3>5.1 Suspension par Terrassea</h3>
              <p>
                Terrassea se réserve le droit de suspendre temporairement ou définitivement, sans
                préavis ni indemnité, le compte de tout Utilisateur en cas de :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>violation des présentes CGU ou des CGV ;</li>
                <li>fourniture d'informations fausses ou trompeuses ;</li>
                <li>comportement frauduleux ou abusif ;</li>
                <li>non-paiement répété des commandes ;</li>
                <li>atteinte à la sécurité ou au bon fonctionnement de la Plateforme ;</li>
                <li>demande d'une autorité judiciaire ou administrative.</li>
              </ul>
              <h3>5.2 Résiliation par l'Utilisateur</h3>
              <p>
                L'Utilisateur peut à tout moment demander la clôture de son compte en envoyant un
                email à{" "}
                <a href="mailto:contact@terrassea.com" className="text-primary underline">
                  contact@terrassea.com
                </a>
                . La clôture prend effet dans un délai de 48 heures, sous réserve de la finalisation
                des commandes en cours. La clôture du compte ne libère pas l'Utilisateur de ses
                obligations relatives aux commandes passées avant la date de clôture.
              </p>
            </section>

            {/* ── Article 6 : Disponibilité de la Plateforme ─────────────── */}
            <section>
              <h2>Article 6 — Disponibilité de la Plateforme</h2>
              <p>
                Terrassea s'efforce d'assurer la disponibilité de la Plateforme 24 heures sur 24,
                7 jours sur 7. Toutefois, Terrassea ne garantit pas une disponibilité ininterrompue
                et ne saurait être tenue responsable en cas d'interruption, qu'elle soit liée à :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>des opérations de maintenance programmées ou d'urgence ;</li>
                <li>des défaillances techniques des prestataires d'hébergement ;</li>
                <li>des incidents de réseau ou des cyberattaques ;</li>
                <li>des cas de force majeure.</li>
              </ul>
              <p>
                Terrassea mettra en œuvre ses meilleurs efforts pour limiter la durée et la
                fréquence des interruptions et pour informer les Utilisateurs en cas d'indisponibilité
                prolongée.
              </p>
            </section>

            {/* ── Article 7 : Contenu utilisateur ────────────────────────── */}
            <section>
              <h2>Article 7 — Contenu généré par les Utilisateurs</h2>
              <h3>7.1 Licence d'utilisation</h3>
              <p>
                En publiant du contenu sur la Plateforme (avis, messages, commentaires,
                photographies de projets, etc.), l'Utilisateur accorde à Pros Import EURL une
                licence non exclusive, gratuite, mondiale et pour la durée des droits de propriété
                intellectuelle, pour utiliser, reproduire, afficher et distribuer ce contenu sur la
                Plateforme et dans les supports de communication de Terrassea.
              </p>
              <h3>7.2 Responsabilité</h3>
              <p>
                L'Utilisateur est seul responsable du contenu qu'il publie sur la Plateforme. Il
                garantit que ce contenu ne porte pas atteinte aux droits de tiers et ne contrevient
                à aucune disposition légale ou réglementaire. Terrassea se réserve le droit de
                supprimer tout contenu contraire aux présentes CGU, sans préavis ni indemnité.
              </p>
            </section>

            {/* ── Article 8 : Indemnisation ──────────────────────────────── */}
            <section>
              <h2>Article 8 — Indemnisation</h2>
              <p>
                L'Utilisateur s'engage à indemniser et à garantir Pros Import EURL, ses dirigeants,
                employés et partenaires, contre toute réclamation, dommage, perte, coût ou dépense
                (y compris les honoraires d'avocat) résultant de :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>la violation des présentes CGU par l'Utilisateur ;</li>
                <li>l'utilisation de la Plateforme par l'Utilisateur ;</li>
                <li>la violation des droits d'un tiers par l'Utilisateur ;</li>
                <li>le contenu publié par l'Utilisateur sur la Plateforme.</li>
              </ul>
            </section>

            {/* ── Article 9 : Droit applicable ───────────────────────────── */}
            <section>
              <h2>Article 9 — Droit applicable et juridiction compétente</h2>
              <p>
                Les présentes CGU sont soumises au droit français. En cas de litige relatif à
                l'interprétation, la validité ou l'exécution des présentes CGU, et après tentative
                de résolution amiable, les tribunaux de Paris seront seuls compétents.
              </p>
            </section>

            {/* ── Article 10 : Modification des CGU ──────────────────────── */}
            <section>
              <h2>Article 10 — Modification des CGU</h2>
              <p>
                Terrassea se réserve le droit de modifier les présentes CGU à tout moment. Les
                modifications seront portées à la connaissance des Utilisateurs par tout moyen
                approprié (notification sur la Plateforme, email). La poursuite de l'utilisation de
                la Plateforme après notification des modifications vaut acceptation des nouvelles
                CGU.
              </p>
            </section>

            {/* ── Article 11 : Dispositions diverses ─────────────────────── */}
            <section>
              <h2>Article 11 — Dispositions diverses</h2>
              <h3>11.1 Intégralité</h3>
              <p>
                Les présentes CGU constituent l'intégralité de l'accord entre l'Utilisateur et
                Terrassea concernant l'utilisation de la Plateforme et remplacent tout accord
                antérieur sur le même objet.
              </p>
              <h3>11.2 Nullité partielle</h3>
              <p>
                Si une disposition des présentes CGU est déclarée nulle ou inapplicable par une
                juridiction compétente, les autres dispositions resteront pleinement en vigueur.
              </p>
              <h3>11.3 Renonciation</h3>
              <p>
                Le fait pour Terrassea de ne pas exercer un droit prévu par les présentes CGU ne
                constitue pas une renonciation à ce droit.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CGU;
