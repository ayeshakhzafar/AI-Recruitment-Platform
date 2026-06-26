"""
Validation utility for interview system.

This script validates:
1) Face verification (binary classification) using confusion matrix metrics.
2) Speech-to-text output quality using WER/CER.

Input CSV formats:

Face CSV columns:
- sample_id
- y_true (0 or 1)
- y_pred (0 or 1)

STT CSV columns:
- sample_id
- reference_text
- predicted_text

Usage example:
python validation/validate_interview_system.py \
  --face_csv validation/face_labels.csv \
  --stt_csv validation/stt_labels.csv \
  --output_dir validation/results
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Dict, List, Tuple


def _safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def _normalize_text(text: str) -> str:
    # Minimal normalization so metrics are fair and consistent.
    return " ".join((text or "").strip().lower().split())


def _levenshtein(a: List[str], b: List[str]) -> int:
    if not a:
        return len(b)
    if not b:
        return len(a)

    prev_row = list(range(len(b) + 1))
    for i, token_a in enumerate(a, start=1):
        curr_row = [i]
        for j, token_b in enumerate(b, start=1):
            ins = curr_row[j - 1] + 1
            delete = prev_row[j] + 1
            replace = prev_row[j - 1] + (token_a != token_b)
            curr_row.append(min(ins, delete, replace))
        prev_row = curr_row
    return prev_row[-1]


def compute_face_metrics(face_csv: Path) -> Dict[str, float]:
    tp = tn = fp = fn = 0
    total = 0

    with face_csv.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        required = {"sample_id", "y_true", "y_pred"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(
                f"Face CSV must contain columns: {sorted(required)}. "
                f"Found: {reader.fieldnames}"
            )

        for row in reader:
            y_true = int(row["y_true"])
            y_pred = int(row["y_pred"])
            if y_true not in (0, 1) or y_pred not in (0, 1):
                raise ValueError(
                    f"y_true/y_pred must be 0 or 1. Row sample_id={row.get('sample_id')}"
                )

            total += 1
            if y_true == 1 and y_pred == 1:
                tp += 1
            elif y_true == 0 and y_pred == 0:
                tn += 1
            elif y_true == 0 and y_pred == 1:
                fp += 1
            elif y_true == 1 and y_pred == 0:
                fn += 1

    accuracy = _safe_div(tp + tn, total)
    precision = _safe_div(tp, tp + fp)
    recall = _safe_div(tp, tp + fn)
    specificity = _safe_div(tn, tn + fp)
    f1 = _safe_div(2 * precision * recall, precision + recall)

    return {
        "samples": total,
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "specificity": round(specificity, 4),
        "f1_score": round(f1, 4),
    }


def compute_stt_metrics(stt_csv: Path) -> Dict[str, float]:
    total_word_dist = 0
    total_words = 0
    total_char_dist = 0
    total_chars = 0
    samples = 0

    with stt_csv.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        required = {"sample_id", "reference_text", "predicted_text"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(
                f"STT CSV must contain columns: {sorted(required)}. "
                f"Found: {reader.fieldnames}"
            )

        for row in reader:
            ref = _normalize_text(row.get("reference_text", ""))
            hyp = _normalize_text(row.get("predicted_text", ""))

            ref_words = ref.split()
            hyp_words = hyp.split()
            ref_chars = list(ref)
            hyp_chars = list(hyp)

            total_word_dist += _levenshtein(ref_words, hyp_words)
            total_words += len(ref_words)

            total_char_dist += _levenshtein(ref_chars, hyp_chars)
            total_chars += len(ref_chars)
            samples += 1

    wer = _safe_div(total_word_dist, total_words)
    cer = _safe_div(total_char_dist, total_chars)

    return {
        "samples": samples,
        "word_errors": total_word_dist,
        "total_reference_words": total_words,
        "wer": round(wer, 4),
        "char_errors": total_char_dist,
        "total_reference_chars": total_chars,
        "cer": round(cer, 4),
    }


def write_reports(
    output_dir: Path,
    face_metrics: Dict[str, float] | None,
    stt_metrics: Dict[str, float] | None,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    payload = {"face_validation": face_metrics, "stt_validation": stt_metrics}
    json_path = output_dir / "validation_report.json"
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    text_lines: List[str] = ["Interview System Validation Report", "=" * 36, ""]

    if face_metrics:
        text_lines.extend(
            [
                "Face Verification:",
                f"- Samples: {face_metrics['samples']}",
                f"- Confusion Matrix: TP={face_metrics['tp']}, TN={face_metrics['tn']}, FP={face_metrics['fp']}, FN={face_metrics['fn']}",
                f"- Accuracy: {face_metrics['accuracy']:.4f}",
                f"- Precision: {face_metrics['precision']:.4f}",
                f"- Recall: {face_metrics['recall']:.4f}",
                f"- Specificity: {face_metrics['specificity']:.4f}",
                f"- F1-Score: {face_metrics['f1_score']:.4f}",
                "",
            ]
        )

    if stt_metrics:
        text_lines.extend(
            [
                "Answer Recording (STT):",
                f"- Samples: {stt_metrics['samples']}",
                f"- WER: {stt_metrics['wer']:.4f}",
                f"- CER: {stt_metrics['cer']:.4f}",
                "",
            ]
        )

    (output_dir / "validation_report.txt").write_text(
        "\n".join(text_lines), encoding="utf-8"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate interview system metrics.")
    parser.add_argument("--face_csv", type=Path, default=None, help="Face labels CSV.")
    parser.add_argument("--stt_csv", type=Path, default=None, help="STT labels CSV.")
    parser.add_argument(
        "--output_dir",
        type=Path,
        default=Path("validation/results"),
        help="Directory to store validation reports.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.face_csv and not args.stt_csv:
        raise ValueError("Provide at least one input file: --face_csv or --stt_csv")

    face_metrics = compute_face_metrics(args.face_csv) if args.face_csv else None
    stt_metrics = compute_stt_metrics(args.stt_csv) if args.stt_csv else None

    write_reports(args.output_dir, face_metrics, stt_metrics)
    print(f"Validation report generated in: {args.output_dir}")


if __name__ == "__main__":
    main()
