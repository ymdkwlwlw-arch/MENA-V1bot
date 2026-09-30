const axios = require("axios");
const FormData = require("form-data");

module.exports.config = {
    name: "ocr",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "استخراج النص من الصور وتحويله إلى نص",
    usePrefix: true,
    commandCategory: "خدمات",
    usages: "ocr + الرد على صورة",
    cooldowns: 5
};

const OCR_API = "https://api.ocr.space/parse/image";

module.exports.run = async function ({ api, event }) {
    try {
        let imageUrl = null;

        /*
         * الحالة الأولى:
         * المستخدم يرد على صورة.
         */
        if (
            event.messageReply &&
            event.messageReply.attachments &&
            event.messageReply.attachments.length > 0
        ) {
            const attachment = event.messageReply.attachments.find(
                item =>
                    item.type === "photo" ||
                    item.type === "image"
            );

            if (attachment) {
                imageUrl = attachment.url || attachment.largePreviewUrl;
            }
        }

        /*
         * الحالة الثانية:
         * المستخدم أرسل صورة مباشرة مع الأمر.
         */
        if (!imageUrl && event.attachments) {
            const attachment = event.attachments.find(
                item =>
                    item.type === "photo" ||
                    item.type === "image"
            );

            if (attachment) {
                imageUrl = attachment.url || attachment.largePreviewUrl;
            }
        }

        if (!imageUrl) {
            return api.sendMessage(
`╭─── ◸ خـدمـة OCR ◿ ───╮

⊸ أرسل صورة مع الأمر:

/ocr

أو قم بالرد على صورة بـ:

/ocr

⊸ سيتم استخراج النص الموجود داخل الصورة.

╰────────────────────╯`,
                event.threadID,
                event.messageID
            );
        }

        const form = new FormData();

        form.append("url", imageUrl);
        form.append("language", "ara");
        form.append("isOverlayRequired", "false");
        form.append("detectOrientation", "true");
        form.append("scale", "true");
        form.append("OCREngine", "2");

        const response = await axios.post(
            OCR_API,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    apikey: "helloworld"
                },
                timeout: 30000,
                maxContentLength: 15 * 1024 * 1024,
                maxBodyLength: 15 * 1024 * 1024
            }
        );

        const data = response.data;

        if (!data || data.IsErroredOnProcessing) {
            const error =
                Array.isArray(data?.ErrorMessage)
                    ? data.ErrorMessage.join(" ")
                    : data?.ErrorMessage || "تعذر معالجة الصورة.";

            return api.sendMessage(
`╭─── ◸ فـشـل OCR ◿ ───╮

⊸ ${error}

╰────────────────────╯`,
                event.threadID,
                event.messageID
            );
        }

        const results = data.ParsedResults || [];

        const text = results
            .map(item => item.ParsedText || "")
            .join("\n")
            .trim();

        if (!text) {
            return api.sendMessage(
`╭─── ◸ نـتـيـجـة OCR ◿ ───╮

⊸ لم أجد نصًا واضحًا داخل الصورة.

⊸ جرّب صورة أوضح أو بدقة أعلى.

╰────────────────────╯`,
                event.threadID,
                event.messageID
            );
        }

        const cleanedText = text
            .replace(/\r/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        return api.sendMessage(
`╭─── ◸ الـنـص الـمـسـتـخـرج ◿ ───╮

${cleanedText}

╰────────────────────────╯`,
            event.threadID,
            event.messageID
        );

    } catch (error) {
        console.error("[OCR ERROR]", error);

        return api.sendMessage(
`╭─── ◸ خـطـأ OCR ◿ ───╮

⊸ حدث خطأ أثناء قراءة الصورة.

⊸ تأكد من أن الصورة واضحة وحاول مرة أخرى.

╰────────────────────╯`,
            event.threadID,
            event.messageID
        );
    }
};
