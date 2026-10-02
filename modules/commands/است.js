module.exports.config = {
	name: "است",
	version: "2.0.0",
	hasPermssion: 2,
	credits: "Mustapha",
	description: "عرض قروبات البوت مع إمكانية الخروج أو الحظر",
	usePrefix: true,
	commandCategory: "المطور",
	usages: "است",
	cooldowns: 5
};

const fs = require("fs");
const path = require("path");

const DEVELOPER_ID = "61593958054356";
const BLOCK_FILE = path.join(__dirname, "است_محظورة.json");


/* ╭─── ◸ نـظـام الـحـظـر ◿ ───╮ */

function loadBlockedGroups() {
	try {
		if (!fs.existsSync(BLOCK_FILE)) {
			fs.writeFileSync(BLOCK_FILE, JSON.stringify([], null, 2));
			return [];
		}

		const data = JSON.parse(
			fs.readFileSync(BLOCK_FILE, "utf8")
		);

		return Array.isArray(data) ? data : [];

	} catch (error) {
		console.error("[است] Load Block Error:", error);
		return [];
	}
}


function saveBlockedGroups(groups) {
	try {
		fs.writeFileSync(
			BLOCK_FILE,
			JSON.stringify(groups, null, 2)
		);
	} catch (error) {
		console.error("[است] Save Block Error:", error);
	}
}


function isBlocked(threadID) {
	const blocked = loadBlockedGroups();

	return blocked.some(
		group => String(group.threadID) === String(threadID)
	);
}


function blockGroup(group) {
	const blocked = loadBlockedGroups();

	if (!blocked.some(
		item => String(item.threadID) === String(group.threadID)
	)) {
		blocked.push({
			threadID: group.threadID,
			name: group.name || "بدون اسم",
			date: new Date().toISOString()
		});

		saveBlockedGroups(blocked);
	}
}


/* ╭─── ◸ الـقـائـمـة ◿ ───╮ */

module.exports.run = async function({
	api,
	event
}) {

	if (event.senderID != DEVELOPER_ID) {
		return api.sendMessage(
			"╭─── ◸ تـنـبـيـه ◿ ───╮\n" +
			"│ ⊸ هذا الأمر مخصص للمطور فقط.\n" +
			"╰────────────────────╯",
			event.threadID
		);
	}

	try {

		const threads = await api.getThreadList(
			100,
			null,
			["INBOX"]
		);

		let groups = threads.filter(thread =>
			thread.isGroup &&
			!isBlocked(thread.threadID)
		);


		if (!groups.length) {

			return api.sendMessage(
				"╭─── ◸ الـقـروبـات ◿ ───╮\n" +
				"│\n" +
				"│ ⊸ لا توجد قروبات متاحة.\n" +
				"│\n" +
				"╰─────────────────────╯",
				event.threadID
			);
		}


		let msg =
			"╭─── ◸ قـائـمـة الـقـروبـات ◿ ───╮\n" +
			"│\n";


		groups.forEach((group, index) => {

			msg +=
				`│ ⊸ ${index + 1}. ${group.name || "بدون اسم"}\n` +
				`│    ID: ${group.threadID}\n`;

			if (index < groups.length - 1) {
				msg += "│    ───────────────\n";
			}
		});


		msg +=
			"│\n" +
			"╰────────────────────────────╯\n" +
			"✦ الحظر: 8حظر\n" +
			"✦ الخروج: خروج8";


		return api.sendMessage(
			msg,
			event.threadID,
			(err, info) => {

				if (err || !info) return;

				global.client.handleReply.push({

					name: "است",

					messageID: info.messageID,

					author: event.senderID,

					groups: groups
				});
			}
		);

	} catch (error) {

		console.error("[است] Error:", error);

		return api.sendMessage(
			"╭─── ◸ خـطـأ ◿ ───╮\n" +
			"│ ⊸ تعذر جلب قائمة القروبات.\n" +
			"╰─────────────────╯",
			event.threadID
		);
	}
};


/* ╭─── ◸ الـتـنـفـيـذ ◿ ───╮ */

module.exports.handleReply = async function({
	api,
	event,
	handleReply
}) {

	if (event.senderID != DEVELOPER_ID) return;

	const input = event.body.trim();


	/*
		الصيغ المدعومة:

		8حظر
		حظر8

		خروج8
		8خروج
	*/

	let action = null;
	let number = null;


	let match = input.match(/^([0-9]+)(حظر|خروج)$/);

	if (match) {
		number = parseInt(match[1]);
		action = match[2];
	}


	if (!action) {

		match = input.match(/^(حظر|خروج)([0-9]+)$/);

		if (match) {
			action = match[1];
			number = parseInt(match[2]);
		}
	}


	if (!action || !number) {

		return api.sendMessage(
			"╭─── ◸ اخـتـيـار غـيـر صـالـح ◿ ───╮\n" +
			"│ ⊸ استخدم إحدى الصيغ التالية:\n" +
			"│\n" +
			"│ ⊸ 8حظر\n" +
			"│ ⊸ خروج8\n" +
			"│\n" +
			"╰──────────────────────────────╯",
			event.threadID
		);
	}


	const index = number - 1;
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

		/*
			إذا اختار حظر:
			نحفظ القروب في ملف الحظر
			ثم نخرج البوت منه.
		*/

		if (action === "حظر") {

			blockGroup(group);

			try {

				await api.removeUserFromGroup(
					api.getCurrentUserID(),
					group.threadID
				);

			} catch (leaveError) {

				console.error(
					"[است] Block Leave Error:",
					leaveError
				);
			}


			return api.sendMessage(
				"╭─── ◸ تـم الـحـظـر ◿ ───╮\n" +
				`│ ⊸ القروب: ${group.name || "بدون اسم"}\n` +
				`│ ⊸ ID: ${group.threadID}\n` +
				"│ ⊸ تم إخراج البوت.\n" +
				"│ ⊸ لن يظهر القروب في القائمة مرة أخرى.\n" +
				"╰────────────────────────────╯",
				event.threadID
			);
		}


		/*
			الخروج فقط بدون حفظه كقروب محظور.
		*/

		if (action === "خروج") {

			await api.removeUserFromGroup(
				api.getCurrentUserID(),
				group.threadID
			);


			return api.sendMessage(
				"╭─── ◸ تـم الـخـروج ◿ ───╮\n" +
				`│ ⊸ القروب: ${group.name || "بدون اسم"}\n` +
				`│ ⊸ ID: ${group.threadID}\n` +
				"│ ⊸ تم إخراج البوت بنجاح.\n" +
				"╰────────────────────────────╯",
				event.threadID
			);
		}


	} catch (error) {

		console.error(
			"[است/handleReply] Error:",
			error
		);


		return api.sendMessage(
			"╭─── ◸ فـشـلـت الـعـمـلـيـة ◿ ───╮\n" +
			`│ ⊸ القروب: ${group.name || "بدون اسم"}\n` +
			"│ ⊸ تعذر تنفيذ العملية.\n" +
			"╰──────────────────────────────╯",
			event.threadID
		);
	}
};
