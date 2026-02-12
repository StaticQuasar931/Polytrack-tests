# Firebase setup (Hosting + Firestore only, no Functions)

This setup matches your Firebase free-plan constraint: **no Cloud Functions**.

Project:
- **Project ID:** `polytrack-052`
- **Web App ID:** `1:1000092276003:web:dbde7b8770d345f1ea6896`

## 1) Enable Firestore

In Firebase Console:
1. Build -> Firestore Database
2. Create database (Native mode)
3. Pick region close to players

## 2) Create leaderboard document

Create this document in Firestore:

- Collection: `leaderboards`
- Document: `overall`
- Field: `entries` (array)

Each array item shape:

```json
{
  "rank": 1,
  "name": "GhostDriver",
  "averageRank": 1.42,
  "raceCount": 18,
  "totalTracks": 20
}
```

## 3) Deploy Firestore rules

Use the `firestore.rules` file in this repo.

Deploy command:

```bash
firebase deploy --only firestore:rules
```

## 4) Deploy hosting

```bash
firebase deploy --only hosting
```

## 5) How updates should be done (safe/public project)

Because this project is public and no Functions are used:
- **Do not allow public writes** to leaderboard docs.
- Update leaderboard data only from Firebase Console (or trusted admin tooling later).
- Public clients only read `leaderboards/overall`.

## 6) Optional next step

If later you want user-submitted tracks/runs, we can add Firebase Auth + separate moderated queues with strict write validation rules.
