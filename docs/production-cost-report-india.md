# CareerConnect: production cost estimate for India

**Updated:** 17 September 2026  

**Planning scale:** 10,000 registered candidates, 3,000 monthly active candidates, about 500 daily active candidates, plus employers

**Currency:** INR, using a planning rate of **₹96 per US$1** (near the [15 September RBI reference rate of ₹95.9253](https://www.msei.in/markets/currency/historical-data/rbireferenceratearchives)). Figures below are approximate, before applicable tax and currency conversion fees.

## 1. What the project actually does

I reviewed all 19 sections of the [supplied CareerConnect documentation](https://clinquant-muffin-131958.netlify.app/) and checked the corresponding local application structure and service integrations.

CareerConnect is a React/Vite web application with a Node/Express API and MongoDB database. It has four account journeys: students, freshers, professionals, and employers. Candidates build detailed profiles and resumes, discover and apply for jobs and internships, see recommendations and skill gaps, take courses, track applications, and use an AI career assistant. Employers maintain company profiles, post opportunities, review applicants, schedule interviews, issue offers, and create courses. The LMS supports lessons including video and PDF uploads. It also has email OTP, Google sign-in through Firebase, notifications, external job collection, and Cloudinary media storage.

The linked page is project documentation hosted on **Netlify**; it describes the application itself as deployed on **Vercel**. Netlify documentation hosting is not an additional production application charge in this model.

### Implemented versus requested or planned

| Item | Current position | Budget treatment |
|---|---|---|
| Email/password, email OTP, Google sign-in | Present in code; email currently uses Gmail SMTP or configurable SMTP | Budget a production mail service and Firebase at current scale |
| MongoDB, Cloudinary, Gemini AI, job scraping | Present in code | Budget database, media, AI, and backend capacity |
| LinkedIn | Profile URL fields and a public jobs-page scraper exist; LinkedIn account sign-in is **not integrated** | Sign-in is a new feature; public job scraping is a separate issue |
| DigiLocker / Meri Pehchaan | Not integrated | Partner approval and commercial quote required |
| Mobile SMS OTP | Not integrated | New SMS provider, DLT registration, and application code required |
| SendGrid | Not integrated; configurable SMTP path exists | New mail account/domain setup; SMTP integration can use current mail utility |
| Paid course checkout | Documentation lists Razorpay as pending | Gateway fees are conditional on taking payments |
| Some skills/users/matching modules | The documentation identifies empty stubs; the checked local files are still empty | Development work, not a vendor subscription |

This is a service and cost review, not a performance or security certification. A load test is needed before committing to server size.

## 2. Recommended production layout

`Vercel Pro static frontend → Cloudflare DNS/WAF → AWS Lightsail API in Mumbai → MongoDB Atlas M10 in Mumbai`

The API also connects to Cloudinary (resumes, photos, course material), SendGrid (email), an India-focused SMS gateway (phone OTP), and Gemini (AI). Firebase continues to verify Google sign-in. Keep the frontend static; do not run the long-lived Express API inside a static frontend deployment. Cache external job results and refresh them on a schedule instead of scraping every visitor request. Add backups, monitoring, spending alerts, and access controls for private resumes and certificates.

The estimate assumes no paid course video viewing yet. Video consumption can dominate the bill and is modeled separately below.

## 3. Monthly run rate at 10,000 registered candidates

The right unit is **actual activity**, not account count. This model assumes 12,000 Indian mobile OTP messages per month (a conservative launch-month load), 20,000 transactional emails, 5,000 general AI requests, about 20 GB of stored resumes plus other images, and moderate API traffic. It assumes one development seat on Vercel. The five-opening tailored-resume scenario in Section 8 is **additional** to these general AI requests. Rates and plan limits can change.

| Cost item | Published basis or calculation | Monthly allowance |
|---|---:|---:|
| Vercel Pro frontend | US$20 per developer seat; commercial production use | **₹1,920** |
| AWS Lightsail Express API | 4 GB RAM / 2 vCPU / public IPv4 at US$24 | **₹2,304** |
| Lightsail snapshots | US$0.05 per stored GB-month; allow for several changed-GB snapshots | **₹300** |
| MongoDB Atlas M10 | Published base US$0.08/hour ≈ US$58.40/730 h; Mumbai configuration varies | **₹6,500** |
| Atlas backups and inter-service transfer | Usage-dependent planning allowance | **₹1,000** |
| Cloudinary Plus | US$99/month, 225 monthly credits, if free 25 credits are exceeded | **₹9,504** |
| SendGrid Essentials | Starts at US$19.95/month; 20,000 emails assumed within plan | **₹1,915** |
| SMS OTP provider | 12,000 × ₹0.17 using an India provider's published priority OTP rate | **₹2,040** |
| Gemini 3.5 Flash | 5,000 general AI requests × (3,000 input + 800 output tokens) = US$58.50 | **₹5,616** |
| Domain renewal | Planning allowance of ₹1,500/year; exact domain/TLD quote varies | **₹125** |
| Monitoring/log retention | Small operational allowance; free tiers may cover it | **₹500** |
| **Estimated known monthly run rate** | **Before tax and DigiLocker quote** | **₹31,724 ≈ ₹32,000** |

For cash planning, hold **₹38,000–₹45,000/month** to cover normal usage variation, exchange movement, and tax where billed. This is a planning envelope, not a quoted provider price. It **does not include any unquoted DigiLocker charge, paid course video usage, payment fees, payroll, support staff, or one-time development**.

### Why these allowances are reasonable

- **AWS:** The [Lightsail price page](https://aws.amazon.com/lightsail/pricing/) lists US$24 for 4 GB with public IPv4 and [US$0.05/GB-month for snapshots](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-snapshots.html). Mumbai gets **half** the listed transfer allowance, so the 4 TB headline is about **2 TB** there. One instance is a low-cost starting point, but it is a single point of failure; a second instance and load balancer add roughly US$42/month before extra snapshots. The 4 GB size is a starting assumption, not a load-test result.
- **Database:** [Atlas lists M10 at US$0.08/hour](https://www.mongodb.com/pricing), and [dedicated clusters start around US$60/month](https://www.mongodb.com/docs/atlas/billing/billing-breakdown-optimization/). Pick Mumbai for lower latency and check the region-specific calculator, backup, and network charges before buying. The free tier is for development, not this production baseline.
- **Cloudinary:** [Free includes 25 credits/month; Plus is US$99 with 225 credits](https://cloudinary.com/pricing). Credits combine storage, transformations, and delivery. At 10,000 users, 20 GB of resumes plus media delivery can exceed the free allowance. Course video can consume credits much faster.
- **AI:** The code defaults to `gemini-3.5-flash`. [Google lists US$1.50 per million input tokens and US$9 per million output tokens](https://ai.google.dev/gemini-api/docs/pricing). Actual prompts, resume size, output length, and chat frequency determine the bill. For example, **20,000** requests with the same token sizes would be about **₹22,464/month** for AI alone.
- **Frontend and domain:** [Vercel says Hobby is for personal, non-commercial use and Pro is for businesses](https://vercel.com/pricing). [Cloudflare DNS, CDN, and universal SSL have a free plan](https://www.cloudflare.com/plans/). Registrar charges depend on the exact available domain/TLD; [Cloudflare sells domains at registry cost](https://www.cloudflare.com/domains/). Domain renewal is an annual expense shown monthly only for budgeting.

## 4. The integrations you asked about

### DigiLocker: sign-in and verified documents

For **sign-in**, the relevant government flow is **Meri Pehchaan**. To fetch a student's DigiLocker marksheet or certificate, CareerConnect would additionally need **Requester** access and the student's explicit consent. These are different capabilities. [API Setu lists both technical specifications and partner onboarding](https://apisetu.gov.in/digilocker/); [DigiLocker says an organization must register as an issuer/requester](https://wb.digilocker.gov.in/web/about/faq), and [the partner portal describes eligibility review, API key, testing/audit, and go-live](https://api.apisetu.gov.in/).

**Price:** No dependable public DigiLocker tariff for this exact private-platform use case was found. The [Digital Locker Authority says requester service fees are market driven](https://www.dla.gov.in/?q=faq). Therefore **do not assume ₹0 or invent a per-user fee**. The monthly table excludes it. Ask the onboarding team for written terms covering Meri Pehchaan sign-in, Requester access, document types, per-transaction fees, minimum commitments, and any audit/security costs. If approval is not granted, this feature cannot be included just by paying a vendor.

### LinkedIn sign-in and profile import

[LinkedIn's self-service OpenID Connect sign-in](https://learn.microsoft.com/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2) provides a member ID, name, profile picture, and email when the relevant permissions and user consent are granted. It **does not provide a full resume** with education, work history, skills, and projects. Wider verification/profile information is limited to [approved partner products](https://www.linkedin.com/help/linkedin/answer/a9385085). LinkedIn says the consumer sign-in product is self-service; no per-login charge is listed in the public documentation reviewed. Budget **₹0 in published recurring LinkedIn API fees for basic sign-in**, plus one-time development and testing. Treat deeper profile import as **approval/quote dependent**, not as an included free feature.

The current LinkedIn jobs scraper is unrelated to sign-in and should not be treated as a licensed job-feed API. Recheck LinkedIn's access terms before relying on it for production listings.

### Indian mobile OTP and DLT

[2Factor publishes ₹0.17 per priority OTP SMS at up to 100,000 messages/month](https://2factor.in/v4/pricing.html), excluding 18% GST. At 12,000 OTPs, that is **₹2,040 before GST**. With 1,000 newly verified numbers in a steady month and no repeated SMS login, the same calculation is only **₹170**. Allow for retries, voice fallback, provider terms, and actual billed delivery. An international provider can cost much more: [Twilio's public India outbound SMS rate is US$0.0832/message](https://www.twilio.com/en-us/sms/pricing/in), roughly ₹8/message at the planning exchange rate.

[TRAI requires principal-entity registration, a header, and approved message templates](https://www.trai.gov.in/advice-to-senders). This is a launch task separate from the SMS API. An [Airtel registration FAQ lists ₹5,900 including GST](https://www.airtel.in/business/commercial-communication/assets/documents/Help_Modules/FAQs-%20Enterprise-Telemarketers%20who%20want%20to%20send%20commercial%20communication%20-%2004-02-2020.pdf); confirm the current operator fee and renewal terms when registering.

### SendGrid email verification

SendGrid sends the email containing an OTP or verification link; **CareerConnect still creates and validates the token**. It does **not** verify a phone number or send SMS through the SendGrid Email API. The existing Nodemailer utility has a configurable SMTP path, so SendGrid SMTP can replace personal Gmail SMTP without changing the whole authentication system. Configure a verified sending domain, SPF, DKIM, DMARC, bounce handling, and rate limits. [SendGrid Essentials starts at US$19.95/month](https://www.twilio.com/en-us/products/email-api/pricing); the free offer is a **60-day trial**, not a permanent production budget.

### Google sign-in and Firebase

Google OAuth through Firebase already appears in the project. At 10,000 registered users and 3,000 monthly active users, standard email/social authentication is typically **₹0 in Firebase Auth usage** under its [published no-cost allowances](https://firebase.google.com/pricing). Firebase **phone authentication is separately billed per SMS**, so choose either Firebase phone SMS or the Indian SMS gateway model above; **do not pay for both paths for the same OTP**.

## 5. Costs that depend on launch scope

| Launch choice | How it changes the monthly bill |
|---|---|
| **Paid course video** | Current course code uploads video to Cloudinary. Track stored GB, delivery GB, and transformations against its credit pool. For more predictable video budgeting, [Cloudflare Stream charges US$5 per 1,000 stored minutes per month plus US$1 per 1,000 delivered minutes](https://developers.cloudflare.com/stream/pricing/). Example: 1,000 minutes stored + 100,000 minutes viewed = **US$105 ≈ ₹10,080/month**, before tax. This requires integration work and is **extra** to the baseline. |
| **Paid course checkout** | Razorpay is planned. [Its standard domestic fee is 2% + 18% GST on that fee](https://razorpay.com/solutions/e-commerce/), or about 2.36% of domestic payment value. Example: 1,000 purchases × ₹500 = ₹5 lakh sales and about **₹11,800 gateway fees**. This is a percentage of sales, not a fixed subscription. |
| **More availability** | Add a second 4 GB Lightsail instance (US$24) and a Lightsail load balancer (US$18): about **₹4,032/month** extra before backup/network changes. |
| **Heavy AI usage** | Four times the modeled request volume adds about **₹16,848/month** compared with the baseline AI line. Meter requests and set spend caps. |
| **High job-search traffic** | Caching and a scheduled refresh are essential. If external scraping runs on each search, CPU, bandwidth, source blocking, and reliability may force a larger server or paid data source. No reliable external job-feed license price is included. |

## 6. Cost-efficient alternative

Because the client is a static React/Vite build, it could move from Vercel Pro to [Cloudflare Pages Free](https://www.cloudflare.com/en-gb/developer-platform/products/pages/) if its build limits and terms fit. Resumes and images could move from Cloudinary to private [Cloudflare R2 storage](https://developers.cloudflare.com/r2/pricing/) with signed access. R2 Standard lists US$0.015/GB-month, 10 GB/month free, operation charges, and free direct egress; 30 GB of files with modest requests can be under a few hundred rupees monthly. **That would require code changes** to replace Cloudinary upload/delivery and protect private files. On the same assumptions, the approximate run rate falls from **₹32,000 to about ₹20,000–₹22,000/month**, before tax, DigiLocker, or paid video. Cloudinary may still be worthwhile if its transformations or managed video workflow are important.

## 7. One-time launch costs and unknowns

- **DLT registration:** around **₹5,900 including GST** in the cited Airtel FAQ; verify current operator terms.
- **Domain purchase:** exact annual charge depends on the domain chosen; ₹1,500/year is only a placeholder.
- **Implementation:** LinkedIn sign-in, DigiLocker onboarding/integration, phone OTP, migration to a new media store, payment checkout, observability, load testing, and privacy/security work are development projects. No developer or agency fee is included because scope and supplier are unknown.
- **DigiLocker:** partner approval and price are unresolved; no honest all-in total is possible until written terms arrive.
- **Taxes:** the estimate is before tax except the cited DLT figure and examples explicitly including GST. Foreign SaaS invoices, local tax, and bank FX charges depend on account and billing setup.

## 8. Five tailored resumes for five matching openings

### How this feature works in CareerConnect

The current `/api/resume/tailor` path checks whether a tailored resume already exists for a job or internship **when the opening has an opportunity ID**. If it does and the user has not requested regeneration, CareerConnect reuses that saved version. For a new opening, it sends the verified profile or primary resume and the opportunity details to Gemini **once**, creates a PDF with PDFKit, uploads it to Cloudinary, and saves a separate MongoDB resume record. The five-opportunity recommendation itself can use the existing scoring engine; this calculation prices the **five new tailored resumes**, not an extra AI ranking step. These are planning estimates because the application does not yet record actual token usage per resume.

At the existing [`gemini-3.5-flash` standard API prices](https://ai.google.dev/gemini-api/docs/pricing) of **US$1.50 per million input tokens** and **US$9.00 per million output tokens**, use a central planning assumption of **4,000 input + 2,000 output tokens per tailored resume**. The output allowance includes any billable thinking tokens. With the report's ₹96/US$ planning exchange rate:

`(4,000 × $1.50 + 2,000 × $9.00) / 1,000,000 × ₹96 = ₹2.304 per tailored resume`

**Five new resumes cost about ₹11.52 in AI usage per participating user.** Shorter responses might cost about **₹6.48 for five** (3,000 input + 1,000 output each); longer responses might cost about **₹23.04 for five** (8,000 input + 4,000 output each). Retries or regeneration add another charge. These figures are marginal AI costs, not the average cost of running the whole website.

| Users generating five new resumes in a month | New AI calls | Added Gemini cost | New monthly total, before tax | Total divided by 10,000 registered users |
|---|---:|---:|---:|---:|
| 1,000 users (10%) | 5,000 | ₹11,520 | ₹43,244 | ₹4.32/user |
| 3,000 users (30%; equal to assumed monthly active users) | 15,000 | ₹34,560 | ₹66,284 | ₹6.63/user |
| 10,000 users (100%) | 50,000 | ₹115,200 | ₹146,924 | ₹14.69/user |

The table adds tailored-resume calls **on top of** the original ₹31,724 monthly estimate, which already budgets 5,000 general AI requests. If those original requests already include tailored resumes in practice, deduct the overlapping calls before using these totals. A month with 10,000 students all making five new resumes is also a **10,000-monthly-active-user** month, so the original 3,000-active-user assumption would need rechecking for other traffic.

### PDF storage and plan limits

The tailored output is a text-based PDF plus a MongoDB record, so there is no separate PDF-generation vendor charge. As a deliberately generous storage example, **50,000 PDFs × 100 KB = about 5 GB**. If each PDF is downloaded once, delivery adds roughly another 5 GB. [Cloudinary counts storage and delivered bandwidth against its credit allowance](https://cloudinary.com/documentation/billing_and_plans); this would consume roughly 10 credits before other media usage. The existing Plus plan includes 225 credits, so the extra PDFs may fit without a new subscription, but check actual PDF sizes, existing usage, and downloads. If usage forces a move from [Plus at US$99 to Advanced at US$249/month](https://cloudinary.com/pricing), the difference is **US$150 ≈ ₹14,400/month**. MongoDB storage or compute may also need more capacity if actual records or traffic exceed the M10 allowance. Those possible tier changes are **not** in the scenario table.

### What one user costs

The base website cost is shared across users. Using the report's exact **₹31,724/month** estimate:

| Measure | Calculation | Approximate monthly amount |
|---|---:|---:|
| Average per registered user | ₹31,724 ÷ 10,000 accounts | **₹3.17** |
| Average per monthly active user | ₹31,724 ÷ 3,000 active users | **₹10.57** |
| Extra AI for one user creating five new tailored resumes | 5 × ₹2.304 | **₹11.52** |
| Allocated total if all 3,000 active users create five | ₹66,284 ÷ 3,000 active users | **₹22.09 per active user** |

These are **average cost allocations**, not a charge from AWS or MongoDB for each account. The marginal cost of an inactive registered account is very low; the cost rises when that person sends OTPs, uses AI, downloads files, or watches course videos. A user who returns to the **same five openings linked by opportunity ID** can receive the cached tailored resumes without five new Gemini calls, unless regeneration is requested.

## Decision-ready figure

**Current-stack baseline:** **₹31,724 ≈ ₹32,000/month before tax**, or **₹3.17 per registered user** at 10,000 accounts and **₹10.57 per monthly active user** at 3,000 active users. **Five new tailored resumes add about ₹11.52 per participating user** at the stated token assumption. If all 3,000 monthly active users use that feature, the modeled total becomes **₹66,284/month before tax**; if all 10,000 users use it in the same month, **₹146,924/month before tax**. Keep a reserve for real token use, taxes, and possible media/database tier changes. The **DigiLocker quote and paid course video remain additional**. Recalculate after measuring actual usage in production.
