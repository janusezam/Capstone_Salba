```
# FINAL PROMPT: ORGANIZE SALBA CHAPTER 4.3 — SYSTEM DEVELOPMENT BY USER ROLE
```

```
Act as an expert software documentation specialist, system analyst, and academic
thesis writer. I am developing **SALBA, an Emergency Reporting and Coordination
Platform**, and I need you to organize and complete Section 4.3 of our Chapter 4
documentation based on the actual system implemented in this repository.
```

```
Your task is to document the developed system by organizing its interfaces,
modules, and features according to the three primary user roles:
```

`1. **Citizen**` 

`2. **Rescuer**` 

`3. **Admin (Administrator)**` 

```
The documentation must follow a professional academic thesis format. Each role
must have its own subsection, and the features within each subsection must be
presented in a logical sequence, starting with the landing page and proceeding
through the relevant menus, interfaces, and functions.
```

```
## 1. Required Chapter Structure
```

```
Use the following structure:
```

- `**4.3 System Development**` 

- `*Objective 3: Develop SALBA Based on Defined Requirements*` 

- `**4.3.1 Developed Modules and Features**` 

```
Briefly introduce the completed SALBA system and explain that the following
subsections present the developed modules according to the three user roles.
Explain that the organization reflects each role's responsibilities and
interactions with the emergency reporting and coordination workflow.
```

```
### 4.3.1.1 Citizen Module
```

```
Document the interfaces and features available to citizens, victims, or
residents who need to report emergencies and monitor their requests for
assistance.
```

```
Arrange the features in the order they are encountered in the actual
application. Use the following as a guide:
```

```
1. **Landing Page** — the initial page users see when accessing SALBA.
```

```
2. **Citizen Login and Registration** — account access and registration, if
implemented.
```

```
3. **Citizen Dashboard or Home Page** — the main interface available after
successful access.
```

```
4. **Emergency Reporting Interface** — the interface for initiating an emergency
report.
```

```
5. **Emergency Type Selection** — available incident categories, if implemented.
6. **Incident Details and Media Attachment** — description, image, or other
report information, if supported.
```

```
7. **GPS Location Capture and Confirmation** — the process of identifying and
confirming the incident location, if implemented.
```

```
8. **Emergency Report Submission and Confirmation** — the interface displayed
when a report is submitted.
```

```
9. **Rescue Tracking Interface** — incident progress and responder status, if
implemented.
```

```
10. **Other Citizen Features** — any additional implemented menus or functions.
```

```
Do not force all ten items into the final document if the actual application has
fewer or differently organized features. Follow the actual navigation and
implementation.
```

```
### 4.3.1.2 Rescuer Module
```

```
Document the interfaces and features used by emergency responders to receive
assignments, navigate to incident locations, and update mission progress.
```

```
Arrange the features according to the actual responder workflow. Use the
following as a guide:
```

```
1. **Rescuer Login** — the responder's account-access interface, if implemented.
```

```
2. **Rescuer Dashboard** — the main responder interface.
```

```
3. **Assigned Emergency Missions** — the list or view of assigned incidents.
```

```
4. **Mission Details** — the emergency type, location, report information, and
other available details.
```

```
5. **Mission Map and Navigation** — the map, route, or location information
available to responders.
```

```
6. **Mission Status Updates** — available controls for indicating that the
responder is en route, has arrived, or has completed a mission.
```

```
7. **Active Mission Monitoring** — current assignments and progress, if
implemented.
```

```
8. **Other Rescuer Features** — any additional implemented functions.
```

```
Explain how these features support the responder's role in the emergency-
response workflow and how status updates contribute to coordination with
administrators and citizens.
```

```
### 4.3.1.3 Admin Module
```

```
Document the interfaces and features available to administrators responsible for
managing reports, validating incidents, coordinating responders, monitoring
emergencies, and maintaining system records.
```

```
Arrange the features in the actual order of the administrator's navigation menu
and workflow. Use the following as a guide:
```

```
1. **Admin Login** — the administrator's account-access interface, if
```

```
implemented.
```

```
2. **Admin Dashboard** — the main administrative interface and its displayed
information.
```

```
3. **Incident Reports Management** — the list of submitted emergency reports.
4. **Incident Verification and Prioritization** — review, validation, and
severity or priority information, if implemented.
```

```
5. **Dispatch and Responder Assignment** — assigning responders and coordinating
deployment.
```

```
6. **Real-Time Emergency Monitoring Map** — the map displaying incident
locations and other available information.
```

```
7. **Rescuer Live Tracking and Route View** — responder location, route, and
estimated arrival information, if implemented.
```

```
8. **Resource Management** — responder, vehicle, equipment, or resource
availability, if implemented.
```

```
9. **Incident History and Report Management** — historical records, search,
filtering, and exports, if implemented.
```

```
10. **Data Analytics Dashboard** — statistics, charts, incident trends, and
response-time information, if implemented.
```

```
11. **User and Role Management** — account administration and role permissions,
if implemented.
```

```
12. **Other Admin Features** — additional implemented menus and functions.
```

