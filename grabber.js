(function(window, document, undefined) {
	var GG = {
		session_id : undefined,
		secret_key : undefined,
		uuid : undefined,
		token : undefined,
		getSongData : undefined,
		eventListeners : {
			tableInserted : undefined,
			songInserted : undefined
		},
		helpers : {
			hasClass : undefined,
			randomHex : undefined,
			hashToken : undefined,
			ajax_post : undefined
		},
		dataGenerators : {
			getStreamRequestData : undefined,
			getTokenRequestData : undefined
		},
		classNames : {
			button : 'gG_dl_button',
			dl_link : 'gG_dl_link'
		}
	};
	GG.eventListeners.tableInserted = function(event)
	{
		var flashvars;
		if(event.target.getAttribute && event.target.getAttribute('class') == 'grid-canvas') {
			document.removeEventListener('DOMNodeInserted', GG.eventListeners.tableInserted);
			event.target.addEventListener('DOMNodeInserted', GG.eventListeners.songInserted);
			flashvars = document.getElementsByName("flashvars")[0].getAttribute('value');
			GG.session_id = /session=([0-9a-z]+)/i.exec(flashvars)[1];
			GG.secret_key = hex_md5(GG.session_id.toString());
			GG.uuid = /uuid=([0-9a-z-]+)/i.exec(flashvars)[1];
		}
	};
	GG.eventListeners.songInserted = function(event)
	{
		var song_cell, options;
		if(event.target.childNodes.length < 1 || ! GG.helpers.hasClass(event.target.childNodes[0], 'song'))
			return;
		song_cell = event.target.childNodes[0];
		if(song_cell.childNodes.length < 2 || ! GG.helpers.hasClass(song_cell.childNodes[1], 'options'))
			return;
		options = song_cell.childNodes[1];
		var button = document.createElement('li');
		button.setAttribute('Title', 'Download');
		button.innerHTML = 'D';
		button.className = GG.classNames.button;
		var dl_link = document.createElement('div');
		dl_link.className = GG.classNames.dl_link;
		event.target.insertBefore(dl_link, event.target.childNodes[1]);
		button.onclick = function(event) { GG.getSongData(event, options.getAttribute('rel'), dl_link); };
		options.appendChild(button);
	};
	GG.helpers.hasClass = function(node, classname)
	{
		if( ! node.className || ! node.className.match)
			return false;
		return node.className.match(new RegExp('(\\s|^)' + classname + '(\\s|$)'));
	};
	GG.dataGenerators.getTokenRequestData = function()
	{
		return {
			"header" : {
				"clientRevision" : "20101222.53",
				"uuid" : GG.uuid,
				"client" : "htmlshark",
				"country" : {
					"CC3" : "0",
					"CC4" : "1073741824",
					"ID" : "223",
					"CC1" : "0",
					"CC2" : "0",
					"IPR" : "847"
				},
				"privacy" : 0,
				"session" : GG.session_id
			},
			"method" : "getCommunicationToken",
			"parameters" : {"secretKey" : GG.secret_key}
		};
	};
	GG.dataGenerators.getStreamRequestData = function(songID, token)
	{
		return {
			"method" : "getStreamKeyFromSongIDEx",
			"parameters" : {
				"mobile" : false,
				"country": {
					"IPR" : "847",
					"ID" : "223",
					"CC1" : "0",
					"CC2" : "0",
					"CC3" : "0",
					"CC4" : "1073741824"
				},
				"songID" : songID,
				"prefetch" : false
			},
			"header" : {
				"clientRevision" : "20101222.53",
				"uuid" : GG.uuid,
				"client" : "jsqueue",
				"privacy" : 0,
				"token" : GG.helpers.hashToken(token),
				"country" : {
					"IPR" : "847",
					"ID" : "223",
					"CC1" : "0",
					"CC2" : "0",
					"CC3" : "0",
					"CC4" : "1073741824"
				},
				"session" : GG.session_id
			}
		};
	};
	GG.getSongData = function(event, songID, dl_link)
	{
		var stream_request_data;
		var ip, stream_key;
		var token, token_request_data = GG.dataGenerators.getTokenRequestData();
		
		dl_link.innerHTML = 'Retrieving song info...';
		dl_link.style.display = 'inline';
		GG.helpers.ajax_post({
			url : 'http://listen.grooveshark.com/more.php?getCommunicationToken',
			data : JSON.stringify(token_request_data),
			async : false,
			success : function(data) { token = JSON.parse(data).result; }
		});
		stream_request_data = GG.dataGenerators.getStreamRequestData(songID, token);
		GG.helpers.ajax_post({
			url : 'http://listen.grooveshark.com/more.php?getStreamKeyFromSongIDEx',
			async : false,
			data : JSON.stringify(stream_request_data),
			success : function(data) {
				data = JSON.parse(data);
				ip = data.result.ip;
				stream_key = data.result.streamKey;
			}
		});
		event.target.onclick = function(event) { };
		event.target.oncontextmenu = function(event) { event.cancelBubble = true; };
		dl_link.innerHTML = '<a href="http://' + ip + '/stream.php?streamKey=' + stream_key+ '">Right-click, "Save link as..."</a>';
	};
	GG.helpers.randomHex = function(length)
	{
		var chars = '0123456789abcdef',
			rand_int,
			rand_string = '';
		while(length > 0)
		{
			rand_int = Math.floor(Math.random() * chars.length);
			rand_string += chars.substring(rand_int, rand_int+1);
			length -= 1;
		}
		return rand_string;
	};
	GG.helpers.hashToken = function(token)
	{
		var salt = GG.helpers.randomHex(6),
			passphrase = 'quitStealinMahShit';
		return salt + hex_sha1('getStreamKeyFromSongIDEx' + ':' + token + ':' + passphrase + ':' + salt);
	};
	GG.helpers.ajax_post = function(args)
	{
		if( ! args.hasOwnProperty('url') || typeof args.url !== 'string')
			return;
		var http = new XMLHttpRequest();
		var url = args.url;
		var params = "";
		var async = args.async == null || args.async;
		if(args.hasOwnProperty('data'))
			params = args.data;
			
		http.open("POST", url, async);

		// Send the proper header information along with the request
		http.setRequestHeader("Content-type", "application/json");
		
		http.onreadystatechange = function() {
			if(http.readyState == 4 && http.status == 200) {
				if(typeof args.success == 'function')
					args.success(http.responseText);
			}
		};
		http.send(params);
	};
	
	document.addEventListener('DOMNodeInserted', GG.eventListeners.tableInserted);
})(this, document);