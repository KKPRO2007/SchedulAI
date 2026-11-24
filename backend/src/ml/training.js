import { calibrateConfidenceThreshold, evaluateIntentModel, trainIntentModel } from './naiveBayes.js';

export const ASSISTANT_INTENTS = ['all', 'day', 'faculty', 'free', 'room', 'subject', 'workload'];
export const HOLDOUT_FRACTION = 0.2;
export const SPLIT_SEED = 42;

export function validateTrainingExamples(examples) {
  if (!Array.isArray(examples) || examples.length === 0) {
    throw new Error('Training data must be a non-empty array.');
  }

  const seen = new Map();
  const counts = Object.fromEntries(ASSISTANT_INTENTS.map((intent) => [intent, 0]));
  for (const [index, example] of examples.entries()) {
    const text = typeof example?.text === 'string' ? example.text.trim() : '';
    const intent = typeof example?.intent === 'string' ? example.intent.trim() : '';
    if (!text || !intent) throw new Error(`Example ${index + 1} needs non-empty text and intent.`);
    if (!ASSISTANT_INTENTS.includes(intent)) {
      throw new Error(`Example ${index + 1} has unknown intent "${intent}".`);
    }

    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
    const earlierIntent = seen.get(normalizedText);
    if (earlierIntent && earlierIntent !== intent) {
      throw new Error(`The question "${text}" has conflicting intents.`);
    }
    if (earlierIntent) throw new Error(`Duplicate training question: "${text}".`);
    seen.set(normalizedText, intent);
    counts[intent] += 1;
  }

  for (const intent of ASSISTANT_INTENTS) {
    if (counts[intent] < 2) {
      throw new Error(`Intent "${intent}" needs at least two labeled examples for holdout evaluation.`);
    }
  }
  return counts;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function stratifiedHoldout(examples, fraction = HOLDOUT_FRACTION, seed = SPLIT_SEED) {
  if (!(fraction > 0 && fraction < 1)) throw new Error('Holdout fraction must be between 0 and 1.');
  const random = seededRandom(seed);
  const grouped = new Map();
  for (const example of examples) {
    const rows = grouped.get(example.intent) ?? [];
    rows.push(example);
    grouped.set(example.intent, rows);
  }

  const training = [];
  const holdout = [];
  for (const [, rows] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (rows.length < 2) throw new Error('Each intent needs two or more examples to split.');
    const shuffled = shuffle(rows, random);
    const holdoutCount = Math.max(1, Math.min(rows.length - 1, Math.round(rows.length * fraction)));
    holdout.push(...shuffled.slice(0, holdoutCount));
    training.push(...shuffled.slice(holdoutCount));
  }
  return { training, holdout };
}

export function evaluateTrainingData(examples, { fraction = HOLDOUT_FRACTION, seed = SPLIT_SEED } = {}) {
  const intentCounts = validateTrainingExamples(examples);
  const { training, holdout } = stratifiedHoldout(examples, fraction, seed);
  const model = trainIntentModel(training);
  const calibration = calibrateConfidenceThreshold(model, holdout);
  const metrics = evaluateIntentModel(model, holdout, { confidenceThreshold: calibration.threshold });
  return {
    split: {
      method: 'stratified-holdout',
      seed,
      holdoutFraction: fraction,
      trainingExamples: training.length,
      holdoutExamples: holdout.length,
    },
    intentCounts,
    confidenceThreshold: calibration.threshold,
    metrics,
  };
}
