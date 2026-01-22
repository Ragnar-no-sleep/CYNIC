/**
 * PM2 Ecosystem Configuration for CYNIC Daemon
 *
 * Usage:
 *   pm2 start scripts/daemon/ecosystem.config.cjs
 *   pm2 stop cynic-cockpit
 *   pm2 restart cynic-cockpit
 *   pm2 logs cynic-cockpit
 *
 * For auto-start on boot:
 *   pm2 startup
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'cynic-cockpit',
      script: './cockpit-daemon.cjs',
      args: 'run',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      env: {
        NODE_ENV: 'production',
        CYNIC_DAEMONIZED: '1',
      },
      // φ-aligned restart delay (6180ms)
      restart_delay: 6180,
      // Log configuration
      error_file: '~/.cynic/daemon/pm2-error.log',
      out_file: '~/.cynic/daemon/pm2-out.log',
      log_file: '~/.cynic/daemon/pm2-combined.log',
      time: true,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
    },
  ],
};
