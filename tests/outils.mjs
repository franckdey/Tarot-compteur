// Outils communs aux tests : extraction du bloc de calcul de web/index.html.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export const PAGE = new URL('../web/index.html', import.meta.url);

// Charge le bloc entre « ===== CALCUL » et « ===== FIN CALCUL » dans un bac à sable
// et renvoie ses constantes et calculerDonne(), sans navigateur.
export function chargerCalcul() {
  const html = readFileSync(PAGE, 'utf8');
  const m = html.match(/\/\/ ===== CALCUL[^\n]*\n([\s\S]*?)\/\/ ===== FIN CALCUL/);
  if (!m) throw new Error('Bloc « ===== CALCUL » … « ===== FIN CALCUL » introuvable dans web/index.html');
  const ctx = {};
  vm.runInNewContext(`${m[1]}\nObject.assign(this, { CONTRATS, SEUIL, POIGNEE, ATOUTS_POIGNEE, CHELEM, calculerDonne });`, ctx);
  return ctx;
}

// Une donne par défaut, à compléter dans chaque test.
export const donne = (d = {}) => ({
  preneur: 0, appele: null, contrat: 'garde', bouts: 2, points: 41,
  petit: 'non', poigneeAtt: 0, poigneeDef: 0, chelem: 'aucun', ...d,
});
