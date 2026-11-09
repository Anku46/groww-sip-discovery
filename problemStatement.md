# Groww SIP Retention — AI Discovery Engine
## Project Context & Problem Statement

---

## 1. Executive Summary & Project Purpose

**"Groww SIP Retention — AI Discovery Engine"** is a specialized Product Management (PM) Discovery and Opportunity Sizing Engine designed to investigate and quantify *why* first-time mutual fund investors in India abandon their Systematic Investment Plans (SIPs) before completing 12 consecutive monthly installments on Groww.

The application serves dual purposes:
1. **Interactive Mentor Testing Sandbox & Discovery Pipeline:** A live, deterministic, and rule-augmented engine that demonstrates automated discovery — covering Hinglish PII scrubbing, Indian MF domain-rule injection, behavioral extraction, and SEBI constraint validation — on real customer feedback.
2. **Quantified Opportunity Sizing Dashboard:** A synthesized product strategy dashboard that surfaces answers to 9 critical discovery questions from a multi-channel corpus of customer conversations, mathematically ranks friction themes using an opportunity scoring formula, and validates AI-generated insights against a human-verified golden dataset.

The *output* of this engine — the ranked themes, their prevalence, and the concrete behavioral patterns — is what research and analysis will produce. This document defines the problem we are trying to solve and the methodology we will use; it does not pre-determine what we will find.

---

## 2. Core Problem Definition: The First-Time SIP Drop-Off

### The 12-Month Retention Challenge

In the Indian retail investment ecosystem, millions of young, first-time investors are onboarded via frictionless digital KYC and UPI Autopay. Despite a simple start, a meaningful share of these investors cancel or allow their SIPs to lapse within the first 12 monthly installments.

**What we know going in (established facts about the domain):**
- The Indian mutual fund industry runs on NPCI's NACH/UPI Autopay infrastructure, which has specific plumbing constraints (e.g., mandate presentation lock-in windows before a debit date). These constraints are often invisible to retail investors.
- First-time investors typically have no prior experience with NAV fluctuation, rupee-cost averaging, or the distinction between an SIP installment status and an actual bank debit confirmation.
- Multiple third-party apps (PhonePe, Google Pay) can surface and allow cancellation of the same UPI Autopay mandate that powers a Groww SIP — creating a potential silent-churn channel outside Groww's ecosystem.

**What we do NOT yet know (the open research questions):**
- Which specific friction points actually drive the most drop-offs, and in what proportions?
- At what stage in the SIP lifecycle does churn concentrate — and is there a dominant "danger window"?
- Are drop-off triggers primarily financial (cashflow, market returns), operational (app UX, mandate mechanics), emotional (anxiety, peer pressure), or some combination?
- Do different investor segments (salaried vs. freelancer, urban vs. semi-urban, influencer-led vs. peer-led onboarding) churn for different reasons?

Research and corpus analysis, not assumption, will answer these questions.

### Key Regulatory & Case Constraints

Any product intervention surface or engine output must operate strictly within Indian regulatory boundaries established by the **Securities and Exchange Board of India (SEBI)** and consumer protection norms:
- **Zero Fund / Stock Recommendations:** No automated tips, fund comparison leading to direct advisory, or fund switching suggestions without a SEBI Registered Investment Advisor (RIA) license.
- **Zero Fear, FOMO, or Urgency Nudges:** No artificial countdown timers, alarmist notifications, or guilt-inducing copy when an investor pauses or skips an installment.
- **Strict Opportunity Addressability Filter:** Unmet user desires that violate SEBI regulations (e.g., "Tell me which small-cap fund will give 30% returns next month") must be downgraded with a heavy constraint penalty (`0.2x` addressability weight) in the opportunity scoring model.

---

## 3. Research Methodology & Data Corpus Plan

The insights that will power this engine will originate from a multi-channel listening exercise across public forums where first-time SIP investors discuss their experiences.

### Planned Source Channels

The following channels are in scope for data collection. Actual record counts per channel will be determined after scraping and filtering; they are not pre-set targets.

