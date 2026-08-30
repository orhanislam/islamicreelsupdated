export type Slide = {
  topTitle: string;
  mainText: string;
  bottomText: string;
  footerText?: string;
  imagePrompt?: string;
  quoteText?: string;
  commentaryText?: string;
  sourceBadge?: string;
};

const MAX_CHARS = 150;

function splitTextIntoChunks(text: string, maxLen: number): string[] {
  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxLen) return [text.trim()];

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxLen) {
    let splitIndex = -1;
    const searchArea = remaining.substring(0, maxLen);
    
    // 1. Look for sentence end
    const sentenceMatches = [...searchArea.matchAll(/[.!?:]\s+/g)];
    if (sentenceMatches.length > 0) {
      const match = sentenceMatches[sentenceMatches.length - 1];
      splitIndex = match.index! + match[0].length;
    } 
    // 2. Look for comma
    else if (searchArea.includes(', ')) {
      splitIndex = searchArea.lastIndexOf(', ') + 2;
    } 
    // 3. Fallback to space
    else if (searchArea.includes(' ')) {
      splitIndex = searchArea.lastIndexOf(' ') + 1;
    }
    // 4. Force split
    else {
      splitIndex = maxLen;
    }

    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

export function autoSplitSlides(slides: Slide[]): Slide[] {
  const result: Slide[] = [];

  for (const slide of slides) {
    const textsToProcess: { type: 'quote' | 'commentary' | 'main', text: string }[] = [];
    
    if (slide.quoteText) textsToProcess.push({ type: 'quote', text: slide.quoteText });
    if (slide.commentaryText) textsToProcess.push({ type: 'commentary', text: slide.commentaryText });
    if (!slide.quoteText && !slide.commentaryText && slide.mainText) textsToProcess.push({ type: 'main', text: slide.mainText });

    if (textsToProcess.length === 0) {
      result.push(slide);
      continue;
    }

    for (let i = 0; i < textsToProcess.length; i++) {
      const item = textsToProcess[i];
      const chunks = splitTextIntoChunks(item.text, MAX_CHARS);
      
      for (let j = 0; j < chunks.length; j++) {
        const isLastChunkOfLastItem = (i === textsToProcess.length - 1) && (j === chunks.length - 1);
        const newSlide: Slide = {
          ...slide,
          quoteText: item.type === 'quote' ? chunks[j] : undefined,
          commentaryText: item.type === 'commentary' ? chunks[j] : undefined,
          mainText: item.type === 'main' ? chunks[j] : '',
        };
        
        if (!isLastChunkOfLastItem) {
          newSlide.bottomText = "Продължава 👉";
        }
        
        result.push(newSlide);
      }
    }
  }

  const total = result.length;
  for (let i = 0; i < total; i++) {
    result[i].footerText = `${i + 1}/${total} • Плъзнете наляво`;
  }

  return result;
}
