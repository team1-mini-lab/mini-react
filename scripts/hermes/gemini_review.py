#!/usr/bin/env python3
"""Gemini API를 직접 한 번 불러서 문서 검토를 받는다 (Hermes 대신, 무료 등급용).

왜 필요한가
  Hermes는 파일을 하나씩 읽으며 요청을 여러 번(3~10회) 보낸다. Google 무료 등급은
  모델에 따라 분당 5~10회라서 한 영역도 끝나기 전에 HTTP 429로 멈춘다.
  이 스크립트는 필요한 문서를 미리 모아 **요청 한 번**으로 보낸다.

사용법
  python3 scripts/hermes/gemini_review.py 2-design A      # 설계 검토 영역 A
  python3 scripts/hermes/gemini_review.py 1-docs          # SRS↔ADR↔SDD 내용 정합성
  환경변수: GOOGLE_API_KEY (없으면 ~/.hermes/.env에서 읽음), GEMINI_MODEL (기본 gemini-3-flash-preview)

결과는 review.sh와 같은 형식으로 docs/verification/results/ 에 저장되고,
오류이거나 지적 표가 없으면 results/failed/ 로 간다. 키는 결과 파일에 쓰지 않는다.
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NAME = sys.argv[1] if len(sys.argv) > 1 else sys.exit("사용법: gemini_review.py <1-docs|2-design> [영역]")
AREA = sys.argv[2] if len(sys.argv) > 2 else ""
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")

P1, P2, CM, SRS = "docs/specs/SDD_final_phase1.md", "docs/specs/SDD_final_phase2.md", "docs/specs/SDD_final_common.md", "docs/SRS_fixed.md"
def ADR(*ns):
    names = sorted(os.listdir(os.path.join(ROOT, "docs/adr")))
    return ["docs/adr/" + f for n in ns for f in names if re.match(rf"(?i)adr[-_]{n:04d}", f)]
FB = lambda *ns: [f"docs/reviews/{f}" for n in ns for f in sorted(os.listdir(os.path.join(ROOT, "docs/reviews"))) if f.startswith(f"feedback-{n:02d}")]

FILES = {
    ("2-design", "A"): [P1, SRS] + ADR(1, 2, 3, 6, 16, 18),
    ("2-design", "B"): [P1, SRS] + ADR(4, 5),
    ("2-design", "C"): [P1, SRS] + ADR(4, 5, 17),
    ("2-design", "D"): [P1, SRS] + ADR(6, 8, 19) + FB(1, 2),
    ("2-design", "E"): [P2, P1, SRS] + ADR(1, 10, 15) + FB(3, 4, 6),
    ("2-design", "F"): [P2, SRS] + ADR(9, 10) + FB(5),
    ("1-docs", ""): [SRS, P1, CM, "docs/adr/README.md"] + ADR(1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 16, 17, 18, 19),
}
files = FILES.get((NAME, AREA)) or sys.exit(f"알 수 없는 조합: {NAME} {AREA}")


def key():
    k = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if k:
        return k
    p = os.path.expanduser("~/.hermes/.env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            m = re.match(r"\s*(?:GOOGLE_API_KEY|GEMINI_API_KEY)\s*=\s*['\"]?([^'\"\s]+)", line)
            if m:
                return m.group(1)
    sys.exit("GOOGLE_API_KEY가 없습니다 (~/.hermes/.env 또는 환경변수)")


prompt = open(os.path.join(ROOT, f"docs/verification/prompts/{NAME}.md"), encoding="utf-8").read()
prompt = prompt.replace("{{AREA}}", AREA or "A~F 전부")
docs = "\n\n".join(f"<<<FILE {f}>>>\n{open(os.path.join(ROOT, f), encoding='utf-8').read()}\n<<<END {f}>>>" for f in files)
text = (prompt + "\n\n---\n아래는 저장소 파일 원문이다. 파일을 직접 열 수 없으니 이 원문만 근거로 쓴다. "
        "근거를 적을 때는 파일 이름과 절 번호를 쓴다.\n\n" + docs)

body = json.dumps({"contents": [{"role": "user", "parts": [{"text": text}]}],
                   "generationConfig": {"temperature": 0.2, "maxOutputTokens": 16384}}).encode()
url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
answer, err = None, None
for attempt in range(4):
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "x-goog-api-key": key()})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.load(r)
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        answer = "".join(p.get("text", "") for p in parts) or json.dumps(data, ensure_ascii=False)[:2000]
        break
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")
        err = f"HTTP {e.code}: {msg[:1500]}"
        wait = re.search(r"retry in ([\d.]+)s", msg) or re.search(r'"retryDelay":\s*"(\d+)s"', msg)
        if e.code == 429 and attempt < 3:
            sec = float(wait.group(1)) + 2 if wait else 65
            print(f"  분당 한도(429) — {sec:.0f}초 기다렸다 다시 보냅니다 ({attempt + 1}/3)")
            time.sleep(sec)
            continue
        break
    except Exception as e:  # 네트워크 등
        err = f"{type(e).__name__}: {e}"
        break

git = lambda c: subprocess.run("git " + c, cwd=ROOT, shell=True, capture_output=True, text=True).stdout.strip()
sha = git("rev-parse --short HEAD") or "unknown"
dirty = " (커밋 안 된 변경 있음)" if git("status --porcelain") else ""
stamp = time.strftime("%Y-%m-%d-%H%M")
fname = f"{stamp}-{NAME}{'-' + AREA if AREA else ''}-{sha}-gemini.md"
head = (f"<!-- gemini direct review -->\n| 항목 | 값 |\n| --- | --- |\n| 날짜 | {time.strftime('%Y-%m-%d %H:%M:%S %Z')} |\n"
        f"| 프롬프트 | docs/verification/prompts/{NAME}.md |\n| 영역 | {AREA or '—'} |\n| 커밋 | {sha}{dirty} |\n"
        f"| 검토자 | Gemini ({MODEL}, API 직접 호출 1회) |\n| 읽은 파일 | {', '.join(files)} |\n\n")
out = head + (answer if answer else f"오류: {err}")
ok = answer is not None and re.search(r"^\|\s*#\s*\|", answer, re.M) and not re.search(r"HTTP 4\d\d|RESOURCE_EXHAUSTED", answer)
d = os.path.join(ROOT, "docs/verification/results", "" if ok else "failed")
os.makedirs(d, exist_ok=True)
open(os.path.join(d, fname), "w", encoding="utf-8").write(out)
print(("✓ 검토 결과 → " if ok else "✗ 검토 실패 → ") + os.path.relpath(os.path.join(d, fname), ROOT))
if not ok:
    print("  ", (err or "지적 표가 없음")[:300])
    sys.exit(1)
