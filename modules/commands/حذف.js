module.exports.config = {
	name: "حذف",
	version: "1.0.1",
	hasPermssion: 0,
	credits: "Mirai Team",
	description: "حذف رسائل البوت",
	usePrefix: true,
	commandCategory: "رسائل",
	usages: "حذف",
	cooldowns: 0
};

module.exports.run = function({ api, event, getText }) {
	if (!event.messageReply) {
		return;
	}

	if (event.messageReply.senderID != api.getCurrentUserID()) {
		return;
	}

	return api.unsendMessage(event.messageReply.messageID);
};

module.exports.languages = {
	"ar": {
		"returnCant": "لا يمكن حذف رسائل الآخرين.",
		"missingReply": "يجب الرد على رسالة أولاً."
	}
};
