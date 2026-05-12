module.exports = {
  apps: [{
    name: 'dfe-api',
    script: 'bash',
    args: '-c "npx tsx server.ts"',
    cwd: '/var/www/dfe',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://dfe_user:T9BazyzhFOAHgJHzDQd4mKFN@172.17.0.1:3306/dfe_db',
      JWT_SECRET: 'ea360c2c6481f19a245f2a7b83613441da07eba47174569549fd0efd685cec34',
      JWT_EXPIRES_IN: '24h',
      PORT: '3001'
    }
  }]
};
