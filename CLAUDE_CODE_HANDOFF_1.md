# PB Tracker — build handoff for Claude Code

## What this project is
A single-file React PWA gym tracker (a gift, now used by two people). It's one
`index.html` that runs React via **Babel-standalone in the browser** (no build step);
React, ReactDOM, prop-types, Recharts and Supabase load from CDNs. There's also
`sw.js` (service worker for offline), a web manifest, and PNG icons.

- **Storage:** local-first. Writes to localStorage instantly, syncs to a Supabase
  Postgres table `user_data` (columns: user_id, exercises jsonb, workouts jsonb,
  updated_at). Auth is Supabase email/password; row-level security limits each
  account to its own row.
- **Hosting:** GitHub Pages. Added to iPhone home screen as a PWA.
- **Data model:** exercises = [{ id, name, area, muscle, pbs: [{reps, kg}] }].
  workouts = [{ id, date, exercises: [{ name, sets: [{reps, kg}] }] }].
  Logging a workout auto-updates PBs; beating one triggers a confetti celebration.

## Deploy status / known fix already identified
The Supabase script tag must use the **UMD** build or you get
"Cannot use import statement outside a module". Correct line:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
```
Also `SUPABASE_URL` must be the base project URL only (https://xxxx.supabase.co) —
no trailing slash, no /rest/v1/.

## Tip for iterating
Serve locally (e.g. `python3 -m http.server`) and test in the browser so you skip
the GitHub-upload + Safari-cache loop. When you do change files and redeploy, bump
the `CACHE` version string in sw.js so the old cache is discarded.

---

# Build tasks

## 1. Taxonomy — ALREADY DONE, do not re-add
The app already has an `Abs` area (muscle `Abs`, colour `#E84A8A`) and `Calves`
was already added under `Legs`. So `AREA_MUSCLES` is already:
`Legs: ["Quads","Hamstrings","Glutes","Calves"], ..., Abs: ["Abs"]`.
DO NOT create a "Core" area — abs live under the area named **`Abs`**. Nothing to
do for this task; just make sure the seed below uses `area: "Abs", muscle: "Abs"`
(it does). Note the app already contains an exercise `Weight Crunches` (area Abs);
Jack's seed adds `Ab Crunch Machine` and `Russian Twists` alongside it — different
exercises, no conflict.

## 2. Per-hand (dumbbell) weights
Some exercises have `perHand: true`. For those, the weight entered/stored is the
weight **per hand**, and everywhere it's displayed it should read `2×Nkg` (e.g.
`2×15kg`) instead of `Nkg`. Affected display spots: PB badges, "targets to beat",
logged-workout set lines, the log-workout PB hint, and the celebration rows.
- Add a **"Dumbbell (per hand)"** checkbox to the Add and Edit exercise sheets that
  sets `perHand` on the exercise.
- PB comparison logic is unchanged (still compares the kg number); perHand is
  display + entry semantics only, and is consistent per exercise.
- Suggested helper: `fmtKg(ex, kg) => ex.perHand ? \`2×${kg}kg\` : \`${kg}kg\``.

## 3. Position field (for cable exercises)
Some exercises have a `positions` array, e.g.
`positions: ["left","middle","right","upstairs"]`. When logging such an exercise,
each set row shows a small position dropdown (default blank/none). Store it on the
set: `{ reps, kg, pos }`. Show it in the logged-workout history as `(left)` etc.
**PBs ignore position** — best kg per rep count only. Only Cable Tricep Pushdown
uses this today, but keep it generic (any exercise with a `positions` array).

## 4. First-run starter chooser
When a brand-new account has no remote row AND no local cache, show a one-time
screen before the main app: **"Set up your exercises"** with three buttons:
- **Jakey** → seeds with the existing barbell list (current `INIT_EXERCISES`; rename it `SEED_JAKEY`).
- **Jack** → seeds with `SEED_JACK` (provided below).
- **Start empty** → seeds `[]`.
Chosen seed is set as the starting exercises, then written to cache + Supabase like
any change. Existing accounts (with remote data) skip this and load normally, so
neither person's data is affected.

