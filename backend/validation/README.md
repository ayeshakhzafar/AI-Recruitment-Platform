# Interview System Validation Guide

Use this folder to generate measurable evidence that your interview system works.

## 1) Face detection/verification validation

Create a CSV with columns:

- `sample_id`
- `y_true` (ground truth: `1` = genuine/valid face, `0` = invalid or mismatch)
- `y_pred` (model/system output: `1` = accepted, `0` = rejected)

This gives you a confusion matrix:

- True Positive (TP): genuine accepted
- True Negative (TN): invalid rejected
- False Positive (FP): invalid accepted
- False Negative (FN): genuine rejected

And metrics:

- Accuracy
- Precision
- Recall
- Specificity
- F1-score

## 2) Answer recording (speech-to-text) validation

Create a CSV with:

- `sample_id`
- `reference_text` (human-correct transcript)
- `predicted_text` (system transcript)

The script computes:

- WER (Word Error Rate)
- CER (Character Error Rate)

Lower WER/CER means better transcription quality.

## 3) Run validation

From backend directory:

```bash
python validation/validate_interview_system.py --face_csv validation/face_labels.sample.csv --stt_csv validation/stt_labels.sample.csv --output_dir validation/results
```

Outputs:

- `validation/results/validation_report.json`
- `validation/results/validation_report.txt`

## 4) What to present in FYP defense

- Dataset size and how samples were collected (lighting, camera angle, noise level, device types).
- Confusion matrix and metrics for face checks.
- WER/CER for answer recording.
- Error analysis of FP/FN and high-WER cases.
- Acceptance target example:
  - Face F1 >= 0.90
  - Face recall >= 0.92
  - STT WER <= 0.20

These thresholds can be adjusted based on your environment and constraints.
