#!/usr/bin/env python3
"""하네스 자체 점검: 문서를 일부러 망가뜨려서 check_docs.py / check_stack.py가 실제로 실패하는지 확인한다.

사용법: python3 scripts/selftest_harness.py
각 변형(mutation)마다 "잡힘/놓침"을 출력하고, 하나라도 놓치면 종료 코드 1.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COPY = ["docs", "scripts", "package.json", "tsconfig.json", "src", "tests"]


def run(tmp, script):
    r = subprocess.run([sys.executable, os.path.join(tmp, "scripts", script)], cwd=tmp,
                       capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


def mutate(tmp, rel, old, new, regex=False):
    p = os.path.join(tmp, rel)
    s = open(p, encoding="utf-8").read()
    s2 = re.sub(old, new, s, count=1, flags=re.M) if regex else s.replace(old, new, 1)
    assert s2 != s, f"변형이 적용되지 않음: {rel} {old[:40]}"
    open(p, "w", encoding="utf-8").write(s2)


def add_file(tmp, rel, text):
    p = os.path.join(tmp, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8").write(text)


CASES = [
    # (이름, 검사 스크립트, 변형 함수)
    ("[1] 설계 추적표에서 FR-09 행 삭제", "check_docs.py",
     lambda t: mutate(t, "docs/specs/SDD_final_phase1.md", r"^\| FR-09 \|.*\n", "", regex=True)),
    ("[1] 설계 추적표에 없는 ID(FR-99) 추가", "check_docs.py",
     lambda t: mutate(t, "docs/specs/SDD_final_phase1.md", "| FR-09 |", "| FR-99 | 오타 | — | — | VT-36 |\n| FR-09 |")),
    ("[2] FR-07 행에서 VT-47 연결 삭제", "check_docs.py",
     lambda t: mutate(t, "docs/specs/SDD_final_phase1.md", "VT-29, VT-45, VT-47 |", "VT-29, VT-45 |")),
    ("[3] 테스트 위치 표에서 VT-19 삭제", "check_docs.py",
     lambda t: mutate(t, "docs/specs/SDD_final_phase2.md", "| `tests/unit/scheduler.test.ts` | VT-19 |", "| `tests/unit/scheduler.test.ts` | — |")),
    ("[4] ADR-0005에 새 Confirmation 테스트 P13 추가 (설계 미반영)", "check_docs.py",
     lambda t: mutate(t, "docs/adr/ADR-0005-patch.md", "| R1 |", "| P13 | 새 시나리오 | 기대 | — |\n| R1 |")),
    ("[5] SRS IR-06이 superseded ADR-0013을 근거로 인용", "check_docs.py",
     lambda t: mutate(t, "docs/SRS_fixed.md", "(ADR-0005 6절 t3). 오류는", "(ADR-0013). 오류는")),
    ("[5] ADR-0009 파일 status를 proposed로 바꿈 (README는 Accepted)", "check_docs.py",
     lambda t: mutate(t, "docs/adr/ADR-0009-batching.md", r"^status: accepted", "status: proposed", regex=True)),
    ("[6] 설계 본문에 PatchError 재등장", "check_docs.py",
     lambda t: mutate(t, "docs/specs/SDD_final_phase1.md", "### 5.2 Patch 실패 복구 프로토콜", "실패하면 `PatchError`를 던진다.\n\n### 5.2 Patch 실패 복구 프로토콜")),
    ("[7] SDD가 ADR-0005의 없는 절(9절)을 인용", "check_docs.py",
     lambda t: mutate(t, "docs/specs/SDD_final_phase1.md", "### 5.2 Patch 실패 복구 프로토콜", "근거는 ADR-0005 9절이다.\n\n### 5.2 Patch 실패 복구 프로토콜")),
    ("[stack] package.json에 react 의존 추가", "check_stack.py",
     lambda t: mutate(t, "package.json", '"dependencies": {', '"dependencies": {\n    "react": "^19.0.0",')),
    ("[stack] src에 .tsx 파일 추가", "check_stack.py",
     lambda t: add_file(t, "src/pages/phase1/App.tsx", "export const A = 1;\n")),
    ("[stack] src에서 react import", "check_stack.py",
     lambda t: add_file(t, "src/pages/phase1/bad.ts", "import { useState } from 'react';\n")),
]


def main():
    missed = 0
    with tempfile.TemporaryDirectory() as base:
        # 원본 상태는 통과해야 한다
        clean = os.path.join(base, "clean")
        for c in COPY:
            src = os.path.join(ROOT, c)
            if os.path.isdir(src):
                shutil.copytree(src, os.path.join(clean, c), ignore=shutil.ignore_patterns("node_modules"))
            elif os.path.exists(src):
                shutil.copy(src, os.path.join(clean, c))
        base_rc = {s: run(clean, s)[0] for s in ("check_docs.py", "check_stack.py")}
        print(f"원본: check_docs={'통과' if base_rc['check_docs.py'] == 0 else '실패'}, "
              f"check_stack={'통과' if base_rc['check_stack.py'] == 0 else '실패'}")
        # check_stack 변형은 "깨끗한 가짜 프로젝트"에서 시험한다 (원본이 아직 React를 쓰고 있어도 검사기를 점검할 수 있게)
        fake = os.path.join(base, "fake")
        shutil.copytree(os.path.join(clean, "scripts"), os.path.join(fake, "scripts"))
        add_file(fake, "package.json", '{\n  "name": "mini-react",\n  "dependencies": {\n    "vite": "^8.0.0"\n  }\n}\n')
        add_file(fake, "tsconfig.json", '{ "compilerOptions": { "strict": true } }\n')
        add_file(fake, "src/core/vnode.ts", "export const x = 1;\n")
        add_file(fake, "tests/a.test.ts", "export {};\n")
        rc_fake, out_fake = run(fake, "check_stack.py")
        print(f"가짜 깨끗한 프로젝트: check_stack={'통과' if rc_fake == 0 else '실패'}")
        if rc_fake != 0:
            print(out_fake)
            missed += 1
        for i, (name, script, fn) in enumerate(CASES):
            src_dir = fake if script == "check_stack.py" else clean
            if script == "check_docs.py" and base_rc[script] != 0:
                print(f"  - 건너뜀 (원본이 이미 실패): {name}")
                continue
            tmp = os.path.join(base, f"m{i}")
            shutil.copytree(src_dir, tmp)
            fn(tmp)
            rc, _ = run(tmp, script)
            ok = rc != 0
            missed += not ok
            print(f"  {'✓ 잡힘' if ok else '✗ 놓침'}  {name}")
    print("\n하네스 자체 점검", "통과" if missed == 0 else f"실패 (놓친 변형 {missed}개)")
    sys.exit(1 if missed else 0)


if __name__ == "__main__":
    main()
