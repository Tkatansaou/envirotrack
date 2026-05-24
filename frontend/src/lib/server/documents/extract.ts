import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import mammoth from 'mammoth';
import { createLogger } from '@/lib/server/logger';

const log = createLogger();

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExtractedFields {
  projectName: string | null;
  projectType: 'ROUTE' | 'BATIMENT' | 'MINE' | 'ENERGIE' | 'AGRICULTURE' | 'AUTRE' | null;
  region: string | null;
  prefecture: string | null;
  canton: string | null;
  maitreOuvrage: string | null;
  financement: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  superficie: number | null;
  // EIES 9 sections (Décret 2017-040/PR)
  eiesSections: {
    resume: string | null;
    cadreJuridique: string | null;
    descriptionProjet: string | null;
    methodes: string | null;
    etatInitial: string | null;
    impacts: string | null;
    pges: string | null;
    consultation: string | null;
    conclusion: string | null;
  } | null;
  pgesMeasures: Array<{
    title: string;
    phase: 'PREPARATION' | 'CONSTRUCTION' | 'EXPLOITATION' | 'FERMETURE';
    composante: 'EAU' | 'AIR' | 'SOL' | 'BIODIVERSITE' | 'SOCIAL' | 'SANTE' | 'AUTRE';
  }> | null;
  regulations: string[] | null;
  confidence: number;
}

// ─── Main extraction function ────────────────────────────────────────────────

export async function extractFromDocument(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ExtractedFields> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY_NOT_CONFIGURED');

  const client = new Anthropic({ apiKey });

  const SYSTEM = `Vous êtes un expert en Études d'Impact Environnemental et Social (EIES) au Togo.
Analysez le document fourni et extrayez les informations structurées selon le Décret 2017-040/PR et la Loi 2008-005 sur l'environnement.
Répondez UNIQUEMENT avec un objet JSON valide, sans balises markdown ni texte autour.`;

  const EXTRACTION_PROMPT = `Extrayez toutes les informations suivantes du document. Mettez null si l'information est absente.

Format JSON attendu (respectez exactement les noms de champs) :
{
  "projectName": "nom du projet",
  "projectType": "ROUTE | BATIMENT | MINE | ENERGIE | AGRICULTURE | AUTRE",
  "region": "une des 6 régions du Togo : Lomé-Commune, Maritime, Plateaux, Centrale, Kara, Savanes",
  "prefecture": "nom de la préfecture",
  "canton": "nom du canton (optionnel)",
  "maitreOuvrage": "maître d'ouvrage (promoteur du projet)",
  "financement": "source de financement",
  "description": "résumé des objectifs et de la nature du projet (max 500 caractères)",
  "latitude": null,
  "longitude": null,
  "superficie": null,
  "eiesSections": {
    "resume": "résumé non technique (section 1)",
    "cadreJuridique": "cadre politique, juridique et institutionnel (section 2)",
    "descriptionProjet": "description du projet (section 3)",
    "methodes": "méthodes utilisées dans l'étude (section 4)",
    "etatInitial": "état initial de l'environnement (section 5)",
    "impacts": "identification et évaluation des impacts (section 6)",
    "pges": "plan de gestion environnementale et sociale (section 7)",
    "consultation": "programme de consultation publique (section 8)",
    "conclusion": "conclusion et recommandations (section 9)"
  },
  "pgesMeasures": [
    {
      "title": "titre de la mesure",
      "phase": "PREPARATION | CONSTRUCTION | EXPLOITATION | FERMETURE",
      "composante": "EAU | AIR | SOL | BIODIVERSITE | SOCIAL | SANTE | AUTRE"
    }
  ],
  "regulations": ["Loi 2008-005", "Décret 2017-040", "..."],
  "confidence": 0.0
}

Pour confidence : 0.9+ si le document est clairement une EIES complète, 0.5-0.9 si partiel, <0.5 si le document n'est pas une EIES.`;

  try {
    // All formats → text → Claude first (primary), DeepSeek fallback if Claude billing fails
    const text = await bufferToText(buffer, mimeType);
    const truncated =
      text.length > 120_000
        ? text.slice(0, 120_000) + '\n\n[Document tronqué — limite de 120 000 caractères]'
        : text;
    const userContent = `Fichier : ${filename}\n\n---\n${truncated}\n---\n\n${EXTRACTION_PROMPT}`;

    // Claude (primary — reprend automatiquement dès que l'abonnement est actif)
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: 'user', content: [{ type: 'text', text: userContent }] }],
      });
      const raw = message.content[0];
      if (raw?.type !== 'text') throw new Error('UNEXPECTED_RESPONSE_TYPE');
      log.info('Document extraction via Claude', { filename, mimeType });
      return JSON.parse(cleanJson(raw.text)) as ExtractedFields;
    } catch (claudeErr) {
      const msg = String(claudeErr);
      const isBillingError =
        msg.includes('credit balance') ||
        msg.includes('billing') ||
        msg.includes('insufficient_quota') ||
        msg.includes('overloaded');
      if (!isBillingError) throw claudeErr;
      log.warn('Claude billing issue, trying DeepSeek fallback', { error: msg, filename });
    }

    // DeepSeek fallback (crédits Claude épuisés)
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) throw new Error('CLAUDE_CREDITS_EXHAUSTED_AND_NO_DEEPSEEK_KEY');
    const result = await extractWithDeepSeek(deepseekKey, SYSTEM, userContent);
    log.info('Document extraction via DeepSeek (Claude billing fallback)', { filename, mimeType });
    return result;
  } catch (err) {
    log.warn('Document extraction failed', { error: String(err), filename });
    throw err;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function extractWithDeepSeek(
  apiKey: string,
  system: string,
  userContent: string,
): Promise<ExtractedFields> {
  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`DeepSeek API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const text = data.choices[0]?.message.content;
  if (!text) throw new Error('DeepSeek returned empty response');
  return JSON.parse(cleanJson(text)) as ExtractedFields;
}

async function bufferToText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const { extractText } = await import('unpdf');
    const { text } = await extractText(new Uint8Array(buffer));
    return Array.isArray(text) ? text.join('\n\n') : (text as string);
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // TXT / plain
  return buffer.toString('utf-8');
}

function cleanJson(raw: string): string {
  // Strip optional markdown code fences Claude sometimes adds
  const match = /```(?:json)?\s*([\s\S]*?)```/.exec(raw);
  if (match?.[1]) return match[1].trim();
  return raw.trim();
}
