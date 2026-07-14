# Round 3 — Research Advocate

1. **§0 deviation 3 vs §4/§7 — F0.6 date contradiction:** deviation 3 says "by week 12"; §4 says "all 13 by week 14 (deviation 3 adjusted)"; §7 schedules weeks 8–14. Two replacement dates for one declared deviation.

2. **§4 F0.6 — undeclared partial deviation:** PRD F0.6 acceptance requires "attributed organic assessment starts tracked"; the spec tracks only `content_page_view` — no mechanism attributes a subsequent `assessment_start` to a content page (the share pattern's in-memory flag can't carry from static pages), and no attribution tag exists in the events allowlist.

3. **§7 minor:** "~179–229h + writing" double-counts (the F0.6 row already includes ~20h writing); "121–161h over 10 weeks" spans weeks 0–10 = 11 calendar weeks (≈11–15 h/wk).

4. **§4 F0.8 minor — undeclared denominator change:** PRD says "status captured for >90% of completers"; spec says "≥99% of non-dev creates" — creates exclude completers whose write failed. Stricter threshold, substituted denominator, undeclared.

Verified clean: App.jsx line ranges exact (40–67, 75–81, 84–96, 106–140, two-stage refine with skip); "any 13-byte payload decodes" accurate; fieldGenerator pure with param-dependent positions; vercel.json maxDuration-only; webhook signature-yes/idempotency-no; §5 matches PRD §9 (gate/diagnostic split, I denominator, C split, clock rules). External: Resend Pro $20/mo no daily cap ✓; Postmark free 100/mo ✓; Supabase OTP needs `{{ .Token }}` customization, 60s cooldown, creates user on send ✓.
