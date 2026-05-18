import { env } from "../config/env";
import type { UploadResultDTO } from "../types";
import { useAuthStore } from "../store/auth.store";

interface UploadResponse {
  success: boolean;
  data: UploadResultDTO;
}

export const uploadService = {
  // onProgress: called with 0–100 percentage.
  // Note: fetch does not natively support upload progress.
  // We use XMLHttpRequest for progress tracking.
  uploadFile: (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<UploadResponse> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }
      xhr.addEventListener("load", () => {
        try {
          const responseBody = JSON.parse(
            xhr.responseText,
          ) as Partial<UploadResponse> & {
            message?: string;
          };

          if (xhr.status >= 200 && xhr.status < 300 && responseBody.success) {
            resolve(responseBody as UploadResponse);
            return;
          }

          reject(new Error(responseBody.message ?? "Upload failed"));
        } catch {
          reject(new Error("Upload failed: invalid response"));
        }
      });

      xhr.addEventListener("error", () =>
        reject(new Error("Upload failed: network error")),
      );
      xhr.addEventListener("abort", () =>
        reject(new Error("Upload cancelled")),
      );

      xhr.open("POST", `${env.API_URL}/upload`);
      xhr.withCredentials = true;

      const token = useAuthStore.getState().accessToken;
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  },
};
