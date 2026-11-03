"""Blind harness helper: tap a uiautomator node by resource-id or content-desc.

Encoding-safe alternative to PowerShell regex taps (Windows PowerShell 5.1
mangles CJK when reading BOM-less UTF-8 a11y dumps).

Usage: python android_tap.py <ui.xml> <needle> <id|desc|text> <adb> <serial>
Prints the tapped center and exits 0 on success, 2 when the node is missing.
"""
import re
import subprocess
import sys

xml_path, needle, attr, adb, serial = sys.argv[1:6]
raw = open(xml_path, encoding="utf-8", errors="replace").read()
if attr == "id":
    attr_pat = rf'resource-id="[^"]*{re.escape(needle)}[^"]*"'
elif attr == "desc":
    attr_pat = rf'content-desc="[^"]*{re.escape(needle)}[^"]*"'
elif attr == "text":
    attr_pat = rf'text="[^"]*{re.escape(needle)}[^"]*"'
else:
    print(f"INVALID ATTR: {attr}; expected id|desc|text", file=sys.stderr)
    sys.exit(2)
m = re.search(
    rf"<node[^>]*{attr_pat}[^>]*bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"",
    raw,
)
if not m:
    print(f"NOT FOUND: {needle} ({attr})", file=sys.stderr)
    sys.exit(2)
cx = (int(m.group(1)) + int(m.group(3))) // 2
cy = (int(m.group(2)) + int(m.group(4))) // 2
subprocess.run(
    [adb, "-s", serial, "shell", "input", "tap", str(cx), str(cy)],
    check=True,
    capture_output=True,
)
print(f"{cx} {cy}")
