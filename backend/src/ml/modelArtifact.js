const REQUIRED_INTENTS = ['all', 'day', 'faculty', 'room', 'subject'];
const MODEL_FORMAT_VERSION = 2;
const MODEL_ALGORITHM = 'multinomial-naive-bayes';
const FEATURE_EXTRACTOR = 'normalized-unigrams-v1';

export function validateAssistantModel(model) {
  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    throw new Error('Assistant model artifact must be a JSON object.');
  }
  if (model.formatVersion !== MODEL_FORMAT_VERSION) {
    throw new Error(`Unsupported assistant model format: ${model.formatVersion}.`);
  }
  if (model.algorithm !== MODEL_ALGORITHM || model.featureExtractor !== FEATURE_EXTRACTOR) {
    throw new Error('Assistant model algorithm or feature extractor is unsupported.');
  }
  if (!Array.isArray(model.vocabulary) || model.vocabulary.length === 0) {
    throw new Error('Assistant model vocabulary is missing.');
  }
  if (model.vocabulary.some((term) => typeof term !== 'string' || !term)) {
    throw new Error('Assistant model vocabulary contains an invalid feature.');
  }
  if (new Set(model.vocabulary).size !== model.vocabulary.length) {
    throw new Error('Assistant model vocabulary contains duplicate features.');
  }
  if (!Number.isFinite(model.confidenceThreshold) || model.confidenceThreshold < 0 || model.confidenceThreshold > 1) {
    throw new Error('Assistant model confidence threshold must be between zero and one.');
  }
  if (!Number.isInteger(model.sampleCount) || model.sampleCount < 1) {
    throw new Error('Assistant model sample count is invalid.');
  }
  if (!model.labels || typeof model.labels !== 'object' || Array.isArray(model.labels)) {
    throw new Error('Assistant model labels are missing.');
  }
  const labels = Object.keys(model.labels).sort();
  if (labels.join('|') !== [...REQUIRED_INTENTS].sort().join('|')) {
    throw new Error('Assistant model has a missing or unexpected intent label.');
  }

  const vocabulary = new Set(model.vocabulary);
  let sampleTotal = 0;
  for (const [intent, stats] of Object.entries(model.labels)) {
    if (!Number.isInteger(stats.documents) || stats.documents < 1) {
      throw new Error(`Assistant model intent "${intent}" has an invalid document count.`);
    }
    if (!Number.isInteger(stats.tokenCount) || stats.tokenCount < 1 || !stats.tokens || typeof stats.tokens !== 'object') {
      throw new Error(`Assistant model intent "${intent}" has invalid token statistics.`);
    }
    const tokenTotal = Object.entries(stats.tokens).reduce((sum, [token, count]) => {
      if (!vocabulary.has(token) || !Number.isInteger(count) || count < 1) {
        throw new Error(`Assistant model intent "${intent}" has an invalid token entry.`);
      }
      return sum + count;
    }, 0);
    if (tokenTotal !== stats.tokenCount) {
      throw new Error(`Assistant model intent "${intent}" has inconsistent token counts.`);
    }
    sampleTotal += stats.documents;
  }
  if (sampleTotal !== model.sampleCount) {
    throw new Error('Assistant model sample count does not match its intent counts.');
  }
  return model;
}

export function validateModelQuality(evaluation) {
  const minimumAccuracy = 0.7;
  const minimumMacroF1 = 0.7;
  if (!evaluation || evaluation.accuracy < minimumAccuracy || evaluation.macroF1 < minimumMacroF1) {
    throw new Error(
      `Assistant model quality gate failed: accuracy must be ≥${minimumAccuracy} and macro F1 ≥${minimumMacroF1}.`,
    );
  }
  return evaluation;
}
