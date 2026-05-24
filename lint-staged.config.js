// Windows has an 8191-char command-line limit. Passing 100+ file paths to prettier
// in a single invocation exceeds it. This config chunks staged files into batches
// of 25 so each prettier / eslint call stays well within the limit.

const CHUNK = 25;

function chunks(files, cmd) {
  const result = [];
  for (let i = 0; i < files.length; i += CHUNK) {
    const batch = files.slice(i, i + CHUNK).join(' ');
    result.push(`${cmd} ${batch}`);
  }
  return result;
}

/** @type {import('lint-staged').Config} */
module.exports = {
  '*.{ts,tsx,js,mjs,cjs}': (files) => [
    ...chunks(files, 'prettier --write'),
    ...chunks(files, 'eslint --fix --max-warnings=0 --no-warn-ignored'),
  ],
  '*.{json,md,yml,yaml}': (files) => chunks(files, 'prettier --write'),
};
