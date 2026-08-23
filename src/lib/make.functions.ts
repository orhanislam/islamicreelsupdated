import { createServerFn } from "@tanstack/react-start";
import fs from "fs";
import path from "path";

export const triggerMakeWebhook = createServerFn({ method: "POST" })
  .inputValidator((input) => input)
  .handler(async ({ data }) => {
    const { title, slides, webhookUrl } = data as { title: string, slides: string[], webhookUrl: string };
    
    // Determine where to save based on process.cwd() / .output/public
    const isProd = fs.existsSync(path.join(process.cwd(), ".output", "public"));
    const outDir = path.join(process.cwd(), isProd ? ".output/public" : "public", "temp_uploads");
    
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const urls = [];
    for (let i = 0; i < slides.length; i++) {
      const base64Data = slides[i].replace(/^data:image\/\w+;base64,/, "");
      const filename = `${Date.now()}_${i}.png`;
      const buffer = Buffer.from(base64Data, "base64");
      
      fs.writeFileSync(path.join(outDir, filename), buffer);
      
      try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        const blob = new Blob([buffer], { type: 'image/png' });
        form.append('fileToUpload', blob, filename);
        
        const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
        const text = await res.text();
        if (text.startsWith('http')) {
          urls.push(text);
        } else {
          urls.push(`http://93.189.88.228/temp_uploads/${filename}`);
        }
      } catch (err) {
        urls.push(`http://93.189.88.228/temp_uploads/${filename}`);
      }
    }

    try {
      const res = await fetch(webhookUrl || "https://hook.eu2.make.com/07869xb84hvnqfq2o26m56jw2ge6m1ua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, images: urls }),
      });
      return { success: res.ok, status: res.status };
    } catch (e: any) {
      throw new Error("Грешка при връзката с Make.com: " + e.message);
    }
  });
