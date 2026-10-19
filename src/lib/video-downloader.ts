import { Readable } from "node:stream";

export async function handleVideoDownload(request: Request, id: string, rawFilename: string): Promise<Response> {
  const fs = await import("fs");
  const fsPromises = fs.promises;
  const path = await import("path");
  const os = await import("os");

  const cleanBase = rawFilename
    .replace(/\.mp4$/i, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, "_")
    .trim() || "islamic-reel";
  const utf8Filename = `${cleanBase}.mp4`;
  const asciiFilename = cleanBase.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "islamic-reel";

  // Check the primary directory where getJobsDir() stores videos
  const primaryDir = path.join(os.homedir(), ".islamicreels_jobs");
  let filePath = path.join(primaryDir, `${id}.mp4`);

  let exists = await fsPromises.access(filePath).then(() => true).catch(() => false);
  if (!exists) {
    // Check fallback tmp directory just in case
    const tmpDir = path.join(os.tmpdir(), "islamic-reels-jobs");
    const tmpPath = path.join(tmpDir, `${id}.mp4`);
    if (await fsPromises.access(tmpPath).then(() => true).catch(() => false)) {
      filePath = tmpPath;
      exists = true;
    }
  }

  if (!exists) {
    return new Response("Video file not found on server", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const stat = await fsPromises.stat(filePath);
  const totalSize = stat.size;

  const rangeHeader = request.headers.get("range");
  let isInline = false;
  try {
    const reqUrl = new URL(request.url, "http://localhost");
    isInline = reqUrl.searchParams.get("inline") === "1";
  } catch {
    // ignore URL parse error
  }

  // Use inline disposition when previewing in <video> tag (?inline=1), and attachment for direct downloads
  const disposition = isInline ? "inline" : "attachment";
  const encodedUtf8 = encodeURIComponent(utf8Filename);

  const commonHeaders: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Content-Disposition": `${disposition}; filename="${asciiFilename}.mp4"; filename*=UTF-8''${encodedUtf8}`,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  };

  if (rangeHeader && rangeHeader.startsWith("bytes=")) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] && parts[1] !== "" ? parseInt(parts[1], 10) : totalSize - 1;

    if (isNaN(start) || isNaN(end) || start < 0 || end >= totalSize || start > end) {
      return new Response("Requested Range Not Satisfiable", {
        status: 416,
        headers: {
          ...commonHeaders,
          "Content-Range": `bytes */${totalSize}`,
        },
      });
    }

    const chunkSize = end - start + 1;
    const nodeStream = fs.createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(nodeStream);

    return new Response(webStream as unknown as ReadableStream, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Content-Length": String(chunkSize),
      },
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream);

  return new Response(webStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      ...commonHeaders,
      "Content-Length": String(totalSize),
    },
  });
}
