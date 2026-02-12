# Firebase setup (Hosting + Firestore, no Functions)

Project:
- Project ID: `polytrack-052`
- Web App ID: `1:1000092276003:web:dbde7b8770d345f1ea6896`

## Collections used by current build

1. `leaderboards_overall/main`
   - `entries: [{ rank, name, score, raceCount, totalTracks }]`
2. `leaderboards_tracks/{trackId}`
   - `entries: [{ rank, name, timeMs, userId, attempts, updatedAt }]`
3. `players/{accountId}`
   - `accountId, name, updatedAt`
4. `players/{accountId}/name_history/{historyId}`
   - `name, updatedAt, replaced`
5. `race_results/{resultId}`
   - `trackId, accountId, name, timeMs, createdAt, source`

## Rules to deploy (direct)

Deploy command:

```bash
firebase deploy --only firestore:rules
```

The rules in this repo do all of the following:
- public read of leaderboard documents
- controlled client writes for `race_results` and `players` documents
- deny-all fallback for everything else

## Hosting deploy

```bash
firebase deploy --only hosting
```

## Notes

- Since this is Functions-free, leaderboard aggregation docs (`leaderboards_overall`, `leaderboards_tracks`) should be updated by your trusted process/tooling.
- Player name sanitization + history logging is already handled client-side before writes.
