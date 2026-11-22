const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'does', 'do', 'for', 'give', 'have', 'in', 'is',
  'it', 'list', 'me', 'my', 'of', 'on', 'or', 'please', 'show', 'the', 'there',
  'this', 'to', 'up', 'what', 'when', 'which', 'who', 'with',
]);

export function tokenize(text) {
  return (String(text).toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((word) => !STOP_WORDS.has(word))
    .map(normalizeWord);
}

function normalizeWord(word) {
  if (word.length > 5 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && /(?:sses|ches|shes|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function extractFeatures(text) {
  return tokenize(text);
}

export function trainIntentModel(examples) {
  const labels = {};
  const vocabulary = new Set();

  for (const { text, intent } of examples) {
    const words = extractFeatures(text);
    const stats = labels[intent] ??= { documents: 0, tokenCount: 0, tokens: {} };
    stats.documents += 1;

    for (const word of words) {
      vocabulary.add(word);
      stats.tokens[word] = (stats.tokens[word] ?? 0) + 1;
      stats.tokenCount += 1;
    }
  }

  return {
    algorithm: 'multinomial-naive-bayes',
    featureExtractor: 'normalized-unigrams-v1',
    vocabulary: [...vocabulary].sort(),
    labels,
  };
}

/** Return the model's top intent and normalized posterior confidence. */
export function predictIntent(model, text) {
  const words = extractFeatures(text).filter((word) => model.vocabulary.includes(word));
  const entries = Object.entries(model.labels);
  const totalDocuments = entries.reduce((sum, [, label]) => sum + label.documents, 0);
  if (!words.length || !model.vocabulary.length || !totalDocuments) {
    return { intent: 'all', confidence: 0 };
  }

  const vocabulary = new Set(model.vocabulary);
  const vocabularySize = vocabulary.size;
  const ranked = entries.map(([intent, stats]) => {
    const prior = Math.log(stats.documents / totalDocuments);
    const denominator = stats.tokenCount + vocabularySize;
    const likelihood = words.reduce(
      (score, word) => score + Math.log(((stats.tokens[word] ?? 0) + 1) / denominator),
      0,
    );
    return { intent, score: prior + likelihood };
  }).sort((left, right) => right.score - left.score);

  const maxScore = ranked[0].score;
  const probabilities = ranked.map(({ score }) => Math.exp(score - maxScore));
  const confidence = probabilities[0] / probabilities.reduce((sum, value) => sum + value, 0);
  return { intent: ranked[0].intent, confidence };
}

export function evaluateIntentModel(model, examples, { confidenceThreshold = 0 } = {}) {
  const intents = Object.keys(model.labels).sort();
  const predictedLabels = [...intents, 'unknown'];
  const confusion = Object.fromEntries(intents.map((actual) => [
    actual,
    Object.fromEntries(predictedLabels.map((predicted) => [predicted, 0])),
  ]));
  let correct = 0;
  let accepted = 0;

  for (const example of examples) {
    const prediction = predictIntent(model, example.text);
    const predicted = prediction.confidence >= confidenceThreshold ? prediction.intent : 'unknown';
    confusion[example.intent][predicted] += 1;
    if (predicted === example.intent) correct += 1;
    if (predicted !== 'unknown') accepted += 1;
  }

  const perIntent = Object.fromEntries(intents.map((intent) => {
    const truePositive = confusion[intent][intent];
    const support = Object.values(confusion[intent]).reduce((sum, value) => sum + value, 0);
    const predictedCount = intents.reduce((sum, actual) => sum + confusion[actual][intent], 0);
    const precision = predictedCount ? truePositive / predictedCount : 0;
    const recall = support ? truePositive / support : 0;
    const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
    return [intent, { precision, recall, f1, support }];
  }));

  const macroF1 = intents.length
    ? Object.values(perIntent).reduce((sum, metric) => sum + metric.f1, 0) / intents.length
    : 0;
  return {
    examples: examples.length,
    accuracy: examples.length ? correct / examples.length : 0,
    macroF1,
    coverage: examples.length ? accepted / examples.length : 0,
    selectiveAccuracy: accepted ? correct / accepted : 0,
    perIntent,
    confusion,
  };
}

export function calibrateConfidenceThreshold(model, examples) {
  const predictions = examples.map((example) => predictIntent(model, example.text));
  const candidates = new Set([0, ...predictions.map(({ confidence }) => Math.min(1, confidence + Number.EPSILON))]);
  let best = { threshold: 0, metrics: evaluateIntentModel(model, examples) };

  for (const threshold of candidates) {
    const metrics = evaluateIntentModel(model, examples, { confidenceThreshold: threshold });
    if (
      metrics.macroF1 > best.metrics.macroF1
      || (metrics.macroF1 === best.metrics.macroF1 && metrics.coverage > best.metrics.coverage)
    ) best = { threshold, metrics };
  }

  return best;
}
