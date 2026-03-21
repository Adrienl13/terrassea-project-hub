import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const CGV = () => {
  const { t } = useTranslation();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-16 max-w-4xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            {t("legal.cgv")}
          </h1>
          <p className="text-muted-foreground mb-12">
            Dernière mise à jour : 21 mars 2026
          </p>

          <div className="prose prose-neutral max-w-none space-y-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:text-sm [&_ul]:text-muted-foreground [&_ol]:text-sm [&_ol]:text-muted-foreground [&_li]:leading-relaxed">

            {/* ── Préambule ───────────────────────────────────────────────── */}
            <section>
              <h2>Préambule</h2>
              <p>
                Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les
                relations entre la société <strong>Pros Import EURL</strong>, exploitant la
                plateforme <strong>Terrassea</strong> (ci-après « Terrassea » ou « la Plateforme »),
                et tout professionnel utilisant la Plateforme pour sourcer du mobilier outdoor
                (ci-après « le Client » ou « l'Acheteur »).
              </p>
              <p>
                <strong>
                  Terrassea agit exclusivement en qualité de mandataire (intermédiaire) au sens
                  des articles 1984 et suivants du Code civil. Terrassea n'est pas vendeur des
                  produits présentés sur la Plateforme.
                </strong>{" "}
                Le contrat de vente est conclu directement entre le Client et le Fournisseur
                partenaire. Les présentes CGV définissent les conditions dans lesquelles Terrassea
                exerce sa mission d'intermédiation.
              </p>
              <p>
                Toute utilisation de la Plateforme implique l'acceptation pleine et entière des
                présentes CGV, ainsi que des{" "}
                <Link to="/cgu" className="text-primary underline">
                  Conditions Générales d'Utilisation (CGU)
                </Link>{" "}
                et de la{" "}
                <Link to="/confidentialite" className="text-primary underline">
                  Politique de confidentialité
                </Link>
                .
              </p>
            </section>

            {/* ── Article 1 : Objet ──────────────────────────────────────── */}
            <section>
              <h2>Article 1 — Objet</h2>
              <p>
                Les présentes CGV ont pour objet de définir les conditions dans lesquelles Terrassea
                fournit ses services d'intermédiation aux Clients professionnels.
              </p>
              <p>
                Terrassea est une plateforme numérique B2B d'intermédiation spécialisée dans le
                sourcing de mobilier outdoor destiné aux professionnels de l'hôtellerie, de la
                restauration et des loisirs (hôtels, restaurants, beach clubs, bars, espaces
                événementiels, etc.). La Plateforme met en relation des Acheteurs professionnels
                avec des Fournisseurs partenaires et facilite :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>la recherche et la comparaison de produits ;</li>
                <li>la génération et la gestion de demandes de devis ;</li>
                <li>le suivi des commandes et des livraisons ;</li>
                <li>la communication entre Acheteurs et Fournisseurs.</li>
              </ul>
            </section>

            {/* ── Article 2 : Rôle de Terrassea ──────────────────────────── */}
            <section>
              <h2>Article 2 — Rôle de Terrassea en qualité de mandataire</h2>
              <p>
                <strong>
                  Terrassea intervient en qualité de mandataire et d'intermédiaire technique.
                  Terrassea ne vend pas, ne fabrique pas et ne stocke pas les produits présentés sur
                  la Plateforme.
                </strong>
              </p>
              <p>À ce titre, Terrassea :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  met à disposition des outils technologiques permettant aux Clients de rechercher,
                  comparer et commander du mobilier auprès des Fournisseurs partenaires ;
                </li>
                <li>
                  transmet les demandes de devis et les commandes aux Fournisseurs concernés ;
                </li>
                <li>
                  facilite la communication et le suivi entre les parties ;
                </li>
                <li>
                  peut assister les parties en cas de litige, dans un rôle de médiation, sans
                  engagement de résultat.
                </li>
              </ul>
              <p>
                <strong>
                  Le contrat de vente est conclu directement entre le Client et le Fournisseur.
                </strong>{" "}
                Terrassea n'est partie au contrat de vente qu'en sa qualité de mandataire facilitant
                la mise en relation. Les obligations relatives à la vente (conformité, garantie,
                livraison, service après-vente) incombent exclusivement au Fournisseur.
              </p>
            </section>

            {/* ── Article 3 : Inscription et accès ───────────────────────── */}
            <section>
              <h2>Article 3 — Inscription et accès</h2>
              <h3>3.1 Réservation aux professionnels</h3>
              <p>
                L'accès aux fonctionnalités de commande de la Plateforme est strictement réservé aux
                professionnels disposant d'un numéro SIREN valide (ou équivalent pour les
                professionnels établis hors de France). Toute inscription implique la fourniture
                d'informations exactes et à jour sur l'identité de l'entreprise.
              </p>
              <h3>3.2 Création de compte</h3>
              <p>
                L'inscription est gratuite. Le Client s'engage à fournir des informations véridiques
                et complètes lors de son inscription et à les maintenir à jour. Un seul compte est
                autorisé par entité juridique (identifiée par son numéro SIREN).
              </p>
              <h3>3.3 Responsabilité du compte</h3>
              <p>
                Le Client est seul responsable de la confidentialité de ses identifiants de connexion
                et de toute action réalisée depuis son compte. Il s'engage à informer immédiatement
                Terrassea de toute utilisation non autorisée de son compte.
              </p>
            </section>

            {/* ── Article 4 : Processus de commande ──────────────────────── */}
            <section>
              <h2>Article 4 — Processus de commande</h2>
              <p>Le processus de commande via la Plateforme se déroule comme suit :</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>
                  <strong>Demande de devis :</strong> Le Client sélectionne les produits souhaités
                  et soumet une demande de devis via la Plateforme. Cette demande est transmise au(x)
                  Fournisseur(s) concerné(s).
                </li>
                <li>
                  <strong>Réponse du Fournisseur :</strong> Le Fournisseur établit un devis
                  personnalisé comprenant les prix, les délais de livraison et les conditions
                  spécifiques. Ce devis est transmis au Client via la Plateforme.
                </li>
                <li>
                  <strong>Acceptation par le Client :</strong> Le Client examine le devis et
                  l'accepte ou le refuse via la Plateforme. L'acceptation du devis vaut conclusion
                  du contrat de vente entre le Client et le Fournisseur.
                </li>
                <li>
                  <strong>Paiement :</strong> Le Client procède au paiement selon les modalités
                  convenues (voir Article 5).
                </li>
                <li>
                  <strong>Livraison :</strong> Le Fournisseur organise la livraison conformément
                  aux conditions convenues dans le devis (voir Article 7).
                </li>
              </ol>
              <p>
                Terrassea facilite chaque étape du processus mais n'est pas partie au contrat de
                vente. L'engagement contractuel est formé entre le Client et le Fournisseur dès
                l'acceptation du devis par le Client.
              </p>
            </section>

            {/* ── Article 5 : Prix et paiement ───────────────────────────── */}
            <section>
              <h2>Article 5 — Prix et paiement</h2>
              <h3>5.1 Fixation des prix</h3>
              <p>
                Les prix des produits sont fixés librement par chaque Fournisseur. Terrassea affiche
                les prix communiqués par les Fournisseurs à titre indicatif. Les prix définitifs
                sont ceux figurant sur le devis accepté par le Client. Tous les prix sont exprimés
                en euros hors taxes (HT), sauf mention contraire explicite.
              </p>
              <h3>5.2 Modalités de paiement</h3>
              <p>
                Le paiement s'effectue par virement bancaire selon les modalités suivantes :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Acompte :</strong> Un acompte est requis à la confirmation de la commande.
                  Le pourcentage de l'acompte est défini par le Fournisseur et indiqué sur le devis
                  (généralement entre 30 % et 50 % du montant total HT).
                </li>
                <li>
                  <strong>Solde :</strong> Le solde est exigible selon les conditions précisées sur
                  le devis (avant expédition, à réception, ou selon un échéancier convenu).
                </li>
              </ul>
              <h3>5.3 Retard de paiement</h3>
              <p>
                En cas de retard de paiement, des pénalités de retard seront appliquées conformément
                à l'article L.441-10 du Code de commerce, au taux BCE majoré de 10 points, sans
                qu'un rappel soit nécessaire. Une indemnité forfaitaire de 40 euros pour frais de
                recouvrement sera également due.
              </p>
            </section>

            {/* ── Article 6 : Commission de Terrassea ────────────────────── */}
            <section>
              <h2>Article 6 — Commission de Terrassea</h2>
              <p>
                La rémunération de Terrassea au titre de ses services d'intermédiation consiste en
                une commission appliquée aux Fournisseurs partenaires. Cette commission :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  est calculée sur le montant hors taxes de chaque commande réalisée via la
                  Plateforme ;
                </li>
                <li>
                  varie en fonction du plan d'abonnement du Fournisseur et des conditions
                  commerciales négociées ;
                </li>
                <li>
                  peut être modifiée par Terrassea avec un préavis de 30 jours ;
                </li>
                <li>
                  est facturée directement au Fournisseur par Pros Import EURL.
                </li>
              </ul>
              <p>
                <strong>
                  Aucune commission n'est facturée au Client (Acheteur).
                </strong>{" "}
                Le Client ne supporte aucun frais lié à l'utilisation de la Plateforme pour ses
                demandes de devis et ses commandes.
              </p>
            </section>

            {/* ── Article 7 : Livraison ──────────────────────────────────── */}
            <section>
              <h2>Article 7 — Livraison</h2>
              <h3>7.1 Responsabilité de la livraison</h3>
              <p>
                <strong>
                  La livraison des produits est sous l'entière responsabilité du Fournisseur.
                </strong>{" "}
                Les délais, modalités et coûts de livraison sont définis par le Fournisseur dans le
                devis accepté par le Client.
              </p>
              <h3>7.2 Rôle de Terrassea</h3>
              <p>
                Terrassea facilite le suivi des livraisons en mettant à disposition des outils de
                tracking et de communication entre le Client et le Fournisseur. Toutefois, Terrassea
                n'est pas responsable :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>des retards de livraison ;</li>
                <li>des avaries ou détériorations survenues pendant le transport ;</li>
                <li>des erreurs de livraison (produits manquants, non conformes) ;</li>
                <li>de la perte des marchandises pendant le transport.</li>
              </ul>
              <h3>7.3 Réception et réserves</h3>
              <p>
                Le Client est tenu de vérifier l'état des produits à la réception et d'émettre
                toutes réserves nécessaires auprès du transporteur et du Fournisseur dans les
                délais légaux. Terrassea recommande de notifier également toute anomalie via la
                Plateforme afin de faciliter le suivi.
              </p>
            </section>

            {/* ── Article 8 : Retours et réclamations ────────────────────── */}
            <section>
              <h2>Article 8 — Retours et réclamations</h2>
              <h3>8.1 Politique de retour</h3>
              <p>
                Les conditions de retour sont définies par chaque Fournisseur dans ses propres
                conditions de vente. Le droit de rétractation prévu par le Code de la consommation
                ne s'applique pas aux transactions entre professionnels (B2B).
              </p>
              <h3>8.2 Réclamations</h3>
              <p>
                En cas de réclamation relative à un produit (défaut de conformité, vice caché,
                produit endommagé), le Client est invité à :
              </p>
              <ol className="list-decimal pl-6 space-y-1">
                <li>contacter le Fournisseur directement via la Plateforme ;</li>
                <li>signaler le problème à Terrassea via l'espace de suivi de commande.</li>
              </ol>
              <p>
                Terrassea s'engage à faciliter la communication entre les parties et à accompagner
                la résolution des litiges dans un rôle de médiateur. Toutefois, la responsabilité
                du traitement de la réclamation incombe au Fournisseur, qui reste seul responsable
                de la conformité et de la qualité des produits vendus.
              </p>
            </section>

            {/* ── Article 9 : Garanties ──────────────────────────────────── */}
            <section>
              <h2>Article 9 — Garanties</h2>
              <p>
                Les produits commercialisés via la Plateforme bénéficient des garanties légales
                (garantie de conformité, garantie contre les vices cachés) et, le cas échéant, des
                garanties commerciales offertes par le Fournisseur.
              </p>
              <p>
                <strong>
                  Terrassea ne fournit aucune garantie propre sur les produits.
                </strong>{" "}
                Toute demande au titre de la garantie doit être adressée directement au Fournisseur
                concerné. Terrassea peut assister le Client dans ses démarches à titre de bonne
                volonté, sans engagement de résultat.
              </p>
              <p>
                Terrassea garantit uniquement le bon fonctionnement de la Plateforme et de ses
                services d'intermédiation, dans les limites définies à l'Article 10.
              </p>
            </section>

            {/* ── Article 10 : Limitation de responsabilité ──────────────── */}
            <section>
              <h2>Article 10 — Limitation de responsabilité</h2>
              <h3>10.1 Principe</h3>
              <p>
                <strong>
                  La responsabilité de Terrassea est strictement limitée à son rôle de mandataire
                  et d'intermédiaire technique.
                </strong>
              </p>
              <h3>10.2 Exclusions de responsabilité</h3>
              <p>Terrassea ne peut être tenue responsable :</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  des défauts de qualité, de conformité ou de sécurité des produits vendus par les
                  Fournisseurs ;
                </li>
                <li>
                  des retards, avaries, pertes ou défauts de livraison ;
                </li>
                <li>
                  de l'inexécution totale ou partielle des obligations du Fournisseur envers le
                  Client ;
                </li>
                <li>
                  de l'insolvabilité ou de la cessation d'activité d'un Fournisseur partenaire ;
                </li>
                <li>
                  de tout dommage indirect, incluant notamment la perte de profit, la perte de
                  chiffre d'affaires, la perte de clientèle, la perte de données, le préjudice
                  d'image ou tout autre dommage consécutif ;
                </li>
                <li>
                  des informations fournies par les Fournisseurs (descriptions, photographies,
                  prix indicatifs) ;
                </li>
                <li>
                  des interruptions ou dysfonctionnements temporaires de la Plateforme.
                </li>
              </ul>
              <h3>10.3 Plafond de responsabilité</h3>
              <p>
                <strong>
                  En tout état de cause, la responsabilité totale de Terrassea (Pros Import EURL) au
                  titre d'une commande ne pourra excéder le montant de la commission effectivement
                  perçue par Terrassea sur la commande concernée.
                </strong>
              </p>
              <h3>10.4 Obligation de moyens</h3>
              <p>
                Terrassea s'engage à mettre en œuvre tous les moyens raisonnables pour assurer le
                bon fonctionnement de la Plateforme et la qualité de ses services d'intermédiation.
                Cette obligation est une obligation de moyens, et non de résultat.
              </p>
            </section>

            {/* ── Article 11 : Protection des données ────────────────────── */}
            <section>
              <h2>Article 11 — Protection des données personnelles</h2>
              <p>
                Les données personnelles collectées dans le cadre de l'utilisation de la Plateforme
                sont traitées conformément au Règlement Général sur la Protection des Données
                (RGPD) et à la loi Informatique et Libertés.
              </p>
              <p>
                Pour en savoir plus sur le traitement de vos données personnelles, vos droits et
                les modalités d'exercice de ceux-ci, veuillez consulter notre{" "}
                <Link to="/confidentialite" className="text-primary underline">
                  Politique de confidentialité
                </Link>
                .
              </p>
            </section>

            {/* ── Article 12 : Force majeure ─────────────────────────────── */}
            <section>
              <h2>Article 12 — Force majeure</h2>
              <p>
                Aucune des parties ne pourra être tenue responsable de l'inexécution ou du retard
                dans l'exécution de ses obligations en cas de force majeure au sens de l'article
                1218 du Code civil.
              </p>
              <p>
                Sont notamment considérés comme des cas de force majeure : les catastrophes
                naturelles, les guerres, les épidémies ou pandémies, les actes de terrorisme, les
                grèves générales, les pannes de réseau internet ou d'énergie, les cyberattaques,
                les décisions gouvernementales ou réglementaires empêchant l'exécution des
                obligations.
              </p>
              <p>
                En cas de force majeure d'une durée supérieure à trois (3) mois, chaque partie
                pourra résilier les engagements en cours sans indemnité.
              </p>
            </section>

            {/* ── Article 13 : Droit applicable ──────────────────────────── */}
            <section>
              <h2>Article 13 — Droit applicable et juridiction compétente</h2>
              <p>
                Les présentes CGV sont soumises au droit français.
              </p>
              <p>
                En cas de litige relatif à l'interprétation, la validité ou l'exécution des
                présentes CGV, les parties s'efforceront de trouver une solution amiable. À défaut
                de résolution amiable dans un délai de trente (30) jours à compter de la
                notification du litige par l'une des parties, le litige sera soumis à la compétence
                exclusive des tribunaux de commerce de Paris, y compris en cas d'appel en garantie
                et de pluralité de défendeurs.
              </p>
            </section>

            {/* ── Article 14 : Modification des CGV ──────────────────────── */}
            <section>
              <h2>Article 14 — Modification des CGV</h2>
              <p>
                Terrassea se réserve le droit de modifier les présentes CGV à tout moment. Les
                Clients seront informés de toute modification par email et/ou par notification sur
                la Plateforme, avec un préavis minimum de <strong>trente (30) jours</strong> avant
                l'entrée en vigueur des nouvelles conditions.
              </p>
              <p>
                La poursuite de l'utilisation de la Plateforme après l'entrée en vigueur des
                nouvelles CGV vaut acceptation de celles-ci. En cas de désaccord, le Client pourra
                clôturer son compte sans frais avant la date d'entrée en vigueur des nouvelles
                conditions.
              </p>
              <p>
                Les commandes en cours au moment de la modification restent soumises aux CGV en
                vigueur au moment de leur acceptation par le Client.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CGV;
