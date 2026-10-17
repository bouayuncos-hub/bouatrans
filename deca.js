// ============================================================
// BOUA Trans — téléchargement public d'un DeCA
// URL : https://<ton-site>/api/deca?id=XXXXXXXX
// Fonction serverless Vercel (aucune installation : ce fichier suffit,
// dans un dossier "api" à la racine du dépôt GitHub).
// Elle lit le PDF enregistré par l'admin dans Firestore et le renvoie
// tel quel : lien HTTPS, téléchargement direct, sans identifiant,
// comme l'exige la réglementation du DeCA pour les contrôles routiers.
// ============================================================
const PROJET = 'boua-trans';
const CLE_API = 'AIzaSyCHwmEXwt67fDeUC8J3cBtN3bNJ555Po6Q';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;

function repondreTexte(res, code, message){
  res.statusCode = code;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(message);
}

module.exports = async (req, res) => {
  try {
    const params = new URL(req.url, 'https://local').searchParams;
    const id = String(params.get('id') || '').trim();
    if(!/^[A-Za-z0-9]{10,40}$/.test(id)) return repondreTexte(res, 400, 'Identificador de documento no válido.');

    const [meta, fichier] = await Promise.all([
      fetch(`${BASE}/deca/${id}?key=${CLE_API}`),
      fetch(`${BASE}/deca_pdf/${id}?key=${CLE_API}`)
    ]);
    if(fichier.status === 404) return repondreTexte(res, 404, 'Documento no encontrado.');
    if(!fichier.ok) return repondreTexte(res, 502, 'Documento temporalmente no disponible. Inténtelo de nuevo.');

    const infos = meta.ok ? await meta.json() : null;
    const champs = (infos && infos.fields) || {};
    if(champs.statut && champs.statut.stringValue === 'annule') return repondreTexte(res, 410, 'Este documento de control ha sido anulado.');

    const donnees = await fichier.json();
    const contenu = donnees.fields && donnees.fields.contenu && donnees.fields.contenu.stringValue;
    if(!contenu) return repondreTexte(res, 404, 'Documento no encontrado.');

    const pdf = Buffer.from(contenu, 'base64');
    const numero = ((champs.numero && champs.numero.stringValue) || id).replace(/[^\w-]/g, '');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Content-Disposition', `${params.get('dl') ? 'attachment' : 'inline'}; filename="DeCA-${numero}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.end(pdf);
  } catch (err) {
    console.error('DeCA :', err);
    repondreTexte(res, 500, 'Error al recuperar el documento.');
  }
};
