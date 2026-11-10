#!/usr/bin/env python3
"""뮤테이션 결과 합치기 (SDD_final_common 3장 G4).

Stryker를 파일별로 나눠 돌린 결과(report/mut/*.json)를 하나로 합쳐 report/mutation.json과 점수를 만든다.
CI에서는 `npm run test:mutation`(stryker run 한 번)이 report/mutation.json을 바로 만든다.
  python3 scripts/merge_mutation.py            # 합치고 점수 출력, 70% 미만이면 종료 코드 1
"""
import collections, glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BREAK = 70.0
parts = sorted(glob.glob(os.path.join(ROOT, "report", "mut", "*.json")))
merged = {"schemaVersion": "1", "thresholds": {"high": 85, "low": 70, "break": BREAK}, "files": {}}
for p in parts:
    merged["files"].update(json.load(open(p, encoding="utf-8"))["files"])  # 같은 파일은 나중 실행(최신 테스트)이 이긴다
if not parts:
    single = os.path.join(ROOT, "report", "mutation.json")
    if not os.path.exists(single):
        print("뮤테이션 결과 없음"); sys.exit(2)
    merged = json.load(open(single, encoding="utf-8"))

per = {}
tot = collections.Counter()
for path, fd in sorted(merged["files"].items()):
    c = collections.Counter(m["status"] for m in fd["mutants"])
    tot += c
    k = c["Killed"] + c["Timeout"]
    d = k + c["Survived"] + c["NoCoverage"]
    per[path] = round(100 * k / d, 1) if d else 100.0
k = tot["Killed"] + tot["Timeout"]
den = k + tot["Survived"] + tot["NoCoverage"]
score = round(100 * k / den, 1) if den else 100.0
if parts:
    json.dump(merged, open(os.path.join(ROOT, "report", "mutation.json"), "w", encoding="utf-8"))
print(f"뮤테이션 점수 {score}% (죽임 {tot['Killed']}, 시간초과 {tot['Timeout']}, 살아남음 {tot['Survived']}, 테스트 없음 {tot['NoCoverage']}) / 기준 {BREAK}%")
for path, s in per.items():
    print(f"  {s:5.1f}%  {path}")
sys.exit(0 if score >= BREAK else 1)
