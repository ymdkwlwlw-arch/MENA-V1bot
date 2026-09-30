const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
	name: "admin",
	version: "2.0.0",
	hasPermssion: 0,
	credits: "Mirai Team",
	description: "إدارة مطوري وأدمن البوت",
	usePrefix: true,
	commandCategory: "المطور",
	usages: "list / add / remove / only / boxonly / status / help",
	cooldowns: 5,

	dependencies: {
		"fs-extra": ""
	}
};


// ═══════════════════════════════════════
// اللغات
// ═══════════════════════════════════════

module.exports.languages = {

	"ar": {

		listAdmin:
			"╭─── ◸ قـائـمـة الإدارة ◿ ───╮\n" +
			"%1\n" +
			"╰────────────────────────╯",

		notHavePermssion:
			"╭─── ◸ مـرفـوض ◿ ───╮\n" +
			"│ ⊸ لا تملك صلاحية استخدام:\n" +
			"│    %1\n" +
			"╰───────────────────╯",

		addedNewAdmin:
			"╭─── ◸ تـمـت الإضـافـة ◿ ───╮\n" +
			"│ ⊸ العدد : %1\n" +
			"│\n" +
			"%2\n" +
			"╰──────────────────────────╯",

		removedAdmin:
			"╭─── ◸ تـمـت الإزالـة ◿ ───╮\n" +
			"│ ⊸ العدد : %1\n" +
			"│\n" +
			"%2\n" +
			"╰─────────────────────────╯"
	},

	"en": {

		listAdmin:
			"╭─── ◸ ADMIN LIST ◿ ───╮\n" +
			"%1\n" +
			"╰──────────────────────╯",

		notHavePermssion:
			"╭─── ◸ ACCESS DENIED ◿ ───╮\n" +
			"│ ⊸ Permission required:\n" +
			"│    %1\n" +
			"╰─────────────────────────╯",

		addedNewAdmin:
			"╭─── ◸ ADMIN ADDED ◿ ───╮\n" +
			"│ ⊸ Count: %1\n" +
			"│\n" +
			"%2\n" +
			"╰───────────────────────╯",

		removedAdmin:
			"╭─── ◸ ADMIN REMOVED ◿ ───╮\n" +
			"│ ⊸ Count: %1\n" +
			"│\n" +
			"%2\n" +
			"╰─────────────────────────╯"
	}
};


// ═══════════════════════════════════════
// تحميل قاعدة بيانات الأمر
// ═══════════════════════════════════════

module.exports.onLoad = function() {

	const {
		writeFileSync,
		existsSync,
		readJsonSync
	} = require("fs-extra");

	const cacheDir = path.join(
		__dirname,
		"cache"
	);

	const dataPath = path.join(
		cacheDir,
		"data.json"
	);

	if (!existsSync(cacheDir)) {
		require("fs-extra").ensureDirSync(cacheDir);
	}

	if (!existsSync(dataPath)) {

		writeFileSync(
			dataPath,
			JSON.stringify(
				{
					adminbox: {}
				},
				null,
				4
			)
		);

		return;
	}

	try {

		const data = readJsonSync(dataPath);

		if (!data.adminbox) {
			data.adminbox = {};
		}

		writeFileSync(
			dataPath,
			JSON.stringify(data, null, 4)
		);

	} catch (error) {

		console.error(
			"[ADMIN] Failed to load database:",
			error
		);

		writeFileSync(
			dataPath,
			JSON.stringify(
				{
					adminbox: {}
				},
				null,
				4
			)
		);
	}
};


// ═══════════════════════════════════════
// التنفيذ
// ═══════════════════════════════════════

