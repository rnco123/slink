# Deployment pipeline

**Goal:** you `git push` (or merge a PR) to `main`, and the live site updates
itself. No manual steps, no SSH, nobody in the loop.

This document describes the whole pipeline end-to-end, the **one-time setup** you
run once, and how to roll back / troubleshoot.

---

## 1. The big picture

```
  you ── merge PR ──▶ main
                       │
                       ▼
              ┌──────────────────┐   GitHub-hosted runner (free, ephemeral)
              │  CI  (ci + e2e)  │   typecheck · lint · tests · build
              └────────┬─────────┘
                       │ green? (branch protection blocks merge otherwise)
                       ▼
              ┌──────────────────┐   GitHub-hosted runner
              │ deploy: images   │   build 2 Docker images → push to GHCR
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐   SELF-HOSTED runner, ON the box
              │ deploy: roll box │   docker compose pull && up -d
              └────────┬─────────┘   + health check
                       ▼
                  live site updated
```

Nothing is re-hosted. Everything runs where it already runs:

| Piece                                                | Hosted on                                               | Cost               |
| ---------------------------------------------------- | ------------------------------------------------------- | ------------------ |
| Live site (storefront, medusa, worker, redis, caddy) | The one EC2 box `i-06ab3de34df6cbd8c` (`23.21.167.196`) | already paying     |
| Container images                                     | GHCR (`ghcr.io/rnco123/slink-*`)                        | free (public repo) |
| CI + image builds                                    | GitHub-hosted runners                                   | free (public repo) |
| The "roll the box" step                              | A **self-hosted runner process on the same box**        | free (~50 MB RAM)  |

**Why a self-hosted runner instead of SSH-from-GitHub:** GitHub's hosted runners
have thousands of rotating IPs. To SSH in from them you'd have to open port 22 to
almost the whole internet — unacceptable for a health box. A self-hosted runner
reaches **out** from the box to GitHub (HTTPS, outbound only); nothing reaches in.
No open SSH port, no private key stored in GitHub.

---

## 2. The workflows

- **`.github/workflows/ci.yml`** — format, lint, typecheck, build, unit +
  integration tests. **`.github/workflows/e2e.yml`** — Playwright. These are the
  quality gate.
- **`.github/workflows/deploy.yml`** — builds the images and rolls the box. Two
  jobs:
  - `images` (GitHub-hosted): builds `slink-medusa` + `slink-storefront`, pushes
    `:latest` and `:<commit-sha>` to GHCR.
  - `deploy` (self-hosted, label `slink-box`): on the box, runs
    `docker compose pull && up -d --remove-orphans`, then health-checks
    `https://manage.saludlinkusa.com/health` and **fails the run if it doesn't
    return 200** — so a broken deploy shows up red, it doesn't fail silently.

`deploy.yml` triggers on **push to `main`** and on the manual **Run workflow**
button.

---

## 3. ONE-TIME setup (you run this once)

### 3a. Install the self-hosted runner on the box

1. In GitHub: **repo → Settings → Actions → Runners → New self-hosted runner →
   Linux / x64**. GitHub shows exact copy-paste commands _including a registration
   token and the current runner version_. Use those, with **two tweaks**:

   - add `--labels slink-box` (and `--name slink-box --unattended`) to the
     `./config.sh` line, so the workflow's `runs-on: [self-hosted, slink-box]`
     matches;
   - install it into `/opt/actions-runner` and run it as the `ubuntu` user (which
     already has Docker + `/opt/slink` access).

   Concretely, in your box SSH session (native Windows `ssh` — Git Bash can't load
   the key):

   ```bash
   sudo mkdir -p /opt/actions-runner && sudo chown "$USER" /opt/actions-runner
   cd /opt/actions-runner
   # use the URL+version+token GitHub shows you; example shape:
   curl -o runner.tar.gz -L https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-linux-x64-X.Y.Z.tar.gz
   tar xzf runner.tar.gz
   ./config.sh --url https://github.com/rnco123/slink --token <TOKEN_FROM_GITHUB_UI> \
     --labels slink-box --name slink-box --unattended
   ```

2. Install it as a **service** so it survives reboots and runs in the background:

   ```bash
   sudo ./svc.sh install ubuntu
   sudo ./svc.sh start
   sudo ./svc.sh status   # should say "active (running)"
   ```

3. Back in GitHub → Settings → Actions → Runners, you should see **`slink-box`**
   with a green "Idle" dot. Done — this box can now run deploy jobs.

### 3b. Protect `main` (so only green code ever deploys)

repo → Settings → Branches → Add branch ruleset for `main`:

- Require a pull request before merging.
- Require status checks to pass: select **`ci`** and **`e2e`**.

