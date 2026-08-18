// Configuration PM2 pour OptiProspect (API + front servi par Express).
// Usage : npm install -g pm2 && pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'optiprospect',
      cwd: './server',
      script: 'index.js',
      node_args: '--disable-warning=ExperimentalWarning --env-file-if-exists=.env',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
