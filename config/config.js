var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'history-backend'
    },
    port: 3000,
    db: 'mongodb://localhost/history-backend-development'
  },

  test: {
    root: rootPath,
    app: {
      name: 'history-backend'
    },
    port: 3000,
    db: 'mongodb://localhost/history-backend-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'history-backend'
    },
    port: 8080,
    db: 'mongodb://'+process.env.MONGO_PORT_27017_TCP_ADDR+':'+process.env.MONGO_PORT_27017_TCP_PORT
  }
};

module.exports = config[env];
