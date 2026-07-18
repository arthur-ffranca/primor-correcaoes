# Essay Correction Site V1 Design

## Overview

This document defines the V1 of a responsive web application for handwritten essay correction. The product is designed for a single teacher account in the first release and focuses on secure essay ingestion, AI-assisted correction, manual review, approval, and private historical storage.

The correction model should follow the Unicamp scoring structure as the primary rubric, while also using the teacher's real correction patterns as a calibration layer for sensitivity to language, clarity, adequacy of register, and recurring teacher-highlighted issues.

## Goals

- Provide a secure login-protected system for a single teacher.
- Allow upload of one or more handwritten essay photos.
- Generate a preliminary correction report from the uploaded images.
- Highlight problematic passages in a separate report, with explanation and suggested adjustment.
- Produce scoring by Unicamp-style criteria and a converted score on a 0-1000 scale.
- Require teacher review and approval before a correction becomes final.
- Preserve a private historical archive of approved corrections.
- Allow the teacher to download the approved essay package with the correction criteria and final report.

## Non-Goals

- Student-facing access in V1.
- Multi-teacher tenancy in V1.
- Mobile-native application in V1.
- Automatic approval without human review.
- Fully visual marking directly on the essay sheet in V1.

## Primary User

### Teacher

The only user in V1 is the teacher. She logs in with email and password, uploads essay photos, reviews AI-generated corrections, approves final versions, consults historical records, and downloads approved correction packages.

## Product Principles

- Human approval is mandatory before any correction is treated as final.
- The system must not over-penalize uncertain OCR or unclear handwriting.
- Privacy is a first-class requirement because the system stores student information.
- Traceability matters: the teacher must be able to see why each issue was flagged.
- Unicamp is the backbone of scoring, but teacher markup patterns help calibrate the analysis.

## Functional Scope

### Authentication

- The application must require login by email and password.
- Passwords must be stored only as secure hashes.
- Unauthenticated users must not access any essay, report, image, or history page.

### Essay Submission

The teacher creates a new essay submission by providing:

- student name
- class/group
- prompt/theme
- submission date
- one or more essay photos

The submission is initially stored as a draft under processing.

### Automated Preliminary Analysis

After upload, the system performs a staged pipeline:

1. image ingestion and storage
2. OCR or handwriting-to-text extraction
3. transcription normalization
4. issue detection
5. explanation generation for each issue
6. Unicamp-criteria scoring suggestion
7. conversion to a 0-1000 score

The preliminary report must include:

- transcription of the essay
- explicit uncertainty markers where the image is not reliably readable
- a concise "largest discounts first" section with the 3 to 5 issues that most reduced the score
- problematic passages ordered by estimated score impact
- issue type
- explanation of why the passage is problematic
- suggested adjustment
- impact on rubric criteria
- suggested score by criterion
- overall suggested score

The teacher-approved feedback pattern is intentionally executive. The system should not generate a long correction essay by default. It should help the teacher decide quickly by surfacing the most grade-relevant issues first, with short explanations and clear score impact.

### Teacher Review

The teacher must review the preliminary analysis before approval. In the review interface, she can:

- inspect uploaded photos
- read the generated transcription
- edit transcription when necessary
- accept, edit, or remove flagged issues
- review suggested score by criterion
- review overall score conversion
- approve the final correction
- save without approval and continue later

### Historical Archive

The application must maintain a private archive of submissions and approved corrections. The teacher should be able to view:

- submissions still under review
- approved corrections
- core metadata such as student name, class/group, theme, date, and status

### Downloads

For approved essays, the teacher must be able to download a correction package containing:

- original uploaded essay images
- approved transcription
- approved correction report
- criterion-by-criterion scores
- final Unicamp-style score
- converted 0-1000 score

## Correction Model

### Rubric Backbone

The primary scoring structure should follow the Unicamp-style rubric discussed in product discovery:

- genre
- purpose
- interlocution
- image
- source text
- cohesion and coherence
- grammar
- aesthetics

The product should preserve raw criterion scores and derive a total score from them. It should also convert that result into a 0-1000 scale for easier consumption.

### Calibration Layer

Teacher-marked examples are used as calibration material, not as a replacement for the Unicamp rubric. Their role is to refine issue detection in categories such as:

- punctuation misuse
- agreement issues
- weak wording
- awkward or unclear phrasing
- inadequate register for the requested genre
- poor reader address or weak interlocution

This calibration layer should influence suggestions and explanations, but the final structured score remains rubric-based.

## Submission States

Each essay should move through explicit states:

- submitted
- processing
- ready_for_review
- needs_resubmission
- approved
- archived

### `needs_resubmission`

