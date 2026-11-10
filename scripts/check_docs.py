#!/usr/bin/env python3
"""SRS ↔ SDD ↔ ADR 정합성 검사 (SDD_final_phase1.md 10.2, 하네스 L5 check:docs).

사용법:  python3 scripts/check_docs.py            (기본 경로)
         python3 scripts/check_docs.py --verbose  (통과 항목 개수도 출력)
실패 항목이 하나라도 있으면 종료 코드 1.

검사 항목
  [1] SRS의 모든 FR/NFR/IR/CON/VT/TBD ID가 설계 추적표에 하나씩 있고, 설계에만 있는 ID가 없다
  [2] SRS 4장의 "요구사항 → VT" 연결이 설계 추적표에도 있다
  [3] 모든 VT가 테스트 위치 표에 있다
  [4] ADR·피드백 문서의 테스트 ID(T, S, D, P, R, TA, H, U, HL, TV, C, B, K, HR, TD)가 설계 문서에 있다
  [5] ADR 목록(README)의 상태와 ADR 파일의 status가 같고, superseded ADR을 요구사항·설계 본문이 근거로 쓰지 않는다
  [6] 지운 설계의 용어가 설계 본문에 남아 있지 않다
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRS = os.path.join(ROOT, "docs/SRS_fixed.md")
SDD1 = os.path.join(ROOT, "docs/specs/SDD_final_phase1.md")
SDD2 = os.path.join(ROOT, "docs/specs/SDD_final_phase2.md")
ADR_DIR = os.path.join(ROOT, "docs/adr")
REVIEW_DIR = os.path.join(ROOT, "docs/reviews")

VERBOSE = "--verbose" in sys.argv
REQ = r"(?:FR|NFR|IR|CON|VT|TBD)"
ID = re.compile(r"\b(FR|NFR|IR|CON|VT|TBD)-(\d{2})\b")
RANGE = re.compile(r"\b(FR|NFR|IR|CON|VT|TBD)-(\d{2})\s*(?:\\?~|–|-)\s*(?:(?:FR|NFR|IR|CON|VT|TBD)-)?(\d{2})\b")
TEST_PREFIX = r"(?:TA|HL|TV|HR|TD|T|S|D|P|R|H|U|C|B|K)"
TEST_ID = re.compile(r"(?<![A-Za-z0-9_-])(" + TEST_PREFIX + r")(\d{1,2})(?![0-9A-Za-z])")
TEST_RANGE = re.compile(r"(?<![A-Za-z0-9_-])(" + TEST_PREFIX + r")(\d{1,2})\s*(?:~|–)\s*\1?(\d{1,2})(?![0-9])")

fails, notes = [], []


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def section(text, start, end=None):
    """start~end 사이 글. 절이 없으면 실패로 기록하고 빈 글을 돌려준다."""
    i = text.find(start)
    if i < 0:
        fails.append(f"[구조] 절 '{start}'를 찾지 못함 (추적표·테스트 위치 표가 있어야 검사할 수 있다)")
        return ""
    j = text.find(end, i + len(start)) if end else -1
    return text[i:j] if j >= 0 else text[i:]


def single_ids(text):
    """범위 표기(VT-25~VT-31)는 빼고 하나씩 적힌 ID만 모은다."""
    text = RANGE.sub(" ", text)
    return {f"{a}-{b}" for a, b in ID.findall(text)}


def expand_ids(cell):
    out = set()
    for a, x, y in RANGE.findall(cell):
        out |= {f"{a}-{i:02d}" for i in range(int(x), int(y) + 1)}
    return out | {f"{a}-{b}" for a, b in ID.findall(cell)}


def expand_tests(text):
    out = set()
    for p, x, y in TEST_RANGE.findall(text):
        out |= {f"{p}{i}" for i in range(int(x), int(y) + 1)}
    return out | {p + n for p, n in TEST_ID.findall(text)}


def rows(text):
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("|") and not set(s) <= set("|-: "):
            yield [c.strip().strip("*`") for c in s.strip("|").split("|")]


srs, sdd1, sdd2 = read(SRS), read(SDD1), read(SDD2)

# ---------- 추적표 위치 ----------
trace1 = section(sdd1, "### 9.3", "### 9.4")
where1 = section(sdd1, "### 9.4", "## 10.")
trace2 = section(sdd2, "### 6.1", "### 6.2")
where2 = section(sdd2, "### 6.2", "## 7.")
trace = trace1 + "\n" + trace2

# ---------- [1] SRS ID ↔ 설계 추적표 ----------
srs_body = section(srs, "# 0. 기본 요구사항")
srs_defined = set()
for r in rows(srs_body):
    if r and re.fullmatch(REQ + r"-\d{2}", r[0]):
        srs_defined.add(r[0])
design_ids = single_ids(trace)
missing = sorted(srs_defined - design_ids)
extra = sorted(design_ids - srs_defined)
if missing:
    fails.append(f"[1] SRS에 정의됐지만 설계 추적표에 하나씩 적히지 않은 ID ({len(missing)}): {', '.join(missing)}")
if extra:
    fails.append(f"[1] 설계 추적표에만 있는 ID (오타 또는 SRS 누락): {', '.join(extra)}")
notes.append(f"[1] SRS 정의 ID {len(srs_defined)}개, 설계 추적표 ID {len(design_ids)}개")

# ---------- [2] 요구사항 → VT 연결 ----------
srs_map = {}
for r in rows(section(srs, "# 4. Verification", "# 5. Appendixes")):
    if r and re.fullmatch(r"VT-\d{2}", r[0]):
        for req in expand_ids(r[1]):
            srs_map.setdefault(req, set()).add(r[0])
sdd_map = {}
for r in rows(trace):
    if r and re.fullmatch(r"(FR|NFR|IR|CON|TBD)-\d{2}", r[0]):
        sdd_map.setdefault(r[0], set()).update(v for v in expand_ids(r[-1]) if v.startswith("VT"))
n2 = 0
for req, vts in sorted(srs_map.items()):
    lack = vts - sdd_map.get(req, set())
    n2 += len(vts)
    if lack:
        fails.append(f"[2] {req}: SRS 4장은 {', '.join(sorted(lack))}로 검증하는데 설계 추적표에 없음")
notes.append(f"[2] SRS 요구사항→VT 연결 {n2}건 대조")

# ---------- [3] VT 테스트 위치 ----------
srs_vts = {i for i in srs_defined if i.startswith("VT-")}
placed = expand_ids(where1 + "\n" + where2)
vt_missing = sorted(srs_vts - placed)
if vt_missing:
    fails.append(f"[3] 테스트 위치 표에 없는 VT: {', '.join(vt_missing)}")
notes.append(f"[3] VT {len(srs_vts)}개 중 위치 지정 {len(srs_vts & placed)}개")

# ---------- [4] ADR·피드백 테스트 ID ----------
def table_test_ids(path):
    ids = set()
    for r in rows(read(path)):
        if r and re.fullmatch(TEST_PREFIX + r"\d{1,2}", r[0]):
            ids.add(r[0])
    return ids

adr_tests = {}
for f in sorted(glob.glob(os.path.join(ADR_DIR, "*.md"))) + sorted(glob.glob(os.path.join(REVIEW_DIR, "*.md"))):
    for t in table_test_ids(f):
        adr_tests.setdefault(t, os.path.relpath(f, ROOT))
design_tests = expand_tests(sdd1 + "\n" + sdd2)
t_missing = sorted(set(adr_tests) - design_tests, key=lambda x: (re.match(r"\D+", x).group(), int(re.search(r"\d+", x).group())))
if t_missing:
    fails.append("[4] ADR·피드백 테스트 ID가 설계 문서에 없음: " + ", ".join(f"{t}({adr_tests[t]})" for t in t_missing))
notes.append(f"[4] ADR·피드백 테스트 ID {len(adr_tests)}개 중 설계 반영 {len(set(adr_tests) & design_tests)}개")

# ---------- [5] ADR 상태 ----------
def file_status(path):
    m = re.search(r"^\s*(?:\|\s*)?status\s*(?::|\|)\s*([A-Za-z]+)", read(path), re.M | re.I)
    return m.group(1).lower() if m else None

readme = read(os.path.join(ADR_DIR, "README.md"))
files = {}
for f in glob.glob(os.path.join(ADR_DIR, "**/*.md"), recursive=True):
    m = re.search(r"(?i)adr[-_](\d{4})", os.path.basename(f))
    if m:
        files[m.group(1)] = f
listed = {}
for r in rows(readme):
    if r and re.fullmatch(r"ADR-\d{4}", r[0]) and len(r) >= 3:
        st = re.search(r"(accepted|proposed|superseded)", r[2], re.I)
        listed[r[0][4:]] = st.group(1).lower() if st else None
for num, st in sorted(listed.items()):
    f = files.get(num)
    if not f:
        fails.append(f"[5] ADR-{num}: README에는 있으나 파일이 없음")
        continue
    fs = file_status(f)
    if fs != st:
        fails.append(f"[5] ADR-{num}: README 상태 '{st}' ≠ 파일 status '{fs}' ({os.path.relpath(f, ROOT)})")
for num in sorted(set(files) - set(listed)):
    fails.append(f"[5] ADR-{num}: 파일은 있으나 README 목록에 없음")
superseded = {n for n, st in listed.items() if st == "superseded"}

def cites_superseded(text, label, skip_heads=()):
    # ADR 번호 바로 앞뒤(앞 12자, 뒤 30자)에 "superseded/대체/폐기/구" 같은 표시가 없으면 근거 인용으로 본다
    ok = re.compile(r"superseded|대체|폐기|구 `?ADR|구 eungi|이전 번호|기각", re.I)
    for line in text.splitlines():
        if any(h in line for h in skip_heads):
            continue
        for n in superseded:
            for m in re.finditer(f"ADR-{n}", line):
                around = line[max(0, m.start() - 12): m.end() + 30]
                if not ok.search(around):
                    fails.append(f"[5] {label}: superseded ADR-{n}을 근거로 인용 → {line.strip()[:90]}")
                    break

srs_req = section(srs, "# 3. Requirements", "# 5. Appendixes")
cites_superseded(srs_req, "SRS 3·4장")
cites_superseded(section(sdd1, "## 1. 개요와 범위"), "SDD_final_phase1 본문")
cites_superseded(section(sdd2, "## 1. 개요와 아키텍처 원칙"), "SDD_final_phase2 본문")
notes.append(f"[5] ADR {len(listed)}개 상태 대조, superseded {sorted('ADR-' + n for n in superseded)}")

# ---------- [6] 지운 설계 용어 ----------
BANNED = {
    "PatchError": "t2(구 ADR-0013) 폐기, t3로 대체",
    "applyPatches": "v0.3 이름, 지금은 applyPatch",
    "path: number[]": "경로 방식 폐기 (CF-02)",
    "DOMParser": "<template> 사용 (CF-05)",
    "goTo(": "History.goTo 제거 (ADR-0008)",
    "unmount(": "unmount 미도입 (ADR-0015)",
    "unmountTree": "unmount 미도입 (ADR-0015)",
    "on?:": "동작 키 이름은 events (ADR-0001)",
    "limit = 100": "History 한도 제거 (ADR-0008)",
}
def body(text, first_heading):
    # 0장 변경 요약은 옛 이름을 설명용으로 쓰므로 제외
    return section(text, first_heading)
for label, text, head in (("SDD_final_phase1", sdd1, "## 1. 개요와 범위"), ("SDD_final_phase2", sdd2, "## 1. 개요와 아키텍처 원칙")):
    b = body(text, head)
    for term, why in BANNED.items():
        for line in b.splitlines():
            if term in line and not re.search(r"제거|폐기|미도입|없|않는다|superseded|대체", line):
                fails.append(f"[6] {label}: 지운 설계 용어 '{term}' ({why}) → {line.strip()[:90]}")
                break

# ---------- [7] 인용한 ADR 절이 실제로 있는가 ----------
# "ADR-0006 8절", "`ADR-0005` 6절", "ADR-0005 2-1절" 같은 인용마다, 그 ADR 파일에 "### 8." "**4)" 같은 절 머리가 있어야 한다
CITE = re.compile(r"ADR-(\d{4})`?\s*(\d+(?:-\d+)?)절")
def has_section(path, num):
    pat = re.compile(r"^\s*(?:#+\s*|\*\*)\s*" + re.escape(num) + r"[.)]\s", re.M)
    return bool(pat.search(read(path)))
cited = 0
p1_body = section(sdd1, "## 1. 개요와 범위")      # 0장 변경 요약은 제외
p2_body = section(sdd2, "## 1. 개요와 아키텍처 원칙")
for label, text in (("SRS", srs), ("SDD_final_phase1", p1_body), ("SDD_final_phase2", p2_body), ("adr/README", readme)):
    seen = set()
    # "추가 예정", "아직 없" 처럼 절이 없음을 밝힌 줄은 인용이 아니다
    text = "\n".join(l for l in text.splitlines() if "추가 예정" not in l and "아직 없" not in l)
    for n, sec in CITE.findall(text):
        if (n, sec) in seen:
            continue
        seen.add((n, sec)); cited += 1
        f = files.get(n)
        if f and not has_section(f, sec):
            fails.append(f"[7] {label}: 'ADR-{n} {sec}절'을 인용하지만 {os.path.relpath(f, ROOT)}에 그 절이 없음")
notes.append(f"[7] ADR 절 인용 {cited}건 확인")

# ---------- 결과 ----------
print("check:docs — SRS ↔ SDD ↔ ADR 정합성 검사")
print(f"  SRS: {os.path.relpath(SRS, ROOT)}")
print(f"  SDD: {os.path.relpath(SDD1, ROOT)}, {os.path.relpath(SDD2, ROOT)}")
if VERBOSE or not fails:
    for n in notes:
        print("  ·", n)
if fails:
    print(f"\n실패 {len(fails)}건")
    for f in fails:
        print("  ✗", f)
    sys.exit(1)
print("\n모든 검사 통과")
