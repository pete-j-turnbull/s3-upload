var koa = require('koa');
var Promise = require('bluebird');
var route = require('koa-route');
var hbs = require('koa-hbs');
var log = require('./utilities/logger');
var koaLogger = require('./utilities/koa-logger');
var config = require('./config/config');
var aws = require('aws-sdk')

var crypto = require('crypto');
function sha256(data) {
    return crypto.createHash("sha256").update(data).digest("base64");
}

//var index = require('./routes/index');
//var upload = require('./routes/upload');

var app = module.exports = koa();

app.use(hbs.middleware({
    viewPath: __dirname + '/views'
}));
app.use(koaLogger());


app.use(route.get('/', function *() {
	yield this.render('index', {});
}));

var _sign = function (filename, filetype) {
	return new Promise(function(resolve, reject) {
		aws.config.update({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, region: config.region });
		var s3 = new aws.S3();
	    var options = {
	    	Bucket: 'keypla',
	      	Key: filename,
	      	Expires: 60,
	      	ContentType: filetype,
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
}
app.use(route.get('/sign', function *() {
	try {
		var filename = this.query.file_name;
		var hashedFilename = sha256(filename);
		var filetype = this.query.file_type;

		var data = yield _sign(hashedFilename, filetype);
		var url = 'https://' + 's3-' + config.region + '.amazonaws.com' + '/' + 'keypla' + '/' + hashedFilename;

		var response = { success: true, result: { signedRequest: data, url: url } }
		log.info(response);
		this.body = response;

	} catch (err) {
		var response = { success: false, result: err };
		log.error(response);
		this.body = response;
	}

}));


if (!module.parent) {
    app.listen(config.port);
    log.info('server running on http://localhost:' + config.port);
}
