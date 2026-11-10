#!/usr/bin/env bash
# Hermes 검토 실행 + 결과 검사
#
# 사용법:
#   scripts/hermes/review.sh <프롬프트 이름> [영역]
#   예) scripts/hermes/review.sh 2-design C        # Patch·복구 영역만
#       scripts/hermes/review.sh 2-design           # A~F 전부
#
# 하는 일:
#   1. docs/verification/prompts/<이름>.md 를 읽고 {{AREA}} 를 영역으로 바꾼다
#   2. hermes -z 로 실행한다
#   3. 결과 맨 위에 날짜·커밋·브랜치·영역·모델을 붙여 docs/verification/results/ 에 저장한다
#   4. 결과가 오류 메시지(크레딧 부족, 요청 미처리 등)이거나 표가 없으면 실패로 처리한다
#      → 실패한 결과는 results/failed/ 로 옮겨서 "검토한 것처럼" 남지 않게 한다
set -euo pipefail

NAME="${1:?프롬프트 이름이 필요합니다 (예: 2-design)}"
AREA="${2:-}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROMPT_FILE="$ROOT/docs/verification/prompts/$NAME.md"
OUT_DIR="$ROOT/docs/verification/results"
[ -f "$PROMPT_FILE" ] || { echo "프롬프트 파일이 없습니다: $PROMPT_FILE" >&2; exit 2; }
command -v hermes >/dev/null || { echo "hermes 명령이 없습니다 (VERIFICATION_GUIDE 1-4)" >&2; exit 2; }

COMMIT="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
BRANCH="$(git -C "$ROOT" branch --show-current 2>/dev/null || echo unknown)"
DIRTY="$(git -C "$ROOT" status --porcelain 2>/dev/null | grep -q . && echo ' (커밋 안 된 변경 있음)' || true)"
MODEL="${HERMES_MODEL_LABEL:-$(hermes config get model 2>/dev/null | tr '\n' ' ' || echo '확인 필요')}"
STAMP="$(date +%F-%H%M)"
SUFFIX="${AREA:+-$AREA}"
OUT="$OUT_DIR/$STAMP-$NAME$SUFFIX-$COMMIT.md"
mkdir -p "$OUT_DIR" "$OUT_DIR/failed"

PROMPT="$(sed "s/{{AREA}}/${AREA:-A~F 전부}/g" "$PROMPT_FILE")"
RAW="$(mktemp)"
set +e
hermes -z "$PROMPT" >"$RAW" 2>&1
RC=$?
set -e

{
  echo "<!-- hermes review -->"
  echo "| 항목 | 값 |"
  echo "| --- | --- |"
  echo "| 날짜 | $(date '+%F %T %Z') |"
  echo "| 프롬프트 | docs/verification/prompts/$NAME.md |"
  echo "| 영역 | ${AREA:-전부} |"
  echo "| 커밋 | $COMMIT ($BRANCH)$DIRTY |"
  echo "| 모델 | $MODEL |"
  echo "| hermes 종료 코드 | $RC |"
  echo
  cat "$RAW"
} >"$OUT"
rm -f "$RAW"

# ---- 결과 검사: 이런 결과는 "검토"가 아니다 ----
BAD='HTTP 4[0-9][0-9]|HTTP 5[0-9][0-9]|Billing|credits|exhausted|not processed|did not complete|rate limit|Unauthorized|Traceback'
if [ "$RC" -ne 0 ] || grep -Eqi "$BAD" "$OUT" || ! grep -q '^| *# *|' "$OUT"; then
  mv "$OUT" "$OUT_DIR/failed/"
  echo "✗ Hermes 검토 실패 → $OUT_DIR/failed/$(basename "$OUT")" >&2
  echo "  (오류 메시지이거나 반례 표가 없습니다. 모델·크레딧·max_tokens 설정을 확인하세요)" >&2
  exit 1
fi
echo "✓ Hermes 검토 결과 → $OUT"
echo "  다음: 반례 표의 줄마다 사람이 손으로 따라가 보고 '진짜 반례 / 아님(이유)'을 적습니다 (VERIFICATION_GUIDE 2단계)."
