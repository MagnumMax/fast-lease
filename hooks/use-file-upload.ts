import { useState } from "react";

export type UploadResult = {
  path: string;
};

export type GetUploadUrlFn<TArgs> = (args: TArgs) => Promise<
  | { success: true; url: string; path: string; token?: string }
  | { success: false; error: string; code?: string }
>;

export function useFileUpload<TArgs>() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    file: File,
    getUploadUrl: GetUploadUrlFn<TArgs>,
    args: TArgs
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Get Signed URL
      const urlResult = await getUploadUrl(args);
      if (!urlResult.success) {
        throw new Error(urlResult.error || "Failed to get upload URL");
      }

      const { url, path } = urlResult;

      // 2. Upload File
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        let detail = `Status: ${uploadRes.status}`;
        try {
          const text = await uploadRes.text();
          if (text) {
             // Try to parse JSON or just take a snippet if it's XML/Text
             try {
                const json = JSON.parse(text);
                detail = json.message || json.error || detail;
             } catch {
                // If it's XML (S3 often returns XML), we might want to just show the text if it's short
                // or just append it.
                if (text.length < 200) detail = text;
             }
          }
        } catch {
          // ignore
        }
        throw new Error(`Ошибка загрузки файла: ${detail}`);
      }

      return { path };
    } catch (err) {
      console.error("Upload failed", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      return null;
    } finally {
      setIsUploading(false);
      setProgress(100);
    }
  };

  return { upload, isUploading, progress, error, reset: () => setError(null) };
}
