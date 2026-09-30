const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const dataPath = path.join(__dirname, "cache", "antilink.json");

const DEVELOPER_ID = "61593519041412";

module.exports.config = {
	name: "antilink",
	version: "3.0.0",
	hasPermssion: 1,
	credits: "ᎠᎯᎢᎬ ᏚᎮᎯᏒᎠᎯ",
	description: "منع الروابط مع استثناء المطور والأدمن",
	usePrefix: true,
	commandCategory: "الحماية",
	usages: "antilink on/off",
	cooldowns: 3
};


module.exports.run = async function({ api, event, args }) {
	const { threadID, senderID } = event;

	try {
		// إنشاء مجلد cache إذا لم يكن موجودًا
		const cachePath = path.dirname(dataPath);

		if (!fs.existsSync(cachePath)) {
			fs.ensureDirSync(cachePath);
		}

		// إنشاء قاعدة البيانات
		if (!fs.existsSync(dataPath)) {
			fs.writeJsonSync(dataPath, {});
		}

		const data = fs.readJsonSync(dataPath);

		// معلومات المجموعة
		const threadInfo = await api.getThreadInfo(threadID);

		const admins = (threadInfo.adminIDs || []).map(
			admin => admin.id
		);

		// المطور أو مسؤول المجموعة فقط
		const isDeveloper = senderID === DEVELOPER_ID;
		const isAdmin = admins.includes(senderID);

		if (!isAdmin && !isDeveloper) {
			return api.sendMessage(
				"هذا الأمر للأدمن فقط يا عب (⌣̀_𓁹)",
				threadID
			);
		}


		// =========================
		// تفعيل النظام
		// =========================

		if (args[0] === "on") {
			data[threadID] = true;

			fs.writeJsonSync(
				dataPath,
				data,
				{ spaces: 2 }
			);

			return api.sendMessage(
				"كدا اشيف واحد يلز رابط ʕᵕ᷄-ᵕ᷅ʔ",
				threadID
			);
		}


		// =========================
		// إيقاف النظام
		// =========================

		if (args[0] === "off") {
			data[threadID] = false;

			fs.writeJsonSync(
				dataPath,
				data,
				{ spaces: 2 }
			);

			return api.sendMessage(
				"✅ تم إيقاف نظام مكافحة الروابط.",
				threadID
			);
		}


		// =========================
		// استخدام خاطئ
		// =========================

		return api.sendMessage(
			"استخدم: antilink on أو off",
			threadID
		);

	} catch (error) {
		console.error("[ANTILINK COMMAND]", error);

		return api.sendMessage(
			"⚠️ حدث خطأ أثناء تنفيذ الأمر.",
			threadID
		);
	}
};


module.exports.handleEvent = async function({ api, event }) {
	const {
		threadID,
		senderID,
		body,
		messageID
	} = event;

	if (!body) return;

	try {
		// لا توجد قاعدة بيانات
		if (!fs.existsSync(dataPath)) return;

		const data = fs.readJsonSync(dataPath);

		// النظام غير مفعل في هذه المجموعة
		if (!data[threadID]) return;


		// =========================
		// اكتشاف الروابط
		// =========================

		const linkRegex =
			/(https?:\/\/|www\.|facebook\.com|me\.me|t\.me|bit\.ly)/i;

		if (!linkRegex.test(body)) return;


		const botID = api.getCurrentUserID();

		const threadInfo =
			await api.getThreadInfo(threadID);

		const admins =
			(threadInfo.adminIDs || []).map(
				admin => admin.id
			);


		// =========================
		// استثناء المطور
		// =========================

		if (senderID === DEVELOPER_ID) {
			return api.sendMessage(
				"👑\nʕᵕ᷄-ᵕ᷅ʔ",
				threadID,
				messageID
			);
		}


		// =========================
		// استثناء الأدمن والبوت
		// =========================

		if (
			admins.includes(senderID) ||
			senderID === botID
		) {
			return;
		}


		// =========================
		// تفاعل مع الرسالة
		// =========================

		api.setMessageReaction(
			"❌",
			messageID,
			() => {},
			true
		);


		// =========================
		// التأكد من أن البوت أدمن
		// =========================

		const isBotAdmin =
			admins.includes(botID);

		if (!isBotAdmin) return;


		// =========================
		// حذف الرسالة
		// =========================

		try {
			await api.unsendMessage(messageID);
		} catch (error) {
			// تجاهل خطأ حذف الرسالة
		}


		// =========================
		// الطرد
		// =========================

		setTimeout(async () => {
			try {

				const imageUrl =
					"https://i.ibb.co/bg9N9sqb/received-1070178788428323-jpeg.jpg";

				const imagePath = path.join(
					__dirname,
					"cache",
					`kick_${senderID}.jpg`
				);


				// تحميل الصورة
				const response = await axios.get(
					imageUrl,
					{
						responseType: "arraybuffer"
					}
				);


				fs.writeFileSync(
					imagePath,
					Buffer.from(response.data, "binary")
				);


				// طرد العضو
				api.removeUserFromGroup(
					senderID,
					threadID,
					(err) => {

						if (err) {
							console.error(
								"[ANTILINK KICK]",
								err
							);

							return;
						}


						// إرسال الرسالة والصورة
						api.sendMessage(
							{
								body: "برا احش الضاف جدك 🦧📿",
								attachment:
									fs.createReadStream(imagePath)
							},
							threadID,
							() => {

								// تنظيف الملف المؤقت
								try {
									if (
										fs.existsSync(
											imagePath
										)
									) {
										fs.unlinkSync(
											imagePath
										);
									}
								} catch (error) {}

							}
						);
					}
				);

			} catch (error) {
				console.error(
					"خطأ في نظام الانتي لينك:",
					error
				);
			}

		}, 1500);

	} catch (error) {
		console.error(
			"[ANTILINK EVENT]",
			error
		);
	}
};
