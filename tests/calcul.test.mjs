// Règles de marque de la FFT appliquées par calculerDonne(d, n).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chargerCalcul, donne } from './outils.mjs';

const { calculerDonne, CONTRATS, SEUIL, POIGNEE, CHELEM, ATOUTS_POIGNEE } = chargerCalcul();
const scores = (d, n) => Array.from(calculerDonne(donne(d), n).scores);
const somme = t => t.reduce((a, b) => a + b, 0);

test('tables de référence', () => {
  assert.deepEqual(Array.from(SEUIL), [56, 51, 41, 36]);
  assert.deepEqual(Object.fromEntries(Object.entries(CONTRATS).map(([k, c]) => [k, c.k])),
    { petite: 1, garde: 2, gsans: 4, gcontre: 6 });
  assert.deepEqual({ ...POIGNEE }, { 0: 0, 1: 20, 2: 30, 3: 40 });
  assert.deepEqual(Object.fromEntries(Object.entries(CHELEM).map(([k, c]) => [k, c.v])),
    { aucun: 0, annonceOk: 400, annonceKo: -200, nonAnnonce: 200, defense: -200 });
  assert.deepEqual(JSON.parse(JSON.stringify(ATOUTS_POIGNEE)), { 3: [13, 15, 18], 4: [10, 13, 15], 5: [8, 10, 13] });
});

test('contrat juste fait : 25 × coefficient', () => {
  for (const [contrat, k] of [['petite', 1], ['garde', 2], ['gsans', 4], ['gcontre', 6]]) {
    const r = calculerDonne(donne({ contrat, bouts: 2, points: 41 }), 4);
    assert.equal(r.gagne, true);
    assert.equal(r.T, 25 * k, contrat);
  }
});

test('points à faire selon les bouts', () => {
  for (const [bouts, seuil] of [[0, 56], [1, 51], [2, 41], [3, 36]]) {
    assert.equal(calculerDonne(donne({ bouts, points: seuil }), 4).gagne, true, `${bouts} bout(s), ${seuil} pts`);
    assert.equal(calculerDonne(donne({ bouts, points: seuil - 0.5 }), 4).gagne, false, `${bouts} bout(s), ${seuil - 0.5} pts`);
  }
});

test('écart ajouté à la marque, un demi-point compte pour un point', () => {
  // Garde, 1 bout, 60 pts : faite de 9 → (25 + 9) × 2 = 68
  assert.equal(calculerDonne(donne({ bouts: 1, points: 60 }), 4).T, 68);
  // Garde, 1 bout, 60,5 pts : faite de 9,5 → 10 → 70
  assert.equal(calculerDonne(donne({ bouts: 1, points: 60.5 }), 4).T, 70);
  // Garde, 1 bout, 50,5 pts : chutée de 0,5 → 1 → −52
  const r = calculerDonne(donne({ bouts: 1, points: 50.5 }), 4);
  assert.equal(r.gagne, false);
  assert.equal(r.ecartArrondi, 1);
  assert.equal(r.T, -52);
});

test('répartition à 3 joueurs : preneur ×2', () => {
  assert.deepEqual(scores({ preneur: 1, contrat: 'petite', bouts: 2, points: 51 }, 3), [-35, 70, -35]);
});

test('répartition à 4 joueurs : preneur ×3', () => {
  assert.deepEqual(scores({ preneur: 2, contrat: 'garde', bouts: 2, points: 41 }, 4), [-50, -50, 150, -50]);
  assert.deepEqual(scores({ preneur: 0, contrat: 'garde', bouts: 2, points: 31 }, 4), [-210, 70, 70, 70]);
});

test('répartition à 5 joueurs : preneur ×2, partenaire ×1', () => {
  assert.deepEqual(scores({ preneur: 0, appele: 3, contrat: 'garde', bouts: 2, points: 41 }, 5), [100, -50, -50, 50, -50]);
});

