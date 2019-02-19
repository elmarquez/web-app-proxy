module.exports = {
  API: "http://localhost:8081/api",
  DATABASE: {
    URL: 'mongodb://localhost:27017/proxy',
  },
  DISABLE_AUTH: false,
  ENABLE_CROSS_ORIGIN: false,
  MODULES: ['proxy'],
  PASSWORD: {
    WORK_FACTOR: 10
  },
  PORT: 8071,
  SEED: 10, // used in password encryption
  SESSION: {
    RESAVE: false,
    SAVE_UNINITIALIZED: false,
    SECRET: "5qgZNZRSvh1Dj2BkSKqJS81CRclWbeoxitMcC85I1JWmxptvBz1x67bRzI0b", // override me with console arg
    STORE: {
      AUTO_REMOVE: 'native',
      AUTO_REMOVE_INTERVAL: 10
    }
  },
  TEST: false,
  UI: "http://localhost:8081/ui",
  UPLOAD_SIZE_LIMIT: '50mb'
};
