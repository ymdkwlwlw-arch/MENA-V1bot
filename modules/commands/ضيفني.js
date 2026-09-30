module.exports.config = {
	name: "ضيفني",
	version: "2.0.0",
	hasPermssion: 2,
	credits: "Mustapha",
	description: "إضافة المطور إلى القروبات",
	usePrefix: true,
	commandCategory: "المطور",
	usages: "ضيفني",
	cooldowns: 5
};

const DEVELOPER_ID = "61593519041412";

module.exports.run = async function({ api, event }) {
	if (event.senderID != DEVELOPER_ID) {
		return api.sendMessage(
			"╭─── ◸ تـنـبـيـه ◿ ───╮\n" +
			"│ ⊸ هذا الأمر مخصص للمطور فقط.\n" +
			"╰────────────────────╯",
			event.threadID
		);
	}

	try {
		const threads = await api.getThreadList(50, null, ["INBOX"]);
		const groups = threads.filter(thread => thread.isGroup);

		if (!groups.length) {
			return api.sendMessage(
				"╭─── ◸ الـقـروبـات ◿ ───╮\n" +
				"│ ⊸ لا توجد قروبات متاحة.\n" +
				"╰─────────────────────╯",
				event.threadID
			);
		}

		let msg =
			"╭─── ◸ قـائـمـة الـقـروبـات ◿ ───╮\n" +
			"│\n";

		groups.forEach((group, index) => {
			msg += `│ ⊸ ${index + 1}. ${group.name || "بدون اسم"}\n`;
		});

		msg +=
			"│\n" +
			"╰────────────────────────────╯\n" +
			"✦ أرسل رقم القروب للمتابعة.";

		return api.sendMessage(msg, event.threadID, (err, info) => {
			if (err || !info) return;

			global.client.handleReply.push({
				name: "ضيفني",
				messageID: info.messageID,
				author: event.senderID,
				groups: groups
			});
		});

	} catch (error) {
		console.error("[ضيفني] Error:", error);

		return api.sendMessage(
			"╭─── ◸ خـطـأ ◿ ───╮\n" +
			"│ ⊸ تعذر جلب قائمة القروبات.\n" +
			"╰─────────────────╯",
			event.threadID
		);
	}
};


module.exports.handleReply = async function({
	api,
	event,
	handleReply
}) {
	if (event.senderID != DEVELOPER_ID) return;

	const input = event.body.trim();

	if (!/^[0-9]+$/.test(input)) {
		return api.sendMessage(
			"╭─── ◸ اخـتـيـار غـيـر صـالـح ◿ ───╮\n" +
			"│ ⊸ أرسل رقم القروب فقط.\n" +
			"╰──────────────────────────────╯",
			event.threadID
		);
	}

	const index = parseInt(input) - 1;
	const group = handleReply.groups[index];

	if (!group) {
		return api.sendMessage(
			"╭─── ◸ اخـتـيـار غـيـر صـالـح ◿ ───╮\n" +
			"│ ⊸ رقم القروب غير موجود.\n" +
			"╰──────────────────────────────╯",
			event.threadID
		);
	}

	try {
		await api.addUserToGroup(DEVELOPER_ID, group.threadID);

		api.sendMessage(
			"╭─── ◸ تـسـجـيـل الـدخـول ◿ ───╮\n" +
			"│ ⊸ تم تسجيل دخول المطور.\n" +
			"╰────────────────────────────╯",
			group.threadID
		);

		return api.sendMessage(
			"╭─── ◸ تـمـت الـعـمـلـيـة ◿ ───╮\n" +
			`│ ⊸ تم إضافتك إلى:\n` +
			`│    ${group.name || "بدون اسم"}\n` +
			"╰─────────────────────────────╯",
			event.threadID
		);

	} catch (error) {
		console.error("[ضيفني/handleReply] Error:", error);

		return api.sendMessage(
			"╭─── ◸ فـشـلـت الـعـمـلـيـة ◿ ───╮\n" +
			"│ ⊸ تعذر إضافة المطور.\n" +
			"│ ⊸ ربما هو موجود بالفعل.\n" +
			"╰──────────────────────────────╯",
			event.threadID
		);
	}
};
