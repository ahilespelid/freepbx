$(document).ready(function() {
	$("form#emergency").submit(function() {
		//Location name must be valid unicode, 128 or less chars
		const lName = $("input[name=location]").val();
		if (isWhitespace(lName) || !isUnicodeLetter(lName) || lName.length > 128) {
			alert(_('Invalid Location Name'));
			return false;
		}

		//Emergency CID must be a valid CallerID
                if (!isCallerID($('input[name="cid"]').val())) {
			alert(_('Invalid Emergency CID'));
                        return false;
		}

		//check for invalid/duplicate MACs
		const macs = $("textarea[name=macs]").val().trim();
		const macsSplit = macs.split('\n');
		let badMacs = [];
		let dupeMacs = [];
		let formattedMacsArr = [];
		macsSplit.forEach(function(mac) {
			const sMacAddress = mac.toUpperCase().replace(/[^0-9A-Z]/g, '');
			//build an array of the formatted MACs, while skipping duplicates
			//in case the a mac was entered multiple times in the same field by accident
			if (!formattedMacsArr.includes(sMacAddress)) {
				formattedMacsArr.push(sMacAddress);	
			}

			//check for existing MACs. A MAC should never be included in multiple locations
			let existingMacEmergencycidIdHash = {};
			existingMacs.forEach(function(x) {
				existingMacEmergencycidIdHash[x.mac] = { 
					id: parseInt(x.emergencycidId, 10) 
				};
			});
			if (existingMacEmergencycidIdHash[sMacAddress] && 
				currentId !== existingMacEmergencycidIdHash[sMacAddress].id) 
			{
				dupeMacs.push(mac);
			}

			//check for invalid mac
			const sMacRegex = /^([0-9A-F]{12})$/i;
			if (!sMacRegex.test(sMacAddress)) {
				badMacs.push(mac);
			}
		});
		if (badMacs.length > 0) {
			let invalidMACmsg = _('Invalid MAC Addresses:') + '\n';
			badMacs.forEach(function(mac) {
				invalidMACmsg += mac + '\n';
			});
			alert(invalidMACmsg);
                        return false;
		}
		if (dupeMacs.length > 0) {
			let dupeMACmsg = _('These MAC Addresses are already mapped to another Location:') + '\n';
			dupeMacs.forEach(function(mac) {
				dupeMACmsg += mac + '\n';
			});
			alert(dupeMACmsg);
                        return false;
		}
		
		//store clean versions of the mac when saving
		let formattedMacs = '';
		formattedMacsArr.forEach(function(x) {
			formattedMacs += x + '\n';
		});	
		$("textarea[name=macs]").val(formattedMacs.trim());
	});
});
