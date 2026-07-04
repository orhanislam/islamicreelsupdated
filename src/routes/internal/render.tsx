import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { renderVideo, type VideoOptions } from "@/lib/render-video";

export const Route = createFileRoute("/internal/render")({
  component: HeadlessRenderPage,
});

// Extend Window to let Puppeteer trigger us
declare global {
  interface Window {
    startHeadlessRender: (opts: VideoOptions) => void;
    onVideoRendered?: (base64: string) => void;
    onRenderError?: (msg: string) => void;
  }
}

function HeadlessRenderPage() {
  const [status, setStatus] = useState("Waiting for Puppeteer payload...");

  useEffect(() => {
    window.startHeadlessRender = async (opts: VideoOptions) => {
      try {
        setStatus("Rendering video...");
        const result = await renderVideo(opts);
        
        setStatus("Encoding to Base64...");
        const reader = new FileReader();
        reader.readAsDataURL(result.blob);
        reader.onloadend = () => {
          setStatus("Sending back to Node...");
          const base64data = (reader.result as string).split(',')[1];
          if (window.onVideoRendered) {
            window.onVideoRendered(base64data);
          } else {
            console.error("onVideoRendered is not defined by Puppeteer");
          }
        };
      } catch (err: unknown) {
        setStatus("Error: " + String(err));
        if (window.onRenderError) {
          window.onRenderError(String(err));
        }
      }
    };
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-black text-white p-8">
      <div className="text-xl font-mono text-center">
        <h1>Islamic Reels Studio - Headless Renderer</h1>
        <p className="mt-4 text-emerald-400">{status}</p>
      </div>
    </div>
  );
}
