import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-16 max-w-4xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            {t("legal.privacy")}
          </h1>
          <p className="text-muted-foreground mb-12">
            Dernière mise à jour : 21 mars 2026
          </p>

          <div className="prose prose-neutral max-w-none space-y-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:text-sm [&_ul]:text-muted-foreground [&_ol]:text-sm [&_ol]:text-muted-foreground [&_li]:leading-relaxed [&_table]:text-sm [&_table]:text-muted-foreground [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top">

            {/* ── 1. Responsable du traitement ────────────────────────────── */}
            <section>
              <h2>1. Responsable du traitement</h2>
              <p>
                Le responsable du traitement des données personnelles collectées via la plateforme
                <strong> Terrassea</strong> (ci-après « la Plateforme ») est :
              </p>
              <ul className="list-none space-y-1 pl-0">
                <li><strong>Pros Import EURL</strong></li>
                <li>SIREN : 988 269 981 — RCS Paris</li>
                <li>60 Rue François 1er, 75008 Paris, France</li>
                <li>Email : <a href="mailto:contact@terrassea.com" className="text-primary underline">contact@terrassea.com</a></li>
                <li>Représentant légal : Adrien Laniez, Gérant</li>
              </ul>
            </section>

            {/* ── 2. Données collectées ───────────────────────────────────── */}
            <section>
              <h2>2. Données personnelles collectées</h2>
              <p>
                Dans le cadre de l'utilisation de la Plateforme, nous collectons les catégories de
                données suivantes :
              </p>

              <h3>2.1 Données d'identification</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Nom et prénom du représentant de l'entreprise</li>
                <li>Adresse email professionnelle</li>
                <li>Numéro de téléphone professionnel</li>
                <li>Fonction au sein de l'entreprise</li>
              </ul>

              <h3>2.2 Données d'entreprise</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Raison sociale</li>
                <li>Numéro SIREN / SIRET</li>
                <li>Adresse du siège social</li>
                <li>Adresse(s) de livraison</li>
                <li>Secteur d'activité (hôtellerie, restauration, etc.)</li>
              </ul>

              <h3>2.3 Données d'utilisation</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Adresse IP</li>
                <li>Type de navigateur et système d'exploitation</li>
                <li>Pages consultées et durée de consultation</li>
                <li>Produits consultés, recherchés ou ajoutés aux favoris</li>
                <li>Historique des demandes de devis et des commandes</li>
                <li>Messages échangés via la Plateforme</li>
                <li>Préférences linguistiques</li>
              </ul>
            </section>

            {/* ── 3. Finalités du traitement ──────────────────────────────── */}
            <section>
              <h2>3. Finalités du traitement</h2>
              <p>Vos données personnelles sont traitées pour les finalités suivantes :</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th>Finalité</th>
                    <th>Base légale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/30">
                    <td>Création et gestion de votre compte utilisateur</td>
                    <td>Exécution du contrat (CGU)</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Traitement des demandes de devis et suivi des commandes</td>
                    <td>Exécution du contrat (CGV)</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Mise en relation avec les Fournisseurs partenaires</td>
                    <td>Exécution du contrat</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Communication relative à vos commandes (emails transactionnels)</td>
                    <td>Exécution du contrat</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Amélioration de la Plateforme et des services</td>
                    <td>Intérêt légitime</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Recommandations personnalisées de produits</td>
                    <td>Intérêt légitime</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Statistiques et analyses d'audience</td>
                    <td>Consentement (cookies analytiques)</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Envoi de communications commerciales (newsletter, promotions)</td>
                    <td>Consentement</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Gestion des litiges et pré-contentieux</td>
                    <td>Intérêt légitime / Obligation légale</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Respect des obligations légales et fiscales</td>
                    <td>Obligation légale</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* ── 4. Durée de conservation ────────────────────────────────── */}
            <section>
              <h2>4. Durée de conservation</h2>
              <p>
                Vos données personnelles sont conservées pendant les durées suivantes :
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th>Type de données</th>
                    <th>Durée de conservation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/30">
                    <td>Données de compte utilisateur</td>
                    <td>Durée de la relation contractuelle + 3 ans après la dernière activité</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Données de commande et facturation</td>
                    <td>10 ans à compter de la commande (obligation légale comptable et fiscale)</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Messages et échanges</td>
                    <td>Durée de la relation contractuelle + 3 ans</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Données de connexion (logs)</td>
                    <td>1 an (obligation légale — LCEN)</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Cookies analytiques</td>
                    <td>13 mois maximum</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Données de prospection commerciale</td>
                    <td>3 ans à compter du dernier contact</td>
                  </tr>
                </tbody>
              </table>
              <p>
                Au-delà de ces durées, les données sont supprimées ou anonymisées de manière
                irréversible.
              </p>
            </section>

            {/* ── 5. Destinataires des données ────────────────────────────── */}
            <section>
              <h2>5. Destinataires des données</h2>
              <p>Vos données personnelles peuvent être communiquées aux destinataires suivants :</p>

              <h3>5.1 Au sein de Terrassea</h3>
              <p>
                Les données sont accessibles au personnel habilité de Pros Import EURL, dans la
                stricte limite de leurs attributions.
              </p>

              <h3>5.2 Fournisseurs partenaires</h3>
              <p>
                Dans le cadre du mandat d'intermédiation, certaines données (nom, entreprise,
                coordonnées professionnelles, détails du projet) sont transmises aux Fournisseurs
                concernés par vos demandes de devis ou commandes.
              </p>

              <h3>5.3 Sous-traitants techniques</h3>
              <p>
                Nous faisons appel aux sous-traitants suivants pour le fonctionnement de la
                Plateforme :
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th>Prestataire</th>
                    <th>Service</th>
                    <th>Localisation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/30">
                    <td>Supabase Inc.</td>
                    <td>Base de données et authentification</td>
                    <td>États-Unis</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Vercel Inc.</td>
                    <td>Hébergement et CDN</td>
                    <td>États-Unis</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td>Anthropic</td>
                    <td>Fonctionnalités d'intelligence artificielle</td>
                    <td>États-Unis</td>
                  </tr>
                </tbody>
              </table>
              <p>
                Ces sous-traitants agissent sur nos instructions et sont liés par des clauses
                contractuelles garantissant la protection de vos données.
              </p>
            </section>

            {/* ── 6. Transferts internationaux ────────────────────────────── */}
            <section>
              <h2>6. Transferts internationaux de données</h2>
              <p>
                Certaines de vos données sont transférées vers les États-Unis dans le cadre de
                l'utilisation de nos sous-traitants (Supabase, Vercel, Anthropic). Ces transferts
                sont encadrés par :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  le EU-US Data Privacy Framework (DPF) pour les prestataires certifiés ;
                </li>
                <li>
                  des clauses contractuelles types (CCT) adoptées par la Commission européenne,
                  conformément à l'article 46 du RGPD ;
                </li>
                <li>
                  des mesures techniques complémentaires (chiffrement des données en transit et au
                  repos).
                </li>
              </ul>
            </section>

            {/* ── 7. Vos droits ───────────────────────────────────────────── */}
            <section>
              <h2>7. Vos droits</h2>
              <p>
                Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits
                suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Droit d'accès :</strong> obtenir la confirmation que des données vous
                  concernant sont traitées et en obtenir une copie.
                </li>
                <li>
                  <strong>Droit de rectification :</strong> demander la correction de données
                  inexactes ou incomplètes.
                </li>
                <li>
                  <strong>Droit à l'effacement :</strong> demander la suppression de vos données,
                  sous réserve des obligations légales de conservation.
                </li>
                <li>
                  <strong>Droit à la portabilité :</strong> recevoir vos données dans un format
                  structuré, couramment utilisé et lisible par machine.
                </li>
                <li>
                  <strong>Droit d'opposition :</strong> vous opposer au traitement de vos données
                  fondé sur l'intérêt légitime.
                </li>
                <li>
                  <strong>Droit à la limitation du traitement :</strong> demander la suspension du
                  traitement dans certains cas prévus par le RGPD.
                </li>
                <li>
                  <strong>Droit de retirer votre consentement :</strong> à tout moment, pour les
                  traitements fondés sur le consentement, sans remettre en cause la licéité du
                  traitement antérieur.
                </li>
                <li>
                  <strong>Droit d'introduire une réclamation :</strong> auprès de la CNIL
                  (Commission Nationale de l'Informatique et des Libertés) —{" "}
                  <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    www.cnil.fr
                  </a>
                </li>
              </ul>
              <p>
                Pour exercer vos droits, contactez-nous à :{" "}
                <a href="mailto:contact@terrassea.com" className="text-primary underline">
                  contact@terrassea.com
                </a>
              </p>
              <p>
                Nous nous engageons à répondre à votre demande dans un délai maximum d'un (1) mois.
                Ce délai peut être prolongé de deux (2) mois en cas de demande complexe, auquel cas
                nous vous en informerons.
              </p>
            </section>

            {/* ── 8. Référent données personnelles ────────────────────────── */}
            <section>
              <h2>8. Référent données personnelles</h2>
              <p>
                Compte tenu de la taille de l'entreprise, Pros Import EURL n'est pas tenue de
                désigner un Délégué à la Protection des Données (DPO) au sens de l'article 37 du
                RGPD. Le référent pour les questions relatives à la protection des données
                personnelles est :
              </p>
              <ul className="list-none space-y-1 pl-0">
                <li><strong>Adrien Laniez</strong></li>
                <li>Email : <a href="mailto:contact@terrassea.com" className="text-primary underline">contact@terrassea.com</a></li>
                <li>Adresse : 60 Rue François 1er, 75008 Paris, France</li>
              </ul>
            </section>

            {/* ── 9. Politique de cookies ─────────────────────────────────── */}
            <section>
              <h2>9. Politique de cookies</h2>
              <h3>9.1 Qu'est-ce qu'un cookie ?</h3>
              <p>
                Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette,
                smartphone) lors de la consultation d'un site web. Il permet au site de mémoriser
                des informations relatives à votre visite.
              </p>

              <h3>9.2 Cookies utilisés</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th>Catégorie</th>
                    <th>Finalité</th>
                    <th>Durée</th>
                    <th>Consentement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/30">
                    <td><strong>Cookies strictement nécessaires</strong></td>
                    <td>Fonctionnement de la Plateforme : authentification, session, préférences de langue, panier</td>
                    <td>Session ou 1 an</td>
                    <td>Non requis</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td><strong>Cookies analytiques</strong></td>
                    <td>Mesure d'audience, analyse du parcours utilisateur, amélioration de la Plateforme</td>
                    <td>13 mois max.</td>
                    <td>Requis</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td><strong>Cookies fonctionnels</strong></td>
                    <td>Mémorisation de vos préférences (langue, affichage, dernières recherches)</td>
                    <td>1 an</td>
                    <td>Non requis</td>
                  </tr>
                </tbody>
              </table>

              <h3>9.3 Gestion de vos préférences</h3>
              <p>
                Lors de votre première visite, un bandeau vous permet d'accepter ou de paramétrer
                les cookies. Vous pouvez à tout moment modifier vos préférences :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>via le lien « Paramètres cookies » disponible en pied de page ;</li>
                <li>via les paramètres de votre navigateur ;</li>
                <li>en nous contactant à <a href="mailto:contact@terrassea.com" className="text-primary underline">contact@terrassea.com</a>.</li>
              </ul>
              <p>
                Le refus des cookies analytiques n'empêche pas l'utilisation de la Plateforme. Seuls
                les cookies strictement nécessaires au fonctionnement seront déposés.
              </p>
            </section>

            {/* ── 10. Sécurité ────────────────────────────────────────────── */}
            <section>
              <h2>10. Sécurité des données</h2>
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
                protéger vos données personnelles contre tout accès non autorisé, altération,
                divulgation ou destruction, notamment :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>chiffrement des données en transit (HTTPS / TLS) et au repos ;</li>
                <li>authentification sécurisée et gestion des accès par rôle ;</li>
                <li>sauvegardes régulières et redondantes ;</li>
                <li>surveillance et journalisation des accès ;</li>
                <li>sensibilisation du personnel aux bonnes pratiques de sécurité.</li>
              </ul>
            </section>

            {/* ── 11. Modifications ───────────────────────────────────────── */}
            <section>
              <h2>11. Modifications de la politique</h2>
              <p>
                Nous nous réservons le droit de modifier la présente Politique de confidentialité à
                tout moment. En cas de modification substantielle, nous vous en informerons par
                email ou par notification sur la Plateforme. La date de dernière mise à jour est
                indiquée en haut de cette page.
              </p>
              <p>
                Nous vous invitons à consulter régulièrement cette page pour prendre connaissance
                des éventuelles modifications.
              </p>
            </section>

            {/* ── 12. Contact ─────────────────────────────────────────────── */}
            <section>
              <h2>12. Contact</h2>
              <p>
                Pour toute question relative à la présente Politique de confidentialité ou pour
                exercer vos droits, vous pouvez nous contacter :
              </p>
              <ul className="list-none space-y-1 pl-0">
                <li><strong>Par email :</strong> <a href="mailto:contact@terrassea.com" className="text-primary underline">contact@terrassea.com</a></li>
                <li><strong>Par courrier :</strong> Pros Import EURL — 60 Rue François 1er, 75008 Paris, France</li>
              </ul>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Privacy;
