const axios = require("axios");

module.exports.config = {
    name: "رفع",
    aliases: ["رفعلي", "upload"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "DANTE SPARDA | تطوير: KIROS",
    description: "رفع الوسائط المرفقة والحصول على رابط مباشر",
    usePrefix: true,
    commandCategory: "Tools",
    usages: "رفع بالرد على صورة أو فيديو",
    cooldowns: 1
};


/*
 * ==========================================
 * جلب رابط API
 * ==========================================
 */

async function getUploadAPI() {

    const response = await axios.get(
        "https://raw.githubusercontent.com/shaonproject/Shaon/main/api.json",
        {
            timeout: 15000
        }
    );

    const apiURL =
        response?.data?.imgur;

    if (!apiURL) {
        throw new Error(
            "رابط API الرفع غير موجود."
        );
    }

    return apiURL;
}


/*
 * ==========================================
 * رفع ملف واحد
 * ==========================================
 */

async function uploadFile(
    apiURL,
    attachment
) {

    if (!attachment?.url) {
        return null;
    }

    const fileURL =
        encodeURIComponent(
            attachment.url
        );

    const response =
        await axios.get(
            `${apiURL}/imgur?link=${fileURL}`,
            {
                timeout: 30000
            }
        );

    return (
        response?.data?.uploaded?.image ||
        null
    );
}


/*
 * ==========================================
 * الأمر الرئيسي
 * ==========================================
 */

module.exports.run = async function ({
    api,
    event
}) {

    const {
        threadID,
        messageID,
        messageReply
    } = event;


    /*
     * ------------------------------------------
     * التحقق من الرد
     * ------------------------------------------
     */

    if (
        !messageReply ||
        !Array.isArray(
            messageReply.attachments
        ) ||
        !messageReply.attachments.length
    ) {

        return api.sendMessage(
`╭──〔 رفع الوسائط 〕──╮
│
│ ⎔ يجب أن ترد على صورة
│ أو فيديو أولاً.
│
│ مثال:
│ رد على الصورة واكتب:
│ /رفع
│
╰────────────────`,
            threadID,
            messageID
        );
    }


    /*
     * ------------------------------------------
     * بدء العملية
     * ------------------------------------------
     */

    try {

        /*
         * Reaction
         */

        try {

            await api.setMessageReaction(
                "⏳",
                messageID,
                () => {},
                true
            );

        } catch (_) {}


        /*
         * جلب API
         */

        const apiURL =
            await getUploadAPI();


        /*
         * المرفقات
         */

        const attachments =
            messageReply.attachments;


        const links = [];


        /*
         * --------------------------------------
         * رفع المرفقات
         * --------------------------------------
         */

        for (
            const attachment of attachments
        ) {

            try {

                const uploaded =
                    await uploadFile(
                        apiURL,
                        attachment
                    );

                if (uploaded) {
                    links.push(
                        uploaded
                    );
                }

            } catch (error) {

                console.log(
                    "[رفع] فشل رفع مرفق:",
                    error.message
                );
            }
        }


        /*
         * --------------------------------------
         * فشل كامل
         * --------------------------------------
         */

        if (!links.length) {

            try {

                await api.setMessageReaction(
                    "❌",
                    messageID,
                    () => {},
                    true
                );

            } catch (_) {}

            return api.sendMessage(
`╭──〔 رفع الوسائط 〕──╮
│
│ فشل رفع المرفقات.
│
│ ⎔ تأكد أن الرابط قابل للوصول.
│ ⎔ حاول مرة أخرى.
│
╰────────────────`,
                threadID,
                messageID
            );
        }


        /*
         * --------------------------------------
         * نجاح
         * --------------------------------------
         */

        try {

            await api.setMessageReaction(
                "✅",
                messageID,
                () => {},
                true
            );

        } catch (_) {}


        /*
         * إرسال الروابط فقط
         */

        return api.sendMessage(
            links.join("\n"),
            threadID,
            messageID
        );


    } catch (error) {

        console.error(
            "[رفع] Error:",
            error
        );


        try {

            await api.setMessageReaction(
                "❌",
                messageID,
                () => {},
                true
            );

        } catch (_) {}


        return api.sendMessage(
`╭──〔 خطأ في الرفع 〕──╮
│
│ حدث خطأ أثناء الاتصال
│ بخدمة رفع الملفات.
│
│ ⎔ حاول مرة أخرى لاحقًا.
│
╰────────────────`,
            threadID,
            messageID
        );
    }
};
