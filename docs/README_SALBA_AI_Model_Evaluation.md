# SALBA AI Model Performance Evaluation

## Chapter 4, Section 4.5: Results and Discussion

## 1. Project Overview

Conduct a complete AI Model Performance Evaluation for the capstone
project:

**SALBA: An AI-Assisted Emergency Reporting and Rescue Coordination
Platform for Malaybalay City**

This evaluation is required for **Chapter 4: Results and Discussion**,
specifically **Section 4.5: AI Model Performance Evaluation**.

The objective is to obtain actual, accurate, reproducible machine
learning performance results that can be presented and defended during
the capstone evaluation.

You have access to the SALBA system, including its source code, AI
implementation, datasets, trained models, and development environment.
Examine the existing implementation, prepare the necessary evaluation
procedures, execute appropriate tests, and generate the complete results
required below.

## 2. Required Evaluation Sections

### 4.5 AI Model Performance Evaluation

-   **4.5.1 Disaster Type Classification (Random Forest Classifier)**
    -   Table 4-9. Random Forest Classifier Performance
    -   Table 4-10. Confusion Matrix - Disaster Type Classification
-   **4.5.2 Severity-Level Prediction (XGBoost)**
    -   Table 4-11. XGBoost Performance for Severity Prediction
-   **4.5.3 False Alarm and Duplicate Report Detection (Logistic
    Regression)**
    -   Table 4-12. Logistic Regression Performance for False Alarm
        Detection

## 3. Initial System Inspection

Before conducting evaluations:

1.  Thoroughly inspect the existing SALBA AI architecture.
2.  Identify how each machine learning model is implemented, trained,
    saved, loaded, and integrated into the system.
3.  Verify whether Random Forest, XGBoost, and Logistic Regression are
    actually implemented for the tasks stated in the manuscript.
4.  Do not assume that the manuscript descriptions accurately represent
    the source code. If the implementation differs, document the
    differences clearly.
5.  Identify each model's input features, target labels, preprocessing
    steps, training procedure, and prediction outputs.
6.  Determine whether duplicate-report detection is performed by
    Logistic Regression or by a separate algorithm, rule, or mechanism.

**Preservation requirement:** Preserve the original implementation.
Obtain approval before making changes that could affect existing models,
production data, or system functionality.

## 4. Training and Evaluation Procedure

If trained models already exist, evaluate their performance using
appropriate independent test data.

If models have not been trained, or existing models do not have reliable
evaluation results, prepare and execute a proper training and evaluation
workflow using legitimate, relevant, appropriately labeled datasets.

Follow accepted machine learning practices:

-   Use appropriate data preprocessing.
-   Separate training and testing data properly.
-   Prevent data leakage between training and testing.
-   Use stratified sampling where appropriate.
-   Set and record a fixed random seed for reproducibility.
-   Use evaluation metrics appropriate to the model's task.
-   Do not evaluate a model solely on the data used to train it.
-   Use independent test data wherever available.
-   Record dataset limitations and any constraints affecting the
    evaluation.
-   Record the software, library, model, and test configuration needed
    to reproduce the results.

Do not fabricate, estimate, or randomly generate performance results to
complete the manuscript.

## 5. Required Model Evaluations

### 5.1 Random Forest: Disaster Type Classification

Evaluate the actual Random Forest implementation for disaster type
classification.

Generate:

-   Accuracy
-   Precision
-   Recall
-   F1-score
-   Complete confusion matrix
-   Per-class performance, where applicable
-   Number of correctly and incorrectly classified test cases for each
    disaster category
-   Supported disaster categories
-   Dataset size and training/testing sample counts
-   Input features and target labels
-   Class distribution
-   Preprocessing and evaluation procedures
-   Inference time, if it can be measured reliably

Clearly label the actual and predicted disaster categories in the
confusion matrix.

### 5.2 XGBoost: Severity-Level Prediction

Evaluate the actual XGBoost implementation for predicting incident
severity.

First determine whether the implementation performs **classification**
or **regression**.

-   If it performs classification, calculate suitable classification
    metrics, such as accuracy, precision, recall, and F1-score.
-   If it performs regression, calculate suitable regression metrics,
    such as MAE, RMSE, and R², where appropriate.

Also document:

-   Severity categories or prediction outputs
-   Dataset size and training/testing sample counts
-   Input features and target labels
-   Class or target distribution
-   Preprocessing and evaluation procedures
-   Inference time, if measurable

Do not report classification metrics for a regression task, or
regression metrics for a classification task.

### 5.3 Logistic Regression: False Alarm Detection

Evaluate Logistic Regression's ability to identify potential false
alarms using actual labeled test data.

Generate appropriate classification metrics, including:

-   Accuracy
-   Precision
-   Recall
-   F1-score
-   Confusion matrix, where available
-   Number of correctly and incorrectly classified cases

Also document:

-   Meaning and definition of each target label
-   Dataset size and training/testing sample counts
-   Input features and target labels
-   Class distribution
-   Preprocessing and evaluation procedures
-   Inference time, if measurable

