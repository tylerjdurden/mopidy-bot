'use strict'

var tg = require('telegram-node-bot')('236288754:AAFcbPuvblRM5vNq24HSBJUoALO_lTeY74c');
var Mopidy = require('mopidy');

var mopidy = new Mopidy({
	webSocketUrl: "ws://localhost:6680/mopidy/ws/",
	callingConvention: "by-position-or-by-name"
});

//log everything
mopidy.on(console.log.bind(console));

//routes each command to its respective controller
tg.router.
	when(['/start'], 'StartController').
	when(['/help'], 'HelpController').
	when(['/ping'], 'PingController').
	when(['/search', '/search@MopidyBot'], 'SearchController');

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
		'Type /search to begin searching for music.' + '\n'
		;

	tg.for('/help', () => {
		$.sendMessage(help_message);
	});
});

//Replies with pong!
tg.controller('PingController', ($) => {
	tg.for('/ping', () => {
		$.sendMessage('pong!') 
	});
});

//simple search mechanism for the mopidy server
tg.controller('SearchController', ($) => {
	var search_callback = function($) {

		var form = {
			user_query: {
				q: 'What do you want to search for?',
				error: 'You have to search for something...',
				validator: (input, callback) => {
					if(input['text']) {
						callback(true);
						return;
					}

					callback(false);
				}
			}
		}

		$.runForm(form, (result) => {
			console.log('result is: ');
			console.log(result);

			mopidy.library.search({'any': [result['user_query']]}).then(function(data){
				console.log(data);

				$.runInlineMenu('sendMessage', 'Select:', {}, [
					{
						text: 'Albums',
						callback: ($) => {
							console.log('Albums: ');
							console.log(data[0]['albums']);
						}
					},
					{
						text: 'Artists',
						callback: ($) => {
							console.log('Artists: ');
						}
					},
					{
						text: 'Tracks',
						callback: ($) => {
							console.log('Tracks: ');
						}
					}
				], [1]);


			});
		}); 
	};

	tg.for('/search', search_callback);
	tg.for('/search@MopidyBot', search_callback);
});

/*
 * mopidy.library.search({"query":null,"uris":null,"exact":null}).then(function(data){
 console.log(data);
 });
 */