test('à 5 joueurs, preneur appelé seul : ×4', () => {
  assert.deepEqual(scores({ preneur: 4, appele: 4, contrat: 'petite', bouts: 3, points: 36 }, 5), [-25, -25, -25, -25, 100]);
});

test('petit au bout : 10 × coefficient au camp qui le mène', () => {
  assert.equal(calculerDonne(donne({ contrat: 'gsans', petit: 'att' }), 4).T, 25 * 4 + 40);
  assert.equal(calculerDonne(donne({ contrat: 'gsans', petit: 'def' }), 4).T, 25 * 4 - 40);
  // l'attaque chute mais mène le petit au bout : il lui reste acquis
  assert.equal(calculerDonne(donne({ contrat: 'garde', points: 40, petit: 'att' }), 4).T, -52 + 20);
});

test('poignées : sans coefficient, au camp qui gagne la donne', () => {
  assert.equal(calculerDonne(donne({ contrat: 'gcontre', poigneeAtt: 1 }), 4).T, 150 + 20);
  assert.equal(calculerDonne(donne({ contrat: 'gcontre', poigneeAtt: 3 }), 4).T, 150 + 40);
  // poignée de la défense mais attaque gagnante : elle va à l'attaque
  assert.equal(calculerDonne(donne({ poigneeDef: 2 }), 4).T, 50 + 30);
  // poignée de l'attaque mais attaque chutée : elle va à la défense
  assert.equal(calculerDonne(donne({ points: 40, poigneeAtt: 2 }), 4).T, -52 - 30);
});

test('chelem', () => {
  assert.equal(calculerDonne(donne({ points: 91, chelem: 'annonceOk' }), 4).T, (25 + 50) * 2 + 400);
  assert.equal(calculerDonne(donne({ points: 91, chelem: 'nonAnnonce' }), 4).T, (25 + 50) * 2 + 200);
  assert.equal(calculerDonne(donne({ points: 60, chelem: 'annonceKo' }), 4).T, (25 + 19) * 2 - 200);
  assert.equal(calculerDonne(donne({ points: 0, chelem: 'defense' }), 4).T, -(25 + 41) * 2 - 200);
});

test('champs facultatifs absents (anciennes donnes enregistrées)', () => {
  const r = calculerDonne({ preneur: 0, contrat: 'garde', bouts: 2, points: 41 }, 4);
  assert.deepEqual(Array.from(r.scores), [150, -50, -50, -50]);
});

test('pas de « −0 » dans les scores', () => {
  // −0 s'afficherait « 0 » mais fausserait les comparaisons Object.is et les sérialisations.
  for (const n of [3, 4, 5]) for (const pts of [0, 20.5, 41, 91]) {
    for (const v of scores({ points: pts, appele: n === 5 ? 1 : null }, n)) assert.ok(!Object.is(v, -0), `−0 avec ${n} joueurs, ${pts} pts`);
  }
});

test('la somme d’une donne fait toujours zéro', () => {
  let nb = 0;
  for (const n of [3, 4, 5]) for (const contrat of Object.keys(CONTRATS)) for (const bouts of [0, 1, 2, 3])
    for (let points = 0; points <= 91; points += 6.5) for (const petit of ['non', 'att', 'def'])
      for (const poigneeAtt of [0, 1, 2, 3]) for (const chelem of Object.keys(CHELEM))
        for (const preneur of [0, n - 1]) for (const appele of n === 5 ? [preneur, (preneur + 2) % n] : [null]) {
          const d = { preneur, appele, contrat, bouts, points, petit, poigneeAtt, poigneeDef: (poigneeAtt + 1) % 4, chelem };
          const t = scores(d, n);
          assert.equal(t.length, n);
          assert.ok(t.every(Number.isInteger), JSON.stringify(d));
          assert.equal(somme(t), 0, JSON.stringify({ n, ...d }));
          nb++;
        }
  assert.ok(nb > 10000);
});
