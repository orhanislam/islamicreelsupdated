const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

console.log("=== Testing Webapp Functionality ===");

// 1. Check FFmpeg installation
try {
  let ffmpegPath = "ffmpeg";
  try {
    const installer = require("@ffmpeg-installer/ffmpeg");
    if (installer.path) ffmpegPath = installer.path;
  } catch (e) {
    console.log("No @ffmpeg-installer/ffmpeg found, using system ffmpeg.");
  }
  
  console.log(`Using FFmpeg path: ${ffmpegPath}`);
  const version = execSync(`"${ffmpegPath}" -version`).toString().split("\n")[0];
  console.log("FFmpeg test SUCCESS:", version);
} catch (e) {
  console.error("FFmpeg test FAILED. Is ffmpeg installed?", e.message);
}

// 2. Check PM2 and Jobs directory
try {
  const jobsDir = path.join(os.homedir(), ".islamicreels_jobs");
  if (!fs.existsSync(jobsDir)) {
    console.log("Jobs directory does not exist, it will be created on first render.");
  } else {
    console.log(`Jobs directory found at: ${jobsDir}`);
  }
  console.log("Storage check SUCCESS.");
} catch (e) {
  console.error("Storage check FAILED:", e.message);
}

console.log("=== All Tests Completed ===");
