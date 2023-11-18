
const config = {
  testEnvironment: "miniflare",
  testMatch: ["**/tests/**/(*.)+(spec|test).+(ts|tsx)"],
  transform: {
    "^.+\\.(ts|tsx)$": "esbuild-jest",
  },
};

export default config;
