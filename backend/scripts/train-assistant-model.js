import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dataPath = path.join(root, 'src/ml/assistant-training-data.json');
const outputPath = path.join(root, 'src/ml/assistant-intent-model.json');
const examples = JSON.parse(await readFile(dataPath, 'utf8'));

function tokenize(text) {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

const labels = {};
const vocabulary = new Set();
for (const { text, intent } of examples) {
  if (!text || !intent) throw new Error('Every training example needs text and intent.');
  const words = tokenize(text);
  if (words.length === 0) throw new Error(`Empty training example for ${intent}.`);
  const model = labels[intent] ??= { documents: 0, tokenCount: 0, tokens: {} };
  model.documents += 1;
  for (const word of words) {
    vocabulary.add(word);
    model.tokens[word] = (model.tokens[word] ?? 0) + 1;
    model.tokenCount += 1;
  }
}

const artifact = {
  formatVersion: 1,
  algorithm: 'multinomial-naive-bayes',
  trainedAt: new Date().toISOString(),
  sampleCount: examples.length,
  vocabulary: [...vocabulary].sort(),
  labels,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Trained ${artifact.algorithm}: ${artifact.sampleCount} examples, ${artifact.vocabulary.length} tokens, ${Object.keys(labels).length} intents.`);
console.log(`Saved ${path.relative(root, outputPath)}`);