Determine whether duplicate-report detection is also handled by Logistic
Regression.

If duplicate detection uses a separate method, evaluate and report it
separately. Do not attribute duplicate-detection performance to Logistic
Regression unless the source code and evaluation evidence establish that
it is responsible for that task.

## 6. Required Tables

Generate all tables using actual measured evaluation results.

### Table 4-9. Random Forest Classifier Performance

Include the appropriate classification metrics, actual numerical values,
and brief explanations where necessary.

### Table 4-10. Confusion Matrix - Disaster Type Classification

Present the complete confusion matrix with clearly labeled actual and
predicted disaster categories. Include the actual number of predictions
for each category.

### Table 4-11. XGBoost Performance for Severity Prediction

Present the relevant performance metrics and results for severity-level
prediction. Use the correct evaluation method based on whether the
implemented model performs classification or regression.

### Table 4-12. Logistic Regression Performance for False Alarm Detection

Present appropriate classification metrics, including confusion matrix
results where available. Explain the model's performance in detecting
false emergency reports.

If duplicate-report detection is implemented separately, provide an
additional evaluation table or supporting discussion.

## 7. Academic Interpretation and Discussion

After each table, write a detailed academic interpretation suitable for
**Chapter 4 of a Philippine BSIT capstone manuscript**.

Each interpretation must:

1.  Begin by referring to its corresponding table. For example: "Table
    4-9 presents..."
2.  Explain the actual measured performance results.
3.  Identify the strengths and limitations of the evaluated model.
4.  Discuss the significance of the results to SALBA's emergency
    reporting, incident prioritization, and rescue coordination
    processes.
5.  Avoid claiming that a model is highly accurate or reliable unless
    the actual results support that conclusion.
6.  Use formal, clear, natural academic language.
7.  Avoid excessive programming terminology.
8.  Avoid em dashes and unsupported claims.

Keep the discussion consistent with the actual implementation and
measured results. Do not make claims about operational benefits that
were not tested.

## 8. Technical Evidence and Documentation

Provide sufficient supporting evidence so the researchers can inspect
and reproduce the reported results.

Save the evidence in clearly organized files. Include, where applicable:

-   Evaluation scripts
-   Dataset descriptions and sources
-   Dataset sizes and class distributions
-   Training and testing sample counts
-   Feature and target-label information
-   Preprocessing procedures
-   Random seed and test configuration
-   Model and library versions
-   Classification reports
-   Confusion matrices
-   Regression evaluation reports, if applicable
-   Inference-time measurements, if measured
-   Relevant execution logs and outputs

Ensure that every numerical result appearing in the manuscript tables
matches the actual outputs generated by the evaluation scripts.

Do not silently modify source datasets, production records, or existing
trained models. Preserve original files and document any derived or
processed datasets.

## 9. Handling Missing Data or Evaluation Limitations

If an evaluation cannot be performed, do not create substitute or
artificial results.

Instead, clearly identify:

-   Which evaluation could not be completed
-   The exact missing dataset, model, target label, feature, or
    technical requirement
-   Why the missing item prevents a valid evaluation
-   What data or changes would be needed to complete the evaluation
-   Whether any partial evaluation is possible and what its limitations
    are

Clearly distinguish among:

-   Results measured using an independent test set
-   Results measured using cross-validation
-   Results measured using another evaluation method
-   Results that could not be obtained

Never present training-set performance as independent test performance.

## 10. Final Deliverables

Produce the following:

1.  **Technical summary** of the AI models actually implemented in
    SALBA.
2.  **Verified training and testing information** for each model.
3.  **Complete numerical results** for Tables 4-9, 4-10, 4-11, and 4-12.
4.  **Confusion matrices and other relevant performance reports.**
5.  **Formal academic interpretations and discussions** for every table.
6.  **Supporting technical evidence** demonstrating how the results were
    obtained.
7.  **A complete, ready-to-insert Section 4.5** for Chapter 4.
8.  **A clear comparison of the manuscript's stated AI models and tasks
    against the actual implementation**, including any differences.

## 11. Final Quality and Integrity Requirements

-   Base all findings on the real SALBA system and actual available
    data.
-   Prioritize accuracy, reproducibility, and academic credibility.
-   Never invent, estimate, or manipulate metrics.
-   Never assume a model exists just because it is mentioned in the
    manuscript.
-   Never misattribute a task or metric to the wrong model.
-   Clearly disclose dataset limitations, class imbalance, missing
    labels, and evaluation constraints.
-   Keep manuscript tables, written discussion, scripts, and raw
    evaluation outputs consistent.
-   Preserve the original system unless changes are explicitly approved.
-   Make the final materials understandable to the capstone researchers
    and suitable for technical review and oral defense.

## 12. Primary Objective

The primary goal is to produce legitimate, reproducible, academically
defensible AI model evaluation results based on the **actual SALBA
system**, not assumed or fabricated results.

Complete the evaluation systematically. Verify the implementation first,
evaluate each model using an appropriate and defensible procedure,
preserve supporting evidence, and provide the final results in a format
that can be directly incorporated into the capstone manuscript.
