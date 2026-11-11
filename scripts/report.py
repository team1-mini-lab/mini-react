#!/usr/bin/env python3
"""검증 보고서 생성기 — 하네스 루프 한 바퀴 (VERIFICATION_GUIDE 3장).

  python3 scripts/report.py            # 로컬: report/REPORT.md 생성
  python3 scripts/report.py --ci       # CI: + $GITHUB_STEP_SUMMARY, 필수 관문 실패 시 종료 코드 1

보고서의 결론(통과/멈춤)은 이 스크립트만 쓴다. 사람이나 AI가 결론 문장을 직접 쓰지 않는다.
모든 칸은 명령 출력 파일(report/*.txt, *.json)이나 저장소 파일을 근거로 한다.

관문(Gate)
  G1 SRS–SDD 정합성 : check:docs + test:harness 통과, 1-docs AI 검토 결과의 모든 지적에 사람 판정
  G2 SDD 설계 검증  : 2-design 검토 결과(영역 A~F)가 있고 모든 반례에 사람 판정, ADR proposed 0개, 열린 설계 항목 0개
  G3 구현           : typecheck + check:stack + check:arch + lint 통과 (스크립트가 없으면 '미구성' = 통과 아님)
  G2 추가 조건       : 검토자(모델) 2명 이상
  G4 VT 검증        : 테스트 전부 통과, 커버리지·뮤테이션 기준 통과, VT 49개 모두 증거 있음(check:vt), 요구사항 사슬 끊김 0 (check:trace)

필수 관문은 환경변수 REQUIRED_GATES (기본 "G1")로 정한다. 단계가 진행되면 "G1,G2", "G1,G2,G3,G4"로 늘린다.
"""
import glob
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "report")
CI = "--ci" in sys.argv
REQUIRED = [g.strip() for g in os.environ.get("REQUIRED_GATES", "G1").split(",") if g.strip()]
os.makedirs(OUT, exist_ok=True)
PKG = json.load(open(os.path.join(ROOT, "package.json"), encoding="utf-8")).get("scripts", {})


def sh(cmd, name, timeout=600):
    t = time.time()
    try:
        p = subprocess.run(cmd, cwd=ROOT, shell=True, capture_output=True, text=True, timeout=timeout)
        rc, out = p.returncode, p.stdout + p.stderr
    except subprocess.TimeoutExpired:
        rc, out = 124, f"시간 초과 ({timeout}s)"
    open(os.path.join(OUT, name + ".txt"), "w", encoding="utf-8").write(out)
    return {"rc": rc, "out": out, "sec": round(time.time() - t, 1), "log": f"report/{name}.txt"}


def npm(script, name=None, extra="", timeout=600):
    if script not in PKG:
        return {"rc": None, "out": "", "sec": 0, "log": None}
    return sh(f"npm run -s {script} {extra}".strip(), name or script.replace(":", "-"), timeout)


def read(p):
    p = os.path.join(ROOT, p)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def git(cmd):
    try:
        return subprocess.run("git " + cmd, cwd=ROOT, shell=True, capture_output=True, text=True).stdout.strip()
    except Exception:
        return ""


mark = lambda r: "⚪ 미구성" if r["rc"] is None else ("✅ 통과" if r["rc"] == 0 else "❌ 실패")
tail = lambda r, n=8: "\n".join([l for l in r["out"].strip().splitlines() if l.strip()][-n:])

