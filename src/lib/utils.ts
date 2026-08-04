import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import copy from 'copy-to-clipboard';

const showManualCopyModal = (text: string, msg: string) => {
  if (document.getElementById("manual-copy-modal-overlay")) return;

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.85)";
  overlay.style.zIndex = "999999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";
  overlay.id = "manual-copy-modal-overlay";

  const modal = document.createElement("div");
  modal.style.backgroundColor = "#1e293b";
  modal.style.padding = "20px";
  modal.style.borderRadius = "16px";
  modal.style.width = "100%";
  modal.style.maxWidth = "500px";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.gap = "16px";
  modal.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.5)";

  const title = document.createElement("h3");
  title.innerText = "📋 Ръчно Копиране";
  title.style.color = "white";
  title.style.margin = "0";
  title.style.fontSize = "18px";
  title.style.fontWeight = "bold";

  const instructions = document.createElement("p");
  instructions.innerText = "Браузърът ви блокира автоматичното копиране (често се случва при липса на HTTPS). Моля, копирайте текста ръчно по-долу:";
  instructions.style.color = "#94a3b8";
  instructions.style.fontSize = "14px";
  instructions.style.margin = "0";

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.width = "100%";
  textarea.style.height = "250px";
  textarea.style.padding = "16px";
  textarea.style.borderRadius = "12px";
  textarea.style.border = "1px solid #334155";
  textarea.style.backgroundColor = "#0f172a";
  textarea.style.color = "white";
  textarea.style.resize = "none";
  textarea.style.fontSize = "14px";
  textarea.style.lineHeight = "1.5";
  textarea.readOnly = true;

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "12px";
  btnRow.style.justifyContent = "flex-end";
  btnRow.style.marginTop = "8px";

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "Затвори";
  closeBtn.style.padding = "10px 20px";
  closeBtn.style.backgroundColor = "#334155";
  closeBtn.style.color = "white";
  closeBtn.style.border = "none";
  closeBtn.style.borderRadius = "8px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontWeight = "500";
  closeBtn.onclick = () => document.body.removeChild(overlay);
  
  const manualCopyBtn = document.createElement("button");
  manualCopyBtn.innerText = "Избери Всичко за Копиране";
  manualCopyBtn.style.padding = "10px 20px";
  manualCopyBtn.style.backgroundColor = "#0ea5e9";
  manualCopyBtn.style.color = "white";
  manualCopyBtn.style.border = "none";
  manualCopyBtn.style.borderRadius = "8px";
  manualCopyBtn.style.cursor = "pointer";
  manualCopyBtn.style.fontWeight = "500";
  manualCopyBtn.onclick = () => {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, 999999);
  };

  btnRow.appendChild(closeBtn);
  btnRow.appendChild(manualCopyBtn);

  modal.appendChild(title);
  modal.appendChild(instructions);
  modal.appendChild(textarea);
  modal.appendChild(btnRow);
  
  overlay.appendChild(modal);
  
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };

  document.body.appendChild(overlay);
  
  setTimeout(() => {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, 999999);
  }, 100);
};

export const copyToClipboardFallback = (text: string, successMsg?: string) => {
  const msg = successMsg || "📋 Професионалният TikTok/Reels текст е копиран в клипборда!";
  
  try {
    const success = copy(text, { format: 'text/plain' });
    if (success) {
      toast.success(msg);
    } else {
      showManualCopyModal(text, msg);
    }
  } catch (err) {
    showManualCopyModal(text, msg);
  }
};
