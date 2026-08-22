const fs = require('fs');
let code = fs.readFileSync('src/routes/_app/assistant.tsx', 'utf-8');

const importStr = 'import { CarouselRendererButton } from "@/components/CarouselRendererButton";\n';
if (!code.includes('CarouselRendererButton')) {
  code = importStr + code;
}

const carouselRenderHtml = `
                      {m.proposal.type === 'carousel' && m.proposal.carouselSlides && (
                        <div className="mt-4 flex flex-col gap-3">
                          <div className="text-sm font-medium text-amber-400 mb-1">📸 КАРУСЕЛ (4 СЛАЙДА)</div>
                          <div className="grid grid-cols-2 gap-3">
                            {m.proposal.carouselSlides.map((slide, i) => (
                              <div key={i} className="rounded-lg border border-border/40 bg-black/40 p-3 text-xs">
                                <div className="font-bold text-amber-300 mb-1">Слайд {i+1}</div>
                                <div className="text-white/90 mb-1">{slide.topTitle}</div>
                                <div className="text-white/60 truncate">{slide.mainText}</div>
                                <div className="mt-2 text-[10px] text-teal-400/70 italic">AI Prompt: {slide.imagePrompt}</div>
                              </div>
                            ))}
                          </div>
                          <CarouselRendererButton slides={m.proposal.carouselSlides} title={m.proposal.title} />
                        </div>
                      )}
`;

const regex = /(<span className="font-medium text-foreground">\{m\.proposal\.title\}<\/span>\s*<\/div>)/;
if (code.match(regex)) {
  code = code.replace(regex, `$1\n${carouselRenderHtml}`);
  fs.writeFileSync('src/routes/_app/assistant.tsx', code);
  console.log('Patched assistant.tsx successfully with regex');
} else {
  console.log('Could not find injection point in assistant.tsx with regex');
}
