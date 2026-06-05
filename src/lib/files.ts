import type { Attachment } from "../types";
import { uid } from "./utils";

const TEXT_EXT =
  /\.(txt|md|csv|json|js|jsx|ts|tsx|py|java|c|cpp|cs|go|rb|rs|php|html|css|scss|xml|yml|yaml|sh|sql|swift|kt|toml|ini|log)$/i;

function guessMime(name: string): string {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (TEXT_EXT.test(name)) return "text/plain";
  return "application/octet-stream";
}

/** Read a single File into an Attachment (base64 + optional thumbnail data URL). */
function readFile(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isImage = file.type.startsWith("image/");
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({
        id: uid(),
        name: file.name,
        size: file.size,
        mime: file.type || guessMime(file.name),
        isImage,
        dataUrl: isImage ? result : null,
        base64,
      });
    };
    reader.readAsDataURL(file);
  });
}

/** Read a FileList/array of Files into Attachments, preserving order. */
export async function readFiles(fileList: FileList | File[]): Promise<Attachment[]> {
  const files = Array.from(fileList);
  return Promise.all(files.map(readFile));
}
