// ── Payment Reference & Invoice Generators ──────────────────────────────────

/** Generate unique payment reference: TRS-2026-XXXXXX */
export function generatePaymentReference(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TRS-${year}-${random}`;
}

/** Generate invoice number: INV-202603-XXXX */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

// ── i18n labels ─────────────────────────────────────────────────────────────

interface I18nStrings {
  subject: string;
  heading: string;
  intro: string;
  beneficiary: string;
  iban: string;
  bic: string;
  bank: string;
  amount: string;
  reference: string;
  dueDate: string;
  important: string;
  importantNote: (ref: string) => string;
  footer: string;
}

const strings: Record<string, I18nStrings> = {
  en: {
    subject: "Your quote has been signed — Payment instructions",
    heading: "Your quote has been signed",
    intro:
      "Thank you for signing your quote. Please find below the payment details to proceed with your order.",
    beneficiary: "Beneficiary",
    iban: "IBAN",
    bic: "BIC",
    bank: "Bank",
    amount: "Amount",
    reference: "Reference",
    dueDate: "Due date",
    important: "Important",
    importantNote: (ref) =>
      `Please include the reference <strong>${ref}</strong> in your bank transfer so we can match your payment.`,
    footer:
      "If you have any questions, contact us at support@terrassea.com. Thank you for choosing Terrassea.",
  },
  fr: {
    subject: "Votre devis a été signé — Instructions de paiement",
    heading: "Votre devis a été signé",
    intro:
      "Merci d'avoir signé votre devis. Veuillez trouver ci-dessous les coordonnées bancaires pour procéder au paiement.",
    beneficiary: "Bénéficiaire",
    iban: "IBAN",
    bic: "BIC",
    bank: "Banque",
    amount: "Montant",
    reference: "Référence",
    dueDate: "Date d'échéance",
    important: "Important",
    importantNote: (ref) =>
      `Veuillez inclure la référence <strong>${ref}</strong> dans votre virement afin que nous puissions identifier votre paiement.`,
    footer:
      "Pour toute question, contactez-nous à support@terrassea.com. Merci d'avoir choisi Terrassea.",
  },
  es: {
    subject: "Su presupuesto ha sido firmado — Instrucciones de pago",
    heading: "Su presupuesto ha sido firmado",
    intro:
      "Gracias por firmar su presupuesto. A continuación encontrará los datos bancarios para realizar el pago.",
    beneficiary: "Beneficiario",
    iban: "IBAN",
    bic: "BIC",
    bank: "Banco",
    amount: "Importe",
    reference: "Referencia",
    dueDate: "Fecha de vencimiento",
    important: "Importante",
    importantNote: (ref) =>
      `Por favor, incluya la referencia <strong>${ref}</strong> en su transferencia para que podamos identificar su pago.`,
    footer:
      "Si tiene alguna pregunta, contáctenos en support@terrassea.com. Gracias por elegir Terrassea.",
  },
  it: {
    subject: "Il tuo preventivo è stato firmato — Istruzioni di pagamento",
    heading: "Il tuo preventivo è stato firmato",
    intro:
      "Grazie per aver firmato il preventivo. Di seguito trovi i dati bancari per procedere al pagamento.",
    beneficiary: "Beneficiario",
    iban: "IBAN",
    bic: "BIC",
    bank: "Banca",
    amount: "Importo",
    reference: "Riferimento",
    dueDate: "Data di scadenza",
    important: "Importante",
    importantNote: (ref) =>
      `Ti preghiamo di includere il riferimento <strong>${ref}</strong> nel tuo bonifico affinché possiamo identificare il pagamento.`,
    footer:
      "Per qualsiasi domanda, contattaci a support@terrassea.com. Grazie per aver scelto Terrassea.",
  },
};

// ── Payment instructions generator ──────────────────────────────────────────

export interface PaymentInstructionsData {
  reference: string;
  amount: number;
  beneficiary: string;
  iban: string;
  bic: string;
  bankName: string;
  dueDate: string;
  lang: string;
}

export function generatePaymentInstructions(data: PaymentInstructionsData): {
  subject: string;
  bodyHtml: string;
  bodyText: string;
} {
  const t = strings[data.lang] ?? strings.en;
  const formattedAmount = new Intl.NumberFormat(data.lang === "en" ? "en-GB" : data.lang, {
    style: "currency",
    currency: "EUR",
  }).format(data.amount);

  const subject = t.subject;

  const bodyHtml = `<!DOCTYPE html>
<html lang="${data.lang}">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f7f7f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <!-- Header -->
    <tr>
      <td style="background:#0f4c5c;padding:24px 32px;">
        <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Terrassea</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:32px;">
        <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px;">${t.heading}</h2>
        <p style="color:#333;font-size:15px;line-height:1.6;">${t.intro}</p>

        <!-- Payment details table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
          <tr style="background:#f9fafb;">
            <td style="padding:12px 16px;font-weight:600;color:#555;border-bottom:1px solid #e0e0e0;width:40%;">${t.beneficiary}</td>
            <td style="padding:12px 16px;color:#1a1a1a;border-bottom:1px solid #e0e0e0;">${data.beneficiary}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-weight:600;color:#555;border-bottom:1px solid #e0e0e0;">${t.iban}</td>
            <td style="padding:12px 16px;color:#1a1a1a;border-bottom:1px solid #e0e0e0;font-family:monospace;">${data.iban}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:12px 16px;font-weight:600;color:#555;border-bottom:1px solid #e0e0e0;">${t.bic}</td>
            <td style="padding:12px 16px;color:#1a1a1a;border-bottom:1px solid #e0e0e0;font-family:monospace;">${data.bic}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-weight:600;color:#555;border-bottom:1px solid #e0e0e0;">${t.bank}</td>
            <td style="padding:12px 16px;color:#1a1a1a;border-bottom:1px solid #e0e0e0;">${data.bankName}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:12px 16px;font-weight:600;color:#555;border-bottom:1px solid #e0e0e0;">${t.amount}</td>
            <td style="padding:12px 16px;color:#1a1a1a;border-bottom:1px solid #e0e0e0;font-weight:700;font-size:16px;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-weight:600;color:#555;border-bottom:1px solid #e0e0e0;">${t.reference}</td>
            <td style="padding:12px 16px;color:#1a1a1a;border-bottom:1px solid #e0e0e0;font-family:monospace;font-weight:700;">${data.reference}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:12px 16px;font-weight:600;color:#555;">${t.dueDate}</td>
            <td style="padding:12px 16px;color:#1a1a1a;">${data.dueDate}</td>
          </tr>
        </table>

        <!-- Important note -->
        <div style="background:#fff8e1;border-left:4px solid #f9a825;padding:14px 18px;margin:24px 0;border-radius:0 6px 6px 0;">
          <strong style="color:#e65100;">${t.important}:</strong>
          <span style="color:#333;font-size:14px;"> ${t.importantNote(data.reference)}</span>
        </div>

        <!-- Footer -->
        <p style="color:#777;font-size:13px;line-height:1.5;margin-top:32px;">${t.footer}</p>
      </td>
    </tr>
    <!-- Bottom bar -->
    <tr>
      <td style="background:#0f4c5c;padding:16px 32px;text-align:center;">
        <span style="color:#ffffffcc;font-size:12px;">&copy; ${new Date().getFullYear()} Terrassea — Premium Outdoor Furniture for Hospitality</span>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const bodyText = [
    `${t.heading}`,
    "",
    t.intro,
    "",
    `${t.beneficiary}: ${data.beneficiary}`,
    `${t.iban}: ${data.iban}`,
    `${t.bic}: ${data.bic}`,
    `${t.bank}: ${data.bankName}`,
    `${t.amount}: ${formattedAmount}`,
    `${t.reference}: ${data.reference}`,
    `${t.dueDate}: ${data.dueDate}`,
    "",
    `${t.important}: ${t.importantNote(data.reference).replace(/<[^>]+>/g, "")}`,
    "",
    t.footer,
    "",
    `© ${new Date().getFullYear()} Terrassea`,
  ].join("\n");

  return { subject, bodyHtml, bodyText };
}
