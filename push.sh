#!/bin/bash
gh auth setup-git
git remote set-url origin https://github.com/c00lman7/uwubot.git
git add -A
git commit -m "fix: use --no-frozen-lockfile"
git push -u origin main