# ---------------- 실행 ----------------
R = {}
R["check_docs"] = npm("check:docs")
R["test_harness"] = npm("test:harness")
R["typecheck"] = npm("typecheck")
R["check_stack"] = npm("check:stack")
R["check_arch"] = npm("check:arch")
R["lint"] = npm("lint")
R["test"] = sh("npx vitest run --reporter=default --reporter=json --outputFile=report/vitest.json", "test")
R["coverage"] = npm("test:coverage")
# 로컬 기기처럼 한 번 실행 시간이 짧으면 파일별로 나눠 돌린 결과를 합친다 (MUTATION_REUSE=1, scripts/merge_mutation.py)
R["mutation"] = sh("python3 scripts/merge_mutation.py", "mutation") if os.environ.get("MUTATION_REUSE") else npm("test:mutation", timeout=2400)  # 뮤테이션은 코드·테스트가 늘수록 오래 걸린다 (CI 약 10~15분)
os.environ["VT_SCRIPT_PASS"] = ",".join(v for v, ok in (("VT-23", R["check_stack"]["rc"] == 0), ("VT-35", R["test"]["rc"] == 0), ("VT-22", R["lint"]["rc"] == 0 and R["check_arch"]["rc"] == 0)) if ok)  # VT-35: jsdom 스위트 통과
R["check_vt"] = sh("python3 scripts/check_vt_tests.py --quiet --results report/vitest.json --json report/vt.json", "check-vt")
R["check_trace"] = sh("python3 scripts/check_trace.py --results report/vitest.json --json report/trace.json", "check-trace")

vt = json.load(open(os.path.join(OUT, "vt.json"), encoding="utf-8")) if os.path.exists(os.path.join(OUT, "vt.json")) else {"rows": [], "count": {}}
tr = json.load(open(os.path.join(OUT, "trace.json"), encoding="utf-8")) if os.path.exists(os.path.join(OUT, "trace.json")) else {"rows": []}
vtest = {}
try:
    vtest = json.load(open(os.path.join(OUT, "vitest.json"), encoding="utf-8"))
except Exception:
    pass

# ---------------- AI 검토와 사람 판정 ----------------
VERDICTS = ("진짜 반례", "기존 한계", "아님", "고침", "문제 아님")


def reviews(prefix):
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, "docs/verification/results", f"*-{prefix}*.md"))):
        if f.endswith(".review.md"):
            continue
        t = read(os.path.relpath(f, ROOT))
        sec = t.split("### 2.")[0] if "### 1." in t else t
        n = len([l for l in sec.splitlines() if re.match(r"^\|\s*\d+\s*\|", l)])
        area = re.search(r"\|\s*영역\s*\|\s*([^|]+)\|", t)
        who = re.search(r"\|\s*(?:모델|검토자)\s*\|\s*([^|]+)\|", t)
        rv = f[:-3] + ".review.md"
        judged = 0
        if os.path.exists(rv):
            for l in open(rv, encoding="utf-8"):
                m = re.match(r"^\|\s*\d+\s*\|\s*([^|]+)\|", l)
                if m and any(v in m.group(1) for v in VERDICTS):
                    judged += 1
        out.append({"file": os.path.relpath(f, ROOT), "findings": n, "judged": min(judged, n),
                    "area": (area.group(1).strip() if area else "?"), "who": (who.group(1).strip()[:40] if who else "?"),
                    "review": os.path.relpath(rv, ROOT) if os.path.exists(rv) else None})
    return out


rev1, rev2 = reviews("1-docs"), reviews("2-design")
failed_runs = len(glob.glob(os.path.join(ROOT, "docs/verification/results/failed/*.md")))

# ADR 상태, 열린 설계 항목
readme = read("docs/adr/README.md")
adr_status = {m.group(1): m.group(2).lower() for m in re.finditer(r"^\|\s*\**ADR-(\d{4})\**\s*\|[^|]*\|\s*\*?([A-Za-z]+)", readme, re.M)}
proposed = sorted(f"ADR-{k}" for k, v in adr_status.items() if v == "proposed")
recheck = sorted(f"ADR-{m}" for m in re.findall(r"^\|\s*\**ADR-(\d{4})\**\s*\|[^|]*\|[^|]*재확인 필요", readme, re.M))


def open_items(doc, start, end):
    t = read(doc)
    i = t.find(start)
    if i < 0:
        return 0
    j = t.find(end, i + 1)
    return len([l for l in t[i:j if j > 0 else None].splitlines() if re.match(r"^\|\s*\d+\s*\|", l) and "해소" not in l])


open1 = open_items("docs/specs/SDD_final_phase1.md", "## 11.", "## 부록 A")
open2 = open_items("docs/specs/SDD_final_phase2.md", "## 7.", "## 부록 A")

