#!/usr/bin/env python3
"""VT별 증거 확인 (SDD_final_phase1.md 9.4, SDD_final_phase2.md 6.2, 하네스 L5 check:vt).

사용법:
  python3 scripts/check_vt_tests.py                       # 표로 보고만 (종료 코드 0)
  python3 scripts/check_vt_tests.py --results report/vitest.json   # 테스트 통과 여부까지
  python3 scripts/check_vt_tests.py --strict --phase 1    # Phase 1 VT 중 증거 없는 것이 있으면 실패
  python3 scripts/check_vt_tests.py --json report/vt.json # 보고서 생성기용 JSON

VT마다 증거 종류를 SDD의 "VT별 테스트 위치" 표에서 읽는다.
  자동    : tests/** 테스트 이름에 [VT-xx]가 있고 (결과 파일이 있으면) 통과
  수동    : docs/verification/checklist-phase*.md 에 "- [x] VT-xx" 로 체크됨
  검토    : docs/verification/code-review.md 에 "- [x] VT-xx" 로 체크됨
  스크립트: check:stack 같은 하네스 스크립트 (보고서 생성기가 결과를 넣는다)
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
STRICT = "--strict" in args
PHASE = args[args.index("--phase") + 1] if "--phase" in args else None
RESULTS = args[args.index("--results") + 1] if "--results" in args else None
JSON_OUT = args[args.index("--json") + 1] if "--json" in args else None
VT = re.compile(r"VT-(\d{2})")
RANGE = re.compile(r"VT-(\d{2})\s*~\s*(?:VT-)?(\d{2})")


def read(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return f.read()


def vts_in(cell):
    out = set()
    for a, b in RANGE.findall(cell):
        out |= {f"VT-{i:02d}" for i in range(int(a), int(b) + 1)}
    return out | {f"VT-{n}" for n in VT.findall(cell)}


def section(text, start, end):
    i = text.find(start)
    if i < 0:
        return ""
    j = text.find(end, i + len(start))
    return text[i:j if j >= 0 else None]


# ---- SRS: VT 목록과 Phase ----
srs = read("docs/SRS_fixed.md")
vt_phase, vt_req = {}, {}
for title, ph in (("## 4.1", "1"), ("## 4.2", "2"), ("## 4.3", "1")):
    for line in section(srs, title, "\n## ").splitlines():
        m = re.match(r"\|\s*(VT-\d{2})\s*\|\s*([^|]*)\|", line)
        if m:
            vt_phase[m.group(1)] = ph
            vt_req[m.group(1)] = m.group(2).strip()

# ---- SDD: 증거 종류 ----
kind = {}
for doc, start, end in (("docs/specs/SDD_final_phase1.md", "### 9.4", "## 10."),
                        ("docs/specs/SDD_final_phase2.md", "### 6.2", "## 7.")):
    for line in section(read(doc), start, end).splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 2 or not VT.search(cells[1]):
            continue
        where = cells[0]
        k = ("수동" if "체크리스트" in where else "검토" if "코드 검토" in where else
             "스크립트" if "check_" in where or "CI 로그" in where else "자동")
        for v in vts_in(cells[1]):
            kind.setdefault(v, set()).add(k)

# ---- tests: 이름에 [VT-xx] ----
named = {}
for dp, _, fs in os.walk(os.path.join(ROOT, "tests")):
    for f in fs:
        if f.endswith(".test.ts"):
            rel = os.path.relpath(os.path.join(dp, f), ROOT)
            for n in re.findall(r"\[VT-(\d{2})\]", open(os.path.join(dp, f), encoding="utf-8").read()):
                named.setdefault(f"VT-{n}", set()).add(rel)

# ---- vitest 결과 (선택) ----
passed, failed = {}, {}
if RESULTS and os.path.exists(RESULTS):
    data = json.load(open(RESULTS, encoding="utf-8"))
    for tf in data.get("testResults", []):
        for a in tf.get("assertionResults", []):
            name = " ".join(a.get("ancestorTitles", []) + [a.get("title", "")])
            for n in re.findall(r"\[VT-(\d{2})\]", name):
                d = passed if a.get("status") == "passed" else failed
                d[f"VT-{n}"] = d.get(f"VT-{n}", 0) + 1

# ---- 체크리스트 ----
def checked(path):
    p = os.path.join(ROOT, path)
    if not os.path.exists(p):
        return set()
    return {f"VT-{n}" for n in re.findall(r"^\s*-\s*\[[xX]\]\s*VT-(\d{2})", open(p, encoding="utf-8").read(), re.M)}

manual_ok = checked("docs/verification/checklist-phase1.md") | checked("docs/verification/checklist-phase2.md")
review_ok = checked("docs/verification/code-review.md")
script_ok = set()
if os.environ.get("VT_SCRIPT_PASS"):
    script_ok = set(os.environ["VT_SCRIPT_PASS"].split(","))

rows = []
for v in sorted(vt_phase):
    ks = sorted(kind.get(v, {"(위치 없음)"}))
    ev, status = [], "증거 없음"
    if "자동" in ks:
        if v in failed:
            status = "실패"
            ev.append(f"테스트 실패 {failed[v]}건")
        elif v in passed:
            status = "통과"
            ev.append(f"테스트 통과 {passed[v]}건")
        elif v in named and not RESULTS:
            status = "테스트 있음(결과 미확인)"
        if v in named:
            ev.append(", ".join(sorted(named[v])))
    if status in ("증거 없음",) and "수동" in ks and v in manual_ok:
        status, ev = "통과", ev + ["수동 체크리스트 체크됨"]
    if status in ("증거 없음",) and "검토" in ks and v in review_ok:
        status, ev = "통과", ev + ["코드 검토 체크됨"]
    if status in ("증거 없음",) and "스크립트" in ks and v in script_ok:
        status, ev = "통과", ev + ["하네스 스크립트 통과"]
    rows.append({"vt": v, "phase": vt_phase[v], "req": vt_req[v], "kind": "/".join(ks),
                 "status": status, "evidence": "; ".join(ev)})

sel = [r for r in rows if PHASE is None or r["phase"] == PHASE]
cnt = {}
for r in sel:
    cnt[r["status"]] = cnt.get(r["status"], 0) + 1

if JSON_OUT:
    os.makedirs(os.path.dirname(JSON_OUT) or ".", exist_ok=True)
    json.dump({"rows": rows, "count": cnt}, open(JSON_OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"check:vt — VT별 증거 ({'Phase ' + PHASE if PHASE else '전체'} {len(sel)}개)")
for k, n in sorted(cnt.items()):
    print(f"  · {k}: {n}")
if "--quiet" not in args:
    for r in sel:
        print(f"  {r['vt']} [{r['kind']}] {r['status']}  {r['evidence']}")
bad = [r for r in sel if r["status"] != "통과"]
if STRICT and bad:
    print(f"\n실패: 증거가 없거나 실패한 VT {len(bad)}개")
    sys.exit(1)
