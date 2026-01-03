export const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".heic",
  ".heif",
  ".avif",
  ".gif",
];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
];

export const ALLOWED_ACCEPT_TYPES = ALLOWED_FILE_EXTENSIONS.join(",");
export const ALLOWED_MIME_TYPE_SET = new Set(ALLOWED_MIME_TYPES);