# ---------------- 관문 판정 ----------------
def gate(conds):
    return all(conds)

reviewers2 = {re.sub(r"\s.*", "", r["who"]).lower() for r in rev2 if r["who"] != "?"}
areas = {a for r in rev2 for a in re.findall(r"[A-F]", r["area"])} | ({"A", "B", "C", "D", "E", "F"} if any("전부" in r["area"] or "A~F" in r["area"] for r in rev2) else set())
G = {
    "G1": gate([R["check_docs"]["rc"] == 0, R["test_harness"]["rc"] == 0, all(r["judged"] == r["findings"] for r in rev1)]),
    "G2": gate([areas >= set("ABCDEF"), len(reviewers2) >= 2, rev2 and all(r["judged"] == r["findings"] for r in rev2), not proposed, not recheck, open1 + open2 == 0]),
    "G3": gate([R[k]["rc"] == 0 for k in ("typecheck", "check_stack", "check_arch", "lint")]),
    "G4": gate([R["test"]["rc"] == 0, R["coverage"]["rc"] == 0, R["mutation"]["rc"] == 0, vt["rows"] and all(r["status"] == "통과" for r in vt["rows"]),
                tr["rows"] and all(r["ok"] for r in tr["rows"])]),
}
icon = lambda g: "✅ 통과" if G[g] else ("❌ 멈춤 (필수)" if g in REQUIRED else "⏸ 미충족")

