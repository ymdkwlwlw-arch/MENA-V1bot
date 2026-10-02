module.exports.config = {
	name: "طلبات",
	version: "1.0.0",
	hasPermssion: 2,
	credits: "Mustapha",
	description: "عرض طلبات إضافة البوت للمجموعات وقبولها",
	usePrefix: true,
	commandCategory: "المطور",
	usages: "طلبات",
	cooldowns: 5
};

const DEVELOPER_ID = "61593958054356";


/* ╭─── ◸ قـائـمـة الـطـلـبـات ◿ ───╮ */

module.exports.run = async function({
	api,
	event
}) {

	if (String(event.senderID) !== DEVELOPER_ID) {
		return api.sendMessage(
			"╭─── ◸ تـنـبـيـه ◿ ───╮\n" +
			"│ ⊸ هذا الأمر مخصص للمطور فقط.\n" +
			"╰────────────────────╯",
			event.threadID
		);
	}

	try {

		/*
			[PENDING]
			تجلب المحادثات الموجودة في الطلبات.
		*/

		const threads = await api.getThreadList(
			100,
			null,
			["PENDING"]
		);

		const requests = threads.filter(thread =>
			thread.isGroup
		);


		if (!requests.length) {

			return api.sendMessage(
				"╭─── ◸ طـلـبـات الـانـضـمـام ◿ ───╮\n" +
				"│\n" +
				"│ ⊸ لا توجد طلبات انضمام حالياً.\n" +
				"│\n" +
				"╰────────────────────────────╯",
				event.threadID
			);
		}


		let msg =
			"╭─── ◸ طـلـبـات الـانـضـمـام ◿ ───╮\n" +
			"│\n";


		requests.forEach((group, index) => {

			msg +=
				`│ ⊸ ${index + 1}. ${group.name || "بدون اسم"}\n` +
				`│    ID: ${group.threadID}\n`;

			if (index < requests.length - 1) {
				msg += "│    ───────────────\n";
			}
		});


		msg +=
			"│\n" +
			"╰────────────────────────────╯\n" +
			"✦ القبول: قبول8";


		return api.sendMessage(
			msg,
			event.threadID,
			(err, info) => {

				if (err || !info) return;

				global.client.handleReply.push({

					name: "طلبات",

					messageID: info.messageID,

					author: event.senderID,

					requests: requests
				});
			}
		);

	} catch (error) {

		console.error("[طلبات] Error:", error);

		return api.sendMessage(
			"╭─── ◸ خـطـأ ◿ ───╮\n" +
			"│ ⊸ تعذر جلب طلبات الانضمام.\n" +
			"│ ⊸ تأكد أن إصدار API يدعم PENDING.\n" +
			"╰─────────────────╯",
			event.threadID
		);
	}
};


/* ╭─── ◸ الـقـبـول ◿ ───╮ */

module.exports.handleReply = async function({
	api,
	event,
	handleReply
}) {

	if (String(event.senderID) !== DEVELOPER_ID) return;

	const input = event.body.trim();


	/*
		الصيغة:

		8قبول
		قبول8
	*/

	let number = null;


	let match = input.match(/^([0-9]+)قبول$/);

	if (match) {
		number = parseInt(match[1]);
	}


	if (!number) {

		match = input.match(/^قبول([0-9]+)$/);

		if (match) {
			number = parseInt(match[1]);
		}
	}


	if (!number) {

		return api.sendMessage(
			"╭─── ◸ اخـتـيـار غـيـر صـالـح ◿ ───╮\n" +
			"│ ⊸ استخدم إحدى الصيغ التالية:\n" +
			"│\n" +
			"│ ⊸ 8قبول\n" +
			"│ ⊸ قبول8\n" +
			"│\n" +
			"╰──────────────────────────────╯",
			event.threadID
		);
	}


	const index = number - 1;
	const group = handleReply.requests[index];


	if (!group) {

		return api.sendMessage(
			"╭─── ◸ اخـتـيـار غـيـر صـالـح ◿ ───╮\n" +
			"│ ⊸ رقم الطلب غير موجود.\n" +
			"╰──────────────────────────────╯",
			event.threadID
		);
	}


	try {

		/*
			قبول طلب المحادثة.

			true = قبول ونقل الطلب إلى INBOX.
		*/

		await api.handleMessageRequest(
			group.threadID,
			true
		);


		/*
			بعد القبول:
			نرسل رسالة ترحيب داخل المجموعة.
		*/

		try {

			await api.sendMessage(
				"╭─── ◸ تـم قـبـول الـطـلـب ◿ ───╮\n" +
				"│\n" +
				"│ ⊸ أهلاً بكم، تم قبول طلب إضافة البوت.\n" +
				"│ ⊸ البوت جاهز للعمل الآن.\n" +
				"│\n" +
				"╰────────────────────────────╯",
				group.threadID
			);

		} catch (sendError) {

			console.error(
				"[طلبات] Welcome Message Error:",
				sendError
			);
		}


		return api.sendMessage(
			"╭─── ◸ تـم الـقـبـول ◿ ───╮\n" +
			`│ ⊸ القروب: ${group.name || "بدون اسم"}\n` +
			`│ ⊸ ID: ${group.threadID}\n` +
			"│ ⊸ تم قبول الطلب بنجاح.\n" +
			"│ ⊸ البوت يعمل الآن داخل المجموعة.\n" +
			"╰────────────────────────────╯",
			event.threadID
		);

	} catch (error) {

		console.error(
			"[طلبات/handleReply] Error:",
			error
		);


		return api.sendMessage(
			"╭─── ◸ فـشـلـت الـعـمـلـيـة ◿ ───╮\n" +
			`│ ⊸ القروب: ${group.name || "بدون اسم"}\n` +
			`│ ⊸ ID: ${group.threadID}\n` +
			"│ ⊸ تعذر قبول الطلب.\n" +
			"╰──────────────────────────────╯",
			event.threadID
		);
	}
};
