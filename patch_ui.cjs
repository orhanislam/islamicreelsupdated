const fs = require('fs');
let code = fs.readFileSync('src/routes/_app/assistant.tsx', 'utf-8');

// The new Carousel block UI we want to add
const carouselUI = `

        {/* Carousel Quick Action Toolbar */}
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mt-6">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <ImageIcon className="size-4" /> ГЕНЕРАТОР НА TIKTOK КАРУСЕЛИ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Генерирай 4 слайда със снимки за TikTok/Reels по всякаква тема. AI ще измисли текста и изображенията.
            </p>
          </div>
          <button
            onClick={() => {
              const carouselPrompt = "Генерирай ми TikTok карусел с 4 слайда. Нека бъде на интересна Ислямска тема (например уроки, дуа, джин или нещо подобно). Използвай типа 'carousel'.";
              // Simulate setting prompt and pressing send
              setPrompt(carouselPrompt);
              // Wait for React state to update slightly, then trigger submit via form or manual call
              setTimeout(() => {
                const form = document.getElementById("chat-form");
                if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }, 100);
            }}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg hover:from-blue-400 hover:to-blue-500 transition shrink-0 cursor-pointer self-stretch sm:self-auto"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Генериране...
              </>
            ) : (
              <>
                <ImageIcon className="size-4" /> Създай Карусел
              </>
            )}
          </button>
        </div>
`;

// Insert it right after the Batch Plan Suggestion block
const searchStr = `</button>\n        </div>\n\n        {/* Batch Plan Suggestion Quick Toolbar */}`;
if (code.includes(searchStr)) {
  code = code.replace(searchStr, carouselUI + '\n        ' + searchStr);
  fs.writeFileSync('src/routes/_app/assistant.tsx', code);
  console.log('Successfully injected Carousel quick action UI.');
} else {
  console.log('Failed to find injection point.');
}

// Ensure the chat form has id="chat-form" so we can trigger it
if (code.includes('<form onSubmit={handleSend}') && !code.includes('id="chat-form"')) {
  code = code.replace('<form onSubmit={handleSend}', '<form id="chat-form" onSubmit={handleSend}');
  fs.writeFileSync('src/routes/_app/assistant.tsx', code);
}
