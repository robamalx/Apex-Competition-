import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const sanitizedArgs = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--host') {
    sanitizedArgs.push('-H');
    if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
      sanitizedArgs.push(args[i + 1]);
      i++;
    } else {
      sanitizedArgs.push('0.0.0.0');
    }
  } else if (arg.startsWith('--host=')) {
    sanitizedArgs.push('-H');
    sanitizedArgs.push(arg.split('=')[1] || '0.0.0.0');
  } else {
    sanitizedArgs.push(arg);
  }
}

if (!sanitizedArgs.includes('-H') && !sanitizedArgs.includes('--hostname')) {
  sanitizedArgs.push('-H', '0.0.0.0');
}
if (!sanitizedArgs.includes('-p') && !sanitizedArgs.includes('--port')) {
  sanitizedArgs.push('-p', '3000');
}

console.log('Starting Next.js dev server with args:', sanitizedArgs);

const child = spawn('npx', ['next', 'dev', ...sanitizedArgs], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
