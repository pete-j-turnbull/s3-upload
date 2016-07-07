var async      = require('asyncawait/async');
var await      = require('asyncawait/await');
var _          = require('lodash');
var Promise    = require('bluebird');
var log        = require('./utilities/logger');
var config     = require('./config/config');
var rabbit     = require('../common/rabbit/connection');
var fs         = require('fs');
var path       = require('path');
var aws        = require('aws-sdk');
var spawn      = require('child_process').spawn;


// Needs to be able to connect to aws, pull out the images under a specific tour hash, combine them into one and re upload that to aws.
//It can then return the uri of the tour.


// Need tourId


var mkdirSync = function (path) {
	try {
    	fs.mkdirSync(path);
  	} catch (e) {
    	if (e.code != 'EEXIST') throw e;
  	}
};
var mkdirpSync = function (dirpath) {
	var parts = dirpath.split(path.sep);
	for (var i = 1; i <= parts.length; i++) {
		mkdirSync( path.join.apply(null, parts.slice(0, i)) );
	}
};


var initS3 = function () {
	aws.config.update({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, region: config.region });
	var s3 = new aws.S3();
	return s3;
};

var getImagesInTour = function (s3, tourId) {
	return new Promise(function (resolve, reject) {
	    var params = {
	    	Bucket: 'keypla',
	    	Prefix: tourId + '/'
	    };
	    s3.listObjects(params, function (err, data) {
	    	if (err) reject(err);
	    	var ids = data.Contents.map(c => c.Key);
	    	resolve(ids);
	    });
	});
};

var downloadImage = function (s3, imageKey) {
	return new Promise(function (resolve, reject) {

		var options = {
	        Bucket: 'keypla',
	        Key: imageKey
	    };

	    var parts = imageKey.split('/');
	    var tourId = parts[0];
	    var imageNo = parts[1];

	    mkdirpSync(path.join('./temp/' + tourId));


	    var writeStream = fs.createWriteStream('./temp/' + tourId + '/' + imageNo);
		var readStream = s3.getObject(options).createReadStream();
		readStream.pipe(writeStream);


		readStream.on('end', function () {
			resolve();
		});
		readStream.on('error', function (err) {
			reject(err);
		});
	});
};
var processImages = function (tourId) {
	return new Promise(function (resolve, reject) {

		// TODO: use spawn to run bash script on the images
		var proc = spawn('bash', ['script', tourId])
		proc.on('close', code => {
			if (code == 0) {
				resolve();
			} else {
				reject(code);
			}
		});

		// Take all images in temp/{tourId}
		// process them
		// Put new file in temp/tours/{tourId}
	});
};
var uploadProcessedTour = function (s3, tourId) {
	return new Promise(function (resolve, reject) {
		// Create ReadStream to processedTour
		log.info(tourId);
		var readStream = fs.createReadStream('./temp/tours/' + tourId);

		// TODO: Make sure this function works

		var options = {
			Bucket: 'keypla',
			Key: 'tours/' + tourId,
			Body: readStream
		};
		s3.putObject(options, function (err, data) {
			if (err) reject(err);
			resolve();
		});
	});
};

var handleMessage = async (function (message) {
    try {
        log.info({ jobStatus: 'RECEIVED', request: message });

        var tourId = message.params.tourId;
        // Get images under dir tourId
        // Download those images to a temp
        // Process them with bash script
        // Upload to s3 in directory tours
        var s3 = initS3();
        
        var imageKeys = getImagesInTour(s3, tourId);
        log.info(1);
        await (Promise.map(imageKeys, imageKey => downloadImage(s3, imageKey)));
        log.info(2);
        await (processImages(tourId));
        log.info(3);

        await (uploadProcessedTour(s3, tourId));
        log.info(4);

        // DONE: Download all tour images and put in temp/{tourId}
        // DONE: Run bash script over images and when done there should be a file in temp called tourProcessed_{tourId}
        // DONE: Upload tourProcessed_{tourId} to aws and return the location of it
        // TODO: Clean up fs


        var response = { success: true };
        log.info({ jobStatus: 'PROCESSED', response: response });
        return response;

    } catch (err) {
        var response = { result: { msg: err.message, stack: err.stack }, success: false };
        log.error({ jobStatus: 'FAILED', response: response });
        return response;
    }
});


async (function () {
    try {

        await (rabbit.init(config.rabbit.url));
        log.info('RabbitMQ available.');

        var queue = rabbit.exchange.queue({ name: config.rabbit.queueName, prefetch: 1, durable: false });

        queue.consume(async (function (message, ack) {
            var response = await (handleMessage(message));
            ack(response);
        }));

    } catch (err) {
        log.error(err);
    }
})();