This state is used when the uploaded images are too poor for reliable correction. The system must clearly notify the teacher that better images are required and should not silently proceed as if the reading were trustworthy.

## Failure Handling

### Low-Quality Images

If an image is blurred, cropped, shadowed, too distant, or otherwise unreadable:

- mark the relevant transcription span as uncertain when only parts are affected
- move the essay to `needs_resubmission` when readability is too compromised
- show a clear warning asking the teacher to re-upload better photos

### OCR Ambiguity

When the system is unsure about a word or phrase:

- do not automatically penalize that fragment as a confirmed student error
- expose the uncertainty in the review screen
- allow the teacher to correct the transcription manually

### Partial Processing Failure

If one step fails but enough data remains for review:

- preserve the upload
- preserve successful intermediate outputs
- surface the failure reason in the UI
- let the teacher decide whether to retry or continue reviewing what is available

## Security and Privacy

### Access Control

- Only authenticated access is allowed.
- All essays, reports, and files are scoped to the owning teacher account.
- No public file URLs should exist for essay images or downloadable reports.

### Data Protection

- Passwords must be hashed securely.
- Sessions must be protected and expire safely.
- File storage must remain private.
- Only necessary student data should be stored in V1.

### Auditability

The system should keep timestamps for:

- submission creation
- processing completion
- review updates
- final approval

It should also preserve separation between:

- preliminary automated analysis
- approved teacher-reviewed final analysis

## Data Model

### User

- id
- email
- password_hash
- created_at
- updated_at

### Essay Submission

- id
- user_id
- student_name
- class_group
- theme
- submission_date
- status
- created_at
- updated_at

### Essay File

- id
- essay_submission_id
- storage_path
- mime_type
- page_order
- created_at

### Transcription

- id
- essay_submission_id
- raw_text
- normalized_text
- uncertainty_notes
- created_at
- updated_at

### Preliminary Analysis

- id
- essay_submission_id
- issues_payload
- criterion_scores_payload
- total_raw_score
- total_1000_score
- processing_notes
- created_at
- updated_at

### Final Review

- id
- essay_submission_id
- approved_transcription
- approved_issues_payload
- approved_criterion_scores_payload
- approved_total_raw_score
- approved_total_1000_score
- reviewer_notes
- approved_at
- updated_at

## User Flow

1. Teacher logs in with email and password.
2. Teacher opens the dashboard and selects "New Essay".
3. Teacher fills in student name, class/group, theme, date, and uploads one or more photos.
4. System stores the submission and starts processing.
5. System produces transcription, issue analysis, criterion scoring, and overall score suggestion.
6. If the image quality is too poor, the system moves the submission to `needs_resubmission`.
7. If processing succeeds, the submission moves to `ready_for_review`.
8. Teacher opens the review screen and validates the transcription and analysis.
9. Teacher edits or confirms the suggested report.
10. Teacher approves the correction.
11. System stores the approved version in the private archive.
12. Teacher downloads the approved correction package if desired.

## Reporting Format

The approved report should be structured for teacher use and future validation:

- essay metadata
- approved transcription
- executive summary in 2 to 3 sentences
- "largest discounts" list limited to the most important 3 to 5 passages
- classification of each issue
- explanation of why each issue matters
- suggested or approved improvement
- rubric impact per issue where relevant
- criterion-by-criterion scores
- total raw score
- converted 0-1000 score
- high-level insights about recurring weaknesses and strengths, kept brief enough for batch correction work

## Recommended Technical Direction

The preferred architecture is a staged processing pipeline with a review-oriented web interface:

- responsive web frontend
- backend with authentication and protected storage
- database for submissions, analysis, reviews, and history
- private file storage for essay images and downloadable reports
- modular analysis pipeline separating ingestion, OCR, correction analysis, scoring, and export

This approach is preferred because it gives stronger traceability, better failure handling, and more reliable iteration than a single monolithic prompt flow.

## Validation Plan for V1

The first implementation should be validated against:

- login and session protection
- private access control
- single and multi-image essay upload
- good-quality and poor-quality image flows
- uncertain transcription handling
- generation of criterion-based preliminary reports
- teacher review and approval flow
- persistence in historical archive
- download generation for approved essays

## Open Implementation Decisions

These are implementation choices still to be resolved during planning, not product-level uncertainties:

- exact OCR provider and handwriting-reading strategy
- exact AI model and prompt chain design
- exact report export format, such as PDF, ZIP, or both
- concrete framework and hosting stack

## Success Criteria for V1

V1 is successful if the teacher can:

- log in securely
- upload handwritten essay images with metadata
- receive a preliminary Unicamp-style correction report
- identify unclear-image failures and request new photos
- review and approve the correction confidently
- access private historical records
- download the approved essay and criteria package
