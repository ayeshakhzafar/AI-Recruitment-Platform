#!/usr/bin/env python3
"""
Evaluate the same face / liveness gate used in production (DeepFace Facenet + anti_spoofing when supported).

Uses **your own labeled images** (not database seed data):
  dataset_root/
    live/    # images you label as genuine live capture
    spoof/   # images you label as attack (print, phone screen, mask, wrong person, etc.)

A sample is counted as **predicted "live accepted"** when `services.face_service._get_face_embedding`
returns an embedding (face found + passes anti-spoof when DeepFace exposes `is_real`).

Run from the `backend` directory (use a REAL path, not the example):

  python scripts/evaluate_face_liveness.py --dataset D:\\my_eval\\face_dataset

  # or any folder names you like:
  python scripts/evaluate_face_liveness.py --live D:\\my_eval\\real --spoof D:\\my_eval\\attacks

Optional second check (OpenCV Haar, same idea as `_face_check` sampling):
  python scripts/evaluate_face_liveness.py --dataset ... --haar-face-present
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Resolve imports as when running from backend/
_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

IMG_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def _list_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    out: list[Path] = []
    for p in sorted(folder.iterdir()):
        if p.is_file() and p.suffix.lower() in IMG_EXT:
            out.append(p)
    return out


def _confusion_counts(y_true_live: list[bool], y_pred_live: list[bool]) -> tuple[int, int, int, int]:
    """Returns TP, TN, FP, FN where "positive" class = live (real)."""
    tp = tn = fp = fn = 0
    for t, p in zip(y_true_live, y_pred_live):
        if t and p:
            tp += 1
        elif t and not p:
            fn += 1
        elif not t and p:
            fp += 1
        else:
            tn += 1
    return tp, tn, fp, fn


def _metrics(tp: int, tn: int, fp: int, fn: int) -> dict:
    n = tp + tn + fp + fn
    acc = (tp + tn) / n if n else 0.0
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    spec = tn / (tn + fp) if (tn + fp) else 0.0
    f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) else 0.0
    return {
        "n": n,
        "accuracy": acc,
        "precision_live": prec,
        "recall_live": rec,
        "specificity_spoof": spec,
        "f1_live": f1,
    }


def _print_matrix(tp: int, tn: int, fp: int, fn: int) -> None:
    print()
    print("Confusion matrix (rows = actual, cols = predicted)")
    print("                 pred NOT live   pred live")
    print(f"  actual NOT live (spoof)   {tn:5d}          {fp:5d}")
    print(f"  actual live               {fn:5d}          {tp:5d}")
    print()
    print("Legend:")
    print("  TP  live & accepted as live")
    print("  TN  spoof & rejected (no embedding / blocked)")
    print("  FP  spoof but accepted as live  (security risk)")
    print("  FN  live but rejected             (bad UX / false block)")
    print()


def _haar_face_present(image_path: Path) -> bool:
    import cv2

    frame = cv2.imread(str(image_path))
    if frame is None:
        return False
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(gray, 1.1, 4, minSize=(60, 60))
    return len(faces) >= 1


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Face liveness / embedding gate - confusion matrix on labeled folders"
    )
    ap.add_argument(
        "--dataset",
        type=Path,
        default=None,
        help="Root folder that contains subfolders live/ and spoof/ (or use --live + --spoof instead)",
    )
    ap.add_argument(
        "--live",
        type=Path,
        default=None,
        help="Folder of genuine live-capture images (alternative to dataset/live/)",
    )
    ap.add_argument(
        "--spoof",
        type=Path,
        default=None,
        help="Folder of spoof / attack images (alternative to dataset/spoof/)",
    )
    ap.add_argument(
        "--haar-face-present",
        action="store_true",
        help="Also run OpenCV Haar 'face present' check (different from DeepFace liveness)",
    )
    args = ap.parse_args()

    live_dir: Path | None = None
    spoof_dir: Path | None = None

    if args.live is not None and args.spoof is not None:
        live_dir = args.live.expanduser().resolve()
        spoof_dir = args.spoof.expanduser().resolve()
    elif args.live is not None or args.spoof is not None:
        print(
            "ERROR: use both --live <dir> and --spoof <dir> together, or only --dataset <root>.",
            file=sys.stderr,
        )
        return 2
    elif args.dataset is not None:
        root = args.dataset.expanduser().resolve()
        if not root.exists():
            print(f"ERROR: path does not exist: {root}", file=sys.stderr)
            print(
                "  Tip: `D:\\path\\to\\your_dataset` was only an example. Create a folder, add live/ and spoof/, "
                "put images inside, then pass that folder to --dataset.",
                file=sys.stderr,
            )
            return 2
        if not root.is_dir():
            print(f"ERROR: not a directory: {root}", file=sys.stderr)
            return 2
        live_dir = root / "live"
        spoof_dir = root / "spoof"
        if not live_dir.is_dir() or not spoof_dir.is_dir():
            print(
                f"ERROR: under {root} there must be two folders named exactly `live` and `spoof`.",
                file=sys.stderr,
            )
            try:
                kids = [p.name for p in root.iterdir() if p.is_dir()]
                if kids:
                    print(f"  Found directories here: {', '.join(sorted(kids))}", file=sys.stderr)
                else:
                    print("  (no subdirectories found — create `live` and `spoof` and add images)", file=sys.stderr)
            except OSError:
                pass
            print(
                "  Or skip that layout and pass explicit folders:  --live <dir> --spoof <dir>",
                file=sys.stderr,
            )
            return 2
    else:
        ap.print_help()
        print(
            "\nERROR: provide --dataset <root with live/ and spoof/> OR both --live <dir> and --spoof <dir>.",
            file=sys.stderr,
        )
        return 2

    assert live_dir is not None and spoof_dir is not None
    if not live_dir.is_dir():
        print(f"ERROR: live folder is not a directory: {live_dir}", file=sys.stderr)
        return 2
    if not spoof_dir.is_dir():
        print(f"ERROR: spoof folder is not a directory: {spoof_dir}", file=sys.stderr)
        return 2

    from services.face_service import _get_face_embedding

    paths: list[Path] = []
    labels_live: list[bool] = []
    for p in _list_images(live_dir):
        paths.append(p)
        labels_live.append(True)
    for p in _list_images(spoof_dir):
        paths.append(p)
        labels_live.append(False)

    if not paths:
        print("ERROR: No images found in live/ or spoof/ (extensions: " + ", ".join(sorted(IMG_EXT)) + ")", file=sys.stderr)
        return 2

    pred_deepface: list[bool] = []
    pred_haar: list[bool] = []

    for p in paths:
        data = p.read_bytes()
        emb = _get_face_embedding(data)
        pred_deepface.append(emb is not None)
        if args.haar_face_present:
            pred_haar.append(_haar_face_present(p))
        else:
            pred_haar.append(False)

    tp, tn, fp, fn = _confusion_counts(labels_live, pred_deepface)
    m = _metrics(tp, tn, fp, fn)

    print(f"Live dir:  {live_dir}")
    print(f"Spoof dir: {spoof_dir}")
    print(f"Images:  live={sum(labels_live)}  spoof={len(labels_live) - sum(labels_live)}  total={len(paths)}")
    print("Model:   DeepFace Facenet represent + anti_spoofing (if supported) - same as interview registration path")
    _print_matrix(tp, tn, fp, fn)
    print(
        f"Accuracy: {m['accuracy']:.4f}  |  Precision(live): {m['precision_live']:.4f}  |  "
        f"Recall(live): {m['recall_live']:.4f}  |  Specificity(spoof): {m['specificity_spoof']:.4f}  |  F1(live): {m['f1_live']:.4f}"
    )

    if args.haar_face_present:
        tp2, tn2, fp2, fn2 = _confusion_counts(labels_live, pred_haar)
        m2 = _metrics(tp2, tn2, fp2, fn2)
        print()
        print("=== Secondary: OpenCV Haar 'face box present' (NOT liveness) ===")
        _print_matrix(tp2, tn2, fp2, fn2)
        print(
            f"Accuracy: {m2['accuracy']:.4f}  |  Precision(live): {m2['precision_live']:.4f}  |  "
            f"Recall(live): {m2['recall_live']:.4f}  |  Specificity(spoof): {m2['specificity_spoof']:.4f}  |  F1(live): {m2['f1_live']:.4f}"
        )

    print()
    print("How to read this for product decisions:")
    print("  High FP  → model accepts too many spoofs → tighten anti-spoof / detector / threshold.")
    print("  High FN  → model blocks real candidates → relax gate or improve lighting guidance.")
    print("  Interview emotion/gaze scores are separate from this embedding gate; evaluate those with labeled frame clips if needed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
