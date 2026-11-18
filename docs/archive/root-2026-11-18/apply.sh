#!/bin/bash
# mini-react 문서 v0.5 적용 스크립트. 저장소 루트에서 실행한다.
set -euo pipefail
PKG="$(cd "$(dirname "$0")" && pwd)"

[ -d .git ] && [ -d docs/adr ] || { echo "저장소 루트(mini-react)에서 실행하세요."; exit 1; }
[ -f docs/adr/adr_002_history_branch_policy.md ] || { echo "eungi 기준 브랜치가 아닙니다. 'git switch -c docs/sdd-v0.5 origin/eungi' 후 다시 실행하세요."; exit 1; }

echo "1) SRS·SDD 복사"
cp "$PKG/docs/SRS_fixed.md" docs/SRS_fixed.md
cp "$PKG/docs/SDD.md" docs/SDD.md
cp "$PKG/docs/SDD_fixed_phase2.md" docs/SDD_fixed_phase2.md

echo "2) ADR 번호 바꾸기 (git mv로 이력 유지)"
git mv docs/adr/adr_001_first_language.md              docs/adr/adr_0007_language.md
git mv docs/adr/adr_006_batching.md                    docs/adr/adr_0009_batching.md
git mv docs/adr/adr_007_hook_rule_enforcement.md       docs/adr/adr_0010_hook_rules.md
git mv docs/adr/adr_008_test_harness.md                docs/adr/adr_0011_test_harness.md
git mv docs/adr/adr_009_design_verification_harness.md docs/adr/adr_0012_design_harness.md
perl -pi -e 's/^# ADR-0001:/# ADR-0007:/' docs/adr/adr_0007_language.md
perl -pi -e 's/^# ADR-0006:/# ADR-0009:/' docs/adr/adr_0009_batching.md
perl -pi -e 's/^# ADR-0007:/# ADR-0010:/' docs/adr/adr_0010_hook_rules.md
perl -pi -e 's/^# ADR-0008:/# ADR-0011:/; s/\(ADR-0001\)/(ADR-0007)/' docs/adr/adr_0011_test_harness.md
perl -pi -e 's/^# ADR-0009:/# ADR-0012:/' docs/adr/adr_0012_design_harness.md

echo "3) History ADR 교체, 복구 ADR 추가, README 합치기"
git rm -q docs/adr/adr_002_history_branch_policy.md
cp "$PKG/docs/adr/adr_0008_history_policy.md" docs/adr/
cp "$PKG/docs/adr/adr_0013_patch_preflight.md" docs/adr/
cp "$PKG/docs/adr/adr_0014_input_sanitize.md" docs/adr/
cp "$PKG/docs/adr/README.md" docs/adr/README.md
[ -f docs/adr/adr_README.md ] && git rm -q docs/adr/adr_README.md

echo "4) 정합성 검사 스크립트"
mkdir -p scripts
cp "$PKG/scripts/check_docs.py" scripts/check_docs.py

git add docs scripts
echo "5) 정합성 검사 실행"
python3 scripts/check_docs.py docs/SRS_fixed.md docs/SDD.md docs/SDD_fixed_phase2.md docs/adr/README.md
echo
git status --short
echo
echo "완료. 확인 후 커밋하세요."
