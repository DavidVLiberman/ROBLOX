// Stamps a new build id into index.html and version.json. Run before committing:
//   node tools/stamp.mjs
// GitHub Pages (and browsers) cache files for a while, so every module is loaded
// with ?v=<build> through the import map, and index.html reloads itself when
// version.json says a newer build is live.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const d = new Date(), pad = (n) => String(n).padStart(2, '0');
const build = `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}.${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
const v = `?v=${build}`;

const modules = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? modules(`${dir}/${e.name}`) : e.name.endsWith('.js') ? [`./${dir}/${e.name}`] : []);
const imports = {
  three: `./vendor/three.module.js${v}`,
  rapier: `./vendor/rapier.es.js${v}`,
  trystero: `./vendor/trystero.js${v}`,
};
for (const m of modules('src').sort()) imports[m] = m + v;
const map = '{ "imports": {\n' + Object.entries(imports).map(([k, f]) => `  "${k}": "${f}"`).join(',\n') + '\n} }';

const file = join(root, 'index.html');
let html = readFileSync(file, 'utf8');
const swap = (re, to) => { if (!re.test(html)) throw new Error('index.html: no match for ' + re); html = html.replace(re, to); };
swap(/(<script type="importmap">\n)[\s\S]*?(\n<\/script>)/, `$1${map}$2`);
swap(/<meta name="build" content="[^"]*">/, `<meta name="build" content="${build}">`);
swap(/href="style\.css[^"]*"/, `href="style.css${v}"`);
swap(/src="src\/main\.js[^"]*"/, `src="src/main.js${v}"`);
swap(/<span class="xp-build">[^<]*<\/span>/, `<span class="xp-build">Build ${build}</span>`);
writeFileSync(file, html);
writeFileSync(join(root, 'version.json'), JSON.stringify({ build }) + '\n');
console.log('build', build, '-', Object.keys(imports).length, 'modules');
