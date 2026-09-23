/**
 * PM2 production config. Secrets are NOT stored here:
 *  - the API reads apps/api/.env (via Node's --env-file)
 *  - the web app reads apps/web/.env (Next.js loads it)
 * Usage: pm2 start ecosystem.config.js && pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'csbms-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      node_args: '--env-file=.env',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '700M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'csbms-web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
