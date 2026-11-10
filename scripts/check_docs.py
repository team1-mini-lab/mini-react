#!/usr/bin/env python3
"""SRS ↔ SDD 정합성 검사 (SDD 8.5 L5 check:trace의 문서 부분).

사용법: python3 scripts/check_docs.py docs/SRS_fixed.md docs/SDD.md docs/SDD_fixed_phase2.md docs/adr/README.md
실패 항목이 하나라도 있으면 종료 코드 1.
"""
import re
import sys

srs_path, sdd_path, p2_path, adr_path = sys.argv[1:5]
srs = open(srs_path, encoding="utf-8").read()
sdd = open(sdd_path, encoding="utf-8").read()
p2 = open(p2_path, encoding="utf-8").read()
adr = open(adr_path, encoding="utf-8").read()
design = sdd + "\n" + p2

ID = r"\b(FR|NFR|IR|CON|VT|TBD)-(\d{2})\b"
fails = []


def ids(text):
    """범위 표기(VT-25~VT-31)는 세지 않고, 하나씩 적힌 ID만 모은다."""
    text = re.sub(r"\b(?:FR|NFR|IR|CON|VT|TBD)-\d{2}\\?~(?:(?:FR|NFR|IR|CON|VT|TBD)-)?\d{2}", " ", text)
    return {f"{a}-{b}" for a, b in re.findall(ID, text)}


def section(text, start, end=None):
    i = text.index(start)
    j = text.index(end, i) if end else len(text)
    return text[i:j]


def table_rows(text):
    return [[c.strip() for c in line.strip().strip("|").split("|")]
            for line in text.splitlines() if line.startswith("|") and not set(line) <= set("|-: ")]


def expand(cell):
    """셀 안의 ID를 범위까지 펼쳐서 모은다 (요구사항↔VT 연결 비교용)."""
    out = set()
    for a, x, y in re.findall(r"\b(FR|NFR|IR|CON|VT|TBD)-(\d{2})\\?~(?:(?:FR|NFR|IR|CON|VT|TBD)-)?(\d{2})", cell):
        out |= {f"{a}-{i:02d}" for i in range(int(x), int(y) + 1)}
    return out | {f"{a}-{b}" for a, b in re.findall(ID, cell)}


# 1. SRS의 모든 ID가 설계 문서에 하나씩 적혀 있는가
srs_ids = {i for i in ids(srs) if not i.startswith("PR")}
design_ids = ids(design)
missing = sorted(srs_ids - design_ids)
extra = sorted(design_ids - srs_ids)
if missing:
    fails.append(f"[1] SRS에는 있고 SDD에 하나씩 적히지 않은 ID: {', '.join(missing)}")
if extra:
    fails.append(f"[1] SDD에만 있는 ID (오타 또는 SRS 누락): {', '.join(extra)}")

# 2. 모든 VT가 테스트 위치(SDD 6.2·6.5, Phase 2 문서 4장)에 있는가
where = section(sdd, "### 6.2", "### 6.3") + section(sdd, "### 6.5", "## 7.") + section(p2, "## 4.", "## 5.")
vt_missing = sorted(v for v in srs_ids if v.startswith("VT") and v not in ids(where))
if vt_missing:
    fails.append(f"[2] 테스트 위치가 정해지지 않은 VT: {', '.join(vt_missing)}")

# 3. 요구사항별 VT 연결이 SRS 4장과 SDD 추적표에서 같은가
srs_map = {}
for row in table_rows(section(srs, "# 4. Verification", "# 5. Appendixes")):
    if row and re.fullmatch(r"VT-\d{2}", row[0]):
        for req in expand(row[1]):
            srs_map.setdefault(req, set()).add(row[0])
sdd_map = {}
trace = section(sdd, "### 7.1", "### 7.2") + section(p2, "## 5.", "**issue.md")
for row in table_rows(trace):
    if row and re.fullmatch(r"(FR|NFR|IR|CON)-\d{2}", row[0]):
        sdd_map[row[0]] = {v for v in expand(row[-1]) if v.startswith("VT")}
for req, vts in sorted(srs_map.items()):
    if not re.match(r"(FR|NFR|IR|CON)-", req):
        continue
    lack = vts - sdd_map.get(req, set())
    if lack:
        fails.append(f"[3] {req}: SRS 4장은 {', '.join(sorted(lack))}로 검증하는데 SDD 추적표에 없음")

# 4. 지운 설계의 용어가 설계 본문(SDD 3장, Phase 2 문서 2장)에 남아 있지 않은가
#    변경 이력·옛 설계와의 비교표는 일부러 옛 용어를 쓰므로 검사하지 않는다.
body = section(sdd, "## 3. Phase 1 설계", "## 4. Phase 2 설계") + section(p2, "## 2. 설계", "## 3.")
banned = ["Path = number", "'CREATE'", "type: 'PROPS'", "props: Props", "applyPatches(", "DOMParser", "getNode(", "createElement(next)"]
for w in banned:
    if w in body:
        fails.append(f"[4] 지운 설계의 용어가 남아 있음: {w}")

# 5. 결정 값이 두 문서에서 같은가
kinds = ["add", "remove", "replace", "text", "attrs", "move"]
for k in kinds:
    if f"`{k}`" not in srs or f"'{k}'" not in sdd:
        fails.append(f"[5] 변경 종류 {k}가 SRS(`{k}`) 또는 SDD 타입('{k}')에 없음")
for name in ["domToVNode", "vnodeToDom", "vnodeToHtml", "htmlToVNode", "applyPatch", "diff"]:
    if name not in srs or name not in sdd:
        fails.append(f"[5] 함수 이름 {name}이 SRS 또는 SDD에 없음")
for val, label in [("0.3초", "미리보기 대기 시간"), ("90%", "커버리지 목표"), ("`dom`", "dom 참조"), ("`key`", "key")]:
    if val not in srs or val not in design:
        fails.append(f"[5] {label}({val})가 한쪽 문서에만 있음")
if "B·C 삭제" not in srs or "j1" not in sdd:
    fails.append("[5] TBD-01 결정(B·C 삭제, j1)이 두 문서에서 일치하지 않음")
if "archive" in sdd and "확장" not in section(sdd, "### 3.5", "### 3.6"):
    fails.append("[5] SDD 3.5가 archive[]를 채택한 것처럼 보임 (ADR-0008 j1과 충돌)")

# 6. 문서가 인용한 ADR 번호가 ADR 목록에 있는가
listed = set(re.findall(r"\| ADR-(\d{4}) \|", adr))
for doc, text in [("SRS", srs), ("SDD", sdd), ("Phase 2", p2)]:
    cited = set(re.findall(r"ADR-(\d{4})", text))
    cited |= {n for n in re.findall(r"\b(00(?:0[1-9]|1[0-4]))\b", text)}
    unknown = sorted(c for c in cited if c not in listed)
    if unknown:
        fails.append(f"[6] {doc}가 목록에 없는 ADR을 인용: {', '.join(unknown)}")

print(f"SRS ID {len(srs_ids)}개, 설계 문서 ID {len(design_ids)}개, ADR 목록 {len(listed)}개")
if fails:
    print(f"실패 {len(fails)}건")
    for f in fails:
        print(" -", f)
    sys.exit(1)
print("모든 검사 통과")
