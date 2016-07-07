var async      = require('asyncawait/async');
var await      = require('asyncawait/await');
var _          = require('lodash');
var Promise    = require('bluebird');
var log        = require('./utilities/logger');
var config     = require('./config/config');
var rabbit     = require('../common/rabbit/connection');


var invoke = function (queueName, params) {
	return new Promise(function (resolve, reject) {
		try {
			rabbit.exchange.publish({ params: params }, {
				key: queueName,
				reply: function (data) {
					resolve(data);
				}
			});
		} catch (err) {
			reject(err);
		}
	});
};

async (function () {
	try {
		await (rabbit.init(config.rabbit.url));

		var result = await (invoke(config.rabbit.queueName,
			{
				tourId: 'HVi4rnp2LobzW256pGfKBTHsBtYnS=75HS0OzecamxQ='
			}
		));

		log.info(result);
	} catch (err) {
		log.error(err);
	}
})();