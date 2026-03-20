import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CoverPageData {
  referenceNumber: string;    // e.g. "TRS-2026-0047"
  projectName: string;
  productName: string;
  quantity: number;
  supplierAlias: string;      // e.g. "Partenaire vérifié A"
  date: string;               // e.g. "15 mars 2026"
  validUntil: string;         // e.g. "15 avril 2026"
  totalAmount: string;        // e.g. "€4 440,00 HT"
  locale?: "fr" | "en" | "es" | "it";
}

// ── Localized strings ──────────────────────────────────────────────────────────

const STRINGS: Record<string, Record<string, string>> = {
  fr: {
    platform: "Plateforme de sourcing mobilier outdoor",
    quoteRef: "DEVIS N°",
    project: "Projet",
    product: "Produit",
    supplier: "Fournisseur",
    date: "Date",
    validity: "Validité",
    amount: "Montant",
    warning: "DOCUMENT TRANSMIS VIA TERRASSEA",
    line1: "Ce devis est émis par le fournisseur identifié et transmis via Terrassea, mandataire de paiement.",
    line2: "Terrassea agit en qualité de mandataire, non de revendeur. Le fournisseur est seul responsable de la conformité des produits.",
    line3: "Toute transaction doit être effectuée exclusivement via la plateforme Terrassea.",
    line4: "L'identité complète du fournisseur et ce document PDF seront accessibles après signature et paiement de l'acompte.",
    ref: "Référence plateforme",
    nextPage: "Le devis fournisseur suit en page suivante →",
  },
  en: {
    platform: "Outdoor furniture sourcing platform",
    quoteRef: "QUOTE REF.",
    project: "Project",
    product: "Product",
    supplier: "Supplier",
    date: "Date",
    validity: "Valid until",
    amount: "Amount",
    warning: "DOCUMENT TRANSMITTED VIA TERRASSEA",
    line1: "This quote was transmitted by a verified supplier via the Terrassea platform.",
    line2: "All transactions must be conducted exclusively through Terrassea.",
    line3: "Signing constitutes a contractual commitment for both parties.",
    line4: "Supplier identity will be revealed after signature and deposit payment.",
    ref: "Platform reference",
    nextPage: "Supplier quote follows on next page →",
  },
  es: {
    platform: "Plataforma de sourcing mobiliario outdoor",
    quoteRef: "PRESUPUESTO N°",
    project: "Proyecto",
    product: "Producto",
    supplier: "Proveedor",
    date: "Fecha",
    validity: "Validez",
    amount: "Importe",
    warning: "DOCUMENTO TRANSMITIDO VIA TERRASSEA",
    line1: "Este presupuesto fue transmitido por un proveedor verificado a través de Terrassea.",
    line2: "Todas las transacciones deben realizarse exclusivamente a través de Terrassea.",
    line3: "La firma constituye un compromiso contractual para ambas partes.",
    line4: "La identidad del proveedor se revelará tras la firma y el pago del anticipo.",
    ref: "Referencia plataforma",
    nextPage: "El presupuesto del proveedor sigue en la página siguiente →",
  },
  it: {
    platform: "Piattaforma di sourcing arredo outdoor",
    quoteRef: "PREVENTIVO N°",
    project: "Progetto",
    product: "Prodotto",
    supplier: "Fornitore",
    date: "Data",
    validity: "Validità",
    amount: "Importo",
    warning: "DOCUMENTO TRASMESSO VIA TERRASSEA",
    line1: "Questo preventivo è stato trasmesso da un fornitore verificato tramite Terrassea.",
    line2: "Tutte le transazioni devono essere effettuate esclusivamente tramite Terrassea.",
    line3: "La firma costituisce un impegno contrattuale per entrambe le parti.",
    line4: "L'identità del fornitore sarà rivelata dopo la firma e il pagamento dell'acconto.",
    ref: "Riferimento piattaforma",
    nextPage: "Il preventivo del fornitore segue alla pagina successiva →",
  },
};

// ── Colors ─────────────────────────────────────────────────────────────────────

const TERRASSEA_ORANGE = rgb(212 / 255, 96 / 255, 58 / 255);   // #D4603A
const DARK = rgb(26 / 255, 26 / 255, 26 / 255);
const GRAY = rgb(120 / 255, 120 / 255, 120 / 255);
const LIGHT_BG = rgb(250 / 255, 247 / 255, 245 / 255);
const WHITE = rgb(1, 1, 1);
const WARNING_BG = rgb(255 / 255, 247 / 255, 237 / 255);

// ── Main function ──────────────────────────────────────────────────────────────

/**
 * Takes a supplier's original PDF and prepends a Terrassea cover page.
 * Returns the merged PDF as a Uint8Array.
 */
