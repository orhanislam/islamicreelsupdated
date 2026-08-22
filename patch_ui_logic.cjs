const fs = require('fs');
let code = fs.readFileSync('src/routes/_app/assistant.tsx', 'utf-8');

const newFunc = `
  const handleGenerateCarouselClick = async () => {
    try {
      if (typeof playStudioClick === 'function') playStudioClick("start");
      setLoading(true);
      const userText = "Генерирай ми TikTok карусел с 4 слайда. Нека бъде на интересна Ислямска тема. Използвай type: 'carousel'.";
      const newMsgs = [...messages, { role: "user", text: userText }];
      setMessages(newMsgs);
      toast.message("Генериране на карусел...");
      
      const history = newMsgs.slice(1, -1).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await chatWithAssistant({
        data: {
          prompt: userText,
          history,
        },
      });
      if (typeof playStudioClick === 'function') playStudioClick("success");
      const newMsg = {
        role: "assistant",
        text: res.reply,
        proposal: res.proposal,
      };
      setMessages((prev) => {
        const next = [...prev, newMsg];
        saveAssistantHistory({ data: { messages: next } }).catch(() => {});
        return next;
      });
    } catch (e) {
      toast.error(e?.message || "Грешка при генериране на карусел");
    } finally {
      setLoading(false);
    }
  };
`;

code = code.replace(/const handleSend =/, newFunc + '\n  const handleSend =');

const buttonRegex = /onClick=\{\(\) => \{\s*const carouselPrompt =[^}]*\}\}/m;
code = code.replace(buttonRegex, 'onClick={handleGenerateCarouselClick}');

fs.writeFileSync('src/routes/_app/assistant.tsx', code);
console.log('Fixed UI button click logic in assistant.tsx');
