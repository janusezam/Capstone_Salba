
I'm the paper writer for this capstone project (Salba), not the developer. I need you to
document the ACTUAL system flow exactly as it is implemented in this codebase — not what
a paper or diagram claims it does. Read through the mobile app, backend/API, and AI
classification code before answering. Do not guess or assume standard architecture; base
everything strictly on what the code actually does.

Please answer in this exact structure:

1. END-TO-END FLOW (VICTIM/CITIZEN REPORTING)
   - Walk through what happens, in order, from the moment a user taps the emergency
     report button in the mobile app to the moment the report reaches the backend.
   - Specifically confirm: Does the app capture GPS location automatically, or does the
     user have to grant/trigger it manually? At what exact step is the location captured?
   - What data fields are actually sent in the report payload (list every field name from
     the actual request body/schema)?

2. AI CLASSIFICATION PIPELINE
   - Which model(s) are actually implemented and running (Random Forest, XGBoost,
     Logistic Regression, or something else)? Quote the file(s) and function/class names.
   - What does each model actually classify or predict (disaster type, severity, false
     alarm detection)? Confirm this matches or differs from: Random Forest for disaster
     type, XGBoost for severity, Logistic Regression for false-alarm/duplicate detection.
   - Is there an actual confidence-threshold check that routes low-confidence predictions
     to a human administrator for manual review? If yes, show the threshold value and
     where it's enforced in code. If this logic doesn't exist yet, say so directly.
   - What is the current measured or logged accuracy of the model(s), if any evaluation
     script or output exists in the repo?

3. INCIDENT VERIFICATION AND DISPATCH (ADMIN SIDE)
   - After a report is classified, what actually happens next in the code? Does it go to
     an administrator dashboard for verification before being dispatched, or is dispatch
     automatic?
   - How does the system notify emergency responders (push notification, WebSocket/
     Socket.io event, polling, etc.)? Name the actual mechanism used in the code.
   - Can a responder accept or decline a dispatch? Where is that logic implemented?

4. REAL-TIME UPDATES AND STATUS TRACKING
   - How does the citizen who submitted the report receive status updates (e.g., "en
     route," "resolved")? Is it via WebSocket, push notification, or polling?
   - Confirm whether Socket.io (or another real-time library) is actually integrated and
     in use, or if it's only listed as a dependency but not implemented.

5. DATABASE / DATA FLOW
   - List the actual database collections/tables that exist right now (e.g.,
     IncidentReports, Users, AIClassificationData, ResponseLogs, Feedback) and their key
     fields.
   - Confirm whether the foreign key / reference relationships between these
     collections match what's described, or if the actual schema is different.

6. GAPS AND MISMATCHES
   - List anything my methodology chapter might reasonably claim that this codebase does
     NOT yet implement (e.g., features that are planned/stubbed but not functional, or
     UI elements without backend logic behind them).
   - List anything the code does that goes beyond or differs from a simple one-tap
     reporting + AI classification + dispatch flow.

Be specific and cite file names / function names for every claim. If something is not
yet implemented, explicitly say "NOT IMPLEMENTED" rather than describing it as if it
exists. I will be comparing your answer directly against my thesis Chapter 3 methodology
text, so accuracy matters more than completeness — flag uncertainty rather than filling
gaps with assumptions.
```


