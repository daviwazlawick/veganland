module.exports = {
  apps: [
    {
      name: 'veganland-api',
      script: 'src/server.js',
      cwd: '/opt/veganland/server',
      env_file: '/opt/veganland/server/.env',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
