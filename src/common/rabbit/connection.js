var async = require('asyncawait/async');
var await = require('asyncawait/await');
var jackrabbit = require('jackrabbit');
var Promise = require('bluebird');

module.exports = (function () {

	var connectRabbit = function (url) {

		return new Promise(function (resolve, reject) {
			var rabbit = jackrabbit(url);
			rabbit
				.on('connected', function () {
					resolve(rabbit.default());
				})
				.on('error', function (err) {
					reject(err);
				});
		});
	};

	var init = async (function (url) {
		this.exchange = await (connectRabbit(url));
	});

	return {
		init: init,
		exchange: null
	};
})();
