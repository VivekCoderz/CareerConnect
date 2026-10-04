# Support playbook: inbox, FAQ and ready replies (L03)

**Owner:** Ram · **Backup:** Tripti · **From:** 8 Oct (beta) · **Cost:** ₹0

Who answers, how fast, and what to say. Use the replies in section 4 as a starting point and fix the details for each person. Never copy and paste blindly.

## 1. Support inbox setup (one time, about 30 minutes)

We use **Zoho Mail Forever Free** on `e2job.com` (up to 5 users, ₹0). The 5 team members get a mailbox each; the support addresses are group addresses or aliases, so they don't use up a user.

| Address | Type | Reaches |
|---|---|---|
| `support@e2job.com` | Group | Ram, Tripti |
| `report@e2job.com` | Group | Ram, Tripti (urgent: scam reports) |
| `employers@e2job.com` | Group | Ram, Vivek |
| `partnerships@e2job.com` | Alias | Ram |
| `grievance@e2job.com` | Alias | Ram, who forwards to the Grievance Officer (Amit Verma) |

1. In Zoho Mail, create a filter per address (`To: report@…` → folder `REPORT`, flag it). Reports are urgent.
2. Reply from the group address, so replies come from `support@e2job.com`, not a personal address.
3. If groups aren't available on the free plan, add the addresses as aliases on Ram's and Tripti's mailboxes instead.
4. The addresses are already in `client/src/config/legal.js` (G05) and the Contact page.

**Don't** use the Brevo account for support replies. Its 300/day limit is for signup OTPs.

## 2. Who checks, and how fast

| What | Check | Reply within |
|---|---|---|
| `REPORT`: job asks for money, scam | Every 2 hours, 9 AM–10 PM | **2 hours.** Unpublish first, then investigate (moderation-sop.md §4) |
| Account or login problems | 10 AM and 6 PM | Same day |
| Application questions | 10 AM and 6 PM | 1 working day |
| Employers | 10 AM and 6 PM | 1 working day |
| Privacy / deletion requests | Daily | Acknowledge within 48 hours |

During launch week (11–17 Oct), Ram and Tripti split the day: Ram until 3 PM, Tripti after 3 PM. At the 10:00 triage (Q07), Tripti posts any bug that came in through support in the team group, with steps to reproduce.

**Escalate to Vivek** (WhatsApp, not email) when: many people report the same error, nobody can log in or sign up, emails stop arriving, or the site is down.

## 3. FAQ (for the website and the WhatsApp channel)

### Students and job seekers

**Is CareerConnect free for students?**
Yes. Creating an account, building your profile and applying are free. **CareerConnect and genuine employers never ask you for money.** If anyone asks for a fee, deposit or "training charge", don't pay. Report the job.

**How do I sign up?**
Click **Continue with Google**. It's the fastest way. You can also sign up with your email and a one-time code (OTP).

**I didn't get the OTP email.**
Check Spam/Promotions and wait 2 minutes. If it still doesn't come, use **Continue with Google**. On busy days our email sending can be full; Google sign-in always works.

**What resume can I upload?**
PDF only, up to the size shown on the upload screen. Recruiters only see your resume after you apply to their job.

**How do I know what happened to my application?**
Go to **My Applications**. You also get a notification (🔔) every time an employer changes your status. Good news (shortlisted, interview, selected, offer) is also emailed straight away. Other updates come in one summary email in the evening.

**It says "Position closed". What does that mean?**
The employer has closed the listing or its deadline has passed. Your application wasn't rejected for something you did. Keep applying to other jobs.

**Some jobs open on another website. Why?**
Those are listings from public job boards, marked with their source. You apply on the company's or the board's own site.

**How do I delete my account?**
Go to **Account** → **Delete account**. Your profile, applications and resume files are deleted. Employers you already applied to may keep the copy they downloaded.

### Employers

**How much does posting cost?**
Free. The first companies to join are **Founding Employers**, with free posting for life and a verified badge.

**Why can't I post yet?**
Every employer is verified by our team before posting (usually within 24 hours). We check that the company and your role are real. Then every listing is reviewed before it goes live (usually within 12 hours).

**Can you post the job for me?**
Yes. Send the JD to `employers@e2job.com` or on WhatsApp. Once your company is verified, we post it under your account and you manage the applicants.

**How do I handle many applicants?**
In **Applicant Tracking → list view**, tick the candidates (or "Select all") and choose Shortlist, Under review, Move to interview or Reject. Candidates are notified automatically.

**When does my listing close?**
At the end of its deadline day (India time), or when you close it. Applicants still waiting are told the position is closed.

## 4. Ready replies

Replace the `[brackets]`. Keep the tone warm and short. Sign as "Team CareerConnect".

**R1. OTP not received**
> Hi [Name], sorry about that. Please check your Spam/Promotions folder. The code can take up to 2 minutes. If it still hasn't arrived, the quickest way in is **Continue with Google** on the sign-up page, using the same email. – Team CareerConnect

**R2. Can't log in**
> Hi [Name], please try **Forgot password** on the login page, or **Continue with Google** if you signed up with Google. If it still fails, reply with the email you used and a screenshot of the error, and we'll fix it today.

**R3. Scam / asked for money (reply within 2 hours)**
> Hi [Name], thank you for reporting this. Please don't pay anything: CareerConnect and genuine employers never charge candidates. We've taken the listing down while we investigate. If you already paid, please also report it at cybercrime.gov.in or call 1930.

**R4. "Why was I rejected?"**
> Hi [Name], we're sorry it didn't work out this time. Employers make their own hiring decisions and don't share the reasons with us. Keep your profile and resume up to date: new jobs are added every day.

**R5. Employer: verification pending**
> Hi [Name], thanks for joining CareerConnect. Your company verification is in progress and usually takes up to 24 hours. If we need anything (company website, official email), we'll write to you. Meanwhile you can send me your JDs and I'll have them ready to publish.

**R6. Employer: verification refused**
> Hi [Name], we couldn't verify [Company] with the details provided: [reason]. Please reply with [official website / registration document / an email from your company domain] and we'll review it again.

**R7. Delete my data (privacy request)**
> Hi [Name], we've received your request. You can delete your account any time under **Account → Delete account**. That removes your profile, applications and resume. If you can't log in, reply from the email on the account and we'll delete it for you within [deletionDays] days.

**R8. Bug report**
> Hi [Name], thanks for telling us. Could you send (1) what you clicked, (2) what you expected, (3) what happened, and (4) a screenshot, plus your phone/laptop and browser? We'll get it fixed.

## 5. What never to do

- Never ask for or accept passwords, OTPs or payment details.
- Never share a candidate's contact details with anyone except through the platform.
- Never promise a job, an interview or a timeline on an employer's behalf.
- Don't argue in public channels. Move it to email or DM.
