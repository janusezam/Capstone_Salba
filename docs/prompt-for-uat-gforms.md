```
You are the lead developer and academic documentation specialist for SALBA, an
emergency reporting, response coordination, and CDRRMO management system for
Malaybalay City. Create the FINAL, complete, Google Forms-ready User Acceptance
Testing (UAT) and Quality Evaluation Survey for SALBA.
```

```
Your output must be in clean Markdown or plain text that can be copied directly
into Google Forms. Do not provide explanations, analysis, alternatives,
placeholders, or a partial draft. Deliver only the finalized form content,
including section titles, descriptions, question types, required fields,
choices, linear-scale labels, and Google Forms branching instructions.
```

# `## Primary Requirement` 

```
The questionnaire must be aligned with selected ISO/IEC 25010 software product
quality characteristics. Do not claim that SALBA is ISO certified. Use this
academic statement in the form description:
```

```
“The User Acceptance Testing questionnaire evaluates SALBA using selected
software product quality characteristics aligned with ISO/IEC 25010.”
```

```
Use these quality characteristics:
```

`1. Functional Suitability` 

`2. Performance Efficiency` 

`3. Compatibility` 

`4. Usability` 

`5. Reliability` 

`6. Security` 

`7. Maintainability` 

`8. Portability` 

```
Use a consistent 5-point Likert scale for all quality statements:
```

- `5 – Strongly Agree` 

- `4 – Agree` 

- `3 – Neutral` 

- `2 – Disagree` 

- `1 – Strongly Disagree` 

- `N/A – Not Applicable / Feature Not Tested` 

```
Use “Multiple-choice grid” for each ISO/IEC 25010 section, with the evaluation
statements as rows and the rating scale as columns.
```

# `## Critical Validator Requirements` 

`1. Categorize and separate respondents into:` 

- `Main User / Citizen of Malaybalay` 

- `CDRRMO Responder / Rescuer` 

- `CDRRMO Admin / Staff (Web System)` 

`2. Use Google Forms “Go to section based on answer” branching:` 

- `Each evaluator must answer the common sections.` 

- `Each evaluator must then answer only the role-specific module-testing section that applies to their selected category.` 

- `Do not show citizens, responders, or admin/staff questions for modules they cannot access.` 

`3. All actual SALBA features and modules must be tested individually.` 

- `Do not use broad statements such as “all features work properly.”` 

- `Do not use vague statements such as “the system is good.”` 

- `Every feature must have clear module-specific questions based on actual SALBA functions.` 

- `Include a “Modules/Features Tested” checkbox question for each user group.` 

- `Each module should be evaluated through functional suitability and, where` 

```
applicable, usability, reliability, performance efficiency, compatibility, and
security.
```

`4. Before writing the final questionnaire, inspect the SALBA source code, database schema, routes, API endpoints, UI screens, user roles, dashboards, mobile application features, web-system features, and existing documentation. Derive the exact module names and capabilities from the real system. Do not invent modules, functions, integrations, or capabilities that do not exist.` 

`5. If a feature is unavailable, incomplete, or not implemented, do not include it as a testable UAT item. Instead, list it separately at the end under: “Features Excluded From UAT Due to Unavailability or Incomplete Implementation”` 

```
   Include the feature name and a brief reason.
```

```
## Required Form Structure
```

```
### Section 1 — Form Title and Instructions
```

# `Title:` 

```
“User Acceptance Testing (UAT) and ISO/IEC 25010 Quality Evaluation Survey for
SALBA”
```

```
Include a concise description explaining that:
```

- `SALBA is evaluated based on actual use during testing.` 

- `The evaluator should complete only the tasks/features assigned to their role.` 

- `Responses will be used for system validation, improvement, research, and academic documentation.` 

- `The instrument is aligned with selected ISO/IEC 25010 quality characteristics.` 

- `There are no right or wrong answers.` 

- `The 5-point scale and N/A option must be used.` 

```
### Section 2 — Informed Consent
```

# `Include:` 

- `Purpose of evaluation` 

- `Voluntary participation` 

- `Confidentiality` 

- `Data privacy` 

- `Data retention` 

- `Possible risks/discomforts` 

- `Possible benefits` 

- `Contact information placeholder: [Insert Researcher Email]` 

- `Required agreement question:` 

```
  “I have read and understood the information above. I voluntarily agree to
participate in this UAT and allow my responses to be used for research, system
validation, system improvement, and academic purposes.”
```

# `Options:` 

- `I Agree` 

- `I Do Not Agree` 

```
Branching:
```

