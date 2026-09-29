const logger = require('./utils/log');
const cron = require('node-cron');

module.exports = async ({ api }) => {
  const config = {
    autoRestart: {
      status: false,
      time: 60,
      note: 'To avoid problems, enable periodic bot restarts',
    },

    acceptPending: {
      status: false,
      time: 30,
      note: 'Approve waiting messages after a certain time',
    },
  };

  function autoRestart(config) {
    if (config.status) {
      cron.schedule(`*/${config.time} * * * *`, () => {
        logger.log('Start rebooting the system!', 'Auto Restart');
        process.exit(1);
      });
    }
  }

  function acceptPending(config) {
    if (config.status) {
      cron.schedule(`*/${config.time} * * * *`, async () => {
        try {
          const list = [
            ...(await api.getThreadList(1, null, ['PENDING'])),
            ...(await api.getThreadList(1, null, ['OTHER'])),
          ];

          if (list[0]) {
            api.sendMessage(
              'You have been approved for the queue. (This is an automated message)',
              list[0].threadID
            );
          }
        } catch (error) {
          console.error(
            '[acceptPending] Error:',
            error.message
          );
        }
      });
    }
  }

  autoRestart(config.autoRestart);
  acceptPending(config.acceptPending);

  // AUTOGREET DISABLED
  // No automatic messages every 10 minutes.
  // No automatic messages every 30 minutes.
};
