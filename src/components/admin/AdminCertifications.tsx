// ============================================================================
// AdminCertifications — admin CRUD for certifications referential
// ÉTAPE 8c (2026-05-05).
//
// Ultra-thin composer over <ReferentialCRUD>. Certifications have no extra
// fields beyond the common shape, so this file is essentially configuration.
// ============================================================================

import ReferentialCRUD from "./referentials/ReferentialCRUD";
import {
  CERTIFICATION_CATEGORIES,
  certificationExtraSchema,
  type CertificationExtra,
} from "@/lib/referentials/certificationSchema";

const DEFAULT_EXTRA: CertificationExtra = {} as CertificationExtra;

export default function AdminCertifications() {
  return (
    <ReferentialCRUD<CertificationExtra>
      tableName="certifications"
      title="Certifications"
      categoryEnum={CERTIFICATION_CATEGORIES}
      extraSchema={certificationExtraSchema as unknown as never}
      extraDefaults={DEFAULT_EXTRA}
      extraFormFields={() => null}
      referencedBy={[
        {
          table: "material_brand_certifications",
          column: "certification_id",
          label: "liaisons marques",
        },
      ]}
    />
  );
}
