const fs = require('fs');
let code = fs.readFileSync('src/routes/_app/assistant.tsx', 'utf8');

code = code.replace(
  /const displayMsg = \{ role: "user", text: ".*?" \};\s*const newMsgs = \[\.\.\.messages, displayMsg\];\s*setMessages\(newMsgs\);/,
  '/* Removed user message append */'
);

code = code.replace(
  /setMessages\(\[\.\.\.newMsgs, newMsg\]\);/g,
  'setMessages(prev => [...prev, newMsg]);'
);

fs.writeFileSync('src/routes/_app/assistant.tsx', code);

