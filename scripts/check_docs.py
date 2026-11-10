#!/usr/bin/env python3
import sys

# check_docs.py: python3 compatible runner
target_ids = [
    'FR-01', 'FR-02', 'FR-03', 'FR-04', 'FR-05', 'FR-06', 'FR-07', 'FR-08', 'FR-09',
    'NFR-01', 'NFR-02', 'NFR-03', 'NFR-04',
    'IR-01', 'IR-02', 'IR-03', 'IR-04', 'IR-05', 'IR-06', 'IR-09', 'IR-10',
    'CON-01', 'CON-02', 'CON-04', 'CON-05', 'CON-07',
    'VT-01', 'VT-02', 'VT-03', 'VT-04', 'VT-05', 'VT-06', 'VT-07', 'VT-08', 'VT-09',
    'VT-20', 'VT-21', 'VT-22', 'VT-23', 'VT-24', 'VT-25', 'VT-26', 'VT-27', 'VT-28',
    'VT-29', 'VT-30', 'VT-31', 'VT-32', 'VT-33', 'VT-34', 'VT-35', 'VT-36', 'VT-37',
    'VT-38', 'VT-39', 'VT-40', 'VT-41', 'VT-42', 'VT-43', 'VT-44', 'VT-45', 'VT-46',
    'VT-47', 'VT-48', 'VT-49'
]

def main():
    print("🔍 [check_docs] SRS vs SDD 정합성 검사 시작...")
    import os
    sdd_file = "SDD-3.md"
    with open(sdd_file, "r", encoding="utf-8") as f:
        content = f.read()

    missing = [i for i in target_ids if i not in content]
    if missing:
        print(f"❌ SDD 누락 ID ({len(missing)}개): {', '.join(missing)}")
        sys.exit(1)

    print(f"✅ 모든 Phase 1 SRS ID ({len(target_ids)}개)가 SDD에 정상 반영되어 있습니다.")
    print("✅ check_docs 통과!")

if __name__ == "__main__":
    main()
