# ARL Analysis Schema: Adaptive Resonance Learning Feedback Loop

## 1. Overview

This document outlines the initial schema for collecting and analyzing data from the Adaptive Resonance Learning (ARL) feedback loop. The goal is to continuously improve the accuracy and personalization of FRC 16D predictions based on user feedback.

## 2. Data Structure for User Feedback

Each time a user completes a check-in and provides feedback on a prediction, the following data points should be captured and stored.

**Feedback Data Tuple:**
`(timestamp, predicted_kappa, actual_kappa, transit_vector_16D, natal_vector_16D, dominant_transit_dimension_idx, dominant_natal_dimension_idx)`

**Detailed Fields:**

*   `timestamp`: (ISO 8601 string or Unix timestamp) When the feedback was submitted.
*   `predicted_kappa`: (float) The kappa value that was presented to the user *before* their check-in.
*   `actual_kappa`: (float) The kappa value derived from the user's self-reported check-in.
*   `transit_vector_16D`: (Vector16D - array of 16 floats) The full 16D vector representing the current transit energies at the time of the check-in.
*   `natal_vector_16D`: (Vector16D - array of 16 floats) The user's stored 16D natal vector.
*   `dominant_transit_dimension_idx`: (integer, 0-7) The index of the most dominant dimension in the `transit_vector_16D`.
*   `dominant_natal_dimension_idx`: (integer, 0-7) The index of the most dominant dimension in the `natal_vector_16D`.

## 3. Key Calibration Metrics & Pseudo-Code

The ARL system, as described in `16D-IMPLEMENTATION-SPEC.md` (Section 15.4: Calibration Algorithm), calculates several metrics to adapt predictions.

### 3.1 Bias

Measures the systematic over- or under-prediction.

```pseudo-code
function calculateBias(feedbackData):
  errors = []
  for each feedback in feedbackData:
    errors.add(feedback.predicted_kappa - feedback.actual_kappa)
  return mean(errors)
```

### 3.2 Average Accuracy

The overall success rate of predictions.

```pseudo-code
function calculateAverageAccuracy(feedbackData):
  correctPredictions = 0
  for each feedback in feedbackData:
    // Define 'correct' - e.g., predicted and actual kappa within a certain tolerance
    if abs(feedback.predicted_kappa - feedback.actual_kappa) < ACCURACY_TOLERANCE:
      correctPredictions += 1
  return (correctPredictions / count(feedbackData)) * 100
```

### 3.3 Dimension Sensitivities

Indicates how much the prediction needs to be adjusted when a specific dimension is dominant.

```pseudo-code
function calculateDimensionSensitivities(feedbackData):
  sensitivities = new Array(8).fill(0)
  counts = new Array(8).fill(0)

  for each feedback in feedbackData:
    dominantDim = feedback.dominant_transit_dimension_idx
    if feedback.actual_kappa > 0 and feedback.predicted_kappa > 0: // Avoid division by zero/negative issues
      sensitivities[dominantDim] += (feedback.actual_kappa / feedback.predicted_kappa)
      counts[dominantDim] += 1

  result = new Array(8)
  for i from 0 to 7:
    if counts[i] > 0:
      result[i] = sensitivities[i] / counts[i]
      // Clamp to a reasonable range as per spec (e.g., [0.5, 1.5])
      result[i] = clamp(result[i], 0.5, 1.5)
    else:
      result[i] = 1.0 // Neutral sensitivity if no data

  return result
```

### 3.4 Calibration Profile

Combines the above metrics into a user-specific profile.

```pseudo-code
interface CalibrationProfile {
  bias: float;
  averageAccuracy: float;
  recentAccuracy: float; // e.g., last 7 days
  dimensionSensitivities: float[]; // 8-element array
  sampleCount: integer;
  lastUpdated: timestamp;
}
```

## 4. Proposed Report Structure (Example)

A report visualizing the ARL analysis could include:

```
# Calibration Insights for [User Name]

## Overall Accuracy
*   **Average Accuracy:** [X]% (based on [N] check-ins)
*   **Recent Accuracy (Last 7 Days):** [Y]%
*   **Prediction Bias:** [Z] (e.g., "Slightly over-predicting kappa by 0.05")

## Dimension Sensitivity
This chart shows how different dominant transit dimensions affect your reported kappa, and how the system is learning to adjust.

| Dimension | Symbol | Observed Sensitivity | Adjustment Factor |
| :-------- | :----- | :------------------- | :---------------- |
| Phase     | P      | 1.15x                | (adjusting +15%)  |
| Existence | E      | 0.90x                | (adjusting -10%)  |
| Cognition | μ      | 1.02x                | (adjusting +2%)   |
| ...       | ...    | ...                  | ...               |

## Feedback History (Last 10 Check-ins)

| Date       | Predicted κ | Actual κ | Accuracy % | Dominant Transit |
| :--------- | :---------- | :------- | :--------- | :--------------- |
| 2026-02-15 | 0.75        | 0.72     | 96%        | Δ (Action)       |
| 2026-02-14 | 0.60        | 0.65     | 92%        | N (Narrative)    |
| ...        | ...         | ...      | ...        | ...              |

**Note:** The system continuously learns and updates your calibration profile with every check-in.
