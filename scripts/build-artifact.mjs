// dist-artifact/index.html を claude.ai Artifact の公開形式に整える。
// Artifact は公開時に <!doctype><html><head><body> の骨組みで包むため、それらのタグを取り除いて中身だけにする。
import { readFileSync, writeFileSync } from 'node:fs';

const src = 'dist-artifact/index.html';
let html = readFileSync(src, 'utf8');
html = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<\/?body>/gi, '')
  .replace(/<meta charset="UTF-8" \/>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
// タイトルは先頭に置く（ギャラリーは先頭8KBからタイトルを読む）
const title = html.match(/<title>[^<]*<\/title>/)[0];
html = html.replace(title, '').replace(/<meta name="theme-color"[^>]*>\s*/i, '');
html = `${title}\n<meta name="claude:viewport-fit-sides" content="cover">\n${html.trim()}`;
writeFileSync('dist-artifact/futari-note.html', html.trim() + '\n');
console.log(`dist-artifact/futari-note.html (${(html.length / 1024).toFixed(0)} KB)`);
