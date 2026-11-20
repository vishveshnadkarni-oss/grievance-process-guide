# Grievance Process Guide

A flowchart app that teaches new joinees how a grievance is handled. It is training material only and must never contain customer data.

## What joinees see (view-only)

- **Walk-through:** answers one step at a time, with Yes/No buttons or a dropdown for choices such as the case reason. Breadcrumbs let them go back.
- **Full map:** the whole flowchart. The path taken in the walk-through is highlighted. Click any step to see its details.
- **Search:** find a step by name or by words in its details.

Joinees cannot change anything. The site only reads `flow.js`, which only you can update in the repository.

## Publish on GitHub Pages

1. Create a new repository (for example `grievance-process-guide`).
2. Upload `index.html`, `app.js`, `flow.js` and this README.
3. Open Settings, then Pages. Under Build and deployment choose Deploy from a branch, pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

## Update the process (only you)

1. Open the site with `#edit` at the end of the address, for example `https://<your-username>.github.io/<repo-name>/#edit`.
2. Click any step in the **Full map** to edit it on the right:
   - Change the title, type, owner, what to do, system, documents, TAT and notes.
   - Use **Add branch (new step)** to create a new path. On a decision step, each branch is one option, for example one case reason.
   - Use **Link to existing step** to join a branch to a step that already exists, such as a shared closure step.
   - Set "How options are shown" to **Dropdown list** for long lists like case reasons.
   - Tick "Mark as to be added" for steps you have not written yet. Joinees see a notice on them.
3. Your changes are saved in your browser while you work. Nobody else sees them yet.
4. Click **Export flow.js**, replace `flow.js` in the repository with the downloaded file, and commit. The site updates in a minute or two.

Other edit-mode buttons: **+ New step** (an unlinked step you can connect later), **Import** (load a `flow.js` file back in) and **Discard changes** (return to the published flow).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page and styles |
| `app.js` | The app |
| `flow.js` | The process itself (the only file you replace when the process changes) |
