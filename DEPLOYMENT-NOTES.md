# Vedátor deployment notes

For production content updates, never put GitHub Actions skip tokens such as `[skip ci]`, `[ci skip]`, `[no ci]` or `[skip actions]` into commits, PR titles, or text that can become the squash merge commit on `main`.

`main` pushes must trigger `.github/workflows/deploy-pages-direct.yml`. A content change is complete only after that Pages workflow finishes successfully.

Do not re-run an older Pages workflow to deploy a newer `main`: reruns can accumulate multiple artifacts named `github-pages` in one workflow run. Trigger a new clean run from a new safe `main` push instead.

RSS contains two different episodes numbered 142. `tools/build-content-v2.mjs` preserves internal ID 142 for the nuclear episode and assigns 1642 to Webb by its stable RSS GUID, with `displayNumber` and `sourceNumber` 142. Keep this mapping stable for playlists, deep links, offline audio, and saved progress. Do not edit the RSS-derived `episodes.json` to fix it: the daily refresh would overwrite that change. Add Webb to a collection using 1642. Run `node tools/test-v2-duplicate-142.mjs` when changing this mapping or playback references.
