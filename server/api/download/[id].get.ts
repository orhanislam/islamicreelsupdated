// Server API route for streaming rendered video files directly to Safari/iOS
// Safari cannot handle large base64 data URLs, so this endpoint serves the .mp4
// file with proper Content-Disposition headers that Safari respects for downloads.

import { eventHandler, getQuery, sendStream, setHeaders, createError } from "h3";

export default eventHandler(async (event) => {
  const query = getQuery(event);
  const jobId = String(query.id || "").trim();
  const filename = String(query.filename || "islamic-reel.mp4").trim();

  if (!jobId || !/^[a-z0-9_-]+$/i.test(jobId)) {
    throw createError({ statusCode: 400, message: "Invalid job ID" });
  }

  const fs = await import("fs");
  const fsPromises = fs.promises;
  const path = await import("path");
  const os = await import("os");

  const jobsDir = path.join(os.tmpdir(), "islamic-reels-jobs");
  const mp4Path = path.join(jobsDir, `${jobId}.mp4`);

  try {
    await fsPromises.access(mp4Path);
  } catch {
    throw createError({ statusCode: 404, message: "Video not found" });
  }

  const stat = await fsPromises.stat(mp4Path);

  setHeaders(event, {
    "Content-Type": "video/mp4",
    "Content-Length": String(stat.size),
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  });

  const stream = fs.createReadStream(mp4Path);
  return sendStream(event, stream);
});
