You have already analyzed the SALBA codebase and created the current
beta-testing documentation files.

The current documentation is technically detailed and useful for the
development/research team, but it is NOT yet sufficiently user-friendly
for actual beta-test participants.

Do NOT discard the existing analysis.

Instead, use the existing files and the actual SALBA implementation as
the foundation to create a **participant-facing Beta Testing Package**.

The current documentation includes:

-   `SALBA_Beta_Testing_Plan.md`
-   `SALBA_Beta_Test_Cases.md`
-   `SALBA_Beta_Testing_Questionnaire.md`
-   `SALBA_User_Evaluation_Questionnaire.md`
-   `SALBA_Beta_Issue_Log.md`
-   `SALBA_Traceability_Matrix.md`
-   `README.md`

You have already identified the actual SALBA workflow.

Now transform that technical information into a testing experience that
an ordinary beta tester can understand and follow.

------------------------------------------------------------------------

# PRIMARY GOAL

The beta tester must NEVER be left wondering:

> "What am I supposed to do?"

> "What am I testing?"

> "What information should I use?"

> "What should happen after I click this?"

> "How do I know whether I passed?"

The tester must be given:

**ROLE → SCENARIO → MISSION → TEST DATA → STEP-BY-STEP ACTIONS →
EXPECTED RESULTS → PASS/FAIL → OBSERVATIONS → COMPLETION →
QUESTIONNAIRE**

------------------------------------------------------------------------

# IMPORTANT DISTINCTION

Separate the documentation into:

## A. INTERNAL/RESEARCHER/TECHNICAL DOCUMENTATION

These may contain:

-   Source-code paths
-   API endpoints
-   Database details
-   Socket.io events
-   ML service details
-   Technical implementation details
-   Developer verification
-   Technical traceability
-   Internal issue tracking

These are NOT intended to be given directly to ordinary beta testers.

Keep them in the existing technical documentation.

------------------------------------------------------------------------

## B. PARTICIPANT-FACING BETA TESTING DOCUMENTATION

This must contain only information that a beta tester needs to
successfully complete the test.

Do not expose unnecessary:

-   API routes
-   Source-code paths
-   Database names
-   Internal service ports
-   Developer terminology
-   Backend architecture
-   ML implementation details

unless the information is genuinely necessary for the participant.

------------------------------------------------------------------------

# STEP 1 --- USE THE ACTUAL SALBA WORKFLOW

Based on your previous codebase analysis, the current system workflow
appears to involve:

Citizen submits emergency report ↓ AI-assisted processing ↓ CDRRMO
Administrator receives/reviews incident ↓ Administrator verifies and
dispatches responder ↓ Responder receives assignment ↓ Responder updates
status ↓ Responder resolves incident ↓ Resolution is communicated ↓
Administrator generates SITREP

VERIFY THIS AGAIN AGAINST THE CURRENT CODE.

If the actual implementation differs, use the actual implementation
instead.

Do not invent features.

------------------------------------------------------------------------

# STEP 2 --- CREATE A CORE BETA TEST MISSION

Create one clear overall mission for the beta test.

The mission should be understandable to a non-technical participant.

Example structure:

> **MISSION:** Complete a simulated emergency incident workflow using
> SALBA, beginning with the submission of an emergency report and ending
> with the appropriate incident resolution and documentation.

Modify this according to the actual implemented workflow.

The mission must explain WHY the tester is using the system.

------------------------------------------------------------------------

# STEP 3 --- CREATE ROLE-SPECIFIC MISSIONS

Create appropriate missions based on the actual implemented roles.

## CITIZEN / RESIDENT

Example:

> Your mission is to submit a simulated emergency report using the
> information provided by the researcher and observe how SALBA processes
> and communicates your report.

## EMERGENCY RESPONDER

Example:

> Your mission is to receive the assigned simulated emergency, review
> the available incident information, update your response status, and
> complete the assigned response workflow.

## CDRRMO ADMINISTRATOR

Example:

> Your mission is to review the simulated emergency report, verify the
> incident, coordinate the appropriate response, monitor its progress,
> and complete the required administrative actions.

VERIFY ALL ACTIONS AGAINST THE ACTUAL CODE.

------------------------------------------------------------------------

# STEP 4 --- CREATE REALISTIC SIMULATED SCENARIOS

Do not tell participants to invent their own emergencies.

Give them controlled test data.

For each scenario provide:

### Scenario ID

### Scenario Name

### Your Role

### Situation

### Mission

### Starting Condition

### Simulated Incident Information

Use a table:

  Information           Provided Test Value
  --------------------- ---------------------
  Incident Type         
  Location              
  Description           
  Date/Time             
  Number Affected       
  Photo/Test Evidence   

Use only fields that actually exist in SALBA.

Do not use real personal information.

