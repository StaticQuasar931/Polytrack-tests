# Firebase setup (Hosting + Firestore, free plan compatible)

Project:
- Project ID: `polytrack-052`
- Web App ID: `1:1000092276003:web:dbde7b8770d345f1ea6896`

## Firestore collections used

- `leaderboards_overall/main`
  - `entries: [{ rank, name, score, raceCount, totalTracks }]`
- `leaderboards_tracks/{trackId}`
  - `entries: [{ rank, name, timeMs, userId, attempts, updatedAt }]`
- `tracks_catalog/{trackId}`
  - `title, author, category, updatedAt`
- `race_results/{docId}` *(optional archival / analytics)*

## Rules to deploy

Use the `firestore.rules` file in this repo.

Deploy command:

```bash
firebase deploy --only firestore:rules
```

## Hosting deploy

```bash
firebase deploy --only hosting
```

## Important operational note

For this public project:
- Keep client writes disabled in Firestore rules.
- Update leaderboard and track docs from Firebase Console (or trusted backend tooling later).
- If you later add authenticated submissions, we can add a moderated queue with strict validation rules.
