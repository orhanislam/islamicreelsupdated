const fs = require('fs');
let code = fs.readFileSync('src/routes/_app/assistant.tsx', 'utf-8');

const target = `            ) : (
              <>
                <Video className="size-4" /> 🚀 Генерирай Серия от {batchCount} Видеа
              </>
            )}
          

        {/* Carousel Quick Action Toolbar */}`;

const replacement = `            ) : (
              <>
                <Video className="size-4" /> 🚀 Генерирай Серия от {batchCount} Видеа
              </>
            )}
          </button>
        </div>

        {/* Carousel Quick Action Toolbar */}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/routes/_app/assistant.tsx', code);
  console.log("Fixed missing closing tags in assistant.tsx");
} else {
  console.log("Could not find the target string. Maybe it's slightly different.");
}
