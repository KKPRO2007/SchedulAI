import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { evaluateTrainingData } from '../src/ml/training.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataPath = path.join(root, 'src/ml/assistant-training-data.json');
const examples = JSON.parse(await readFile(dataPath, 'utf8'));
const report = evaluateTrainingData(examples);
const columns = [...Object.keys(report.metrics.confusion), 'unknown'];

console.log(`Split: ${report.split.method} · seed ${report.split.seed}`);
console.log(`Training: ${report.split.trainingExamples} · holdout: ${report.split.holdoutExamples}`);
console.log(`Confidence threshold: ${report.confidenceThreshold.toFixed(3)} · coverage: ${(report.metrics.coverage * 100).toFixed(1)}% · selective accuracy: ${(report.metrics.selectiveAccuracy * 100).toFixed(1)}%`);
console.log(`Accuracy: ${(report.metrics.accuracy * 100).toFixed(1)}% · macro F1: ${(report.metrics.macroF1 * 100).toFixed(1)}%`);
console.log('\nPer-intent metrics');
for (const [intent, metrics] of Object.entries(report.metrics.perIntent)) {
  console.log(`${intent.padEnd(10)} precision ${(metrics.precision * 100).toFixed(1)}% · recall ${(metrics.recall * 100).toFixed(1)}% · F1 ${(metrics.f1 * 100).toFixed(1)}% · n=${metrics.support}`);
}
console.log('\nConfusion matrix (rows = actual, columns = predicted)');
const intents = Object.keys(report.metrics.confusion);
console.log(`actual / ${columns.join(' / ')}`);
for (const intent of Object.keys(report.metrics.confusion)) {
  console.log(`${intent.padEnd(12)} ${columns.map((predicted) => String(report.metrics.confusion[intent][predicted]).padStart(4)).join(' ')}`);
}
