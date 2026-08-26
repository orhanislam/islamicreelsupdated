const fs = require('fs');
let code = fs.readFileSync('src/lib/render-carousel.ts', 'utf8');

code = code.replace(
  /\/\/ FOOTER TEXT[\s\S]*?#dddddd\x22\);\s*\}\);/m,
  '/* Footer text removed per user request */'
);

fs.writeFileSync('src/lib/render-carousel.ts', code);

