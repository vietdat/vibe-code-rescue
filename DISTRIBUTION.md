# Distribution: GitHub discoverability + launch plan

This file is the launch plan for `vibe-code-rescue`. Nothing in it has
been posted anywhere — it is a checklist and a set of drafts for the
owner to execute. Read each community's rules again before posting;
rules change, and the community's own rules page is the authority.

## 1. GitHub discoverability

### One-line description (paste into the repo's About → Description)

> Audit AI-generated (vibe-coded) code before you launch it: a Claude Code skill + Node.js CLI that finds leaked secrets, broken access control, BOLA, SQL injection and vulnerable dependencies, and writes a plain-language report with a grade.

The README's opening line is the same sentence, so the repo page and
the README agree.

### Topics (paste into the repo's About → Topics — 20, the GitHub maximum used here)

```
vibe-coding, claude-code, code-audit, security-audit, ai-generated-code,
spring-boot, secrets-scanning, static-analysis, cli, nodejs, agent-skill,
bola, supabase, rls, stripe, sql-injection, javascript, security,
code-review, open-source
```

Why these: they are the words developers actually search for when
their AI-built app is about to launch — `vibe-coding`,
`claude-code`, `code-audit`, `security-audit`, `ai-generated-code`,
`spring-boot`, `secrets-scanning`, `static-analysis`, plus the
specific flaws the tool catches (`bola`, `supabase`, `rls`,
`stripe`, `sql-injection`).

### GitHub setup checklist (Day 0)

- [ ] Repo is public, default branch `main`.
- [ ] About → Description: the one-line description above.
- [ ] About → Topics: the 20 topics above.
- [ ] About → Website: leave blank (there is no website for this repo).
- [ ] README starts with the description sentence (it does — see
      `README.md`).
- [ ] `LICENSE` (MIT), `CONTRIBUTING.md`, `CHANGELOG.md` present.
- [ ] CI is green on `main` (`.github/workflows/ci.yml`, Node 18/20/22).

## 2. Where to post

Every community below was verified to exist on 2026-11-22. Only these
are listed — nothing unverified.

| Channel | What it is | Rules to respect |
| --- | --- | --- |
| Hacker News — Show HN (`news.ycombinator.com/submit`) | Y Combinator's community; Show HN posts are for something people can try. Title starts with `Show HN:`. | Post from your own account, on a weekday when you can stay in the thread for hours. Write the first comment yourself (what it is, how to try it, one honest limitation). Do not ask anyone to upvote or comment — HN penalises that. |
| r/coolgithubprojects (`reddit.com/r/coolgithubprojects/`) | Subreddit for sharing projects hosted on GitHub. | Every project must be hosted on GitHub. Title format: `[Description] - [Project Name]`. Reposts only with new features and 6+ months since the last post. |
| r/SideProject (`reddit.com/r/SideProject/`) | Subreddit for sharing side projects; self-promotion is its purpose. | Follow the subreddit's posting rules; Reddit's spam filter can auto-remove posts with bare links from new accounts, so post the write-up as text with the repo link inside. |
| r/ClaudeCode (`reddit.com/r/ClaudeCode/`) | Community for building with Claude Code. | Simple project sharing belongs in the weekly showcase thread. A standalone post needs the `Built with Claude Code` flair and a substantive write-up (how it works, what Claude Code was involved in), not just a link. |
| r/webdev (`reddit.com/r/webdev/`) | Community for all things web development, front-end and back-end. | Project/feedback posts are allowed on **Saturdays only**, under the **Showoff Saturday** flair. Commercial promotion is banned every day — no sales pitch. |
| skills.sh (`skills.sh`) | Vercel's cross-agent skills directory and CLI (`npx skills add owner/repo`). | The directory indexes GitHub repos with `SKILL.md` files. After publishing, check the listing appears, then test the install command yourself before telling anyone to run it. |
| awesome-claude-skills (`github.com/ComposioHQ/awesome-claude-skills`) | The largest curated list of Claude skills on GitHub. | Propose the skill with a pull request to its README, in the list's own format, under a fitting category (Development & Code Tools / Security). Acceptance is the maintainers' call — do not claim to be listed until the PR is merged. |
| dev.to (`dev.to`) | Developer blogging platform. | Publish the "how I built it / what it catches" article (draft below). Link the repo, not a landing page. |
| X (`x.com`) | Short-form posts / threads. | One thread on launch day, then reply to comments. No hashtags spam; one or two tags at most. |

