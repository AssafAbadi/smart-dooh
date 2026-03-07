# GitHub Setup – Push This Project to Your Repository

## Current Status

- **Git**: The project is a git repository with two commits (full codebase + mobile-driver as regular files).
- **Remote**: `origin` is set to **https://github.com/Assafabadi/smart-dooh.git**. Create the repo on GitHub (step 1) before pushing.

## What You Need to Do

### 1. Create the repository on GitHub (one-time)

**Quick link** (create repo named `smart-dooh` under Assafabadi):  
**[https://github.com/new?name=smart-dooh](https://github.com/new?name=smart-dooh)**

1. Log in to [GitHub](https://github.com) as **Assafabadi**.
2. Open the link above (or go to https://github.com/new and set repository name to `smart-dooh`).
3. Leave **"Add a README file"** and **".gitignore"** **unchecked** (we already have them).
4. Click **Create repository**.

### 2. Push (after creating the repo)

In a terminal, from the **project root** (`c:\Users\asaf0\smart-dooh`):

```powershell
git push -u origin main
```

(Remote `origin` is already set to `https://github.com/Assafabadi/smart-dooh.git`. If you ever need to add it again: `git remote add origin https://github.com/Assafabadi/smart-dooh.git`.)

To use SSH instead of HTTPS, change the remote: `git remote set-url origin git@github.com:Assafabadi/smart-dooh.git`, then run `git push -u origin main`.

### 3. Optional: GitHub CLI (`gh`)

From the project root:

```powershell
gh repo create smart-dooh --private --source=. --remote=origin --push
```

(Change `smart-dooh` to your desired repo name; use `--public` if you want a public repo.)

---

## Note about `apps/mobile-driver`

`apps/mobile-driver` is now tracked as **regular files** in this repo (the previous gitlink/submodule was removed), so one push uploads the full project including the mobile app.

---

## After the first push

- Your full Smart DOOH codebase (backend, admin, simulator, docs, and the new **COMPLETE_APP_ARCHITECTURE_AND_FLOW.md**) will be on GitHub.
- You can share the repo with developers or investors and use **docs/COMPLETE_APP_ARCHITECTURE_AND_FLOW.md** as the main reference for architecture and flow.
