/*
 * listal.js - Download listal pictures
 * 
 * Florian Dejonckheere <florian@floriandejonckheere.be>
 * 
 * */

var fs =	require('fs');
var path =	require('path');
var colors =	require('colors');
var mkdirp =	require('mkdirp');
var async =	require('async');

var request =	require('request');
var cheerio =	require('cheerio');

var argv =	require('yargs')
			.usage('Usage: $0 -u URL [-o OUTPUT] [-p PAGE]')
			.demand('u')
			.describe('u', 'Listal URL without trailing \'/pictures\'')
			.describe('o', 'Output directory (defaults to \'listal_pictures\')')
			.describe('p', 'Starting page (defaults to 1)')
			.argv;

// Maximum parallel connection
request.defaults({
	pool: {
		maxSockets: 5
	}
})

var path = process.cwd() + '/' + (argv.o || './listal_pictures/');
fs.realpath(path, function(err, resolvedPath){
	// ignore all errors, realpath is used for resolving only

	mkdirp(resolvedPath, function(err){
		if(err) console.error(err);

		console.log('Saving pictures to ' + resolvedPath.green);

		var done = false;
		var i = (argv.p || 0) - 1;
		async.whilst(function(){ return (!done); }, function(callback){
			i++;
			console.log('Scraping ' + ('page ' + i).green);
			request(argv.u + '/pictures//' + i, function(err, resp, html){
				if(err) console.error(err);

				$ = cheerio.load(html);
				if($('table.product-images img').length == 0) done = true;

				$('table.product-images img').parent('a').each(function(i, el){
					request($(el).attr('href'), function(err, resp, html){
						if(err) console.error(err);

						$i = cheerio.load(html);
						var imgUri = $i('center img').attr('src');
						var splitUri = imgUri.split('/');
						var imgPath = resolvedPath + '/' + splitUri[splitUri.length - 2] + '-' + splitUri[splitUri.length - 1];
						fs.exists(imgPath, function(exists){
							if(exists){
								console.log('Skipping ' + imgUri.red + ', because local file already exists');
							} else {
								console.log('Downloading ' + imgUri.yellow + ' to ' + imgPath.yellow);
								request(imgUri).pipe(fs.createWriteStream(imgPath));
							}
						});

						// if last index, terminate async loop
						if(i == ($('table.product-images img').length - 1)) callback();
					});
				});
			});
		}, function(err){
			if(err) console.error(err);
			else console.log('Done!'.green);
		});
	});
});
