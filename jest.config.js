/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts", "**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  transformIgnorePatterns: ["/node_modules/"], // 기본값
};
