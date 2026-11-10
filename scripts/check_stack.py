#!/usr/bin/env python3
"""UI 프레임워크 0 검사 (SRS CON-01·CON-02, VT-23, SDD_final_phase1.md 2.3).

사용법: python3 scripts/check_stack.py
실패 항목이 하나라도 있으면 종료 코드 1.

  - package.json dependencies/devDependencies에 UI 프레임워크와 그 플러그인이 없다
  - src/, tests/ 에 .tsx/.jsx 파일이 없다
  - src/, tests/, index.html 에 UI 프레임워크 import/스크립트가 없다
  - tsconfig.json: strict true, jsx 옵션 없음
  - src/ 아래 .js 소스가 없다 (ADR-0007)
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANNED_PKG = re.compile(
    r"^(react|react-dom|react-is|preact|vue|svelte|solid-js|lit|@vitejs/plugin-react.*|@vitejs/plugin-vue.*|"
    r"@sveltejs/.*|@preact/.*|@types/react.*|lucide-react|motion|framer-motion)$")
BANNED_IMPORT = re.compile(
    r"""(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"](react|react-dom|react-dom/client|preact|vue|svelte|lucide-react|motion(?:/react)?)['"]""")
fails = []


def strip_jsonc(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(?m)^\s*//.*$", "", text)
    return re.sub(r",(\s*[}\]])", r"\1", text)


pkg_path = os.path.join(ROOT, "package.json")
pkg = json.load(open(pkg_path, encoding="utf-8"))
for sec in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
    for name in pkg.get(sec, {}):
        if BANNED_PKG.match(name):
            fails.append(f"package.json {sec}: '{name}' (UI 프레임워크·플러그인 또는 화면 라이브러리)")

for top in ("src", "tests"):
    for dp, dn, fn in os.walk(os.path.join(ROOT, top)):
        dn[:] = [d for d in dn if d != "node_modules"]
        for f in fn:
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, ROOT)
            if f.endswith((".tsx", ".jsx")):
                fails.append(f"{rel}: JSX 파일 (CON-01)")
            if top == "src" and f.endswith(".js"):
                fails.append(f"{rel}: src 아래 .js 소스 (ADR-0007)")
            if f.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs", ".html")):
                for i, line in enumerate(open(p, encoding="utf-8", errors="replace"), 1):
                    m = BANNED_IMPORT.search(line)
                    if m:
                        fails.append(f"{rel}:{i}: '{m.group(1)}' import (CON-01)")

idx = os.path.join(ROOT, "index.html")
if os.path.exists(idx):
    for i, line in enumerate(open(idx, encoding="utf-8"), 1):
        if re.search(r"\.(tsx|jsx)['\"]", line) or 'id="root"' in line:
            fails.append(f"index.html:{i}: React 진입점 흔적 → {line.strip()[:80]}")

ts_path = os.path.join(ROOT, "tsconfig.json")
if os.path.exists(ts_path):
    ts = json.loads(strip_jsonc(open(ts_path, encoding="utf-8").read()))
    co = ts.get("compilerOptions", {})
    if co.get("strict") is not True:
        fails.append("tsconfig.json: compilerOptions.strict가 true가 아님 (ADR-0007)")
    if "jsx" in co:
        fails.append(f"tsconfig.json: compilerOptions.jsx = {co['jsx']!r} (JSX 사용 흔적)")
else:
    fails.append("tsconfig.json 없음")

print("check:stack — UI 프레임워크 0 / TypeScript strict 검사 (CON-01, CON-02, VT-23)")
if fails:
    print(f"\n실패 {len(fails)}건")
    for f in fails:
        print("  ✗", f)
    sys.exit(1)
print("\n모든 검사 통과")