- `“I Agree” goes to Respondent Profile.` 

- `“I Do Not Agree” goes to form submission/end section.` 

```
### Section 3 — Respondent Profile
```

```
Include these questions:
```

`1. Name — Short answer — Optional` 

`2. Email Address — Short answer — Optional` 

`3. Testing Date — Date — Required` 

`4. User Category — Multiple choice — Required` 

- `Main User / Citizen of Malaybalay` 

- `CDRRMO Responder / Rescuer` 

- `CDRRMO Admin / Staff (Web System)` 

`5. Device Used — Checkboxes — Required` 

- `Android phone` 

- `iPhone` 

- `Tablet` 

- `Laptop` 

- `Desktop computer` 

- `Other` 

`6. Browser Used — Multiple choice — Required` 

- `Google Chrome` 

- `Microsoft Edge` 

- `Mozilla Firefox` 

- `Safari` 

- `Other` 

```
Configure branching from “User Category” to the corresponding role-specific task
and module-testing section.
```

# `### Section 4 — Common ISO/IEC 25010 Evaluation` 

```
All respondents must answer this section after testing their assigned role-based
features.
```

```
Create separate Multiple-choice grids for:
```

# `#### A. Functional Suitability` 

```
Include statements measuring whether SALBA provides complete, correct, and
appropriate functions for the evaluator’s assigned tasks.
```

# `#### B. Performance Efficiency` 

```
Include statements measuring loading time, response time, timely submission,
retrieval, processing, and performance during normal use.
```

# `#### C. Compatibility` 

```
Include statements measuring correct operation on the evaluator’s device,
browser, screen size, operating environment, and normal workflow.
```

# `#### D. Usability` 

```
Include statements measuring navigation, clarity of labels and instructions,
ease of learning, ease of task completion, visual layout, error messages, and
user confidence.
```

# `#### E. Reliability` 

```
Include statements measuring stable operation, consistent behavior, accurate
notifications or updates, appropriate handling of errors, preservation of
submitted information, and continuous operation.
```

# `#### F. Security` 

```
Include statements measuring authentication, role-based access, confidentiality,
appropriate access restrictions, protection of personal/sensitive information,
and security-related confirmations.
```

# `Important:` 

- `Use plain language understandable by citizens, responders, and administrative staff.` 

- `Use N/A where a quality statement cannot be fairly evaluated by a respondent.` 

- `Do not duplicate the same idea under multiple quality categories.` 

- `Do not ask end users to judge internal source-code quality, database structure, or developer-only processes.` 

# `### Section 5 — Main User / Citizen of Malaybalay` 

```
Create a role-specific section using the actual citizen-facing SALBA modules
```

```
identified from the system.
```

```
First question:
“Which SALBA citizen features did you test?”
Question type: Checkboxes
Required: Yes
Choices: List every actual citizen-facing feature/module found in the system.
```

```
Then create module-specific evaluation items for every listed feature. Use exact
system terminology.
```

```
For each actual feature, include questions that verify:
```

- `The feature can be accessed. - The feature performs its intended task correctly. - The required information can be entered, selected, submitted, viewed, or updated correctly.` 

- `The output, confirmation, notification, status, map, upload, or result is accurate when applicable.` 

- `The feature is understandable and usable by a citizen.` 

- `The citizen’s data and access are appropriately protected where applicable.` 

```
### Section 6 — CDRRMO Responders / Rescuers
```

```
Create a role-specific section using the actual responder/rescuer SALBA modules
identified from the system.
```

```
First question:
“Which SALBA responder/rescuer features did you test?”
Question type: Checkboxes
Required: Yes
Choices: List every actual responder/rescuer feature/module found in the system.
```

```
Then create module-specific evaluation items for every listed feature. Use exact
system terminology.
```

```
For each actual feature, include questions that verify:
```

- `Access to incident reports, alerts, assignments, or operational records.` 

- `Accuracy and completeness of incident details.` 

- `Proper operation of location, mapping, routing, dispatch, communication, or status-update features where they exist.` 

- `Accurate receipt of alerts or notifications.` 

- `Correct status updates, response records, or coordination actions.` 

- `Reliability and suitability of the feature for emergency-response operations.` 

- `Proper access controls for responder-level functions.` 

```
### Section 7 — CDRRMO Admin / Staff (Web System)
```

```
Create a role-specific section using the actual admin/staff web modules
identified from the system.
```

```
First question:
“Which SALBA admin/staff web features did you test?”
Question type: Checkboxes
Required: Yes
Choices: List every actual administrative web module found in the system.
```