| Source Channel | Rationale for Inclusion |
| :--- | :--- |
| **Google Play Store Reviews** | High volume of transactional complaints; captures app-level friction at the moment of failure |
| **Apple App Store Reviews** | iOS-specific UX patterns; tends toward more articulate, detailed feedback |
| **Reddit (`r/personalfinanceindia`, `r/IndiaInvestments`)** | Long-form discussion; captures emotional journey, peer advice-seeking, and portfolio anxiety |
| **YouTube Comment Sections** | First-time beginners engaging with educational content; reveals expectation gaps |
| **FinTech Forums (TradingQ&A, etc.)** | Power-user and semi-technical discussions about transaction plumbing and reconciliation |

### Filtering Criteria
Raw records will be filtered down to **first-time investor conversations only**, defined as:
- Explicit mention of this being their first SIP, first mutual fund, or first investment experience, **or**
- Clear behavioral markers consistent with a new investor (e.g., asking what NAV means, confusion about first installment timing, comparing SIP to FD as a newcomer).

The final filtered corpus size will be reported as an output of the research phase, not defined here.

### Opportunity Scoring Formula

To prioritize discovered friction themes objectively after research is complete, each theme will be evaluated using:

$$\text{Opportunity Score} = \text{Theme Share (\%)} \times \text{Mean Churn Severity (1–5)} \times \text{Constraint Addressability (0–1)}$$

- **Theme Share (%):** Percentage of the filtered corpus where this theme is the primary friction driver — derived from corpus analysis.
- **Mean Churn Severity (1–5):** Average severity score across all records tagged with this theme — derived from behavioral extraction.
- **Constraint Addressability (0–1):** How actionable the theme is within SEBI constraints. Themes that require SEBI-restricted advice score 0.2; fully addressable themes score 1.0.

The ranked output — number of themes, their names, and their scores — will emerge from research.

---

## 4. The 9 Core Discovery Questions

These are the open questions this engine is built to answer through research and corpus analysis. They are questions, not pre-filled answers.

| # | Discovery Question |
| :-: | :--- |
| **1** | Why do first-time investors start a SIP, and what are their expectations at the outset? |
| **2** | How does investor behavior and emotional state evolve from Month 1 through Month 8–12? |
| **3** | What specific events, moments, or realizations trigger a decision to pause, skip, or cancel? |
| **4** | What do users actively monitor in the app, and how frequently — and does this correlate with churn? |
| **5** | What inside-app elements (UI, copy, status displays) create confusion or misplaced blame? |
| **6** | What outside-app workarounds do investors resort to (e.g., third-party UPI apps, Reddit, manual investing)? |
| **7** | What distinguishes investors who continue past 12 months from those who drop off early? |
| **8** | Are there meaningfully different churn patterns across investor segments (age, income type, onboarding trigger)? |
| **9** | What consistent unmet needs surface across the corpus that Groww could feasibly address? |

---

## 5. Technical Architecture & Design Requirements

### Theme & Styling Specifications
- **Base Aesthetics:** Clean, high-density Fintech Analytical Dashboard.
- **Palette:** Dark Navy background (`#0F172A`), Slate surfaces (`#1E293B` / `#F8FAFC`).
- **Okabe-Ito Color-Blind Safe Accents:**
  - Teal (`#0072B2`): Positive growth, verified state, low risk.
  - Vermilion (`#D55E00`): Critical risk, high churn severity, cancellation alert.
  - Amber (`#E69F00`): Medium risk, warning state, informational pause.

### Core Stack & Interactive Reliability
- **Frontend Framework:** React / Next.js / Vite + Tailwind CSS + Lucide React Icons.
- **Fail-Safe Architecture:** Works **100% out-of-the-box** without demanding API keys from mentors during evaluation.
- **Dual-Engine Processing:**
  - *Built-in Deterministic Simulation Engine:* Fast, realistic rule-based parsing with domain-specific heuristic regexes and semantic mapping.
  - *Optional LLM Drawer:* Enables live inference using Groq, OpenAI, or Google Gemini if the evaluator supplies an API key.

---

## 6. The 4 Interactive Tabs Specification