Now anything on `main` has already passed CI, so `deploy.yml` can ship it without
re-checking.

### 3c. First run

Push anything to `main` (or click **Actions → deploy → Run workflow**). Watch:
`images` builds → `deploy` runs on `slink-box` → health check goes green. That's
the pipeline proven.

**Order matters:** install the runner (3a) _before_ relying on a push, otherwise
the `deploy` job sits "Queued", waiting for the `slink-box` runner to exist.

---

## 4. Everyday use

- **Ship:** merge a PR to `main`. That's the entire process.
- **Manual redeploy:** Actions → **deploy** → **Run workflow**.
- **Roll back to a previous build:** every build also pushes an image tagged with
  its commit SHA. To pin the box to an older one, on the box:
  ```bash
  cd /opt/slink
  # point the compose images at a specific SHA instead of :latest, then:
  IMAGE_TAG=<old-sha> docker compose up -d
  ```
  (Requires the compose file to read `${IMAGE_TAG:-latest}` for the image tags —
  a small one-line change per service; see `infra/deploy`. Until then, roll back
  by reverting the commit on `main`, which triggers a fresh deploy of the prior
  code.)

---

## 5. Troubleshooting

| Symptom                     | Cause                             | Fix                                                                                          |
| --------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| `deploy` job stuck "Queued" | The `slink-box` runner is offline | On the box: `cd /opt/actions-runner && sudo ./svc.sh status`; `start` it                     |
| `images` job fails          | Docker build error                | Read the job log; it's a real build break — fix and re-push                                  |
| Health check step red       | Containers didn't come up         | On the box: `cd /opt/slink && docker compose ps` and `docker compose logs medusa --tail=100` |
| Deploy green but site stale | Browser/CDN cache                 | Hard refresh; check `docker compose ps` shows recent "Up" times                              |

---

## 6. Alternative: AWS SSM + OIDC (no software on the box)

If you'd rather AWS own the execution (no runner process on the box), this is the
AWS-native version. It's more up-front IAM wiring, which is why the self-hosted
runner is the recommended default — but here it is for completeness.

1. **Give the box an SSM role** (it currently has no instance profile):

   ```bash
   aws iam create-role --role-name slink-ec2-ssm-role \
     --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
   aws iam attach-role-policy --role-name slink-ec2-ssm-role \
     --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
   aws iam create-instance-profile --instance-profile-name slink-ec2-ssm-profile
   aws iam add-role-to-instance-profile --instance-profile-name slink-ec2-ssm-profile \
     --role-name slink-ec2-ssm-role
   aws ec2 associate-iam-instance-profile --instance-id i-06ab3de34df6cbd8c \
     --iam-instance-profile Name=slink-ec2-ssm-profile --region us-east-1
   ```

   Confirm the box registers (Ubuntu ships the SSM agent):
   `aws ssm describe-instance-information --region us-east-1` should list it within
   a few minutes.

2. **Trust GitHub via OIDC** (no stored AWS keys):

   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

   Then create an IAM role `slink-github-deploy` whose trust policy allows
   `token.actions.githubusercontent.com` for `repo:rnco123/slink:ref:refs/heads/main`,
   with permission to `ssm:SendCommand` / `ssm:GetCommandInvocation` on the
   instance and the `AWS-RunShellScript` document.

3. **Deploy job** (replaces the self-hosted `deploy` job):
   ```yaml
   deploy:
     needs: [images]
     runs-on: ubuntu-latest
     permissions: { id-token: write, contents: read }
     steps:
       - uses: aws-actions/configure-aws-credentials@v4
         with:
           role-to-assume: arn:aws:iam::537124932549:role/slink-github-deploy
           aws-region: us-east-1
       - name: Roll the box via SSM
         run: |
           id=$(aws ssm send-command \
             --instance-ids i-06ab3de34df6cbd8c \
             --document-name AWS-RunShellScript \
             --parameters 'commands=["cd /opt/slink && docker compose pull && docker compose up -d --remove-orphans && docker image prune -f"]' \
             --query Command.CommandId --output text)
           aws ssm wait command-executed --command-id "$id" --instance-id i-06ab3de34df6cbd8c
           aws ssm get-command-invocation --command-id "$id" --instance-id i-06ab3de34df6cbd8c
   ```

Both approaches give the same result: **merge to `main` → live**. Pick one.

---

## 7. Why the AI assistant can't finish this for you

The safety system blocks an AI agent from running commands on production
infrastructure — SSH to the box, `aws iam` writes, `aws ssm send-command`,
storing secrets. That's deliberate. The workflow files and this document are done;
the one-time box/AWS setup (section 3 or 6) is the part that must be run by a
human with the credentials. After that, no human — or AI — touches a deploy again.

```

```
