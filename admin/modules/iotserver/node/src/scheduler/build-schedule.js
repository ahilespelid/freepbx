const cronBuilder = require('cron-builder');
const weekDaysMap = {"mon": "1", "tue": "2", "wed": "3", "thu": "4", "fri": "5", "sat": "6", "sun": "7"};
function buildSchedule(automated_action, tsKey) {
	if (!automated_action.get(tsKey)) {
		return null;
	}
	try {
		var value = automated_action.get(tsKey);
		value = value.toLowerCase();
		var arr = value.split('|');
		var cronExp = new cronBuilder();
		var exp = cronExp.getAll();

		if (arr[0].trim().includes('every') || arr[0].trim().includes('[')) {
			if (arr[1] !== undefined) {
				let ts = arr[1].trim();
				let moment = 'am';
				let ts_content = ts.split('am');
				if (ts_content.length == 1) {
					ts_content = ts.split('pm');
					moment = 'pm';
				}
				let ts_values = ts_content[0].trim().split(":");
				let hours = parseInt(ts_values[0].trim());
				let minutes = parseInt(ts_values[1].trim());
				hours = (moment == 'am' && hours == 12) ? 0 : hours;
				hours = (moment == 'am') ? hours : (hours == 12)? hours: hours + 12;
				exp.minute = [minutes];
				exp.hour = [hours];
		    }
			if (arr[0].trim() == 'everyworkingday') {
				exp.dayOfTheWeek = ['1', '2', '3', '4', '5'];
			} else if (arr[0].trim().includes('[')) {
				var Selected_days = JSON.parse(arr[0].trim());
				let dayOfTheWeek = [];
				Selected_days.forEach((day)=> {
					dayOfTheWeek.push(weekDaysMap[day]);
				})
				exp.dayOfTheWeek =dayOfTheWeek;
			}
			cronExp.setAll(exp);
			return cronExp.build();
		}
	} catch (err) {
		log.error(err);
		return null;
	}
	return null;
}
module.exports = {buildSchedule,weekDaysMap};