## 3. What to post (drafts)

All drafts use only numbers verified by running the tool — the demo
audit (F 17/100, 19 findings), `--fix` (17 → 47/100, 13 findings),
the live probes (all 5 fail, F 2/100), the Spring sample (D 60/100,
8 findings), and the test suite (18 tests, all passing). No invented
numbers. No invented numbers.

### Show HN

Title: `Show HN: Vibe-code-rescue — audit an AI-built app before you launch it`

First comment:

> I built a small CLI + Claude Code skill that audits AI-generated ("vibe-coded") code before launch. It is deterministic and offline, Node 18+, zero runtime dependencies. It checks for leaked secrets, admin routes without login, BOLA, SQL injection, Supabase queries with no RLS, Stripe webhooks without signature verification, vulnerable dependencies, and a Spring Boot profile — then writes a plain-language report with a grade.
>
> Try it on the bundled demo (a deliberately vulnerable app, no install needed):
>
> ```
> git clone https://github.com/vietdat/vibe-code-rescue.git
> cd vibe-code-rescue
> node bin/vibe-rescue.js audit demo/vulnerable-app
> ```
>
> The demo scores F (17/100) with 19 findings. `--fix` applies only safe, reversible fixes and takes it to F (47/100); `--live` probes a running app and drops it to F (2/100). A good grade does not prove an app is secure — the checks are static plus live probes, not a penetration test — and the docs say where each check can false-positive. Happy to hear what it misses on your codebase.

### r/coolgithubprojects

Title: `[CLI + Claude Code skill] Audit AI-generated code before launch — secrets, BOLA, SQL injection, Spring Boot`

Body:

> vibe-code-rescue audits a vibe-coded codebase and writes a plain-language report with a grade. Node 18+, zero dependencies, deterministic and offline. Checks: leaked secrets, admin routes without login, BOLA, SQL injection, Supabase without RLS, unsigned Stripe webhooks, vulnerable dependencies, plus a Spring Boot profile. `npx`-free quick start: `node bin/vibe-rescue.js audit demo/vulnerable-app` — the bundled demo scores F (17/100) with 19 findings. MIT licensed. https://github.com/vietdat/vibe-code-rescue

### r/SideProject

Title: `I built a CLI that grades your vibe-coded app before you launch it`

Body: same as the r/coolgithubprojects draft, plus one paragraph in
your own words about why you built it (for example: you kept seeing
the same security mistakes in AI-built apps, so you wrote the checker
you wished existed). Keep it honest — say what it does not do (it is
not a penetration test).

### r/ClaudeCode — weekly showcase thread

Comment (short — the thread is for sharing, not for a full write-up):

> vibe-code-rescue — a Claude Code skill + CLI that audits vibe-coded apps and writes a plain-language report with a grade (secrets, BOLA, SQL injection, Spring Boot, live probes). Node 18+, zero dependencies. The bundled demo scores F (17/100). https://github.com/vietdat/vibe-code-rescue

Only make a standalone post here if you also publish the dev.to
write-up — use the `Built with Claude Code` flair and post the
write-up, not just the link.

### r/webdev — Showoff Saturday

Title: `Showoff Saturday — I made a CLI that audits AI-built apps for leaked secrets, BOLA and SQL injection`

Body: the r/coolgithubprojects draft, plus the install command for
the skill (`bash skills/vibe-rescue/scripts/install.sh claude-code`).
No sales pitch, no pricing — there is none.

### dev.to article

Title: `Your AI-built app probably leaks secrets. I wrote a CLI that checks before you launch`

Outline (write it in your own words, ~800–1,200 words):

1. The problem in plain words: an AI-built app can leak secrets, let
   anyone open other users' data, or ship fake packages. Give the
   demo as the example (19 findings, F 17/100).
2. What the CLI checks, with one real finding per family and its
   `file:line` evidence from the demo.