### Tab 1: Live Interactive Discovery Workflow (Mentor Test Sandbox)
- **Interactive Controls:**
  - Raw text input area for verbatim testing.
  - Quick-Load Real Verbatim Chips: Representative real-world inputs that exercise different paths through the pipeline, including Hinglish complaints, mandate revocation scenarios, return frustration, salary–debit date mismatch, and SEBI-restricted advisory requests.
- **Visual 4-Stage Discovery Pipeline:**
  1. **Stage 1 — PII Scrubber & Hinglish Semantic Normalizer:** Masks names, phone numbers, and account numbers; translates Hinglish colloquials to structured English intent.
  2. **Stage 2 — Indian MF Domain Rule Injector:** Surfaces underlying domain mechanics relevant to the input (e.g., T-3 mandate lock-in, NACH bounce penalty structure, UPI Autopay revocation path, NAV unit accumulation vs. absolute P&L).
  3. **Stage 3 — Structured Behavioral Extraction:** Emits structured JSON and visual status badges covering: `Investor Lifecycle Stage`, `User Segment`, `Primary Friction Theme`, `Inside-App Confusion`, `Outside-App Workaround`, `Churn Severity (1–5)`.
  4. **Stage 4 — Constraint Check & Opportunity Contribution:** Validates the extracted intent against SEBI guidelines and case constraints; applies penalty weighting if advisory content is detected.

### Tab 2: Quantified Opportunity Matrix & 9 Discovery Questions
- Interactive sorting and filtering table displaying discovered friction themes with their opportunity scores.
- Visual breakdown of the analyzed corpus across source channels.
- Expandable accordion grid with answers to all 9 core discovery questions (populated from research findings).

### Tab 3: Dataset Explorer (Filterable Corpus Sample)
- Searchable data table of representative multi-source user verbatims.
- Multi-dimensional filtering by: Source Channel, Lifecycle Month Bucket, User Segment, and Primary Friction Theme.

### Tab 4: AI Evidence Log & Golden Set Validation
- **Agreement Benchmark Scorecard** measuring how closely the AI engine's classifications match human PM ground-truth labels on a held-out golden set.
- **Full Golden Set Validation Table:** Columns — `ID`, `Source`, `Verbatim Snippet`, `Human PM Label (Ground Truth)`, `AI Engine Label`, `Match Status (✅ / ❌)`, `Root Cause of Mismatch`.
- **Highlighted Correction Case Studies:** Cards documenting specific instances where AI output was rejected or overridden by a human PM reviewer, with reasoning.

---

## 7. Domain Glossary & Indian FinTech Mechanics

These are established domain facts, not research findings. They form the background knowledge the engine uses to interpret investor feedback.

- **NPCI (National Payments Corporation of India):** The governing body managing retail electronic payments, including NACH and UPI Autopay.
- **NACH / e-Mandate:** National Automated Clearing House electronic mandate authorizing mutual fund debit directly from an investor's bank account.
- **T-3 Mandate Lock-in Cutoff:** Mutual fund transaction platforms (BSE StarMF, NSE NMF II) generate and freeze bank presentation files 3 working days prior to the debit date. Attempting to modify or cancel an installment after the T-3 window has passed does not prevent the bank from being presented with the debit — a fact almost universally unknown to first-time investors.
- **NACH Bounce Penalty:** A penalty charged by commercial banks when an ECS/NACH debit request fails due to insufficient funds. Groww itself does not levy this charge, but investors frequently attribute the loss to Groww.
- **UPI Autopay:** Modern recurring mandate mechanism allowing debit authorizations via UPI handles. Mandates can be independently revoked through third-party UPI apps (PhonePe, Google Pay), creating a churn vector outside Groww's direct control.
- **NAV (Net Asset Value):** The per-unit price of a mutual fund scheme. First-time investors frequently misinterpret absolute NAV movement as analogous to a stock price drop, leading to premature panic.
- **Rupee-Cost Averaging:** The mechanism by which fixed periodic investments buy more units when NAV is low and fewer when NAV is high, reducing average cost over time — a concept rarely internalized by investors who only read absolute P&L.
