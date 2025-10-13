const fs = require('fs');
const path = require('path');

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', 'public', 'backup', 'tests', '__tests__', '.github', 'playwright-report']);

function isCodeFile(file) {
  return CODE_EXT.has(path.extname(file));
}

function walk(dir, cb) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) {
      if (IGNORE_DIRS.has(it.name)) continue;
      walk(full, cb);
    } else if (it.isFile()) {
      cb(full);
    }
  }
}

function stripCommentsFromCode(src) {
  let out = '';
  let i = 0;
  let len = src.length;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escape = false;
  let templateDepth = 0;
  let prevChar = '';

  function prevNonWhite() {
    for (let j = out.length - 1; j >= 0; j--) {
      const ch = out[j];
      if (!/\s/.test(ch)) return ch;
    }
    return '';
  }

  while (i < len) {
    const ch = src[i];
    const next = src[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += ch;
      }
      i++;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === '/' && next === '/') {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
    }

    
    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === "'") { inSingle = true; out += ch; i++; continue; }
      if (ch === '"') { inDouble = true; out += ch; i++; continue; }
      if (ch === '`') { inTemplate = true; templateDepth = 0; out += ch; i++; continue; }
    } else if (inSingle) {
      out += ch;
      if (!escape && ch === "'") inSingle = false;
      escape = !escape && ch === '\\';
      i++; continue;
    } else if (inDouble) {
      out += ch;
      if (!escape && ch === '"') inDouble = false;
      escape = !escape && ch === '\\';
      i++; continue;
    } else if (inTemplate) {
      out += ch;
      if (!escape && ch === '`') {
        inTemplate = false;
      } else if (!escape && ch === '{' && src[i - 1] === '$') {
        templateDepth++;
      } else if (!escape && ch === '}' && templateDepth > 0) {
        templateDepth--;
      }
      escape = !escape && ch === '\\';
      i++; continue;
    }

    out += ch;
    i++;
  }
  return out;
}

function processFile(file) {
  if (!isCodeFile(file)) return;
  try {
    const src = fs.readFileSync(file, 'utf8');
    const stripped = stripCommentsFromCode(src);
    if (stripped !== src) {
      fs.writeFileSync(file, stripped, 'utf8');
      console.log('stripped', file);
    }
  } catch (e) {
    console.error('skip', file, e && e.message);
  }
}

function main() {
  const root = path.resolve(__dirname, '..');
  walk(root, (file) => processFile(file));
}

main();
