# Moderation rules: employers, jobs and reports

**Owner:** Ram · **Applies from:** public launch, 11 Oct 2026 · **Tracker:** L01

These are the rules for whoever is on admin duty. Their purpose is to keep scam jobs and fake employers off CareerConnect, because one fake job that takes money from a student can destroy our reputation.

> **Before launch:** approval only works once S03 (jobs start as *Pending Approval*) and S04 (employers need approval before posting) are merged. Until then, check every new job by hand in `/admin/opportunities`.

## 1. Approving a new employer (target: within 24 hours)

Approve only when **all** of these are true:

1. **The company is real.** Its website loads and describes the business, or it has a LinkedIn company page with employees, or it has a GST/CIN number that looks up correctly.
2. **The contact person belongs to the company.** Their email is on the company's domain (for example `hr@company.com`).
3. **The profile is complete:** company name, website or LinkedIn, city, and what the company does.

**The contact uses a Gmail, Yahoo or Outlook address?** That's allowed for small businesses, but **call the phone number on the profile** before approving. Note the call in the admin notes.

**Reject or ask for more details if:**
- the company name copies a well-known brand but the domain doesn't match (for example "Google Careers India" on `googlejobs-india.in`);
- the website is missing, still "coming soon", or unrelated to the company;
- several accounts share the same phone number or email.

## 2. Approving a job or internship (target: within 12 hours)

Check every new listing for these points:

| Check | Pass if |
|---|---|
| Real role | The title and description describe actual work, not "earn from home" |
| Pay | If a salary or stipend is shown, it's realistic for the role and city |
| Contact | Candidates apply through CareerConnect or the company's own site, not only through a personal WhatsApp or Telegram number |
| Location | A real city, or clearly marked Remote |
| Company | The employer is already approved (section 1) |

**Decisions:** *Approve* → *Request changes* (with a note to the employer) → *Reject*.

## 3. Always reject (and ban the employer on a repeat)

- **Anything that asks candidates for money:** "registration fee", "training fee", "security deposit", "kit charges", paid certificates as a condition of the job. **CareerConnect never allows a fee to be charged to a candidate.**
- Asking for Aadhaar, PAN, bank details or OTPs before an interview.
- MLM, network marketing, chain or referral-income schemes.
- "Data entry", "typing" or "form filling" jobs promising unrealistic pay.
- Crypto or trading "jobs" where the candidate has to invest.
- Adult content, gambling, or anything illegal.
- Pretending to be a company the employer doesn't represent.
- Discriminating on religion, caste, gender, marital status or disability, unless the law allows it.

## 4. Handling reports from users

| Report type | Response time | First action |
|---|---|---|
| **Asks for money / scam** | **Within 2 hours** | **Unpublish the job at once**, then investigate. Ban the employer if confirmed. |
| Fake company or impersonation | Within 12 hours | Unpublish, then verify the company again (section 1) |
| Wrong or misleading information | Within 24 hours | Ask the employer to fix it; unpublish if there's no reply in 48 hours |
| Duplicate or spam | Within 24 hours | Remove the duplicate |

After acting, mark the report *Resolved* in `/admin/reports` with a short note on what was done. If a scam reached candidates who had already applied, tell Ram, who will decide whether to warn them.

## 5. Tools

- **Employers and companies:** `/admin/companies`, `/admin/users` (a status change to inactive blocks login)
- **Jobs and internships:** `/admin/opportunities` (approve, reject, close)
- **Reports:** `/admin/reports`
- **Settings:** `/admin/settings` (auto-approve switches stay **off** during launch)

Always leave a short admin note explaining why something was rejected or banned. If an employer complains, that note is our record.

## 6. Escalate to Ram

- Any confirmed scam where a candidate may have paid money.
- Any legal threat, police or government request, or media question.
- Any employer larger than about 500 employees complaining about a rejection.

## 7. Admin rota, 11–25 Oct

Two checks a day, at the daily **10:00 triage** and the **18:00 metrics review**. Clear everything pending at each check, and look at scam reports whenever you're online.

| Date | 10:00 | 18:00 |
|---|---|---|
| Sun 11 Oct (launch) | Ram + Tripti | Ram + Sneha |
| Mon 12 Oct | Tripti | Sneha |
| Tue 13 Oct | Yug | Imran |
| Wed 14 Oct | Ram | Tripti |
| Thu 15 Oct | Sneha | Yug |
| Fri 16 Oct | Imran | Ram |
| Sat 17 Oct | Tripti | Sneha |
| Sun 18 Oct | Yug | Ram |
| Mon 19 Oct | Imran | Tripti |
| Tue 20 Oct | Sneha | Yug |
| Wed 21 Oct | Ram | Imran |
| Thu 22 Oct | Tripti | Sneha |
| Fri 23 Oct | Yug | Ram |
| Sat 24 Oct | Imran | Tripti |
| Sun 25 Oct | Sneha | Ram |

Vivek isn't on the rota, because he owns deploys and production fixes during this period. **Swaps are fine;** post them in the team group.
