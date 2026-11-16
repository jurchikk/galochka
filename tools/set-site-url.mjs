// Прописывает адрес сайта во все файлы, где он нужен целиком:
// canonical, Open Graph, разметка schema.org, sitemap.xml, robots.txt и страница 404.
//
// Запуск: node tools/set-site-url.mjs https://имя.github.io/galochka/

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'site.config.json');
const files = ['index.html', '404.html', 'sitemap.xml', 'robots.txt', 'llms.txt', 'README.md'];

const input = process.argv[2];
if (!input) {
  console.error('Укажите адрес сайта: node tools/set-site-url.mjs https://имя.github.io/galochka/');
  process.exit(1);
}

let next;
try {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('нужен адрес с https://');
  next = url.origin + url.pathname.replace(/\/*$/, '/');
} catch (error) {
  console.error(`Адрес не подошёл: ${error.message}`);
  process.exit(1);
}

const config = JSON.parse(await readFile(configPath, 'utf8'));
const previous = config.siteUrl;

if (previous === next) {
  console.log(`Адрес уже установлен: ${next}`);
  process.exit(0);
}

for (const name of files) {
  const file = path.join(root, name);
  const text = await readFile(file, 'utf8');
  const count = text.split(previous).length - 1;
  await writeFile(file, text.split(previous).join(next));
  console.log(`${name}: заменено ${count}`);
}

await writeFile(configPath, `${JSON.stringify({ siteUrl: next }, null, 2)}\n`);
console.log(`Готово: ${previous} → ${next}`);
