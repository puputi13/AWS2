'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.resolve(process.cwd(), 'dist');
const files = [
  'index.html',
  'hero_ready.png',
  'luna_ready.png',
  'ren_ready.png',
  'kai_ready.png',
  'enemy_slime.png',
  'enemy_bat.png',
  'enemy_goblin.png',
  'enemy_golem.png',
];

fs.mkdirSync(out, { recursive: true });
for (const name of files) {
  const source = path.join(root, name);
  if (!fs.existsSync(source)) throw new Error(`公開ファイルが見つかりません: ${name}`);
  fs.copyFileSync(source, path.join(out, name));
}
console.log(`Vercel用の静的ファイルを dist に出力しました（${files.length}ファイル）`);
