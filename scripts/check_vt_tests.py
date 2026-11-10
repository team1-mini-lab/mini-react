#!/usr/bin/env python3
import os
import re
import sys

def main():
    print("🔍 [check_vt_tests] VT 검증 테스트 스위트 확인 중...")
    test_dir = "tests"
    if not os.path.exists(test_dir):
        print(f"⚠️ {test_dir} 디렉토리가 없습니다.")
        sys.exit(0)

    found_vts = set()
    for root, _, files in os.walk(test_dir):
        for file in files:
            if file.endswith(".test.ts"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    matches = re.findall(r"\[(VT-\d+)\]", content)
                    for m in matches:
                        found_vts.add(m)

    print(f"📊 발견된 VT 테스트 케이스: {len(found_vts)}개")
    for vt in sorted(found_vts):
        print(f"  - {vt}")
    print("✅ check_vt 완료")

if __name__ == "__main__":
    main()
