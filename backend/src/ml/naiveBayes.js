const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'can', 'does', 'do', 'for', 'give', 'have', 'in', 'is',
  'it', 'list', 'me', 'my', 'of', 'on', 'or', 'please', 'show', 'the', 'there',
  'this', 'to', 'up', 'what', 'when', 'which', 'who', 'with',
]);

export function tokenize(text) {
  return (String(text).toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((word) => !STOP_WORDS.has(word));
}

export function trainIntentModel(examples) {
  const labels = {};
  const vocabulary = new Set();

  for (const { text, intent } of examples) {
    const words = tokenize(text);
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
    vocabulary: [...vocabulary].sort(),
    labels,
  };
}

/** Return the model's top intent and normalized posterior confidence. */
export function predictIntent(model, text) {
  const words = tokenize(text).filter((word) => model.vocabulary.includes(word));
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

export function evaluateIntentModel(model, examples) {
  const intents = Object.keys(model.labels).sort();
  const confusion = Object.fromEntries(intents.map((actual) => [
    actual,
    Object.fromEntries(intents.map((predicted) => [predicted, 0])),
  ]));
  let correct = 0;

  for (const example of examples) {
    const { intent: predicted } = predictIntent(model, example.text);
    confusion[example.intent][predicted] += 1;
    if (predicted === example.intent) correct += 1;
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
    perIntent,
    confusion,
  };
}
