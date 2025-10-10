module.exports = {
  apps: [{
    name: 'immigration-portal',
    script: './start-server.sh', // Use startup script with explicit memory limit
    instances: 1, // Changed from 2 to 1 for easier debugging
    exec_mode: 'fork', // Changed from cluster to fork for easier debugging
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    interpreter: 'bash', // Use bash to run the script
    env_file: './.env',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Add some debugging options
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