Do not use real emergency incidents.

Clearly state:

> **IMPORTANT: This is a simulated emergency scenario for system testing
> only. Do not use SALBA to report a real emergency during the testing
> session.**

------------------------------------------------------------------------

# STEP 5 --- CREATE A TRUE STEP-BY-STEP TEST

This is the MOST IMPORTANT REQUIREMENT.

Every participant scenario must have a complete sequence.

Use this format:

  --------------------------------------------------------------------------------
  Step   What You Need to Do            What You Should See     Result     Notes
  ------ ------------------------------ ----------------------- ---------- -------
  1      Open SALBA                     SALBA opens             ☐ Pass ☐   
                                        successfully            Fail       

  2      Log in                         Your assigned interface ☐ Pass ☐   
                                        appears                 Fail       

  3      Open emergency reporting       Reporting screen        ☐ Pass ☐   
                                        appears                 Fail       

  4      Enter the provided incident    Information is accepted ☐ Pass ☐   
         information                                            Fail       

  5      Submit the report              Confirmation/status     ☐ Pass ☐   
                                        appears                 Fail       
  --------------------------------------------------------------------------------

Continue until the entire scenario is completed.

The steps must be based on actual implemented screens and functions.

------------------------------------------------------------------------

# STEP 6 --- USE SIMPLE LANGUAGE

The tester-facing instructions should NOT read like developer
documentation.

Instead of:

> "Trigger the POST /api/reports endpoint."

write:

> "Submit the emergency report."

Instead of:

> "Verify Socket.io synchronization."

write:

> "Check whether the incident update appears on the other user's
> screen."

Instead of:

> "Validate the ML classification pipeline."

write:

> "Observe the emergency classification or severity information
> displayed by SALBA, if visible in your assigned role."

------------------------------------------------------------------------

# STEP 7 --- INCLUDE EXPECTED RESULTS

Every important action must have an expected result.

The participant should know what successful behavior looks like.

Use plain language.

Example:

### Step 5 --- Submit the Report

**What to do:**

Tap **Submit Report**.

**What you should see:**

SALBA should confirm that the emergency report was submitted
successfully.

**Result:**

☐ PASS ☐ FAIL

**If FAIL, describe what happened:**

------------------------------------------------------------------------

------------------------------------------------------------------------

# STEP 8 --- DO NOT MAKE THE PARTICIPANT DIAGNOSE TECHNICAL PROBLEMS

If something goes wrong, the tester should describe what they
experienced.

Do NOT ask them to determine:

-   API errors
-   Database errors
-   HTTP status codes
-   ML service failures
-   Socket.io failures
-   JavaScript exceptions

Instead ask:

> "What happened?"

> "What did you expect to happen?"

> "Could you continue?"

> "What did you see on the screen?"

------------------------------------------------------------------------

# STEP 9 --- CREATE A TESTER OBSERVATION LOG

Provide:

  -----------------------------------------------------------------------------
  Step   What Happened?   Could You Continue?    Screenshot/Evidence    Notes
  ------ ---------------- ---------------------- ---------------------- -------

  -----------------------------------------------------------------------------

The tester can simply document what they observed.

------------------------------------------------------------------------

# STEP 10 --- CREATE PASS/FAIL/BLOCKED DEFINITIONS

Use:

### PASS

The tester completed the step and the expected result occurred.

### FAIL

The tester completed the action but the expected result did not occur.

### BLOCKED

The tester could not continue because of a system problem.

### N/A

The step does not apply to the assigned role.

Make these definitions visible to the tester.

------------------------------------------------------------------------

# STEP 11 --- DEFINE WHEN THE TEST IS FINISHED

Create a:

## BETA TEST COMPLETION CHECKLIST

☐ I completed all steps assigned to my role.

☐ I recorded Pass/Fail results.

☐ I recorded problems I encountered.

☐ I completed the assigned simulated emergency workflow.

☐ I completed the Beta Testing Questionnaire.

☐ I submitted my testing form to the researcher.

------------------------------------------------------------------------

# STEP 12 --- RESTRUCTURE THE BETA QUESTIONNAIRE

The questionnaire should come AFTER the actual scenario.

Do not use the questionnaire as a substitute for testing.

The order should be:

### PART I

Testing Instructions

### PART II

Assigned Scenario

### PART III

Step-by-Step Test Execution

### PART IV

Observation/Issue Recording

### PART V

Scenario Completion

### PART VI

Post-Test Beta Testing Questionnaire

### PART VII

Open-Ended Feedback

------------------------------------------------------------------------

# STEP 13 --- KEEP THE QUESTIONNAIRE SHORT AND RELEVANT

Do not ask testers to rate things they could not reasonably observe.

The questionnaire should evaluate their actual experience.

Possible areas:

### Task Completion

