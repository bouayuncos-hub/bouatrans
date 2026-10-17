// ============================================================
// BOUA Trans — téléchargement public d'un DeCA
// URL : https://<ton-site>/api/deca?id=XXXXXXXX   (&dl=1 pour forcer l'enregistrement)
// Fonction serverless Vercel : ce fichier dans un dossier "api" à la racine
// du dépôt GitHub suffit, aucune installation.
// Elle lit le PDF enregistré par l'admin dans Firestore et le renvoie tel
// quel : HTTPS, téléchargement direct, sans identifiant (exigence DeCA).
// Robuste : 3 essais avec délai maximal, réponses claires en espagnol pour
// l'inspection, requêtes HEAD / OPTIONS acceptées.
// ============================================================
const PROJET = 'boua-trans';
const CLE_API = 'AIzaSyCHwmEXwt67fDeUC8J3cBtN3bNJ555Po6Q';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;

function entetesCommuns(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}
function repondreTexte(res, code, message){
  res.statusCode = code;
  entetesCommuns(res);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(message);
}
// Lecture Firestore avec délai maximal (8 s) et jusqu'à 3 essais
async function lireDocument(chemin){
  let derniere;
  for(let essai = 0; essai < 3; essai++){
    const controleur = new AbortController();
    const minuterie = setTimeout(() => controleur.abort(), 8000);
    try {
      const rep = await fetch(`${BASE}/${chemin}?key=${CLE_API}`, { signal: controleur.signal });
      clearTimeout(minuterie);
      if(rep.status === 404) return null;
      if(rep.ok) return await rep.json();
      derniere = new Error(`Firestore ${rep.status}`);
      if(rep.status < 500 && rep.status !== 429) break; // erreur définitive (ex : règles)
    } catch (err) {
      clearTimeout(minuterie);
      derniere = err;
    }
    await new Promise(r => setTimeout(r, 300 * (essai + 1)));
  }
  throw derniere;
}

module.exports = async (req, res) => {
  if(req.method === 'OPTIONS'){ res.statusCode = 204; entetesCommuns(res); return res.end(); }
  if(req.method !== 'GET' && req.method !== 'HEAD') return repondreTexte(res, 405, 'Método no permitido.');
  try {
    const params = new URL(req.url, 'https://local').searchParams;
    const id = String(params.get('id') || '').trim();
    if(!/^[A-Za-z0-9]{10,40}$/.test(id)) return repondreTexte(res, 400, 'Identificador de documento no válido.');

    const [infos, fichier] = await Promise.all([lireDocument(`deca/${id}`).catch(() => null), lireDocument(`deca_pdf/${id}`)]);
    if(!fichier) return repondreTexte(res, 404, 'Documento de control no encontrado.');
    const champs = (infos && infos.fields) || {};
    if(champs.statut && champs.statut.stringValue === 'annule') return repondreTexte(res, 410, 'Este documento de control ha sido anulado.');

    const contenu = fichier.fields && fichier.fields.contenu && fichier.fields.contenu.stringValue;
    if(!contenu) return repondreTexte(res, 404, 'Documento de control no encontrado.');
    const pdf = Buffer.from(contenu, 'base64');
    if(pdf.slice(0, 5).toString() !== '%PDF-') return repondreTexte(res, 500, 'Documento dañado. Contacte con el transportista.');

    const numero = ((champs.numero && champs.numero.stringValue) || id).replace(/[^\w-]/g, '');
    res.statusCode = 200;
    entetesCommuns(res);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Content-Disposition', `${params.get('dl') ? 'attachment' : 'inline'}; filename="DeCA-${numero}.pdf"`);
    res.end(req.method === 'HEAD' ? undefined : pdf);
  } catch (err) {
    console.error('DeCA :', err);
    repondreTexte(res, 503, 'Servicio temporalmente no disponible. Vuelva a escanear el código en unos segundos.');
  }
};
