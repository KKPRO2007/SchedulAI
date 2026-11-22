import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { predictIntent } from './naiveBayes.js';

const modelUrl = new URL('./assistant-intent-model.json', import.meta.url);
const model = JSON.parse(readFileSync(fileURLToPath(modelUrl), 'utf8'));
/** Classify a timetable question with the checked-in, locally trained model. */
export function classifyAssistantIntent(question) {
  const prediction = predictIntent(model, question);
  return prediction.confidence >= 0.4
    ? prediction
    : { intent: 'all', confidence: prediction.confidence };
}