-   I was able to complete my assigned task.

### Functionality

-   The functions I used performed as expected.

### Usability

-   I could understand how to use the functions required for my task.

### Workflow

-   The sequence of actions was clear.

### System Response

-   SALBA provided understandable feedback after my actions.

### Reliability

-   SALBA worked consistently during my test.

### Overall Experience

-   The system supported me in completing my assigned mission.

Then provide open-ended questions.

------------------------------------------------------------------------

# STEP 14 --- KEEP THE USER EVALUATION QUESTIONNAIRE SEPARATE

Do not merge the Beta Testing Questionnaire and User Evaluation
Questionnaire.

The User Evaluation Questionnaire should remain the broader research
instrument for UAT/software quality evaluation.

The Beta Testing Questionnaire should focus on the actual beta-testing
experience.

------------------------------------------------------------------------

# STEP 15 --- DO NOT REMOVE THE TECHNICAL DOCUMENTATION

The existing technical files are still valuable.

Keep:

-   Beta Testing Plan
-   Technical Test Cases
-   Issue Log
-   Traceability Matrix

But create a new participant-facing layer.

------------------------------------------------------------------------

# STEP 16 --- CREATE THE FOLLOWING NEW FILES

Create:

`SALBA_Beta_Tester_Guide.md`

Purpose: A simple guide explaining the beta testing activity from
beginning to end.

------------------------------------------------------------------------

`SALBA_Beta_Scenario_Packets.md`

Purpose: Contains the actual scenarios, tester roles, missions,
simulated data, starting conditions, and completion conditions.

------------------------------------------------------------------------

`SALBA_Beta_Tester_Execution_Form.md`

Purpose: Contains the participant-facing step-by-step test execution
tables with:

-   Step
-   Action
-   Expected Result
-   Pass/Fail
-   Notes

------------------------------------------------------------------------

`SALBA_Beta_Testing_Questionnaire.md`

Update the existing questionnaire so that it corresponds directly to the
new scenario-based beta test.

------------------------------------------------------------------------

# STEP 17 --- CREATE A CLEAR TESTER FLOW

At the very beginning of the guide, show:

## YOUR BETA TEST FLOW

**1. Receive your assigned role**

↓

**2. Read your simulated emergency scenario**

↓

**3. Review the test information provided**

↓

**4. Follow the steps in order**

↓

**5. Mark PASS or FAIL after each important step**

↓

**6. Record problems if something unexpected happens**

↓

**7. Complete the entire mission**

↓

**8. Complete the Beta Testing Questionnaire**

↓

**9. Submit your completed testing form**

This should be visually obvious.

------------------------------------------------------------------------

# STEP 18 --- DO NOT MAKE TESTERS TEST EVERYTHING

A participant should only perform the scenario assigned to their role.

Do not require a citizen to test administrator features.

Do not require a responder to test database behavior.

Do not require an administrator to evaluate source code.

The researcher/test coordinator may coordinate multiple roles to execute
one complete end-to-end scenario.

------------------------------------------------------------------------

# STEP 19 --- MULTI-ROLE END-TO-END TESTING

If SALBA requires multiple users for one complete emergency workflow,
clearly explain the handoff.

For example:

### STAGE 1 --- CITIZEN

Citizen submits simulated emergency.

↓

### STAGE 2 --- ADMINISTRATOR

Administrator receives and processes the simulated incident.

↓

### STAGE 3 --- RESPONDER

Responder receives the assignment and performs the response workflow.

↓

### STAGE 4 --- ADMINISTRATOR

Administrator verifies completion and performs the final administrative
step.

Make it clear which tester acts at each stage.

Do not require one participant to pretend to be every role unless that
is specifically how the system is being tested.

------------------------------------------------------------------------

# STEP 20 --- FINAL SELF-TEST

Before finalizing, pretend that you are a person who has NEVER seen
SALBA before.

Read only the participant-facing document.

Ask:

> "Do I know what situation I am simulating?"

> "Do I know my role?"

> "Do I know my mission?"

> "Do I have all the information I need?"

> "Do I know exactly what to click/do?"

> "Do I know what should happen?"

> "Do I know what to record when something goes wrong?"

> "Do I know when I am finished?"

If the answer to any question is NO, revise the document.

------------------------------------------------------------------------

# IMPORTANT FINAL RULE

Do not make the beta testing package merely a questionnaire.

It must be a **GUIDED TESTING ACTIVITY followed by a QUESTIONNAIRE.**

The participant should actively perform the system workflow first.

Only afterward should they provide their evaluation.

The final experience should be:

**MISSION → SCENARIO → ACTION → EXPECTED RESULT → PASS/FAIL →
OBSERVATION → COMPLETION → QUESTIONNAIRE**

That is the structure we need for an actual SALBA beta test.
