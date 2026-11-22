import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const modelUrl = new URL('./assistant-intent-model.json', import.meta.url);
const model = JSON.parse(readFileSync(fileURLToPath(modelUrl), 'utf8'));
const vocabulary = new Set(model.vocabulary);
const totalDocuments = Object.values(model.labels).reduce((sum, label) => sum + label.documents, 0);

function tokenize(text) {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** Classify a timetable question with the checked-in, locally trained model. */
export function classifyAssistantIntent(question) {
  const words = tokenize(question).filter((word) => vocabulary.has(word));
  if (words.length === 0) return { intent: 'all', confidence: 0 };

  const vocabSize = vocabulary.size;
  const ranked = Object.entries(model.labels).map(([intent, stats]) => {
    const prior = Math.log(stats.documents / totalDocuments);
    const denominator = stats.tokenCount + vocabSize;
    const likelihood = words.reduce(
      (score, word) => score + Math.log(((stats.tokens[word] ?? 0) + 1) / denominator),
      0,
    );
    return { intent, score: prior + likelihood };
  }).sort((a, b) => b.score - a.score);

  const max = ranked[0].score;
  const expScores = ranked.map(({ score }) => Math.exp(score - max));
  const confidence = expScores[0] / expScores.reduce((sum, score) => sum + score, 0);
  return { intent: confidence >= 0.4 ? ranked[0].intent : 'all', confidence };
}