3. What `--fix` does (safe, reversible only) and what it cannot do
   (admin auth, BOLA, SQL injection need hand fixes).
4. What `--live` probes, and the honest limits (heuristics can
   false-positive; a good grade is not proof of security).
5. How to run it: the three commands from the README quick start.

### X thread

Post 1: `I built a CLI that audits vibe-coded apps before launch. Point it at the code, get a plain-language report with a grade. The bundled demo scores F (17/100) with 19 findings.`

Post 2: `It checks leaked secrets, admin routes without login, BOLA, SQL injection, Supabase without RLS, unsigned Stripe webhooks, vulnerable deps, and Spring Boot. Node 18+, zero dependencies, deterministic.`

Post 3: `--fix applies only safe, reversible fixes (17 → 47/100 on the demo). --live probes a running app: all 5 probes fail on the demo, grade drops to F (2/100).`

Post 4: `MIT licensed. Repo: https://github.com/vietdat/vibe-code-rescue — try it on your own vibe-coded app and tell me what it misses.`

### skills.sh

After publishing, check that the skill appears on skills.sh, then
test the install yourself:

```bash
npx skills add vietdat/vibe-code-rescue --skill vibe-rescue
```

If the listing does not appear, check skills.sh's submission
instructions on the site itself — do not guess a submission process.

### awesome-claude-skills PR

Open a pull request to
`github.com/ComposioHQ/awesome-claude-skills` adding one line in the
list's own format, under the fitting category, linking
`github.com/vietdat/vibe-code-rescue` with a one-sentence description
(the GitHub description above). Do not claim to be listed until the
PR is merged.

## 4. In what order (day by day)

Anchor the week so Day 6 is a Saturday (r/webdev only allows project
posts on Saturdays). Example: publish on a Sunday.

| Day | Do | Why this order |
| --- | --- | --- |
| Day 0 (Sun) | Publish the repo. Fill in the GitHub About description + 20 topics. Run `npm test` once more on `main` and confirm CI is green. | Nothing to link until the repo is public and the About box is filled in. |
| Day 1 (Mon) | Post to Show HN (weekday, when you can stay in the thread for hours). | Show HN is the highest-leverage single post; it needs your full attention the same day. |
| Day 2 (Tue) | Post to r/coolgithubprojects and r/SideProject. Answer every comment the same day. | Both welcome project posts any day; ride the Show HN discussion while it is fresh. |
| Day 3 (Wed) | Check skills.sh listing + test the install command. Open the awesome-claude-skills PR. | Directory listings take time to appear; submit early so they are live before the later posts point at them. |
| Day 4 (Thu) | Publish the dev.to article. | A written piece gives the Reddit and X posts something to link to besides the repo. |
| Day 5 (Fri) | Post the X thread. Reply to comments on all earlier posts. Fix any small bug the comments found, and say so in the threads. | Keeps the launch visible through the week without posting the same link twice in one place. |
| Day 6 (Sat) | Post to r/webdev (Showoff Saturday flair) and comment in r/ClaudeCode's weekly showcase thread. | r/webdev project posts are Saturday-only; the ClaudeCode showcase thread is weekly. |
| Day 7 (Sun) | Answer follow-ups everywhere. Note what people asked for (missing checks, false positives) as GitHub issues. Do not repost the same link anywhere. | Launch week ends with listening, not more posting. Reposting the same project in a community within days gets removed. |

## 5. Rules for the whole launch

- Read each community's rules before posting; if a rule and this
  plan disagree, the rule wins.
- Never ask anyone to upvote or comment — on HN that gets
  accounts penalised; everywhere else it reads as spam.
- Do not repost the same project in the same community within days.
  r/coolgithubprojects, for example, only allows reposts with new
  features after 6+ months.
- Answer comments like a colleague: thank people for bug reports,
  fix the small ones, and say what the tool does not do.
- No invented numbers anywhere: only the verified numbers in section
  3 (demo F 17/100, 19 findings; `--fix` 17 → 47/100; live F 2/100,
  5 probes fail; Spring D 60/100, 8 findings; 18 tests passing).
- This plan is preparation only. Nothing has been posted.
