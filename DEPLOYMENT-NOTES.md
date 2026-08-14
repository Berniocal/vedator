# Vedátor deployment notes

For production content updates, never put GitHub Actions skip tokens such as `[skip ci]`, `[ci skip]`, `[no ci]` or `[skip actions]` into commits, PR titles, or text that can become the squash merge commit on `main`.

`main` pushes must trigger `.github/workflows/deploy-pages-direct.yml`. A content change is complete only after that Pages workflow finishes successfully.

Do not re-run an older Pages workflow to deploy a newer `main`: reruns can accumulate multiple artifacts named `github-pages` in one workflow run. Trigger a new clean run from a new safe `main` push instead.
