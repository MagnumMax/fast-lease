export const TASK_DOCUMENT_MAPPING: Record<string, string[]> = {
  COLLECT_BUYER_DOCS_COMPANY: [
    "doc_company_license",
    "doc_emirates_id_manager",
    "doc_passport_manager",
    "doc_emirates_id_driver",
    "doc_passport_driver",
    "doc_driving_license",
  ],
  COLLECT_BUYER_DOCS_INDIVIDUAL: [
    "doc_passport_buyer",
    "doc_emirates_id_buyer",
    "doc_driving_license_buyer",
    "doc_second_driver_bundle",
  ],
  COLLECT_SELLER_DOCS_COMPANY: [
    "doc_emirates_id_owner",
    "doc_company_license",
    "doc_quotation",
    "doc_passing_certificate",
    "doc_mulkia_certificate",
    "doc_hiyaza_certificate",
    "doc_noc_company_letter",
    "doc_noc_gps_letter",
    "doc_trn_certificate",
  ],
  COLLECT_SELLER_DOCS_INDIVIDUAL: ["doc_emirates_id_seller"],
};
