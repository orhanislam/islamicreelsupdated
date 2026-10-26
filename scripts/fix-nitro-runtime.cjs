const fs = require('fs');
const path = require('path');

const serverDir = path.resolve('.output/server');
const libsDir = path.join(serverDir, '_libs');
const ssrDir = path.join(serverDir, '_ssr');

if (!fs.existsSync(serverDir)) {
  console.log('[fix-nitro-runtime] .output/server does not exist. Skipping.');
  process.exit(0);
}

// 1. Create independent rolldown-runtime.mjs
const runtimeFile = path.join(libsDir, 'rolldown-runtime.mjs');
const runtimeContent = `import { createRequire } from "node:module";

export var __create = Object.create;
export var __defProp = Object.defineProperty;
export var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
export var __getOwnPropNames = Object.getOwnPropertyNames;
export var __getProtoOf = Object.getPrototypeOf;
export var __hasOwnProp = Object.prototype.hasOwnProperty;
export var __esmMin = (fn, res, err) => () => {
	if (err) throw err[0];
	try {
		return fn && (res = fn(fn = 0)), res;
	} catch (e) {
		throw err = [e], e;
	}
};
export var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
export var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
export var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
export var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
export var __toCommonJS = (mod) => __hasOwnProp.call(mod, "module.exports") ? mod["module.exports"] : __copyProps(__defProp({}, "__esModule", { value: true }), mod);
export var __require = /* @__PURE__ */ createRequire(import.meta.url);

export { __toESM as C, __commonJSMin as v, __esmMin as y, __toCommonJS as S, __require as x, __exportAll as b };
`;

fs.writeFileSync(runtimeFile, runtimeContent, 'utf8');
console.log('[fix-nitro-runtime] Created _libs/rolldown-runtime.mjs');

// 2. Walk all .mjs files in serverDir and rewrite circular imports to rolldown-runtime.mjs
function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.mjs') && fullPath !== runtimeFile) {
      files.push(fullPath);
    }
  }
  return files;
}

const allMjs = walk(serverDir);
let patchedCount = 0;

for (const filePath of allMjs) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Match import of esm-*.mjs
  const esmImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']([^"']*\/_ssr\/esm-[^"']+\.mjs)["'];?/g;

  if (esmImportRegex.test(content)) {
    content = content.replace(esmImportRegex, (match, imports, importPath) => {
      // Calculate relative path from filePath to runtimeFile
      const relPath = path.relative(path.dirname(filePath), runtimeFile).replace(/\\/g, '/');
      const normalizedRel = relPath.startsWith('.') ? relPath : `./${relPath}`;
      patchedCount++;
      return `import { ${imports.trim()} } from "${normalizedRel}";`;
    });
    modified = true;
  }

  // Patch TanStack Start getStartContext so background timers/workers never throw "No Start context found in AsyncLocalStorage"
  if (content.includes('No Start context found in AsyncLocalStorage')) {
    content = content.replace(
      /if\s*\(!context\s*&&\s*opts\?\.throwIfNotFound\s*!==\s*false\)\s*throw\s+new\s+Error\(`No Start context found in AsyncLocalStorage[^`]*`\);/g,
      'if (!context) return { request: new Request("http://127.0.0.1/"), startOptions: {}, contextAfterGlobalMiddlewares: {} };'
    );
    modified = true;
    console.log(`[fix-nitro-runtime] Patched getStartContext fallback in ${path.basename(filePath)}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

console.log(`[fix-nitro-runtime] Patched ${patchedCount} imports across .output/server to use rolldown-runtime.mjs`);

// 3. Inject Autonomous 24/7 Autopilot Scheduler startup hook + 15s internal SSR heartbeat into .output/server/index.mjs
const serverIndexFile = path.join(serverDir, 'index.mjs');
if (fs.existsSync(serverIndexFile)) {
  let indexContent = fs.readFileSync(serverIndexFile, 'utf8');
  if (!indexContent.includes('__autopilot_bootstrap_hook__')) {
    const bootstrapSnippet = `
// __autopilot_bootstrap_hook__
// Guaranteed 24/7 Zero-Click Autopilot Scheduler process startup hook & 15s SSR heartbeat
const __triggerAutopilotTick = async () => {
  try {
    if (globalThis.__nitro_vite_envs__ && globalThis.__nitro_vite_envs__["ssr"]) {
      await globalThis.__nitro_vite_envs__["ssr"].fetch(new Request("http://127.0.0.1/api/autopilot-bootstrap"));
    }
  } catch (err) {
    // non-fatal
  }
};
setTimeout(async () => {
  await __triggerAutopilotTick();
  console.log("[autopilot-bootstrap] 24/7 Zero-Click Autopilot Scheduler booted immediately on process start.");
}, 1500);
setInterval(__triggerAutopilotTick, 15000);
`;
    fs.appendFileSync(serverIndexFile, bootstrapSnippet, 'utf8');
    console.log('[fix-nitro-runtime] Injected 24/7 Autopilot Scheduler startup hook & 15s heartbeat into .output/server/index.mjs');
  }
}
