const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const src = path.join(process.cwd(), 'lib', 'templates');
const out = path.join(process.cwd(), 'lib', 'templates_compiled');
if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });

for (const f of fs.readdirSync(src)) {
  if (!f.endsWith('.hbs')) continue;
  const name = f.replace(/\.hbs$/, '');
  const tpl = fs.readFileSync(path.join(src, f), 'utf8');
  const pre = Handlebars.precompile(tpl);
  fs.writeFileSync(path.join(out, `${name}.js`), `module.exports = Handlebars.template(${pre});\n`);
}
console.log('Precompiled templates');