```
Then create module-specific evaluation items for every listed feature. Use exact
system terminology.
```

```
For each actual feature, include questions that verify:
```

- `Proper login and role-based access.` 

- `Dashboard accuracy and usefulness.` 

- `Correct management of users, accounts, roles, records, and system data where applicable.` 

```
- Correct monitoring, verification, processing, dispatching, assigning,
updating, archiving, and reporting functions where applicable.
```

```
- Accuracy of generated reports, analytics, maps, summaries, notifications, and
records where applicable.
```

- `Appropriate administrative controls and protection of sensitive information.` 

```
- Suitability for actual CDRRMO operational and administrative workflow.
```

```
### Section 8 — Maintainability and Portability for Authorized Technical
Evaluators
```

```
Show this section only to respondents who are genuinely qualified to evaluate
technical/admin aspects. If the current three user categories do not include a
technical evaluator, place these questions under CDRRMO Admin/Staff only when
they directly observe these characteristics; otherwise set them as N/A-capable
items.
```

```
Maintainability must focus only on observable aspects:
```

- `Errors can be identified and reported clearly.` 

- `System changes, fixes, or updates do not unnecessarily disrupt normal use.` 

- `The web system remains functional after authorized updates, where tested.` 

```
Portability must focus only on observable aspects:
```

- `The system works properly across tested supported devices and browsers.` 

- `The mobile interface adapts to tested screen sizes, where applicable.` 

- `The system remains usable across tested networks or locations.` 

```
Do not ask citizens to assess source-code modularity, code analyzability, or
technical installation unless they actually performed those tasks.
```

```
### Section 9 — Overall Acceptance
```

```
Use a Multiple-choice grid or individual questions:
```

`1. SALBA meets the needs of my role.` 

`2. SALBA is suitable for its intended emergency-reporting, response, coordination, and administrative purpose.` 

`3. I would be willing to use SALBA in actual operations, when needed.` 

`4. I would recommend SALBA to other intended users in my role.` 

`5. Overall, I am satisfied with my experience using SALBA.` 

# `Add:` 

```
“Overall Rating of SALBA”
Question type: Linear scale, 1 to 5
```

- `1 = Very Poor` 

- `5 = Excellent` 

```
### Section 10 — Open-Ended Feedback
```

```
Use paragraph questions:
```

`1. Which SALBA module or feature was most useful during testing? 2. Which specific module or feature needs the most improvement before deployment?` 

`3. What errors, difficulties, or limitations did you encounter?` 

`4. What feature, revision, or safeguard do you recommend before deployment?` 

`5. Additional comments or suggestions.` 

- `## Output Format Rules` 

```
Return the completed UAT in this exact Markdown structure:
```

- `# [Form Title]` 

```
## Form Description
```

```
## Section 1: Informed Consent
For every question, show:
```

```
- Question
```

- `Google Forms question type` 

- `Required: Yes/No` 

- `Choices` 

- `Branching instruction, if applicable` 

```
Continue this format for every section through the final submission section.
```

```
For every ISO/IEC 25010 grid, show:
```

- `Grid title` 

- `Question type: Multiple-choice grid` 

- `Rows - Columns` 

- `Required: Yes` 

- `Include N/A column` 

```
For every role-specific module, explicitly identify:
```

```
- Module name
```

- `User category` 

- `Exact evaluation questions` 

- `Question type` 

```
- Required status
```

```
At the end, include:
```

```
## Google Forms Branching Map
```

```
Provide a concise routing map, for example:
- Consent = I Agree → Respondent Profile
- Consent = I Do Not Agree → End Form
- Citizen → Common ISO Evaluation → Citizen Module Evaluation → Overall
Acceptance → Feedback → Submit
- Responder → Common ISO Evaluation → Responder Module Evaluation → Overall
Acceptance → Feedback → Submit
```

```
- Admin/Staff → Common ISO Evaluation → Admin/Staff Module Evaluation →
Technical/Admin Evaluation, if applicable → Overall Acceptance → Feedback →
Submit
```

```
## Feature Coverage Matrix
```

```
Create a table with these columns:
```

- `User Category` 

- `Actual SALBA Module/Feature` 

- `Functional Suitability Item(s)` 

- `Usability Item(s)` 

- `Reliability/Performance/Security Item(s), as applicable` 

- `Included in UAT: Yes/No` 

```
The final result must be complete, non-redundant, role-based, feature-specific,
ready to copy into Google Forms, and based strictly on the actual implemented
SALBA system.
```

