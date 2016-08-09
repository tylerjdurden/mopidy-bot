'use strict'

var tg = require('telegram-node-bot')('236288754:AAFcbPuvblRM5vNq24HSBJUoALO_lTeY74c');
var Mopidy = require('mopidy');
var request = require('request');
var async = require('async');

var mopidy = new Mopidy({
	webSocketUrl: "ws://localhost:6680/mopidy/ws/",
	callingConvention: "by-position-or-by-name"
});

//log everything
//mopidy.on(console.log.bind(console));

function range(start, stop, step) {
	if (typeof stop == 'undefined') {
		// one param defined
		stop = start;
		start = 0;
	}

	if (typeof step == 'undefined') {
		step = 1;
	}

	if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
		return [];
	}

	var result = [];
	for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
		result.push(i);
	}

	return result;
};

// var getSongArtists = function(song, callback) {
function getSongArtists(song, callback) {
	var artists = '';
	try{
		// console.log('song is: ');
		// console.log(song);
		if(song.artists[0])
			artists += song.artists[0].name;
		else
			return 'Unknown Artist';

		for(var j = 1;j < song.artists.length;++j)
			artists += ', ' + song.artists[j].name;
	}
	catch(e){
		console.log('error: ' + e.toString());
		artists = 'Unknown Artists';
	}

	// return artists
	callback(artists);
};

//routes each command to its respective controller
tg.router.
	when(['/start', '/start@MopidyBot'], 'StartController').
	when(['/help', '/help@MopidyBot'], 'HelpController').
	when(['/ping', '/ping@MopidyBot'], 'PingController').
	when(['/search', '/search@MopidyBot'], 'SearchController').
	when(['/queue', '/queue@MopidyBot'], 'QueueController').
	when(['/playpause', '/playpause@MopidyBot'], 'PlayPauseController').
	when(['/clear', '/clear@MopidyBot'], 'ClearQueueController');

//Doesn't do much.
tg.controller('StartController', ($) => {
	var start_message = 'Hi! I\'m MopidyBot. Type /help to see what I can do.';

	tg.for('/start', () => {
		$.sendMessage(start_message)
	});
});

//Displays help message
tg.controller('HelpController', ($) => {
	var help_message = 
		'Type /help to see this message.' + '\n' +
		'Type /ping for me to reply with "pong!"' + '\n' +
		'Type /search to begin searching for music.' + '\n' +
		'Type /queue to see the music queue.' + '\n' +
		'Type /clear to clear the queue.' + '\n' +
		'Type /playpause to play the music if it\'s paused, or vice versa.' + '\n'
		;

	tg.for('/help', () => {
		$.sendMessage(help_message);
	});
});

//Replies with pong!
tg.controller('PingController', ($) => {
	tg.for('/ping', () => {
		console.log('received ping, sending pong');
		$.sendMessage('pong!');
	});
});

tg.controller('QueueController', ($) => {
	var send_queue = function($){
		mopidy.tracklist.getTracks({}).then(function(data){
			var outer_data = data;
			// console.log('outer data is ');
			// console.log(data);
			mopidy.playback.getCurrentTrack({}).then(function(data){
				mopidy.tracklist.getNextTlid({}).then(function(data){
					// console.log(data);
				});
				var message = 'Queue is: \n';
				// for(var i = 0;i < outer_data.length;++i){
				var i = 0;
				async.eachSeries(outer_data, function(item, cb){
					message += (i+1) + '. ';
					
					// console.log('\n\n\n\n');
					// console.log('Queue data is: ');
					// console.log(data);
					// console.log('\n\n\n\n');
					// console.log('inside send_queue, innermost data is: ');
					// console.log(data);
					getSongArtists(outer_data[i], function(artists){
						message += artists;	
						message += ' - ' + item['name'] + '\n';
						++i;
						cb(null);
					});

				});
				if(outer_data.length <= 0)
					message = 'Queue is empty.';
				$.sendMessage(message);
			});
		});	
	};

	//tg.for('/queue', send_queue($));
	//tg.for('/queue@MopidyBot', send_queue($));
	send_queue($);
});

tg.controller('PlayPauseController', ($) => {
	var play_pause = function($){
		mopidy.playback.getState({}).then(function(data){
			//console.log(data);
			if(data == 'playing'){
				mopidy.playback.pause({}).then(function(data){
					//console.log(data);
					$.sendMessage("Paused.");
				});
			}
			else{
				mopidy.playback.play({"tl_track":null,"tlid":null}).then(function(data){
					//console.log(data);
					$.sendMessage("Playing.");
				});
			}
		});	
	};

	play_pause($);
});

