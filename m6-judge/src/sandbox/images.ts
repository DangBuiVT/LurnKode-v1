/** Pinned, prebuilt runner images (built by docker-compose / CI). */
export const IMAGES = {
  python: "m6-python-runner:local",
  cpp: "m6-cpp-runner:local",
} as const;
