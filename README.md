# Blue Bus Widget

A Scriptable iOS home-screen widget for the Bi-Co Blue Bus. Supports small (2x2), and medium (4x2), split into two columns: next departures leaving Bryn Mawr on the left, next departures leaving Haverford on the right. Tap the widget to open the official schedule page.

## Install (5 steps)

1. Install **Scriptable** (free) from the App Store.
2. Open `widget.js` in this repo. Copy the entire file.
3. Open Scriptable → tap `+` (top right) → paste → tap ▶ (bottom right) once. It saves itself as "Blue Bus" and deletes the untitled file it was pasted into, then puts up an alert. Close the editor and "Blue Bus" is in your script list.
4. Long-press an empty spot on your home screen → tap `+` (top left) → search "Scriptable" → pick the **small** or **medium** size → **Add Widget**.
5. Long-press the new widget → **Edit Widget** → set Script to "Blue Bus".

## Files

- `widget.js` — the Scriptable script. Paste this into Scriptable.
- `index.html` — static landing page with a one-tap Copy button. Fetches `./widget.js` at click time.
- `demo.mp4` / `poster.jpg` — screen recording on the landing page and its still frame. The page shows the poster and only loads the video when someone taps play.
- `vercel.json` — sets `Cache-Control` on `widget.js` so users always get the latest.
- `scrape.js` — Node script that regenerates the SCHEDULE block from the BMC page. Run manually if the schedule changes.
- `test.js` — Node self-check for the departure-picking logic.

## Known limitations

- iOS PWAs can't produce home-screen widgets — this is a real Apple restriction, hence the Scriptable route.
- No live GPS: This widget is timetable-only. I'm not aware of one.
- Semester breaks / holidays are not modeled. The BMC page doesn't publish variants for these.
- Sun/Sat use a single "leaves HC" column (Stokes). Saturday's Suburban Square and South Lot stops are not shown.
