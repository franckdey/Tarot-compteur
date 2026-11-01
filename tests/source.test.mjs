// Règles de code de CLAUDE.md vérifiables sans navigateur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PAGE } from './outils.mjs';

const html = readFileSync(PAGE, 'utf8');
const script = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'));
const manifeste = readFileSync(new URL('../android/AndroidManifest.xml', import.meta.url), 'utf8');

test('pas de alert(), confirm() ni prompt() : utiliser confirmer() et toast()', () => {
  assert.doesNotMatch(script, /(^|[^.\w])(alert|confirm|prompt)\s*\(/m);
});

test('aucun script externe : l’appli tient dans index.html', () => {
  assert.doesNotMatch(html, /<script[^>]+src=/i);
});

test('la clé de stockage reste tarotCompteur.v1 (parties déjà enregistrées)', () => {
  assert.match(script, /const KEY = 'tarotCompteur\.v1'/);
});

test('le JavaScript de la page se compile', () => {
  assert.doesNotThrow(() => new Function(script.replace('<script>', '')));
});

test('manifeste Android : version et SDK', () => {
  assert.match(manifeste, /android:versionCode="\d+"/);
  assert.match(manifeste, /android:versionName="[^"]+"/);
  assert.match(manifeste, /android:minSdkVersion="23"/);
});
