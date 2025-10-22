#!/usr/bin/env node
(async () => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
  const TRIMMED_COMMIT_HASH = process.env.TRIMMED_COMMIT_HASH;
  const LATEST_TAG = process.env.LATEST_TAG;

  console.log('GITHUB_TOKEN', GITHUB_TOKEN);
  console.log('GITHUB_REPOSITORY', GITHUB_REPOSITORY);
  console.log('TRIMMED_COMMIT_HASH', TRIMMED_COMMIT_HASH);
  console.log('LATEST_TAG', LATEST_TAG);

  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !TRIMMED_COMMIT_HASH) {
    process.exit(1);
  }

  const payload = {
    tag_name: TRIMMED_COMMIT_HASH,
    target_commitish: TRIMMED_COMMIT_HASH,
  };

  if (LATEST_TAG && LATEST_TAG.trim() !== '') {
    payload.previous_tag_name = LATEST_TAG;
  }

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/generate-notes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `GitHub release note generation failed with status ${response.status}`
    );
    console.error(errorText);
    process.exit(1);
  }

  const data = await response.json();
  const body = data.body || '';

  const { writeFileSync } = require('fs');

  writeFileSync('pr_body_raw.txt', body);

  const processed = body
    .split('\n')
    .map((line) => {
      const m = line.match(/\* .* in (https:\/\/github\.com\/[^ )]+)/);
      return m ? `* ${m[1]}` : line;
    })
    .join('\n');

  writeFileSync('pr_body_processed.txt', processed);

  const final = [
    '## デプロイ手順書',
    '',
    '- <https://github.com>',
    '',
    processed,
  ].join('\n');

  writeFileSync('pr_body.txt', final);
})();