# ---------------- 보고서 ----------------
sha = os.environ.get("GITHUB_SHA", git("rev-parse HEAD"))[:7] or "?"
branch = os.environ.get("GITHUB_HEAD_REF") or os.environ.get("GITHUB_REF_NAME") or git("branch --show-current")
dirty = " (커밋 안 된 변경 있음)" if not CI and git("status --porcelain") else ""
L = []
w = L.append
w("<!-- mini-react-verify-report -->")
w("# mini-react 검증 보고서")
w("")
w(f"| 항목 | 값 |\n| --- | --- |\n| 커밋 | `{sha}` ({branch}){dirty} |\n| 생성 | {time.strftime('%Y-%m-%d %H:%M %Z')} · {'GitHub Actions' if CI else '로컬'} |\n| 필수 관문 | {', '.join(REQUIRED)} |")
w("")
w("> 이 보고서는 `scripts/report.py`가 명령 결과로 만든다. 결론 칸을 손으로 고치지 않는다.")
w("")
w("## 0. 이 보고서가 검사한 방법")
w("")
w("| 칸 | 무엇을 어떻게 확인했나 | 근거 파일 |")
w("| --- | --- | --- |")
w("| SRS ↔ SDD | SRS에 정의된 FR·NFR·IR·CON·VT·TBD ID 전부가 SDD 추적표(phase1 9.3, phase2 6.1)에 하나씩 있는지, SRS 4장의 요구사항→VT 연결 62건이 SDD에도 있는지, VT 49개의 테스트 위치가 정해졌는지 | `scripts/check_docs.py` [1]~[3], `report/check-docs.txt` |")
w("| ADR ↔ SDD | ADR·피드백 문서 Confirmation 표의 테스트 ID 전부(T·S·D·P·R·TA·H·U·HL·TV·C·B·K·HR·TD)가 SDD에 있는지, ADR 상태가 README와 파일에서 같은지, superseded ADR(0013·0014)을 근거로 쓰지 않는지, 인용한 ADR 절이 실제로 있는지 | `check_docs.py` [4]·[5]·[7] |")
w("| 하네스 자체 | 문서·코드를 일부러 12가지로 망가뜨려 하네스가 모두 실패로 잡는지 | `scripts/selftest_harness.py`, `report/test-harness.txt` |")
w("| 설계 타당성 | AI 검토(반례 찾기) 결과 파일의 반례 줄 수와, 옆의 `*.review.md`에 사람이 적은 판정 수를 센다. 판정 내용 자체는 사람이 확인한다 | `docs/verification/results/` |")
w("| SDD ↔ 코드 | SDD 부록 A의 함수 이름이 적힌 파일에 실제로 정의돼 있는지, 부록 A에 없는 export가 있는지 | `scripts/check_trace.py`, `report/check-trace.txt` |")
w("| 코드 ↔ VT | 테스트 이름의 `[VT-xx]`, 그 테스트 파일이 import 하는 src 파일, vitest 결과(통과·실패)를 요구사항마다 이어 본다 | `check_trace.py`, `report/vitest.json` |")
w("| CON-01 | `package.json`·`src`·`tests`·`index.html`·`tsconfig.json`에 React·JSX 흔적이 있는지 | `scripts/check_stack.py` |")
w("")
w("## 관문 요약")
w("")
w("| 관문 | 판정 | 무엇으로 판정했나 |")
w("| --- | --- | --- |")
w(f"| G1 SRS–SDD 정합성 | {icon('G1')} | check:docs {mark(R['check_docs'])}, test:harness {mark(R['test_harness'])}, AI 지적 판정 {sum(r['judged'] for r in rev1)}/{sum(r['findings'] for r in rev1)} |")
w(f"| G2 SDD 설계 검증 | {icon('G2')} | 검토 영역 {''.join(sorted(areas)) or '없음'}/ABCDEF, 검토자 {len(reviewers2)}명/2명 이상, 반례 판정 {sum(r['judged'] for r in rev2)}/{sum(r['findings'] for r in rev2)}, ADR proposed {len(proposed)}개·재확인 필요 {len(recheck)}개, 열린 설계 항목 {open1 + open2}개 |")
w(f"| G3 구현 | {icon('G3')} | typecheck {mark(R['typecheck'])}, check:stack {mark(R['check_stack'])}, check:arch {mark(R['check_arch'])}, lint {mark(R['lint'])} |")
cnt = vt.get("count", {})
w(f"| G4 VT 검증 | {icon('G4')} | 커버리지 {mark(R['coverage'])}, 뮤테이션 {mark(R['mutation'])}, 테스트 {mark(R['test'])} ({vtest.get('numPassedTests', '?')}/{vtest.get('numTotalTests', '?')}), VT 증거 {cnt.get('통과', 0)}/{len(vt['rows'])}, 요구사항 사슬 {sum(r['ok'] for r in tr['rows'])}/{len(tr['rows'])} |")
w("")
w("## 1. 하네스 실행 결과")
w("")
w("| 명령 | 결과 | 시간 | 로그 |")
w("| --- | --- | --- | --- |")
for k, label in (("check_docs", "check:docs"), ("test_harness", "test:harness"), ("typecheck", "typecheck"), ("check_stack", "check:stack"),
                 ("check_arch", "check:arch"), ("lint", "lint"), ("test", "vitest"), ("coverage", "test:coverage"), ("mutation", "test:mutation"),
                 ("check_vt", "check:vt"), ("check_trace", "check:trace")):
    r = R[k]
    w(f"| `{label}` | {mark(r)} | {r['sec']}s | {r['log'] or '스크립트 없음'} |")
for k in ("check_docs", "check_stack"):
    if R[k]["rc"]:
        w(f"\n<details><summary>{k} 실패 내용 (끝부분)</summary>\n\n```\n{tail(R[k], 20)}\n```\n</details>")
w("")
w("## 2. 설계 검토 (AI + 사람 판정)")
w("")
w("| 결과 파일 | 검토자 | 영역 | 지적 | 사람 판정 |")
w("| --- | --- | --- | --- | --- |")
for r in rev1 + rev2:
    w(f"| `{r['file'].split('/')[-1]}` | {r['who']} | {r['area']} | {r['findings']} | {r['judged']}/{r['findings']}{'' if r['review'] else ' (판정 파일 없음)'} |")
if not rev1 + rev2:
    w("| (없음) | | | | |")