module.exports.run = async function({
	api,
	event,
	args,
	Users,
	permssion,
	getText
}) {

	const {
		threadID,
		messageID,
		mentions = {}
	} = event;

	const {
		configPath
	} = global.client;

	const {
		ADMINBOT = []
	} = global.config;

	const {
		userName = {}
	} = global.data;

	const {
		writeFileSync,
		readJsonSync
	} = global.nodemodule["fs-extra"];

	const mentionIDs = Object.keys(mentions);

	// إعادة تحميل config
	delete require.cache[
		require.resolve(configPath)
	];

	const config = require(configPath);

	// تأمين المصفوفات
	if (!Array.isArray(config.ADMINBOT)) {
		config.ADMINBOT = [];
	}

	if (!Array.isArray(global.config.ADMINBOT)) {
		global.config.ADMINBOT = [];
	}


	// ═══════════════════════════════════
	// الدوال المساعدة
	// ═══════════════════════════════════

	const saveConfig = () => {

		writeFileSync(
			configPath,
			JSON.stringify(config, null, 4),
			"utf8"
		);
	};

	const saveGlobal = () => {

		global.config.ADMINBOT =
			[...new Set(
				global.config.ADMINBOT
					.map(String)
			)];

		config.ADMINBOT =
			[...new Set(
				config.ADMINBOT
					.map(String)
			)];
	};

	const isDeveloper =
		event.senderID === "100004253741257";

	const isBotAdmin =
		permssion === 2;

	const getTargets = () => {

		let targets = [];

		// Reply
		if (
			event.type === "message_reply" &&
			event.messageReply?.senderID
		) {
			targets.push(
				event.messageReply.senderID
			);
		}

		// Mentions
		if (mentionIDs.length > 0) {
			targets.push(...mentionIDs);
		}

		// IDs
		const directIDs = args
			.slice(1)
			.filter(id => /^\d+$/.test(id));

		targets.push(...directIDs);

		return [
			...new Set(
				targets.map(String)
			)
		];
	};


	// ═══════════════════════════════════
	// الأمر الفرعي
	// ═══════════════════════════════════

	const command =
		(args[0] || "help").toLowerCase();


	// ═══════════════════════════════════
	// HELP
	// ═══════════════════════════════════

	if (
		command === "help" ||
		command === "مساعدة"
	) {

		const msg =
			"╭────── ◸ ADMIN ◿ ──────╮\n" +
			"│\n" +
			"│ ⊸ admin list\n" +
			"│    عرض قائمة الإدارة\n" +
			"│\n" +
			"│ ⊸ admin add [ID]\n" +
			"│    إضافة أدمن\n" +
			"│\n" +
			"│ ⊸ admin remove [ID]\n" +
			"│    إزالة أدمن\n" +
			"│\n" +
			"│ ⊸ admin only\n" +
			"│    Admin Only للبوت\n" +
			"│\n" +
			"│ ⊸ admin boxonly\n" +
			"│    تقييد البوت على أدمن المجموعة\n" +
			"│\n" +
			"│ ⊸ admin status\n" +
			"│    عرض حالة النظام\n" +
			"│\n" +
			"╰────────────────────────╯";

		return api.sendMessage(
			msg,
			threadID,
			messageID
		);
	}


	// ═══════════════════════════════════
	// LIST
	// ═══════════════════════════════════

	if (
		command === "list" ||
		command === "all" ||
		command === "-a"
	) {

		const admins =
			[...new Set(
				(
					config.ADMINBOT ||
					ADMINBOT ||
					[]
				).map(String)
			)];

		if (admins.length === 0) {

			return api.sendMessage(
				"╭─── ◸ الإدارة ◿ ───╮\n" +
				"│ ⊸ لا يوجد أدمن مسجل.\n" +
				"╰───────────────────╯",
				threadID,
				messageID
			);
		}

		const list = [];

		for (
			let i = 0;
			i < admins.length;
			i++
		) {

			const id = admins[i];

			try {

				const data =
					await Users.getData(id);

				const name =
					data?.name ||
					"مستخدم غير معروف";

				list.push(
					`│ ${i + 1}. ${name}\n` +
					`│    ⊸ ${id}`
				);

			} catch {

				list.push(
					`│ ${i + 1}. مستخدم\n` +
					`│    ⊸ ${id}`
				);
			}
		}

		const msg =
			"╭──── ◸ قـائـمـة الإدارة ◿ ────╮\n" +
			"│\n" +
			list.join("\n") +
			"\n│\n" +
			`│ ⊸ العدد : ${admins.length}\n` +
			"╰────────────────────────────╯";

		return api.sendMessage(
			msg,
			threadID,
			messageID
		);
	}


	// ═══════════════════════════════════
	// STATUS
	// ═══════════════════════════════════

	if (
		command === "status" ||
		command === "حالة"
	) {

		const adminOnly =
			config.adminOnly === true;

		const dataPath =
			path.join(
				__dirname,
				"cache",
				"data.json"
			);

		let database = {
			adminbox: {}
		};

		try {
			database = readJsonSync(dataPath);
		} catch {}

		const boxOnly =
			database.adminbox?.[threadID] === true;

		const totalAdmins =
			[
				...new Set(
					(config.ADMINBOT || [])
						.map(String)
				)
			].length;

		const msg =
			"╭──── ◸ حـالـة الـنـظـام ◿ ────╮\n" +
			"│\n" +
			`│ ⊸ أدمن البوت : ${totalAdmins}\n` +
			`│ ⊸ Admin Only : ${adminOnly ? "مفعل" : "متوقف"}\n` +
			`│ ⊸ Box Only : ${boxOnly ? "مفعل" : "متوقف"}\n` +
			"│\n" +
			"╰────────────────────────────╯";

		return api.sendMessage(
			msg,
			threadID,
			messageID
		);
	}


	// ═══════════════════════════════════
	// ADD
	// ═══════════════════════════════════

	if (command === "add") {

		if (!isDeveloper) {

			return api.sendMessage(
				getText(
					"notHavePermssion",
					"add"
				),
				threadID,
				messageID
			);
		}

		if (permssion != 2) {

			return api.sendMessage(
				getText(
					"notHavePermssion",
					"add"
				),
				threadID,
				messageID
			);
		}

		const targets = getTargets();

		if (targets.length === 0) {

			return api.sendMessage(
				"╭─── ◸ إضـافـة ◿ ───╮\n" +
				"│ ⊸ اكتب ID أو اعمل منشن\n" +
				"│ ⊸ أو رد على رسالة المستخدم.\n" +
				"╰───────────────────╯",
				threadID,
				messageID
			);
		}

		const added = [];
		const exists = [];

		for (const id of targets) {

			if (
				config.ADMINBOT
					.map(String)
					.includes(id)
			) {
				exists.push(id);
				continue;
			}

			config.ADMINBOT.push(id);

			if (
				!global.config.ADMINBOT
					.map(String)
					.includes(id)
			) {
				global.config.ADMINBOT.push(id);
			}

			try {

				const data =
					await Users.getData(id);

				added.push(
					`│ ⊸ [ ${id} ] » ${data?.name || "مستخدم"}`
				);

			} catch {

				added.push(
					`│ ⊸ [ ${id} ]`
				);
			}
		}

		saveGlobal();
		saveConfig();

		let msg =
			"╭──── ◸ إضـافـة الإدارة ◿ ────╮\n" +
			"│\n";

		if (added.length) {
			msg += added.join("\n") + "\n";
		}

		if (exists.length) {
			msg +=
				"│\n" +
				`│ ⊸ موجود مسبقًا : ${exists.length}\n`;
		}

		msg +=
			"│\n" +
			"╰────────────────────────────╯";

		return api.sendMessage(
			msg,
			threadID,
			messageID
		);
	}


	// ═══════════════════════════════════
	// REMOVE
	// ═══════════════════════════════════

	if (
		command === "remove" ||
		command === "rm" ||
		command === "delete"
	) {

		if (!isDeveloper) {

			return api.sendMessage(
				getText(
					"notHavePermssion",
					"remove"
				),
				threadID,
				messageID
			);
		}

		if (permssion != 2) {

			return api.sendMessage(
				getText(
					"notHavePermssion",
					"remove"
				),
				threadID,
				messageID
			);
		}

		const targets = getTargets();

		if (targets.length === 0) {

			return api.sendMessage(
				"╭─── ◸ إزالـة ◿ ───╮\n" +
				"│ ⊸ اكتب ID أو اعمل منشن\n" +
				"│ ⊸ أو رد على رسالة المستخدم.\n" +
				"╰──────────────────╯",
				threadID,
				messageID
			);
		}

		const removed = [];
		const notFound = [];

		for (const id of targets) {

			const index =
				config.ADMINBOT
					.map(String)
					.indexOf(id);

			if (index === -1) {

				notFound.push(id);
				continue;
			}

			config.ADMINBOT.splice(
				index,
				1
			);

			const globalIndex =
				global.config.ADMINBOT
					.map(String)
					.indexOf(id);

			if (globalIndex !== -1) {

				global.config.ADMINBOT.splice(
					globalIndex,
					1
				);
			}

			try {

				const data =
					await Users.getData(id);

				removed.push(
					`│ ⊸ [ ${id} ] » ${data?.name || "مستخدم"}`
				);

			} catch {

				removed.push(
					`│ ⊸ [ ${id} ]`
				);
			}
		}

		saveGlobal();
		saveConfig();

		let msg =
			"╭──── ◸ إزالـة الإدارة ◿ ────╮\n" +
			"│\n";

		if (removed.length) {
			msg += removed.join("\n") + "\n";
		}

		if (notFound.length) {
			msg +=
				"│\n" +
				`│ ⊸ غير موجود : ${notFound.length}\n`;
		}

		msg +=
			"│\n" +
			"╰────────────────────────────╯";

		return api.sendMessage(
			msg,
			threadID,
			messageID
		);
	}


	// ═══════════════════════════════════
	// ADMIN ONLY
	// ═══════════════════════════════════

	if (command === "only") {

		if (!isDeveloper) {

			return api.sendMessage(
				getText(
					"notHavePermssion",
					"only"
				),
				threadID,
				messageID
			);
		}

		config.adminOnly =
			config.adminOnly !== true;

		saveConfig();

		return api.sendMessage(
			"╭─── ◸ Admin Only ◿ ───╮\n" +
			`│ ⊸ الحالة : ${
				config.adminOnly
					? "تم التفعيل"
					: "تم الإيقاف"
			}\n` +
			"╰──────────────────────╯",
			threadID,
			messageID
		);
	}


	// ═══════════════════════════════════
	// BOX ONLY
	// ═══════════════════════════════════

	if (command === "boxonly") {

		if (!isDeveloper) {

			return api.sendMessage(
				getText(
					"notHavePermssion",
					"boxonly"
				),
				threadID,
				messageID
			);
		}

		const dataPath =
			path.join(
				__dirname,
				"cache",
				"data.json"
			);

		let database;

		try {
			database =
				fs.readJsonSync(dataPath);
		} catch {
			database = {
				adminbox: {}
			};
		}

		if (!database.adminbox) {
			database.adminbox = {};
		}

		database.adminbox[threadID] =
			database.adminbox[threadID] !== true;

		fs.writeJsonSync(
			dataPath,
			database,
			{
				spaces: 4
			}
		);

		return api.sendMessage(
			"╭─── ◸ Box Only ◿ ───╮\n" +
			`│ ⊸ الحالة : ${
				database.adminbox[threadID]
					? "تم التفعيل"
					: "تم الإيقاف"
			}\n` +
			"│\n" +
			"│ ⊸ عند التفعيل، يتم تقييد\n" +
			"│    استخدام البوت على أدمن المجموعة.\n" +
			"╰────────────────────╯",
			threadID,
			messageID
		);
	}


	// ═══════════════════════════════════
	// أمر غير معروف
	// ═══════════════════════════════════

	return api.sendMessage(
		"╭─── ◸ ADMIN ◿ ───╮\n" +
		"│ ⊸ الأمر غير معروف.\n" +
		"│ ⊸ استخدم: admin help\n" +
		"╰─────────────────╯",
		threadID,
		messageID
	);
};
