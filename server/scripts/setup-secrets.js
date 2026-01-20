#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('Cloudflare Workers Secrets Setup');
  console.log('================================\n');
  console.log(
    'This script will help you set up the required secrets for the notetaker API.'
  );
  console.log(
    'You need to have wrangler installed and authenticated with Cloudflare.\n'
  );

  const clientId = await prompt('Enter your Google OAuth Client ID: ');
  const clientSecret = await prompt('Enter your Google OAuth Client Secret: ');

  if (!clientId || !clientSecret) {
    console.error('Both Client ID and Client Secret are required.');
    process.exit(1);
  }

  console.log('\nSetting up secrets...\n');

  try {
    execSync(`echo "${clientId}" | wrangler secret put GOOGLE_CLIENT_ID`, {
      stdio: 'inherit',
    });
    execSync(
      `echo "${clientSecret}" | wrangler secret put GOOGLE_CLIENT_SECRET`,
      {
        stdio: 'inherit',
      }
    );

    console.log('\nSecrets configured successfully!');
    console.log('\nNext steps:');
    console.log('1. Run `bun run dev` to start the local development server');
    console.log('2. Run `bun run deploy` to deploy to Cloudflare Workers');
  } catch (error) {
    console.error('Failed to set secrets:', error.message);
    process.exit(1);
  }

  rl.close();
}

main();
