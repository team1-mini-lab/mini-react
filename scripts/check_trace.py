#!/usr/bin/env python3
"""SRS → SDD → 코드 → VT 테스트 사슬 검사 (ADR-0012 check:trace, SDD_final_phase1.md 10장).

요구사항 하나마다 다음 사슬이 끊기지 않았는지 본다.

  SRS 요구사항 ──(SRS 5.1.3)──▶ ADR (accepted 인가)
       │
  SRS 요구사항 ──(SDD 추적표 9.3 / 6.1)──▶ 설계 요소(함수 이름)
        │                                        │ (SDD 부록 A: 함수 → 파일)
        │                                        ▼
        └──(SRS 4장)──▶ VT ──(테스트 이름 [VT-xx])──▶ 테스트 파일 ──(import)──▶ 코드 파일

  [설계] SDD 추적표에 행이 있고, 설계 요소에 부록 A의 함수 이름이 있다
  [코드] 그 함수가 부록 A에 적힌 파일에서 export 되어 있다
  [테스트] 그 요구사항의 VT 중 하나 이상이 자동 테스트 이름에 있다 (수동·검토 VT만 있는 요구사항은 '수동')
           자동 테스트 대신 하네스 스크립트가 검사하는 VT는 그 스크립트가 통과하면 '검사 ✓' (환경 변수 VT_SCRIPT_PASS, report.py가 넣음)
           브라우저 체크리스트에서 `- [x] VT-xx`로 확인된 VT는 '수동 ✓'
  [연결] 그 테스트 파일이 그 코드 파일을 import 한다 (테스트가 엉뚱한 코드를 검사하지 않는지)
  [결과] (vitest 결과 파일이 있으면) 그 VT 테스트가 모두 통과

역방향도 본다.
  - 부록 A에 없는데 src 에서 export 된 이름 (설계에 없는 코드)
  - 테스트 이름의 VT가 SRS에 없음 (오타)

사용법:
  python3 scripts/check_trace.py [--phase 1|2] [--results report/vitest.json] [--json out.json] [--strict]
  --strict: 요구사항 하나라도 사슬이 끊기면 종료 코드 1
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
opt = lambda k: args[args.index(k) + 1] if k in args else None
PHASE, RESULTS, JSON_OUT, STRICT = opt("--phase"), opt("--results"), opt("--json"), "--strict" in args
IDENT = re.compile(r"[A-Za-z_]\w*")
REQ = re.compile(r"^(FR|NFR|IR|CON)-\d{2}$")


def read(p):
    p = p if os.path.isabs(p) else os.path.join(ROOT, p)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def section(text, start, end):
    i = text.find(start)
    if i < 0:
        return ""
    j = text.find(end, i + len(start))
    return text[i:j if j >= 0 else None]


def rows(text):
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("|") and not set(s) <= set("|-: "):
            yield [c.strip() for c in re.split(r"(?<!\\)\|", s.strip("|"))]


def ids(cell, prefix="VT"):
    out = set()
    p = r"(?<![A-Za-z])" + prefix   # NFR-02 안의 "FR-02"를 잡지 않도록
    for a, b in re.findall(p + r"-(\d{2})\s*~\s*(?:" + prefix + r"-)?(\d{2})", cell):
        out |= {f"{prefix}-{i:02d}" for i in range(int(a), int(b) + 1)}
    return out | {f"{prefix}-{n}" for n in re.findall(p + r"-(\d{2})", cell)}


DOCS = {"1": "docs/specs/SDD_final_phase1.md", "2": "docs/specs/SDD_final_phase2.md"}
TRACE = {"1": ("### 9.3", "### 9.4"), "2": ("### 6.1", "### 6.2")}

# ---- 부록 A: 함수 → 파일 ----
func_file = {}
for ph, doc in DOCS.items():
    for r in rows(section(read(doc), "## 부록 A", "## 부록 B")):
        if len(r) < 2 or not r[0].startswith("`"):
            continue
        f = "src/" + r[0].strip("`")
        for tok in re.findall(r"`([^`]+)`", r[1].replace("\\|", "|")):
            m = IDENT.match(tok.replace("new ", ""))
            if m and m.group() not in ("tag", "Component"):
                func_file.setdefault(m.group(), f)

# ---- src: export 된 이름 ----
EXPORT = re.compile(r"^\s*export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function\*?|class|const|let|var|interface|type|enum)\s+([A-Za-z_]\w*)", re.M)
EXPORT_LIST = re.compile(r"^\s*export\s*\{([^}]*)\}", re.M)
exports = {}
for dp, _, fs in os.walk(os.path.join(ROOT, "src")):
    for fn in fs:
        if fn.endswith(".ts"):
            rel = os.path.relpath(os.path.join(dp, fn), ROOT)
            t = read(rel)
            names = set(EXPORT.findall(t))
            for grp in EXPORT_LIST.findall(t):
                names |= {x.strip().split(" as ")[-1] for x in grp.split(",") if x.strip()}
            exports[rel] = names

# ---- tests: VT 이름, import 한 src 파일 ----
IMPORT = re.compile(r"""from\s+['"]([^'"]+)['"]""")
vt_tests, test_imports = {}, {}
for dp, _, fs in os.walk(os.path.join(ROOT, "tests")):
    for fn in fs:
        if not fn.endswith(".test.ts"):
            continue
        rel = os.path.relpath(os.path.join(dp, fn), ROOT)
        t = read(rel)
        for n in re.findall(r"\[VT-(\d{2})\]", t):
            vt_tests.setdefault(f"VT-{n}", set()).add(rel)
        imps = set()
        for spec in IMPORT.findall(t):
            if spec.startswith("."):
                p = os.path.normpath(os.path.join(os.path.dirname(rel), spec))
                if p.startswith("src"):
                    imps.add(p if p.endswith(".ts") else p + ".ts")
        test_imports[rel] = imps

# ---- vitest 결과 ----
vt_pass, vt_fail = set(), set()
if RESULTS and os.path.exists(RESULTS):
    for tf in json.load(open(RESULTS, encoding="utf-8")).get("testResults", []):
        for a in tf.get("assertionResults", []):
            name = " ".join(a.get("ancestorTitles", []) + [a.get("title", "")])
            for n in re.findall(r"\[VT-(\d{2})\]", name):
                (vt_pass if a.get("status") == "passed" else vt_fail).add(f"VT-{n}")
vt_pass -= vt_fail

# ---- SRS: 수동·검토 VT 구분 (SDD 테스트 위치 표) ----
manual_vts, script_vts = set(), set()
for ph, doc in DOCS.items():
    loc = section(read(doc), "### 9.4" if ph == "1" else "### 6.2", "## 10." if ph == "1" else "## 7.")
    for r in rows(loc):
        if len(r) > 1 and re.search(r"체크리스트|코드 검토|check_|check:|lint|CI 로그", r[0]):
            manual_vts |= ids(r[1])
        if len(r) > 1 and re.search(r"check_|check:|lint|CI 로그", r[0]):
            script_vts |= ids(r[1])
script_pass = set(filter(None, os.environ.get("VT_SCRIPT_PASS", "").split(","))) & script_vts
checked_vts = set()
for doc in ("docs/verification/checklist-phase1.md", "docs/verification/checklist-phase2.md"):
    checked_vts |= {f"VT-{n}" for n in re.findall(r"^- \[x\] VT-(\d{2})", read(doc), re.M | re.I)}
srs = read("docs/SRS_fixed.md")
srs_vts = {f"VT-{n}" for n in re.findall(r"^\|\s*VT-(\d{2})\s*\|", srs, re.M)}

# ---- SRS 5.1.3: 요구사항 → ADR (상태는 docs/adr/README.md) ----
readme = read("docs/adr/README.md")
adr_state = {m.group(1): m.group(2).lower() for m in re.finditer(r"^\|\s*\**ADR-(\d{4})\**\s*\|[^|]*\|\s*\*?([A-Za-z]+)", readme, re.M)}
adr_recheck = set(re.findall(r"^\|\s*\**ADR-(\d{4})\**\s*\|[^|]*\|[^|]*재확인 필요", readme, re.M))
req_adrs = {}
for r in rows(section(srs, "### 5.1.3", "### 5.1.4")):
    m = re.match(r"ADR-(\d{4})$", r[0]) if r else None
    if not m or len(r) < 5 or "superseded" in r[3]:
        continue
    for rid in ids(r[4], "FR") | ids(r[4], "NFR") | ids(r[4], "IR") | ids(r[4], "CON") | ids(r[4], "TBD"):
        req_adrs.setdefault(rid, set()).add(m.group(1))

# ---- 요구사항별 사슬 ----
result = []
for ph in (["1", "2"] if PHASE is None else [PHASE]):
    for r in rows(section(read(DOCS[ph]), *TRACE[ph])):
        if not r or not REQ.match(r[0]):
            continue
        req, design, vts = r[0], r[1], ids(r[-1])
        funcs = [m for m in re.findall(r"`([^`(]+)", design)]
        funcs = [IDENT.match(f).group() for f in funcs if IDENT.match(f) and IDENT.match(f).group() in func_file]
        files = sorted({func_file[f] for f in funcs})
        def defined(name, f):
            if name in exports.get(f, set()):
                return True
            # 클래스 메서드 (mount, update, push, undo …)는 export 대신 정의만 확인
            return bool(re.search(r"^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+|get\s+)*" + re.escape(name) + r"\s*(?:<[^>]*>)?\s*\(", read(f), re.M))
        missing_code = [f"{f} ({func_file[f]})" for f in funcs if not defined(f, func_file[f])]
        auto_vts = sorted(v for v in vts if v not in manual_vts)
        tests = sorted({t for v in auto_vts for t in vt_tests.get(v, ())})
        linked = sorted({t for t in tests if set(files) & test_imports.get(t, set())})
        adrs = sorted(req_adrs.get(req, ()))
        a_state = [adr_state.get(a, "?") for a in adrs]
        st = {
            "ADR": "—" if not adrs else ("✓" if all(x == "accepted" for x in a_state) and not (set(adrs) & adr_recheck) else "△"),
            "설계": "✓" if funcs else ("—" if not auto_vts else "△"),
            "코드": "—" if not funcs else ("✓" if not missing_code else "✗"),
            "테스트": ("검사 ✓" if set(vts) & script_pass else "수동 ✓" if vts and set(vts) <= (checked_vts | script_pass) else "수동") if not auto_vts else ("✓" if tests else "✗"),
            "연결": "—" if not (auto_vts and files) else ("✓" if linked else "✗"),
            "결과": ("✓" if vts and set(vts) <= (checked_vts | script_pass) else "—") if not auto_vts else ("✗" if set(auto_vts) & vt_fail else "✓" if RESULTS and set(auto_vts) <= vt_pass else "?"),
        }
        broken = [k for k, v in st.items() if v == "✗"]  # ADR △(proposed·재확인)는 끊김이 아니라 '승인 대기'로 본다
        why = "; ".join(filter(None, [
            ("코드 없음: " + ", ".join(missing_code)) if st["코드"] == "✗" else "",
            ("자동 테스트 없음: " + ", ".join(auto_vts)) if st["테스트"] == "✗" else "",
            ("테스트가 " + ", ".join(files) + "를 import 하지 않음") if st["연결"] == "✗" else "",
            "테스트 실패" if st["결과"] == "✗" else ""]))
        result.append({"phase": ph, "req": req, "adrs": [f"ADR-{a}({adr_state.get(a, '?')}{', 재확인' if a in adr_recheck else ''})" for a in adrs], "funcs": funcs, "files": files, "vts": sorted(vts),
                       "auto_vts": auto_vts, "tests": tests, "missing_code": missing_code,
                       "status": st, "ok": not broken, "why": why})

# ---- 역방향 ----
documented = set(func_file)
undocumented = sorted(f"{n} ({f})" for f, ns in exports.items() for n in ns
                      if n not in documented and not re.match(r"^[A-Z][A-Za-z]*(Options|Result|Slot|Handlers|Props|Change|Pair|Attrs|Child|VNode|VElement|VText|Component|SetState|EventHandlers)$", n))
unknown_vts = sorted(set(vt_tests) - srs_vts)

if JSON_OUT:
    os.makedirs(os.path.dirname(JSON_OUT) or ".", exist_ok=True)
    json.dump({"rows": result, "undocumented": undocumented, "unknown_vts": unknown_vts},
              open(JSON_OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

ok = sum(r["ok"] for r in result)
print(f"check:trace — SRS → SDD → 코드 → VT 사슬 ({'Phase ' + PHASE if PHASE else '전체'})")
print(f"  요구사항 {len(result)}개 중 사슬이 끊기지 않은 것 {ok}개")
print("  | 요구사항 | ADR | 설계 | 코드 | 테스트 | 연결 | 결과 | 끊긴 곳 |")
for r in result:
    s = r["status"]
    why = "; ".join(filter(None, [
        ("코드 없음: " + ", ".join(r["missing_code"])) if s["코드"] == "✗" else "",
        ("자동 테스트 없음: " + ", ".join(r["auto_vts"])) if s["테스트"] == "✗" else "",
        ("테스트가 " + ", ".join(r["files"]) + "를 import 하지 않음") if s["연결"] == "✗" else "",
        "테스트 실패" if s["결과"] == "✗" else ""]))
    print(f"  | {r['req']} | {s['ADR']} | {s['설계']} | {s['코드']} | {s['테스트']} | {s['연결']} | {s['결과']} | {why} |")
if undocumented:
    print(f"\n  설계(부록 A)에 없는 export {len(undocumented)}개: {', '.join(undocumented[:15])}{' …' if len(undocumented) > 15 else ''}")
if unknown_vts:
    print(f"  SRS에 없는 VT를 쓰는 테스트: {', '.join(unknown_vts)}")
if STRICT and (ok < len(result) or unknown_vts):
    sys.exit(1)
