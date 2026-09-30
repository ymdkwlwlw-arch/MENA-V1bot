const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
	name: "تيكتوك",
	version: "2.0.0",
	hasPermssion: 0,
	credits: "DANTE",
	description: "البحث عن فيديوهات تيك توك وإرسالها",
	usePrefix: true,
	commandCategory: "الوسائط",
	usages: "تيكتوك [كلمة البحث]",
	cooldowns: 10
};

module.exports.run = async function({ api, event, args }) {
	const {
		threadID,
		messageID
	} = event;

	const searchQuery = args.join(" ").trim();

	// =========================
	// التحقق من البحث
	// =========================

	if (!searchQuery) {
		return api.sendMessage(
			"╮── ▽ 「 تنبيه 」\n" +
			"│ يرجى كتابة ما تريد البحث عنه ○\n" +
			"╯────────────── 🝓",
			threadID,
			messageID
		);
	}

	let loadingMessage = null;
	let filePath = null;

	try {

		// =========================
		// حالة البحث
		// =========================

		api.setMessageReaction(
			"📥",
			messageID,
			() => {},
			true
		);

		const loadingMsg =
			"╮─────── 🝓 ───────╭\n" +
			"   𝖳𝖨𝖪𝖳𝖮𝖪  𝖲𝖤𝖠𝖱𝖢𝖧\n" +
			"╯─────── 🝓 ───────╰\n" +
			`│ ⌑ البحث : ${searchQuery}\n` +
			"│ ⌑ الحالة : جاري البحث عن فيديو...\n" +
			"╯────────────── 🝓";

		loadingMessage = await api.sendMessage(
			loadingMsg,
			threadID
		);


		// =========================
		// البحث في TikTok API
		// =========================

		const response = await axios.get(
			"https://www.tikwm.com/api/feed/search",
			{
				params: {
					keywords: searchQuery,
					count: 1,
					cursor: 0
				},
				timeout: 30000
			}
		);

		const videos =
			response?.data?.data?.videos || [];

		const videoData = videos[0];


		// =========================
		// لا توجد نتائج
		// =========================

		if (!videoData) {

			if (loadingMessage?.messageID) {
				try {
					await api.unsendMessage(
						loadingMessage.messageID
					);
				} catch (e) {}
			}

			return api.sendMessage(
				"لم يتم العثور على نتائج لهذا البحث.",
				threadID,
				messageID
			);
		}


		// =========================
		// إنشاء مجلد Cache
		// =========================

		const cacheDir =
			path.join(__dirname, "cache");

		if (!fs.existsSync(cacheDir)) {
			fs.ensureDirSync(cacheDir);
		}


		// =========================
		// تحميل الفيديو
		// =========================

		filePath = path.join(
			cacheDir,
			`tiktok_${Date.now()}.mp4`
		);

		const videoUrl =
			videoData.play ||
			videoData.wmplay;

		if (!videoUrl) {
			throw new Error(
				"لم يتم العثور على رابط الفيديو"
			);
		}

		const videoResponse =
			await axios.get(
				videoUrl,
				{
					responseType: "arraybuffer",
					timeout: 60000,
					maxContentLength: Infinity,
					maxBodyLength: Infinity
				}
			);

		fs.writeFileSync(
			filePath,
			Buffer.from(videoResponse.data)
		);


		// =========================
		// إنهاء حالة البحث
		// =========================

		if (loadingMessage?.messageID) {
			try {
				await api.unsendMessage(
					loadingMessage.messageID
				);
			} catch (e) {}
		}

		api.setMessageReaction(
			"✅",
			messageID,
			() => {},
			true
		);


		// =========================
		// معلومات الفيديو
		// =========================

		const title =
			videoData.title ||
			"بدون وصف";

		const author =
			videoData.author?.unique_id ||
			"غير معروف";

		const report =
			"╮─────── 🝓 ───────╭\n" +
			"   𝖳𝖨𝖪𝖳𝖮𝖪  𝖲𝖤𝖠𝖱𝖢𝖧\n" +
			"╯─────── 🝓 ───────╰\n" +
			`│ ⌑ الوصف : ${title.substring(0, 40)}...\n` +
			`│ ⌑ الحساب : @${author}\n` +
			"│ ⌑ المطور : DANTE\n" +
			"╯────────────── 🝓";


		// =========================
		// إرسال الفيديو
		// =========================

		return api.sendMessage(
			{
				body: report,
				attachment: fs.createReadStream(filePath)
			},
			threadID,
			() => {

				try {
					if (
						filePath &&
						fs.existsSync(filePath)
					) {
						fs.unlinkSync(filePath);
					}
				} catch (e) {}

			},
			messageID
		);

	} catch (err) {

		console.error(
			"[TIKTOK SEARCH]",
			err
		);

		// حذف رسالة الانتظار
		if (loadingMessage?.messageID) {
			try {
				await api.unsendMessage(
					loadingMessage.messageID
				);
			} catch (e) {}
		}

		// تنظيف الفيديو إذا تم إنشاؤه
		if (filePath && fs.existsSync(filePath)) {
			try {
				fs.unlinkSync(filePath);
			} catch (e) {}
		}

		api.setMessageReaction(
			"❌",
			messageID,
			() => {},
			true
		);

		return api.sendMessage(
			"حدث خطأ أثناء محاولة جلب الفيديو.",
			threadID,
			messageID
		);
	}
};
