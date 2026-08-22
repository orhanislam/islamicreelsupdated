const fs = require('fs');
let code = fs.readFileSync('src/components/CarouselRendererButton.tsx', 'utf-8');

if (!code.includes('Copy } from "lucide-react"')) {
  code = code.replace('import { Loader2, Image as ImageIcon } from "lucide-react";', 'import { Loader2, Image as ImageIcon, Copy } from "lucide-react";');
}

const target = `  return (
    <div className="mt-3">
      <Button 
        onClick={handleGenerate}`;

const replacement = `  const handleCopyTitle = () => {
    if (title) {
      navigator.clipboard.writeText(title);
      toast.success("Заглавието е копирано!");
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <Button 
        variant="outline" 
        onClick={handleCopyTitle} 
        className="w-full gap-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400"
      >
        <Copy className="size-4" /> Копирай Заглавието (за TikTok)
      </Button>
      <Button 
        onClick={handleGenerate}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/CarouselRendererButton.tsx', code);
  console.log("Successfully added copy button!");
} else {
  console.log("Error: Target string not found.");
}