```
Treat this as a suggested organization, not a list of features to claim
automatically. Inspect the code and document only what actually exists.
```

```
## 2. Inspect the Existing Repository Before Writing
```

```
Before preparing the documentation:
```

- `Inspect the frontend pages, routes, components, layouts, navigation menus, and role-based interfaces.` 

```
- Inspect relevant backend routes, controllers, and models when necessary to
confirm functionality.
```

```
- Identify the actual landing page and the correct navigation sequence for each
role.
```

- `Determine which features are fully implemented, partially implemented, simulated, or only represented by a prototype.` 

- `Locate any existing screenshots and match each screenshot to the correct page and user role.` 

```
- Refer to the existing Chapter 4 draft to maintain continuity with the earlier
sections and figure numbering.
```

```
Use the actual source code, available screenshots, and verifiable system
behavior as evidence.
```

```
**Do not invent features, screenshots, menu items, workflows, or results.** If a
suggested feature does not exist, omit it. If a feature cannot be verified, mark
it for verification rather than claiming it is functional.
```

```
Do not unnecessarily modify the application's code. The primary goal is to
prepare the documentation, not redesign the system.
```

```
## 3. Screenshot Placement and Figure Numbering
```

```
Every major interface or distinct feature documented in Section 4.3.1 must have
its corresponding screenshot whenever an actual screenshot is available or can
be captured from the running system.
```

```
Follow this format for every feature:
```

```
**Feature Heading**
```

```
Write a short introductory paragraph explaining the feature and its purpose.
```

```
**[Insert the actual screenshot of this interface here]**
```

```
*Figure 4-X. Descriptive Title of the Interface.*
```

```
Write the academic discussion immediately after the figure caption.
```

```
Then proceed to the next feature in the same user-role subsection.
```

# `### Figure numbering requirements` 

- `The existing Chapter 4 draft ends its design-related figures with **Figure 4- 9. Database Schema (ERD)**.` 

- `Begin the developed-system screenshots with **Figure 4-10**, provided no additional figures have been inserted before Section 4.3.` 

- `Continue sequentially across all three roles: Citizen, Rescuer, and Admin.` 

- `Do not restart numbering when moving to a different role.` 

- `Never duplicate figure numbers.` 

- `Use unique and descriptive captions.` 

- `Ensure every figure number referenced in the discussion matches the actual screenshot.` 

- `If a feature needs multiple screenshots to explain different interfaces, give each screenshot a separate sequential figure number.` 

- `Place screenshots directly after the paragraph introducing the feature and before the discussion of that figure.` 

- `Keep each screenshot close to its related discussion.` 

# `Example numbering sequence:` 

- `Figure 4-10. SALBA Landing Page` 

- `Figure 4-11. Citizen Login Interface` 

- `Figure 4-12. Citizen Emergency Reporting Interface` 

- `Figure 4-13. Citizen Rescue Tracking Interface` 

- `Figure 4-14. Rescuer Dashboard` 

- `Figure 4-15. Rescuer Mission Map` 

- `Figure 4-16. Rescuer Mission Status Interface` 

- `Figure 4-17. Admin Dashboard` 

- `Figure 4-18. Admin Incident Management Interface` 

- `Figure 4-19. Admin Emergency Monitoring Map` 

```
These captions are examples only. Determine the actual screenshots and final
sequence before assigning the definitive numbers.
```

```
## 4. Academic Discussion After Every Figure
```

```
After each figure caption, write a separate academic paragraph discussing the
corresponding interface.
```

```
Each discussion should explain:
```

```
1. **Purpose:** Why the interface or feature was developed.
```

```
2. **Visible components:** The actual menus, buttons, fields, cards, tables,
maps, indicators, and controls shown.
```

```
3. **Functionality:** What the user can do through the interface.
```

```
4. **User role:** How the feature supports the responsibilities of the Citizen,
Rescuer, or Admin.
```

```
5. **Workflow connection:** How the feature relates to the previous or next step
in the system.
```

```
6. **System requirements:** What reporting, coordination, tracking, monitoring,
security, or management requirement it addresses.
```

```
7. **Contribution to SALBA:** How the feature supports the overall emergency
reporting and coordination process.
```

```
Do not merely describe the visual appearance of the screenshot. Explain the
function and significance of the interface within the system.
```

```
Use formal academic language appropriate for a college thesis. Write complete
paragraphs rather than informal bullet points for the figure discussions.
```

```
### Example of the required format
```

```
**4.3.1.1 Citizen Module**
```

```
The Citizen Module provides the interfaces through which citizens can access the
SALBA platform, report emergency incidents, and monitor the progress of their
requests for assistance. Its features are organized according to the actual
citizen workflow, beginning with the initial landing page and continuing through
the available reporting and tracking functions.
```

```
**Landing Page**
```

```
[Insert the actual landing-page screenshot here.]
```

```
*Figure 4-10. SALBA Landing Page.*
```

