import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { trainIntentModel } from '../src/ml/naiveBayes.js';
import { evaluateTrainingData } from '../src/ml/training.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataPath = path.join(root, 'src/ml/assistant-training-data.json');
const outputPath = path.join(root, 'src/ml/assistant-intent-model.json');
const examples = JSON.parse(await readFile(dataPath, 'utf8'));
const evaluation = evaluateTrainingData(examples);
const model = trainIntentModel(examples);

const artifact = {
  formatVersion: 2,
  algorithm: model.algorithm,
  trainedAt: new Date().toISOString(),
  sampleCount: examples.length,
  intentCounts: evaluation.intentCounts,
  evaluation: { ...evaluation.split, ...evaluation.metrics },
  vocabulary: model.vocabulary,
  labels: model.labels,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Trained ${artifact.algorithm} using ${artifact.sampleCount} examples and ${artifact.vocabulary.length} tokens.`);
console.log(`Held-out accuracy: ${(artifact.evaluation.accuracy * 100).toFixed(1)}% · macro F1: ${(artifact.evaluation.macroF1 * 100).toFixed(1)}% (${artifact.evaluation.holdoutExamples} questions).`);
console.log(`Saved ${path.relative(root, outputPath)}`);
