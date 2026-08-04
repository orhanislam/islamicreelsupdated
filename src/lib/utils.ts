import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const copyToClipboardFallback = (text: string, successMsg?: string) => {
  const msg = successMsg || "📋 Професионалният TikTok/Reels текст е копиран в клипборда!";
  
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(msg))
      .catch(() => fallbackCopyLocal(text, msg));
  } else {
    fallbackCopyLocal(text, msg);
  }
};

const fallbackCopyLocal = (text: string, msg: string) => {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // iOS Safari fixes: prevent scrolling and flashing, ensure size
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // Magic fix for iOS Safari
    textArea.setSelectionRange(0, 999999);
    
    const successful = document.execCommand('copy');
    textArea.remove();
    
    if (successful) {
      toast.success(msg);
    } else {
      toast.error("Грешка при копиране (iOS/Safari).");
    }
  } catch (err) {
    toast.error("Грешка при копиране");
  }
};
