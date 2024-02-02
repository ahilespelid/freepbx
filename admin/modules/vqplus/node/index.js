var FreePBX = require("freepbx");

FreePBX.connect().then(function (pbx) {
	pbx.astman.action({
		'action':'UserEvent',
		'UserEvent': 'Periodicalcheck'
	}, function(err, res) {
		if(err) {
			console.error(err)
		}
	});

	setInterval(function() {
		pbx.astman.action({
			'action':'UserEvent',
			'UserEvent': 'Periodicalcheck'
		}, function(err, res) {
			if(err) {
				console.error(err)
			}
		});
	}, 10000);
});