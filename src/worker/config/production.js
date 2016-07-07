module.exports = {
    logger: {
        enabled: ['debug', 'info', 'warn', 'error']
    },
    rabbit: {
    	url: 'amqp://guest:guest@127.0.0.1:5671/',
    	queueName: 'jobs.processTour'
    },
    accessKeyId: 'AKIAIMOL22VCKBGCBYGA',
    secretAccessKey: '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',
    region: 'eu-west-1'
};
