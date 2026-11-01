// La page web dans Chromium, à la taille d'un téléphone (OnePlus Nord : ~400 px de large).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { PAGE, chargerCalcul } from './outils.mjs';

const { calculerDonne } = chargerCalcul();
const LARGEUR = 400;
let navigateur;

before(async () => {
  navigateur = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => { await navigateur?.close(); });

// Ouvre la page dans un contexte neuf. `stockage` pré-remplit localStorage.
// Les vraies polices Google sont chargées : la largeur des prénoms en dépend.
async function ouvrir(stockage) {
  const ctx = await navigateur.newContext({ viewport: { width: LARGEUR, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  if (stockage) await ctx.addInitScript(v => { if (!sessionStorage.getItem('init')) { localStorage.setItem('tarotCompteur.v1', v); sessionStorage.setItem('init', '1'); } }, JSON.stringify(stockage));
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('dialog', d => { erreurs.push(`boîte de dialogue native : ${d.message()}`); d.dismiss(); });
  await page.goto(PAGE.href);
  await page.evaluate(() => document.fonts.ready);
  return { page, erreurs, fermer: () => ctx.close() };
}

async function pasDeDefilementHorizontal(page, ou) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(sw <= cw, `défilement horizontal ${ou} : ${sw} px pour ${cw} px`);
}

// Vérifie que chaque prénom affiché tient en entier dans sa case (ajusterNoms).
async function nomsLisibles(page, selecteur) {
  await page.evaluate(() => document.fonts.ready);
  const debordes = await page.$$eval(selecteur, els => els.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
  assert.deepEqual(debordes, [], `prénoms coupés : ${debordes.join(', ')}`);
}

const choisir = (page, idSeg, texte) => page.locator(`#${idSeg} button`, { hasText: texte }).first().click();

test('accueil : s’affiche sans erreur ni défilement horizontal', async () => {
  const { page, erreurs, fermer } = await ouvrir();
  await page.getByRole('heading', { name: 'Nouvelle partie' }).waitFor();
  await pasDeDefilementHorizontal(page, 'sur l’accueil');
  assert.deepEqual(erreurs, []);
  await fermer();
});

test('partie complète à 5 joueurs aux prénoms longs', async () => {
  const { page, erreurs, fermer } = await ouvrir();
  const joueurs = ['Maximilienne', 'Bartholomew', 'Jean-Baptiste', 'Marie-Chantal', 'Ève'];
  for (const j of joueurs) { await page.fill('#nouveau', j); await page.click('#addForm button[type=submit]'); }
  await page.getByRole('button', { name: 'Commencer à 5 joueurs' }).click();
  await nomsLisibles(page, '.tot .nm');

  // Donne 1 : garde de Maximilienne avec Jean-Baptiste, 2 bouts, 47 points, petit au bout.
  await page.getByRole('button', { name: 'Ajouter une donne' }).click();
  await choisir(page, 'preneur', 'Maximilienne');
  await choisir(page, 'appele', 'Jean-Baptiste');
  await choisir(page, 'contrat', 'Garde');
  await choisir(page, 'bouts', '2');
  await page.fill('#pts', '47');
  await page.click('#extras summary');
  await choisir(page, 'petit', 'Attaque');
  await pasDeDefilementHorizontal(page, 'dans la saisie');
  await nomsLisibles(page, '.pv .nm');
  await page.click('#ok');

  // Donne 2 : garde contre de Ève seule, 1 bout, défense saisie à 45 → attaque 46, chutée.
  await page.getByRole('button', { name: 'Ajouter une donne' }).click();
  await choisir(page, 'preneur', 'Ève');
  await choisir(page, 'appele', 'Ève');
  await choisir(page, 'contrat', 'Garde contre');
  await choisir(page, 'bouts', '1');
  await page.click('#swap');
  await page.fill('#pts', '45');
  await page.click('#ok');

  const attendu = [
    { preneur: 0, appele: 2, contrat: 'garde', bouts: 2, points: 47, petit: 'att', poigneeAtt: 0, poigneeDef: 0, chelem: 'aucun' },
    { preneur: 4, appele: 4, contrat: 'gcontre', bouts: 1, points: 46, petit: 'non', poigneeAtt: 0, poigneeDef: 0, chelem: 'aucun' },
  ];
  const stock = await page.evaluate(() => JSON.parse(localStorage.getItem('tarotCompteur.v1')));
  assert.deepEqual(stock.partie.joueurs, joueurs);
  assert.deepEqual(stock.partie.donnes, attendu);

  const totaux = attendu.reduce((t, d) => t.map((v, i) => v + calculerDonne(d, 5).scores[i]), [0, 0, 0, 0, 0]);
  const affiches = await page.$$eval('.tot .pt', els => els.map(e => Number(e.textContent.replace('−', '-'))));
  assert.deepEqual(affiches, totaux);
  assert.equal(totaux.reduce((a, b) => a + b, 0), 0);

  await pasDeDefilementHorizontal(page, 'sur la feuille de marque');
  await nomsLisibles(page, 'th .nm');

  // Les scores survivent au rechargement.
  await page.reload();
  assert.deepEqual(await page.$$eval('.tot .pt', els => els.map(e => Number(e.textContent.replace('−', '-')))), totaux);
  assert.deepEqual(erreurs, []);
  await fermer();
});

test('corriger puis supprimer une donne', async () => {
  const partie = { id: 'x', debut: Date.now(), joueurs: ['Ana', 'Bob', 'Cid', 'Dan'], premierDonneur: 0,
    donnes: [{ preneur: 1, appele: null, contrat: 'garde', bouts: 2, points: 41, petit: 'non', poigneeAtt: 0, poigneeDef: 0, chelem: 'aucun' }] };
  const { page, erreurs, fermer } = await ouvrir({ partie, archives: [], habitues: partie.joueurs, derniersNoms: partie.joueurs });
  assert.deepEqual(await page.$$eval('.tot .pt', els => els.map(e => e.textContent)), ['−50', '150', '−50', '−50'].map(s => s.replace('−', '-')));

  await page.click('tbody.dn');
  await choisir(page, 'contrat', 'Petite');
  await page.click('#ok');
  assert.deepEqual(await page.$$eval('.tot .pt', els => els.map(e => e.textContent)), ['-25', '75', '-25', '-25']);

  await page.click('tbody.dn');
  await page.click('#suppr');
  await page.click('#cYes');
  assert.equal(await page.locator('tbody.dn').count(), 0);
  assert.deepEqual(erreurs, []);
  await fermer();
});

test('données d’une ancienne version : la page les relit sans erreur', async () => {
  // Format d'avant la liste des habitués, donnes sans les champs facultatifs.
  const archive = { id: 'a', debut: Date.UTC(2026, 9, 3), fin: Date.UTC(2026, 9, 3, 23), joueurs: ['Léa', 'Tom', 'Zoé'], premierDonneur: 0,
    donnes: [{ preneur: 0, contrat: 'garde', bouts: 1, points: 55 }] };
  const { page, erreurs, fermer } = await ouvrir({ partie: null, archives: [archive], derniersNoms: ['Léa', 'Tom', 'Zoé'] });
  await page.getByRole('heading', { name: 'Parties précédentes' }).waitFor();
  assert.match(await page.locator('.hist .res').first().textContent(), /Léa 116/);
  assert.equal(await page.locator('.roster .pj').count(), 3);
  assert.deepEqual(erreurs, []);
  await fermer();
});

test('bouton retour Android : ferme la saisie, puis laisse quitter', async () => {
  const joueurs = ['Ana', 'Bob', 'Cid'];
  const { page, erreurs, fermer } = await ouvrir({ partie: { id: 'x', debut: Date.now(), joueurs, premierDonneur: 0, donnes: [] }, archives: [], habitues: joueurs });
  await page.getByRole('button', { name: 'Ajouter une donne' }).click();
  assert.equal(await page.evaluate(() => window.retourAndroid()), true);
  assert.equal(await page.locator('.sheet').count(), 0);
  assert.equal(await page.evaluate(() => window.retourAndroid()), false);
  assert.deepEqual(erreurs, []);
  await fermer();
});
