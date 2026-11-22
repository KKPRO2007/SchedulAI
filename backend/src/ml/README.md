# Assistant intent model

This backend-only ML module uses a multinomial Naive Bayes text classifier to route timetable questions to day, subject, room, faculty, or full-schedule lookups. It runs locally in Node.js and has no hosted model, API key, or additional runtime dependency. The timetable remains the source of answers; the classifier selects which timetable entries to retrieve.

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
