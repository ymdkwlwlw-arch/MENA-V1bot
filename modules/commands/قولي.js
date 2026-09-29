const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "قولي",
    aliases: ["say", "صوت"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "تحويل النص إلى رسالة صوتية",
    usePrefix: true,
    commandCategory: "message",
    usages: "قولي النص",
    cooldowns: 5
};

module.exports.run = async function ({
    api,
    event,
    args
}) {
    try {
        const {
            threadID,
            senderID,
            messageID
        } = event;

        const cacheDir =
            path.join(__dirname, "cache");

        await fs.ensureDir(cacheDir);

        const content =
            event.type === "message_reply"
                ? event.messageReply.body
                : args.join(" ");

        if (!content || !content.trim()) {
            return api.sendMessage(
                "اكتب النص الذي تريد تحويله إلى صوت.",
                threadID,
                messageID
            );
        }

        let language = global.config.language || "ar";
        let text = content.trim();

        /*
         * يمكن تحديد اللغة في بداية النص:
         * en مرحبا
         * ru مرحبا
         * ko مرحبا
         * ja مرحبا
         * tl مرحبا
         */

        const languageMatch =
            text.match(/^(ru|en|ko|ja|tl)\s+/i);

        if (languageMatch) {
            language =
                languageMatch[1].toLowerCase();

            text =
                text
                    .slice(languageMatch[0].length)
                    .trim();
        }

        if (!text) {
            return api.sendMessage(
                "لم يتم العثور على نص لتحويله إلى صوت.",
                threadID,
                messageID
            );
        }

        const filePath =
            path.join(
                cacheDir,
                `say_${threadID}_${senderID}_${Date.now()}.mp3`
            );

        const url =
            "https://translate.google.com/translate_tts" +
            `?ie=UTF-8&q=${encodeURIComponent(text)}` +
            `&tl=${encodeURIComponent(language)}` +
            "&client=tw-ob";

        await global.utils.downloadFile(
            url,
            filePath
        );

        if (!(await fs.pathExists(filePath))) {
            throw new Error(
                "تعذر إنشاء ملف الصوت."
            );
        }

        return api.sendMessage(
            {
                attachment:
                    fs.createReadStream(filePath)
            },
            threadID,
            async () => {
                try {
                    await fs.remove(filePath);
                } catch {}
            },
            messageID
        );

    } catch (error) {
        console.error(
            "[قولي] Error:",
            error
        );

        return api.sendMessage(
            `حدث خطأ أثناء تحويل النص إلى صوت.\nالسبب: ${error.message || "غير معروف"}`,
            event.threadID,
            event.messageID
        );
    }
};