```
Figure 4-10 presents the landing page of the SALBA platform. The interface
serves as the initial access point for users and displays the navigation options
available in the application. The presented elements guide users toward the
relevant functions supported by the system. As the entry point to the Citizen
Module, the landing page establishes the initial interaction between the user
and the platform and provides access to the next stage of the citizen workflow.
```

```
**Important:** This paragraph is only an example of the writing style. Verify
```

```
the actual landing-page elements and revise the discussion to match the
implementation.
```

```
Continue using this same structure for each actual feature under Citizen,
Rescuer, and Admin.
```

```
## 5. Organize Features Within Each User Role
```

```
Within each subsection, follow this sequence:
```

```
**Role introduction → feature heading → introductory paragraph → screenshot →
figure caption → academic discussion → next feature.**
```

```
Do not mix Citizen, Rescuer, and Admin screenshots within the same role
subsection.
```

```
For example, complete the Citizen Module's documented workflow before beginning
the Rescuer Module. Complete the Rescuer Module before proceeding to the Admin
Module.
```

```
If the landing page is shared by all roles, document it once in the most
appropriate location. Refer to it briefly in the other role discussions when
necessary instead of duplicating the same screenshot.
```

```
If a page contains several meaningful features, use separate figures only when
the screenshots provide distinct information. Avoid unnecessary duplication of
nearly identical screens.
```

```
## 6. Align the Discussion With the Existing Chapter 4
```

```
The preceding sections of the current Chapter 4 draft discuss the SALBA
architecture, emergency reporting, GPS location capture, AI-assisted
classification, administrator verification, responder dispatch, real-time
monitoring, resource management, incident records, data analytics, and user-role
management.
```

```
Use these earlier sections as context when discussing the developed features.
```

```
Section 4.3 must focus on:
```

- `What was actually developed.` 

- `What each user role can access.` 

- `What each interface displays.` 

- `How each implemented feature functions.` 

- `How the features connect to the system workflow.` 

- `How the developed modules address the requirements established earlier.` 

```
Avoid repeating the entire system architecture or design discussion from Section
4.2. Briefly connect the implemented feature to its relevant requirement
instead.
```

```
Do not introduce unsupported claims about system performance, AI accuracy,
security, or testing results. These results should be discussed in their
appropriate testing and evaluation sections.
```

```
## 7. Screenshot Capture and Missing Evidence
```

```
If actual screenshots are available in the repository, use the correct ones for
each feature.
```

```
If screenshots are missing and the application can be run:
```

- `Start the appropriate development environment when possible.` 

- `Navigate to the actual page.` 

- `Capture the real interface.` 

- `Save screenshots in an organized directory, such as` 

- ``docs/screenshots/citizen/`, `docs/screenshots/rescuer/`, and` 

- ``docs/screenshots/admin/`, if appropriate for the repository.` 

- `Use descriptive filenames corresponding to the documented feature.` 

- `Ensure the screenshots are legible and show the relevant interface.` 

- `Remove or conceal credentials, tokens, and sensitive personal information.` 

```
If you cannot access a page, capture a screenshot, or verify a feature, insert a
clearly labeled placeholder and list the required evidence. Do not create a
fictional interface or represent a mockup as a completed system feature.
```

# `## 8. Output and Documentation Requirements` 

```
Produce a complete, properly organized Section 4.3.1 containing:
```

`1. An introductory paragraph for the Developed Modules and Features section.` 

`2. A dedicated Citizen Module subsection.` 

`3. A dedicated Rescuer Module subsection.` 

`4. A dedicated Admin Module subsection.` 

`5. Features arranged in each role's actual navigation and workflow order.` 

`6. Actual screenshots placed near their corresponding discussions, wherever possible.` 

`7. Sequential figure numbers continuing from Figure 4-9.` 

`8. Unique captions for every figure.` 

`9. Academic discussions immediately after every figure.` 

`10. Consistent terminology, heading levels, grammar, and thesis formatting.` 

`11. A list of missing screenshots and features that require verification.` 

`12. A final figure-numbering and content consistency check.` 

```
If the documentation already exists as an editable file in the repository,
update that file while preserving the rest of the chapter. Otherwise, create a
separate draft file containing Section 4.3.1, with clear screenshot insertion
points where needed.
```

```
Do not overwrite unrelated files, delete project files, or change application
functionality unnecessarily.
```

# `## 9. Final Instruction` 

```
Start by inspecting the actual SALBA repository and the available Chapter 4
draft. Identify the real pages, features, role-specific navigation menus, and
screenshots.
```

```
Then prepare the complete Section 4.3.1 in this order:
```

`1. **Citizen Module**` 

`2. **Rescuer Module**` 

`3. **Admin Module**` 

```
Within each role, document the features in the actual user workflow, starting
with the landing page or role-specific entry point as appropriate.
```

```
For every documented feature, include its introduction, actual screenshot,
correctly numbered figure caption, and formal academic discussion.
```

```
**The final result must be ready to integrate into our thesis, based on the
actual implementation rather than assumptions. Do not stop at an outline;
complete the documentation using the evidence available in the repository and
clearly identify anything that still needs a screenshot or verification.**
```

