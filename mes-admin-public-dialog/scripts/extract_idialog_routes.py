#!/usr/bin/env python3
"""Extract legacy MES IDIALOG Key routes and View constructor contracts."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path


def read_source(path: Path) -> str:
    raw = path.read_bytes()
    for encoding in ("utf-8-sig", "gb18030"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1")


ROUTE = re.compile(
    r"public\s+DialogResult\s+Show(?P<key>\w+)\s*\(\s*params\s+object\s*\[\]\s*Params\s*\)"
    r"(?P<body>.*?)"
    r"(?=public\s+DialogResult\s+Show|\Z)",
    re.S,
)
DIALOG = re.compile(
    r"Config\.FormService\.ShowDialog\(\s*\"(?P<title>[^\"]*)\"\s*,\s*"
    r"\"(?P<view>[^\"]*)\"\s*,\s*\"(?P<bus>[^\"]*)\"\s*,\s*Params\s*\)",
    re.S,
)


def find_view(project: Path, class_name: str) -> Path | None:
    for candidate in project.rglob(f"{class_name}.cs"):
        parts = set(candidate.parts)
        if "bin" not in parts and "obj" not in parts:
            return candidate
    return None


def constructors(path: Path | None, class_name: str) -> str:
    if not path:
        return ""
    pattern = re.compile(rf"public\s+{re.escape(class_name)}\s*\(([^)]*)\)")
    values = []
    for match in pattern.finditer(read_source(path)):
        signature = match.group(1).strip()
        if signature not in values:
            values.append(signature)
    return " | ".join(values)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_root", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    route_file = args.project_root / "PUBLIC" / "MESService" / "GetIDIALOG.cs"
    if not route_file.exists():
        raise SystemExit(f"Cannot find GetIDIALOG.cs: {route_file}")

    records = []
    for route in ROUTE.finditer(read_source(route_file)):
        dialog = DIALOG.search(route.group("body"))
        if not dialog:
            continue
        view = dialog.group("view")
        class_name = view.split("|")[-1]
        view_file = find_view(args.project_root, class_name)
        records.append({
            "Key": route.group("key"),
            "Title": dialog.group("title"),
            "View": view,
            "Bus": dialog.group("bus"),
            "Constructor": constructors(view_file, class_name),
            "ViewFile": str(view_file.relative_to(args.project_root)) if view_file else "",
        })

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Key", "Title", "View", "Bus", "Constructor", "ViewFile"])
        writer.writeheader()
        writer.writerows(records)
    print(f"Extracted {len(records)} routes to {args.out}")


if __name__ == "__main__":
    main()
