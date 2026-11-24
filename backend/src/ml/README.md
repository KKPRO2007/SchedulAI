# Assistant intent model

This backend-only ML module uses a multinomial Naive Bayes text classifier to route timetable questions to day, subject, room, faculty, full-schedule, free-slot, or workload lookups. It runs locally in Node.js with no API key or additional runtime dependency. The timetable remains the source of answers: the classifier decides which timetable entries and summaries are retrieved, and an optional hosted LLM (Groq, then Gemini) only phrases the answer from that retrieved data. Without an LLM key the assistant answers from the same retrieval with built-in templates.

## Features

Questions are lower-cased and split into words; common stop words are dropped (`who` is kept because it signals faculty questions), simple plurals are folded, weekday names become a `<day>` placeholder and plain numbers become `<num>`. The placeholders let the model learn that a day or time was mentioned without memorising which one.

## Retrain

Add labeled example questions to `assistant-training-data.json`, then run from the repository root:

```sh
npm --prefix backend run train:assistant
```

This regenerates the checked-in `assistant-intent-model.json` artifact. The backend loads that artifact when its assistant service is imported. Retraining changes classifier parameters only; it does not update the timetable or require a frontend change.

## Evaluate

Run a deterministic stratified holdout evaluation without changing the model artifact:

```sh
npm --prefix backend run evaluate:assistant
```

The report includes accuracy, per-intent precision/recall/F1, and a confusion matrix. Training rejects missing intents, duplicate questions, conflicting labels, and examples with invalid intents. Each intent must have at least two examples so the holdout split keeps examples in both the training and evaluation sets.

Training calibrates an abstention threshold from the same deterministic holdout. Low-confidence requests are routed to a short clarification response rather than being treated as a request for the entire timetable. The trainer validates the generated artifact and blocks promotion when holdout accuracy or macro F1 is below 70%; the runtime validates model format, feature extractor, class labels, vocabulary, and token counts before loading it.

The training corpus is a small starter set for intent routing, not a foundation model or a general-purpose language model. Its holdout metrics are directional because the corpus is small and hand-written. Expand it with representative, reviewed timetable questions before relying on it for broad phrasing.
