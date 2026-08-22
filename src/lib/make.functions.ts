import { createServerFn } from "@tanstack/react-start";
import fs from "fs";
import path from "path";

export const triggerMakeWebhook = createServerFn({ method: "POST" })
  .inputValidator((input) => input)
  .handler(async ({ data }) => {
    const { title, slides, webhookUrl } = data as { title: string, slides: string[], webhookUrl: string };
    
    // Determine where to save based on process.cwd() / .output/public
    // In dev it's public/, in prod it's .output/public
    const isProd = fs.existsSync(path.join(process.cwd(), ".output", "public"));
    const outDir = path.join(process.cwd(), isProd ? ".output/public" : "public", "temp_uploads");
    
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const urls = [];
    for (let i = 0; i < slides.length; i++) {
      const base64Data = slides[i].replace(/^data:image\/\w+;base64,/, "");
      const filename = `${Date.now()}_${i}.png`;
      fs.writeFileSync(path.join(outDir, filename), Buffer.from(base64Data, "base64"));
      urls.push(`http://93.189.88.228/temp_uploads/${filename}`);
    }

    try {
      const res = await fetch(webhookUrl || "https://hook.eu2.make.com/07869xb84hvnqfq2o26m56jw2ge6m1ua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, images: urls }),
      });
      return { success: res.ok, status: res.status };
    } catch (e: any) {
      throw new Error("Грешка при връзка с Make.com: " + e.message);
    }
  });
