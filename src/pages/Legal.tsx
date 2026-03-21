import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Legal = () => {
  const { t } = useTranslation();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-16 max-w-4xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            {t("legal.mentions")}
          </h1>
          <p className="text-muted-foreground mb-12">
            Dernière mise à jour : 21 mars 2026
          </p>

          <div className="prose prose-neutral max-w-none space-y-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:text-sm [&_ul]:text-muted-foreground [&_li]:leading-relaxed">

            {/* ── 1. Éditeur du site ──────────────────────────────────────── */}
            <section>
              <h2>1. Éditeur du site</h2>
              <p>
                Le site <strong>terrassea.com</strong> (ci-après « le Site ») est édité par :
              </p>
              <ul className="list-none space-y-1 pl-0">
                <li><strong>Raison sociale :</strong> Pros Import EURL</li>
                <li><strong>Nom commercial :</strong> Terrassea</li>
                <li><strong>Forme juridique :</strong> Entreprise Unipersonnelle à Responsabilité Limitée (EURL)</li>
                <li><strong>SIREN :</strong> 988 269 981</li>
                <li><strong>RCS :</strong> Paris</li>
                <li><strong>Siège social :</strong> 60 Rue François 1er, 75008 Paris, France</li>
                <li><strong>Directeur de la publication :</strong> Adrien Laniez, en qualité de Gérant</li>
                <li><strong>Email :</strong> contact@terrassea.com</li>
              </ul>
            </section>

            {/* ── 2. Activité ─────────────────────────────────────────────── */}
            <section>
              <h2>2. Activité</h2>
              <p>
                Terrassea est une plateforme numérique d'intermédiation B2B spécialisée dans le
                sourcing de mobilier outdoor pour les professionnels de l'hôtellerie et de la
                restauration (hôtels, restaurants, beach clubs, bars, etc.).
              </p>
              <p>
                Terrassea agit en qualité de <strong>mandataire</strong> au sens des articles 1984 et
                suivants du Code civil. La société Pros Import EURL n'est pas vendeur des produits
                présentés sur le Site. Elle met en relation des acheteurs professionnels avec des
                fournisseurs partenaires et facilite les opérations de devis, de commande et de suivi
                logistique. Le contrat de vente est conclu directement entre l'acheteur et le
                fournisseur.
              </p>
              <p>
                Dans le cadre de son mandat, Pros Import EURL encaisse les paiements des clients
                pour le compte des fournisseurs, déduit sa commission au titre de l'intermédiation,
                et reverse le solde aux fournisseurs concernés. Ce mécanisme d'encaissement pour
                compte de tiers est opéré conformément au mandat confié par chaque fournisseur
                partenaire à Pros Import EURL.
              </p>
            </section>

            {/* ── 3. Hébergement ──────────────────────────────────────────── */}
            <section>
              <h2>3. Hébergement</h2>
              <p>Le Site est hébergé par :</p>
              <ul className="list-none space-y-1 pl-0">
                <li><strong>Vercel Inc.</strong></li>
                <li>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
                <li>Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">vercel.com</a></li>
              </ul>
              <p>
                Les données applicatives sont hébergées par Supabase Inc. (États-Unis), dans le
                respect des garanties appropriées en matière de transferts internationaux de données
                personnelles (voir notre{" "}
                <Link to="/confidentialite" className="text-primary underline">
                  Politique de confidentialité
                </Link>
                ).
              </p>
            </section>

            {/* ── 4. Propriété intellectuelle ─────────────────────────────── */}
            <section>
              <h2>4. Propriété intellectuelle</h2>
              <p>
                L'ensemble des éléments du Site (textes, graphismes, logos, icônes, images, clips
                audio et vidéo, logiciels, bases de données, mises en page, etc.) est protégé par les
                lois françaises et internationales relatives à la propriété intellectuelle.
              </p>
              <p>
                La marque <strong>Terrassea</strong>, le logo et l'identité visuelle associée sont la
                propriété exclusive de Pros Import EURL. Toute reproduction, représentation,
                modification, publication, transmission ou dénaturation, totale ou partielle, du Site
                ou de son contenu, par quelque procédé que ce soit et sur quelque support que ce soit,
                est interdite sans l'autorisation écrite préalable de Pros Import EURL.
              </p>
              <p>
                Les photographies de produits, fiches techniques et descriptions présentes sur le Site
                sont la propriété de leurs fournisseurs respectifs et sont utilisées dans le cadre du
                mandat d'intermédiation confié à Terrassea.
              </p>
            </section>

            {/* ── 5. Limitation de responsabilité ─────────────────────────── */}
            <section>
              <h2>5. Limitation de responsabilité</h2>
              <p>
                Les informations diffusées sur le Site sont présentées à titre indicatif et sont
                susceptibles d'évoluer. Pros Import EURL ne saurait garantir l'exactitude, la
                complétude ou l'actualité des informations diffusées sur le Site.
              </p>
              <p>
                En sa qualité de mandataire, Pros Import EURL ne saurait être tenue responsable :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>de la qualité, de la conformité ou de la sécurité des produits vendus par les fournisseurs partenaires ;</li>
                <li>des retards, avaries ou défauts de livraison imputables aux fournisseurs ou aux transporteurs ;</li>
                <li>de l'insolvabilité d'un fournisseur partenaire ;</li>
                <li>de tout dommage indirect, y compris la perte de profit, la perte de clientèle ou la perte de données ;</li>
                <li>de toute interruption ou indisponibilité temporaire du Site.</li>
              </ul>
              <p>
                En tout état de cause, la responsabilité de Pros Import EURL au titre du Site est
                limitée au montant de la commission effectivement perçue sur la transaction concernée.
              </p>
            </section>

            {/* ── 6. Liens hypertextes ────────────────────────────────────── */}
            <section>
              <h2>6. Liens hypertextes</h2>
              <p>
                Le Site peut contenir des liens vers des sites tiers. Pros Import EURL n'exerce aucun
                contrôle sur le contenu de ces sites et décline toute responsabilité quant à leur
                contenu ou aux éventuels traitements de données personnelles qu'ils opèrent.
              </p>
            </section>

            {/* ── 7. Données personnelles ─────────────────────────────────── */}
            <section>
              <h2>7. Données personnelles</h2>
              <p>
                Le traitement des données personnelles collectées via le Site est détaillé dans notre{" "}
                <Link to="/confidentialite" className="text-primary underline">
                  Politique de confidentialité
                </Link>
                , accessible à tout moment depuis le Site.
              </p>
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
                Informatique et Libertés, vous disposez de droits d'accès, de rectification, de
                suppression, de portabilité et d'opposition sur vos données personnelles. Pour
                exercer ces droits, contactez-nous à :{" "}
                <a href="mailto:contact@terrassea.com" className="text-primary underline">
                  contact@terrassea.com
                </a>
                .
              </p>
            </section>

            {/* ── 8. Cookies ──────────────────────────────────────────────── */}
            <section>
              <h2>8. Cookies</h2>
              <p>
                Le Site utilise des cookies. Pour en savoir plus sur notre utilisation des cookies et
                paramétrer vos préférences, consultez la section dédiée de notre{" "}
                <Link to="/confidentialite" className="text-primary underline">
                  Politique de confidentialité
                </Link>
                .
              </p>
            </section>

            {/* ── 9. Droit applicable ─────────────────────────────────────── */}
            <section>
              <h2>9. Droit applicable et juridiction compétente</h2>
              <p>
                Les présentes mentions légales sont soumises au droit français. En cas de litige, et
                après tentative de résolution amiable, les tribunaux de Paris seront seuls compétents.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Legal;
