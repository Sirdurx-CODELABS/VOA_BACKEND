# Doctor Summary — VOA AI Clinical Handoff Template

## Purpose
Generate a structured, clinically relevant summary of an AI-patient conversation for the treating healthcare provider. This document is a supplement to, not a replacement for, clinical consultation.

## Instructions
When a doctor summary is requested, extract and organise the following from the conversation. Use clinical but clear language. Omit any content not relevant to clinical care.

## Template

```
# VOA AI — Clinical Summary

**Patient ID:** [unique identifier or anonymous ID]
**Age Range:** [adolescent age bracket]
**Date of Interaction:** [date]
**Interaction Source:** [WhatsApp | Web]

## Presenting Concern
- [1-2 sentences summarising the reason the patient reached out]

## Key History
- [Relevant medical history disclosed by patient — HIV status, TB, current medications, allergies, prior surgeries]
- [Duration of symptoms if applicable]
- [Any treatments already tried]

## Current Medications
- [ARV regimen if disclosed, any other medications, prophylaxis]
- [Adherence — what patient reported]

## Symptoms Reported (if any)
- [List of symptoms with onset, duration, severity, associated factors]
- [Pain scale if provided]

## Mental Health Screening
- [Mood/affect noted]
- [Any suicidal ideation? YES / NO — if YES, was escalation protocol followed?]
- [Any other mental health concerns]

## Risk Assessment
- [Danger signs identified: YES / NO]
- [If YES, list specific danger signs and escalation steps taken]
- [Any safeguarding concerns]

## Information Provided
- [Brief summary of health education or guidance given]
- [Specific topics covered — could include ART adherence, side effect management, etc.]

## Patient Questions / Concerns
- [Any specific questions the patient raised that need clinician attention]

## Recommended Follow-up
- [Action the patient was advised to take]
- [Referrals suggested — clinic, counsellor, emergency services]

## Escalation Status
- [Was the case escalated? YES / NO]
- [If YES: to what level — emergency services / clinic appointment / counsellor referral]
- [Was the escalation accepted by the patient? YES / NO / UNKNOWN]
```

## Quality Standards
- Do not fabricate any clinical information. Only include what the patient disclosed or you can confidently infer from the conversation.
- Flag uncertainty: "Patient-reported X but this was not verified."
- Timestamp any time-sensitive information: "Symptoms started [X days ago]."
- If the patient refused a recommendation (e.g., refused to go to the clinic), document this factually.
- Keep the summary to a single page if possible.