tg.controller('ClearQueueController', ($) => {
	mopidy.tracklist.clear({}).then(function(data){
		//console.log(data);
		$.sendMessage('Queue cleared.');
	});
});


//simple search mechanism for the mopidy server
tg.controller('SearchController', ($) => {
	var search_callback = function($) {
		console.log('[DEBUG]: beginning search');

		callback: ($) => {
			console.log('Albums: ');
			//data[0] gets spotify
			console.log(data[0]['albums']);
			var first_album = data[0]['albums'][0];
			for (var key in first_album) {
				if (first_album.hasOwnProperty(key)) {
					//alert(key + " -> " + p[key]);
					console.log(key + " -> " + first_album[key]);
				}
			}

			console.log('$ is: ');
			console.log($);
		}

		var form = {
			user_query: {
				q: 'What do you want to search for?',
				error: 'You have to search for something...',
				validator: (input, callback) => {
					if(input['text']) {
						console.log('[DEBUG]: validator success!\n');
						callback(true);
						//return;
					}

					else {
						console.log('[DEBUG]: validator failed!\n');
						callback(false);
					}
				}
			}
		}

		function enqueue_track($, data, index, trackNo){
			console.log('in enqueue_track, data is: ');
			console.log(data);
			// var trackIndex = trackNo - 1;
			console.log('trackNo is: ' + trackNo.toString());
			mopidy.tracklist.add({"tracks":null,"at_position":null,"uri":data[index]['tracks'][trackNo]['uri'],"uris":null})
				.then(function(data){
					$.sendMessage('Track enqueued.');
					//mopidy.tracklist.getTracks({}).then(function(data){
					//});
			});
		}

		function enqueue_album($, data, index, albumNo){
			//console.log('[DEBUG]: data is: ');
			//console.log(data);

			$.runMenu({
				message: 'Do you want to enqueue the entire album or just one track from it?',
				layout: 1,
				'Entire album': () => {
					// console.log('[DEBUG]: data[index] is:');
					// console.log(data[index]);
					console.log('albumNo is: ');
					console.log(albumNo);
					console.log(data[index]['albums'][albumNo]);	
					console.log('\n');
					
					// var albumIndex = albumNo - 1;
					mopidy.tracklist.add({"tracks":null,"at_position":null,"uri":data[index]['albums'][albumNo]['uri'],"uris":null})
						.then(function(data){
							$.sendMessage('Album enqueued.');
						});
				},
				'Single track': () => {
					// var albumIndex = albumNo - 1;
					var overall_max = 5;
					var max = (data[index]['tracks'].length > overall_max) ? overall_max : data[index]['tracks'].length;
					console.log('data is: ');
					console.log(data);
					// console.log('albumIndex is: ');
					// console.log(albumIndex);
					mopidy.library.browse({"uri":data[index]['albums'][albumNo]['uri']}).then(function(data){
						//console.log(data);
						var message = '';
						for(var i = 0;i < data.length;++i){
							message += (i+1) + '. ' + data[i]['name'] + '\n';
						}
						// $.sendMessage(message);
						console.log('sending message: ' + message + '\n');
						var menu = {
							message: message,
							layout: 5
						};

						// append the track buttons
						// (callbacks for buttons 1 through n)
						// for(var i = 0;i < data.length;++i){
						async.eachOfSeries(data, function(data_item, data_idx, data_cb){
							// is index correct?
							menu[(data_idx+1).toString()] = () => {enqueue_track($, data, index, data_idx);};
							data_cb(null);
						}, function(){
							menu['Start over'] = () => {};
							$.runMenu(menu);
						});
					});
				}
			});

		}

		function enqueue($, chosen_medium, data, index, trackOrAlbumNo){
			if(chosen_medium == 'tracks')
				enqueue_track($, data, index, trackOrAlbumNo);
			else
				enqueue_album($, data, index, trackOrAlbumNo);
		}

		function browse($, isTracks, data, index) {
			console.log("[DEBUG]: data is:");
			console.log(data);
			console.log("[DEBUG]: end data");
			console.log("\n\n");

			console.log("[DEBUG]: data[index] is:");
			console.log(data[index]);
			console.log("[DEBUG]: end data[index]");
			console.log("\n\n");

			console.log("[DEBUG]: data[index]['albums'] is:");
			console.log(data[index]['albums']);
			console.log("[DEBUG]: end data[index]['albums']");
			console.log("\n\n");

			var chosen_medium = (isTracks) ? 'tracks' : 'albums';
			if(data[index][chosen_medium] == null){
				var message = 'No ' + chosen_medium + ' found for that search query. Start over?';
				$.runMenu({
					message: message,
					layout: 1,
					'Start over': () => {startOver();},
					'No': () => {/* do nothing */}
				});

			}

			var overall_max = 5;
			var max = (data[index][chosen_medium].length > overall_max) ? overall_max : data[index][chosen_medium].length;
			console.log('max is ' + max);
			var message = '';
			if(max > 1){
				message = 'The top ' + max + ' ' + chosen_medium + ' are:\n';
			}
			else{
				message = 'The top ' + chosen_medium.substr(0, chosen_medium.length - 1) + ' is:\n';
			}
			//i is 5. why is it greater than max? 
			// for(var i = 0; i < max; ++i){
			// while(j < max){
			// data[index][chosen_medium].forEach(item, index){
			// for(key in data[index][chosen_medium]){
			var idx = 0;
			async.waterfall([
					function (callback) {
						// var idx = 0;
						async.eachSeries(data[index][chosen_medium], function(item, cb) {
							if(idx >= max){
								// continue;

								// this acts as a continue because it's a function
								cb();
								// return;
							}

							else if(chosen_medium == 'tracks') {
								// message += (j+1) + '. ' 
								// 		+ getSongArtists(data[index][chosen_medium][j]) + ' - ' 
								// 		+ data[index][chosen_medium][j]['name'] + '\n';
								getSongArtists(item, function(artists){
									message += (idx+1) + '. ' + artists + ' - ' + item['name'] + '\n';
									cb();
								});
							}

							else {
								var album_uri = item['uri'];
								album_uri = album_uri.replace('spotify:album:','');
								request('https://api.spotify.com/v1/albums/' + album_uri, function (error, response, body) {
										if (!error && response.statusCode == 200) {
											body = JSON.parse(body);
											// console.log('body is: ');
											// console.log(body);
											// console.log('body.artists is: ');
											// console.log(body.artists);
											// console.log('data index chosen_medium is ');
											// console.log(data[index][chosen_medium]);
											// console.log('item is ');
											// console.log(item);
											if(item != null){
												var append = (idx) + '. ' + body.artists[0].name + ' - ' + item['name'] + '\n';
												message += append;
											}
										}
										cb();
								});
							}
							idx++;
						}, function() {
							callback(null, message);
						});
					},
					function(message, callback) {
						// $.sendMessage(message);
						console.log('sending message: ' + message + '\n');
						var menu = {
							message: message,
							layout: 5
						};

						//append the top max functions to the menu 
						//(callbacks for buttons 1 through n)
						// for(var i = 0;i < max;++i){
						async.eachSeries(range(max), function(idx, my_cb){
							// is index correct?
							menu[(idx+1).toString()] = () => {enqueue($, chosen_medium, data, index, idx);};
							my_cb(null);	
						}, function(){
							// menu['Start over'] = () => {startOver();};
							menu['End search'] = () => {};

							console.log('running menu');
							$.runMenu(menu);
							console.log('calling callback');
							callback(null);
						});
					}
			]);
		} 

		function startOver() {
			$.runForm(form, (result) => {
				console.log('[DEBUG]: result is: ');
				console.log(result);
				console.log('[DEBUG]: end of result');

				mopidy.library.search({'any': [result['user_query']]})
					.then(function(data){
						/*
						   console.log("[DEBUG]: data is:");
						   console.log(data);
						   console.log("[DEBUG]: end data");
						   console.log("\n\n");

						   console.log("[DEBUG]: data[index] is:");
						   console.log(data[index]);
						   console.log("[DEBUG]: end data[index]");
						   console.log("\n\n");

						   console.log("[DEBUG]: data[index]['albums'] is:");
						   console.log(data[index]['albums']);
						   console.log("[DEBUG]: end data[index]['albums']");
						   console.log("\n\n");
						   */

						//we want the spotify results for now
						//only spotify has an 'albums' value
						var index = (data[0]['uri'].includes('spotify')) ? 0 : 1;
						//Either browse tracks or albums
						$.runMenu({
							message: 'Do you want to browse tracks or albums?',
							layout: 1,
							'Tracks': () => {browse($, true, data, index)},
							'Albums': () => {browse($, false, data, index)},
						});
					});
			});
		}
		
		//run search no matter what
		startOver();
	};

	tg.for('/search', search_callback);
	tg.for('/search@MopidyBot', search_callback);
});

/*
 * mopidy.library.search({"query":null,"uris":null,"exact":null}).then(function(data){
 console.log(data);
 });
 */