w(f"\n- 실패한 AI 실행(`results/failed/`): {failed_runs}건 — 검토로 세지 않는다")
w(f"- ADR proposed: {', '.join(proposed) or '없음'} / 재확인 필요: {', '.join(recheck) or '없음'}")
w(f"- 열린 설계 항목: Phase 1 {open1}개 (SDD 11장), Phase 2 {open2}개 (Phase 2 문서 7장)")
w("")
w("## 3. 정합성 사슬 (SRS → ADR → SDD → 코드 → VT)")
w("")
w("✓ 이어짐 · ✗ 끊김 · △ ADR 승인 대기 또는 설계 칸에 함수 이름 없음 · — 해당 없음 · 검사 ✓ = 하네스 스크립트(check:stack·lint·check:arch·jsdom 실행)가 통과 · 수동 ✓ = 브라우저 체크리스트에서 확인 · 수동 = 아직 확인 안 된 수동·검토 VT · ? 결과 미확인")
w("")
w("| 요구사항 | ADR | 설계 | 코드 | 테스트 | 연결 | 결과 | 끊긴 곳 | 근거 ADR · 함수 · 테스트 |")
w("| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
for r in tr["rows"]:
    s = r["status"]
    det = "; ".join(filter(None, [", ".join(r.get("adrs", [])), ", ".join(r["funcs"]), ", ".join(t.split("/")[-1] for t in r["tests"])]))
    w(f"| {r['req']} | {s.get('ADR', '—')} | {s['설계']} | {s['코드']} | {s['테스트']} | {s['연결']} | {s['결과']} | {r.get('why', '')} | {det} |")
w("")
w("## 4. VT 49개 증거")
w("")
w("| VT | 요구사항 | 증거 종류 | 상태 | 근거 |")
w("| --- | --- | --- | --- | --- |")
for r in vt["rows"]:
    w(f"| {r['vt']} | {r['req']} | {r['kind']} | {r['status']} | {r['evidence']} |")
w("")
w("## 5. 다음에 할 일 (자동 추출)")
w("")
todo = []
if R["check_docs"]["rc"]:
    todo.append("check:docs 실패 항목 고치기 (report/check-docs.txt)")
if sum(r["findings"] - r["judged"] for r in rev1 + rev2):
    todo.append(f"AI 검토 지적 {sum(r['findings'] - r['judged'] for r in rev1 + rev2)}건 사람 판정 (`*.review.md`)")
if len(reviewers2) < 2:
    todo.append(f"설계 검토자 2명(서로 다른 모델) 필요 — 지금 {len(reviewers2)}명")
if set("ABCDEF") - areas:
    todo.append(f"설계 검토 영역 {''.join(sorted(set('ABCDEF') - areas))} 실행")
if proposed or recheck:
    todo.append("팀 회의: ADR " + ", ".join(proposed + recheck) + " 승인·재확인")
if open1 + open2:
    todo.append(f"열린 설계 항목 {open1 + open2}개 결정")
if R["check_stack"]["rc"]:
    todo.append("React·JSX 제거 (check:stack)")
for k in ("check_arch", "lint"):
    if R[k]["rc"] is None:
        todo.append(f"`{k.replace('_', ':')}` 스크립트 구성")
broken = [r["req"] for r in tr["rows"] if not r["ok"]]
if broken:
    todo.append(f"요구사항 사슬 끊김 {len(broken)}개: {', '.join(broken[:12])}{' …' if len(broken) > 12 else ''}")
for t in todo:
    w(f"- [ ] {t}")
md = "\n".join(L) + "\n"
open(os.path.join(OUT, "REPORT.md"), "w", encoding="utf-8").write(md)
json.dump({"sha": sha, "gates": G, "required": REQUIRED, "todo": todo}, open(os.path.join(OUT, "summary.json"), "w"), ensure_ascii=False, indent=1)

if CI and os.environ.get("GITHUB_STEP_SUMMARY"):
    open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8").write(md)
print(md.split("## 1.")[0])
print("전체 보고서: report/REPORT.md")
bad = [g for g in REQUIRED if not G.get(g)]
if bad:
    print("필수 관문 미통과:", ", ".join(bad))
    sys.exit(1)
