module.exports = {
  apps: [
    {
      name: 'scorewala',
      script: 'powershell.exe',
      args: '-NoProfile -ExecutionPolicy Bypass -Command "npm run start"',
      interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
