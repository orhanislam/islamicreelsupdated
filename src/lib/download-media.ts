export type SaveMediaResult = "shared" | "downloaded" | "opened";

let shareInFlight = false;

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: ShareData & { files?: File[] }) => boolean;
  share?: (data: ShareData & { files?: File[] }) => Promise<void>;
};

export function sanitizeFilename(input: string, fallback = "post") {
  const clean = input.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "");
  return clean || fallback;
}

export function inferExtensionFromUrl(url: string, fallback: string) {
  try {
    const path = new URL(url, window.location.href).pathname;
    const match = path.match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() || fallback;
  } catch {
    return fallback;
  }
}

export function isIOSMediaDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function cleanMediaMimeType(type?: string | null) {
  if (!type) return "application/octet-stream";
  return type.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
}

export function addDownloadFilename(url: string, filename: string) {
  try {
    const u = new URL(url, window.location.href);
    u.searchParams.set("download", filename);
    return u.toString();
  } catch {
    return url;
  }
}

export function createSameOriginDownloadUrl(sourceUrl: string, filename: string) {
  const u = new URL("/api/public/download/render", window.location.origin);
  u.searchParams.set("source", sourceUrl);
  u.searchParams.set("filename", filename);
  return u.toString();
}

export function createSameOriginMediaUrl(sourceUrl: string, mimeType = "video/mp4") {
  const u = new URL("/api/public/download/render", window.location.origin);
  u.searchParams.set("source", sourceUrl);
  u.searchParams.set("mode", "inline");
  u.searchParams.set("mime", cleanMediaMimeType(mimeType));
  return u.toString();
}

function openDirectlyOnIOS(url: string): SaveMediaResult {
  const opened = window.open(url, "_blank", "noopener");
  if (!opened) window.location.href = url;
  return "opened";
}

export async function saveMediaFromUrl(sourceUrl: string, filename: string, mimeHint?: string): Promise<SaveMediaResult> {
  // On iPhone the only reliable "Save to Files" path from a web app is the
  // native share sheet with a real File. Try that first; if CORS blocks the
  // fetch, navigate to a hosted URL with a download filename so Safari stores
  // it in Files/Downloads instead of using the ignored <a download> flow.
  if (isIOSMediaDevice()) {
    try {
      const res = await fetch(sourceUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      return await saveMediaBlob(blob, filename, mimeHint, addDownloadFilename(sourceUrl, filename));
    } catch {
      return openDirectlyOnIOS(createSameOriginDownloadUrl(sourceUrl, filename));
    }
  }

  try {
    const res = await fetch(sourceUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await saveMediaBlob(blob, filename, mimeHint);
  } catch (error) {
    const opened = window.open(sourceUrl, "_blank", "noopener");
    if (opened) return "opened";
    throw error;
  }
}

export async function saveMediaBlob(
  blob: Blob,
  filename: string,
  mimeHint?: string,
  hostedFallbackUrl?: string | null,
): Promise<SaveMediaResult> {
  const type = cleanMediaMimeType(blob.type || mimeHint || "application/octet-stream");
  const normalizedBlob = blob.type === type ? blob : new Blob([blob], { type });
  
  // On iOS, the best way to allow saving directly to Photos (Camera Roll)
  // is to use the native Web Share API with a File object.
  if (isIOSMediaDevice() && !shareInFlight) {
    const nav = navigator as NavigatorWithFileShare;
    if (nav.canShare && nav.share) {
      try {
        shareInFlight = true;
        const file = new File([normalizedBlob], filename, { type });
        if (nav.canShare({ files: [file] })) {
          await nav.share({
            title: "Видео",
            files: [file]
          });
          return "shared";
        }
      } catch (e: any) {
        // AbortError means user cancelled the share sheet, which is fine.
        if (e.name !== "AbortError") console.error("Share failed", e);
      } finally {
        shareInFlight = false;
      }
    }
  }

  const objectUrl = URL.createObjectURL(normalizedBlob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  return "downloaded";
}
