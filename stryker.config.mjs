// 뮤테이션 테스트 (SDD_final_common 3장 G4). core·component의 코드를 일부러 바꿔 테스트가 잡는지 본다.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
// 기기 한 번 실행 시간이 짧은 환경에서는 MUT_FILES·MUT_NAME으로 파일을 나눠 돌린 뒤 scripts/merge_mutation.py로 합친다.
const files = process.env.MUT_FILES?.split(',');
const name = process.env.MUT_NAME ?? 'mutation';

export default {
  testRunner: 'vitest',
  mutate: files ?? ['src/core/**/*.ts', 'src/component/**/*.ts', '!src/core/errors.ts', '!src/component/errors.ts'],
  coverageAnalysis: 'perTest',
  reporters: process.env.MUT_FILES ? ['clear-text', 'json'] : ['clear-text', 'progress', 'json', 'html'],
  jsonReporter: { fileName: `report/${name}.json` },
  htmlReporter: { fileName: 'report/mutation.html' },
  thresholds: { high: 85, low: 70, break: 70 },
  concurrency: 4,
  timeoutMS: 10000,
  tempDirName: `.stryker-tmp/${name}`,
  cleanTempDir: true,
};