export async function addCoverPageToPdf(
  originalPdfBytes: ArrayBuffer | Uint8Array,
  data: CoverPageData
): Promise<Uint8Array> {
  const locale = data.locale || "fr";
  const s = STRINGS[locale] || STRINGS.fr;

  // Load the original PDF
  const originalDoc = await PDFDocument.load(originalPdfBytes);
  const totalOriginalPages = originalDoc.getPageCount();

  // Create a new PDF for the cover page
  const coverDoc = await PDFDocument.create();
  const page = coverDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Embed fonts
  const fontBold = await coverDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await coverDoc.embedFont(StandardFonts.Helvetica);

  let y = height - 60;

  // ── Background ─────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: 0, width, height,
    color: WHITE,
  });

  // ── Top accent bar ─────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: height - 6, width, height: 6,
    color: TERRASSEA_ORANGE,
  });

  // ── Logo text ──────────────────────────────────────────────
  y = height - 65;
  page.drawText("TERRASSEA", {
    x: 50, y,
    size: 28,
    font: fontBold,
    color: TERRASSEA_ORANGE,
  });

  y -= 20;
  page.drawText(s.platform, {
    x: 50, y,
    size: 10,
    font: fontRegular,
    color: GRAY,
  });

  // ── Separator ──────────────────────────────────────────────
  y -= 25;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  // ── Quote reference ────────────────────────────────────────
  y -= 40;
  page.drawText(`${s.quoteRef} ${data.referenceNumber}`, {
    x: 50, y,
    size: 18,
    font: fontBold,
    color: DARK,
  });

  // ── Separator ──────────────────────────────────────────────
  y -= 20;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  // ── Info block background ──────────────────────────────────
  y -= 15;
  const infoBlockTop = y;
  const infoBlockHeight = 150;
  page.drawRectangle({
    x: 40, y: infoBlockTop - infoBlockHeight,
    width: width - 80, height: infoBlockHeight,
    color: LIGHT_BG,
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 0.5,
  });

  // ── Info rows ──────────────────────────────────────────────
  const infoRows = [
    { label: s.project, value: data.projectName },
    { label: s.product, value: `${data.productName} × ${data.quantity} pcs` },
    { label: s.supplier, value: `${data.supplierAlias}  🔒` },
    { label: s.date, value: data.date },
    { label: s.validity, value: data.validUntil },
    { label: s.amount, value: data.totalAmount },
  ];

  y = infoBlockTop - 22;
  for (const row of infoRows) {
    page.drawText(row.label, {
      x: 60, y,
      size: 9,
      font: fontRegular,
      color: GRAY,
    });
    page.drawText(row.value, {
      x: 180, y,
      size: 10,
      font: fontBold,
      color: DARK,
    });
    y -= 20;
  }

  // ── Warning block ──────────────────────────────────────────
  y = infoBlockTop - infoBlockHeight - 30;
  const warningHeight = 140;
  page.drawRectangle({
    x: 40, y: y - warningHeight,
    width: width - 80, height: warningHeight,
    color: WARNING_BG,
    borderColor: TERRASSEA_ORANGE,
    borderWidth: 1,
  });

  // Warning title
  let wy = y - 22;
  page.drawText(`⚠  ${s.warning}`, {
    x: 60, y: wy,
    size: 11,
    font: fontBold,
    color: TERRASSEA_ORANGE,
  });

  // Warning lines
  wy -= 22;
  page.drawText(s.line1, { x: 60, y: wy, size: 9, font: fontRegular, color: DARK });
  wy -= 18;
  page.drawText(`•  ${s.line2}`, { x: 60, y: wy, size: 9, font: fontRegular, color: DARK });
  wy -= 16;
  page.drawText(`•  ${s.line3}`, { x: 60, y: wy, size: 9, font: fontRegular, color: DARK });
  wy -= 16;
  page.drawText(`•  ${s.line4}`, { x: 60, y: wy, size: 9, font: fontRegular, color: DARK });

  // ── Bottom section ─────────────────────────────────────────
  y = y - warningHeight - 30;
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  y -= 20;
  page.drawText(`${s.ref} : ${data.referenceNumber}`, {
    x: 50, y,
    size: 9,
    font: fontRegular,
    color: GRAY,
  });

  y -= 16;
  page.drawText("terrassea.com  ·  contact@terrassea.com", {
    x: 50, y,
    size: 9,
    font: fontRegular,
    color: GRAY,
  });

  // ── Page indicator ─────────────────────────────────────────
  y -= 35;
  const totalPages = totalOriginalPages + 1;
  page.drawText(`Page 1/${totalPages}  —  ${s.nextPage}`, {
    x: 50, y,
    size: 9,
    font: fontBold,
    color: TERRASSEA_ORANGE,
  });

  // ── Bottom accent bar ──────────────────────────────────────
  page.drawRectangle({
    x: 0, y: 0, width, height: 4,
    color: TERRASSEA_ORANGE,
  });

  // ── Merge: cover page + original PDF ───────────────────────
  const mergedDoc = await PDFDocument.create();

  // Copy cover page
  const [coverPage] = await mergedDoc.copyPages(coverDoc, [0]);
  mergedDoc.addPage(coverPage);

  // Copy all original pages
  const originalPages = await mergedDoc.copyPages(
    originalDoc,
    originalDoc.getPageIndices()
  );
  for (const p of originalPages) {
    mergedDoc.addPage(p);
  }

  // Set metadata
  mergedDoc.setTitle(`Devis ${data.referenceNumber} — Terrassea`);
  mergedDoc.setAuthor("Terrassea");
  mergedDoc.setSubject(`Devis pour ${data.projectName}`);
  mergedDoc.setCreator("Terrassea Platform");

  return mergedDoc.save();
}

// ── Generate reference number ──────────────────────────────────────────────────

export function generateQuoteReference(): string {
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `TRS-${year}-${seq}`;
}