## 5. Auto-derive PBs from history
Currently PBs update on save but never correct downward when a workout is deleted.
Change so displayed PBs = the best across the **seed/manual baseline** and **all
logged workouts**, recomputed whenever workouts change.
- Keep the manually editable baseline as `exercise.pbs`.
- Derive: for each exercise, `displayedPbs[reps] = max(baseline[reps], best logged kg at that reps)`.
- Use the derived PBs in the PBs tab, targets, and Progress; keep Edit writing to baseline.
- This makes deleting a workout able to lower a PB back to the true best.

---

# Data notes (from parsing Jack's historical log)
- `Cable Tricep Pushdown` shows **10×27kg** — that best-ever came from an old
  "broken pulley" session; recent work is ~21–23kg. It's technically correct as an
  all-time best. Jack may want to lower it to 23kg — confirm with him.
- `Delt Fly` and `Rear Delt Fly` are kept separate; `Chest Press` and
  `Converging Chest Press` are kept separate. Merge if Jack says they're the same machine.
- One parsing artifact (Seated Shoulder Press 8×23kg) has already been removed.

---

# SEED_JACK (paste as-is; his machine-based exercises + starting PBs)

```js
const SEED_JACK = [
  { id: "j1", name: "Booty Builder", area: "Legs", muscle: "Glutes", pbs: [{ reps: 10, kg: 60 }] },
  { id: "j2", name: "Bulgarian Split Squat", area: "Legs", muscle: "Quads", pbs: [{ reps: 10, kg: 6 }] },
  { id: "j3", name: "Calf Press", area: "Legs", muscle: "Calves", pbs: [{ reps: 12, kg: 45 }, { reps: 11, kg: 39 }, { reps: 10, kg: 45 }] },
  { id: "j4", name: "Hack Squat", area: "Legs", muscle: "Quads", pbs: [{ reps: 10, kg: 62 }, { reps: 8, kg: 67 }] },
  { id: "j5", name: "Hip Abduction", area: "Legs", muscle: "Glutes", pbs: [{ reps: 10, kg: 25 }] },
  { id: "j6", name: "Hip Adduction", area: "Legs", muscle: "Glutes", pbs: [{ reps: 12, kg: 28 }] },
  { id: "j7", name: "Leg Extension", area: "Legs", muscle: "Quads", pbs: [{ reps: 12, kg: 47 }, { reps: 11, kg: 47 }, { reps: 10, kg: 54 }] },
  { id: "j8", name: "Leg Press", area: "Legs", muscle: "Quads", pbs: [{ reps: 10, kg: 50 }] },
  { id: "j9", name: "Prone Leg Curl", area: "Legs", muscle: "Hamstrings", pbs: [{ reps: 12, kg: 27 }, { reps: 10, kg: 43 }, { reps: 9, kg: 41 }] },
  { id: "j10", name: "Split Squat", area: "Legs", muscle: "Quads", pbs: [{ reps: 10, kg: 10 }] },
  { id: "j11", name: "Chest Fly", area: "Chest", muscle: "Chest", pbs: [{ reps: 12, kg: 59 }, { reps: 11, kg: 66 }, { reps: 10, kg: 66 }, { reps: 8, kg: 73 }] },
  { id: "j12", name: "Chest Press", area: "Chest", muscle: "Chest", pbs: [{ reps: 12, kg: 27 }, { reps: 10, kg: 45 }] },
  { id: "j13", name: "Converging Chest Press", area: "Chest", muscle: "Chest", pbs: [{ reps: 11, kg: 41 }, { reps: 10, kg: 45 }, { reps: 9, kg: 45 }, { reps: 8, kg: 41 }] },
  { id: "j14", name: "Dumbbell Chest Press", area: "Chest", muscle: "Chest", pbs: [{ reps: 12, kg: 14 }, { reps: 10, kg: 16 }], perHand: true },
  { id: "j15", name: "Diverging Seated Row", area: "Back", muscle: "Upper Back", pbs: [{ reps: 12, kg: 27 }, { reps: 11, kg: 36 }, { reps: 10, kg: 41 }, { reps: 8, kg: 38 }] },
  { id: "j16", name: "Lat Pulldown", area: "Back", muscle: "Lats", pbs: [{ reps: 12, kg: 45 }, { reps: 10, kg: 47 }, { reps: 9, kg: 52 }] },
  { id: "j17", name: "T-Bar Row", area: "Back", muscle: "Upper Back", pbs: [{ reps: 10, kg: 20 }] },
  { id: "j18", name: "Arm Curl", area: "Arms", muscle: "Biceps", pbs: [{ reps: 11, kg: 36 }, { reps: 10, kg: 38 }, { reps: 9, kg: 36 }, { reps: 8, kg: 36 }, { reps: 6, kg: 36 }] },
  { id: "j19", name: "Cable Bicep", area: "Arms", muscle: "Biceps", pbs: [{ reps: 10, kg: 17.1 }, { reps: 9, kg: 17 }, { reps: 8, kg: 17 }] },
  { id: "j20", name: "Cable Tricep Pushdown", area: "Arms", muscle: "Triceps", pbs: [{ reps: 11, kg: 14.7 }, { reps: 10, kg: 27 }, { reps: 9, kg: 19.3 }, { reps: 8, kg: 17 }], positions: ["left", "middle", "right", "upstairs"] },
  { id: "j21", name: "Dumbbell Bicep Curl", area: "Arms", muscle: "Biceps", pbs: [{ reps: 10, kg: 9 }], perHand: true },
  { id: "j22", name: "EZ Bar Curl", area: "Arms", muscle: "Biceps", pbs: [{ reps: 8, kg: 10 }] },
  { id: "j23", name: "Seated Dip", area: "Arms", muscle: "Triceps", pbs: [{ reps: 10, kg: 52 }, { reps: 9, kg: 47 }] },
  { id: "j24", name: "Seated Long Head Bicep", area: "Arms", muscle: "Biceps", pbs: [{ reps: 10, kg: 8 }, { reps: 8, kg: 9 }] },
  { id: "j25", name: "Tricep Extension", area: "Arms", muscle: "Triceps", pbs: [{ reps: 10, kg: 45 }] },
  { id: "j26", name: "Cable Shoulder Raise", area: "Shoulders", muscle: "Delts", pbs: [{ reps: 10, kg: 3.4 }, { reps: 8, kg: 5 }] },
  { id: "j27", name: "Delt Fly", area: "Shoulders", muscle: "Delts", pbs: [{ reps: 11, kg: 39 }, { reps: 10, kg: 52 }, { reps: 9, kg: 52 }, { reps: 8, kg: 52 }] },
  { id: "j28", name: "Rear Delt Fly", area: "Shoulders", muscle: "Delts", pbs: [{ reps: 10, kg: 39 }, { reps: 8, kg: 39 }] },
  { id: "j29", name: "Seated Shoulder Press", area: "Shoulders", muscle: "Delts", pbs: [{ reps: 10, kg: 10 }] },
  { id: "j30", name: "Shoulder Press", area: "Shoulders", muscle: "Delts", pbs: [{ reps: 10, kg: 15 }, { reps: 9, kg: 15 }, { reps: 8, kg: 15 }], perHand: true },
  { id: "j31", name: "Shoulder Swing", area: "Shoulders", muscle: "Delts", pbs: [{ reps: 10, kg: 8 }, { reps: 9, kg: 7 }, { reps: 8, kg: 8 }], perHand: true },
  { id: "j32", name: "Ab Crunch Machine", area: "Abs", muscle: "Abs", pbs: [{ reps: 12, kg: 45 }, { reps: 10, kg: 45 }] },
  { id: "j33", name: "Russian Twists", area: "Abs", muscle: "Abs", pbs: [{ reps: 15, kg: 6 }] },
];
```

Note: `SEED_JAKEY` is just the current `INIT_EXERCISES` array already in index.html —
rename it, don't retype it.
