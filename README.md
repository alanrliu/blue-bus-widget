# Blue Bus Widget

A Scriptable iOS home-screen widget for the Bi-Co Blue Bus. Supports small (2x2), and medium (4x2), split into two columns: next departures leaving Bryn Mawr on the left, next departures leaving Haverford on the right. Tap the widget to open the official schedule page.

## Install (5 steps)

1. Install **Scriptable** (free) from the App Store.
2. Open `widget.js` in this repo. Copy the entire file.
3. Open Scriptable → tap `+` (top right) → paste → tap ▶ (bottom right) once. It saves itself as "Blue Bus" and deletes the untitled file it was pasted into, then puts up an alert. Close the editor and "Blue Bus" is in your script list.
4. Long-press an empty spot on your home screen → tap `+` (top left) → search "Scriptable" → pick the **small** or **medium** size → **Add Widget**.
5. Long-press the new widget → **Edit Widget** → set Script to "Blue Bus".

## Known limitations

- iOS only, Android support may be possible using a similar/same script.
- No live GPS: This widget is timetable-only, there aren't ways to find actual location of bus, and I didn't want to bother with your device's locations.
- School breaks or last minute updates are not included.
- Sun/Sat use a single "leaves HC" column (Stokes). Saturday's Suburban Square and South Lot stops are not shown.
