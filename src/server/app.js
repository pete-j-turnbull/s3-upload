var koa = require('koa');
var Promise = require('bluebird');
var router = require('koa-router')();
var hbs = require('koa-hbs');
var log = require('./utilities/logger');
var koaLogger = require('./utilities/koa-logger');
var config = require('./config/config');
var aws = require('aws-sdk');

var crypto = require('crypto');
function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("base64");
}

var app = koa();


router.get('/', function *() {
	yield this.render('index', {});
});

var _sign = function (fileName, fileType) {
	return new Promise(function(resolve, reject) {
		aws.config.update({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, region: config.region });
		var s3 = new aws.S3();
	    var options = {
	    	Bucket: 'keypla',
	      	Key: fileName,
	      	Expires: 60,
	      	ContentType: fileType,
	      	ACL: 'public-read'
    	};

    	s3.getSignedUrl('putObject', options, function (err, data) {
    		if (err) {
    			reject(err);
    		} else {
    			resolve(data);
    		}
    	});
	});
};
router.get('/sign', function *() {
	try {
		var fileType = this.query.fileType;

		var tourName = this.query.tourName;
		var imgNumber = this.query.imgNumber;

		var tourHash = sha256(tourName).replace('/', '=');

		var data = yield _sign(tourHash + '/' + imgNumber, fileType);
		var url = 'https://' + 's3-' + config.region + '.amazonaws.com' + '/' + 'keypla' + '/' + tourHash + '/' + imgNumber;

		var response = { success: true, result: { signedRequest: data, url: url } }
		log.info(response);
		this.body = response;

	} catch (err) {
		var response = { success: false, result: err };
		log.error(response);
		this.body = response;
	}

});


app.use(koaLogger());
app.use(hbs.middleware({
    viewPath: __dirname + '/views'
}));
app.use(router.routes());


if (!module.parent) {
    app.listen(config.port);
    log.info('server running on http://localhost:' + config.port);
}
