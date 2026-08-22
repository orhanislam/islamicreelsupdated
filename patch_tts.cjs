const fs = require('fs');
let code = fs.readFileSync('src/lib/tts.functions.ts', 'utf-8');

// Replace standard prefixes: Ал-, Ат-, Ан-, Аз-, Ас-, Аш-, Ад-, Ар-
// to be phonetically clear and not treated as abbreviation by Bulgarian TTS.
const fixes = `
      // Fix Arabic prefixes that cause Bulgarian TTS to expand them as abbreviations (e.g. "ал." -> "Александър")
      .replace(/\\b(А|а)л-/g, "$1л ")
      .replace(/\\b(А|а)т-/g, "$1т ")
      .replace(/\\b(А|а)н-/g, "$1н ")
      .replace(/\\b(А|а)з-/g, "$1з ")
      .replace(/\\b(А|а)с-/g, "$1с ")
      .replace(/\\b(А|а)ш-/g, "$1ш ")
      .replace(/\\b(А|а)д-/g, "$1д ")
      .replace(/\\b(А|а)р-/g, "$1р ")
`;

const injectionPoint = '// Fix Islamic reference name pronunciation for Bulgarian TTS';
if (code.includes(injectionPoint)) {
  code = code.replace(injectionPoint, fixes + '      ' + injectionPoint);
  fs.writeFileSync('src/lib/tts.functions.ts', code);
  console.log('Fixed TTS logic in src/lib/tts.functions.ts');
} else {
  console.log('Could not find injection point in TTS');
}
