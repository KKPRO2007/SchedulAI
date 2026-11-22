# Assistant intent model

This backend-only ML module uses a multinomial Naive Bayes text classifier to route timetable questions to day, subject, room, faculty, or full-schedule lookups. It runs locally in Node.js and has no hosted model, API key, or additional runtime dependency. The timetable remains the source of answers; the classifier selects which timetable entries to retrieve.

## Retrain

Add labeled example questions to `assistant-training-data.json`, then run from the repository root:

```sh
npm --prefix backend run train:assistant
```

This regenerates the checked-in `assistant-intent-model.json` artifact. The backend loads that artifact when its assistant service is imported. Retraining changes classifier parameters only; it does not update the timetable or require a frontend change.

The training corpus is a small starter set for intent routing, not a foundation model or a general-purpose language model. Expand it with representative, reviewed timetable questions before relying on it for broad phrasing.
