module.exports = {
  Cron: () => () => {},
  CronExpression: {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_10_MINUTES: '*/10 * * * *',
    EVERY_30_MINUTES: '*/30 * * * *',
    EVERY_HOUR: '0 * * * *',
  },
  ScheduleModule: {
    forRoot: () => ({
      module: class ScheduleModule {},
      providers: [],
      exports: [],
    }),
  },
};
