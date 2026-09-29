const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "cache");

module.exports.config = {
    name: "تيك",
    aliases: ["tiktok", "تيكتوك"],
    version: "3.0.0",
    hasPermssion: 0,
    credits: "DANTE | تعريب وتطوير: KIROS",
    description: "تحميل فيديوهات TikTok",
    usePrefix: true,
    commandCategory: "Media",
    usages: "تيك رابط الفيديو",
    cooldowns: 5
};


/*
 * ==========================================
 * التحقق من رابط TikTok
 * ==========================================
 */

function isTikTokURL(url) {
    return /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\//i
        .test(url);
}


/*
 * ==========================================
 * حذف ملف مؤقت
 * ==========================================
 */

async function removeFile(filePath) {
    try {
        if (
            filePath &&
            await fs.pathExists(filePath)
        ) {
            await fs.remove(filePath);
        }
    } catch (error) {
        console.log(
            "[تيك] فشل حذف الملف:",
            error.message
        );
    }
}


/*
 * ==========================================
 * جلب معلومات الفيديو
 * ==========================================
 */

async function getTikTokData(url) {

    const response = await axios.post(
        "https://www.tikwm.com/api/",
        new URLSearchParams({
            url,
            hd: "1"
        }).toString(),
        {
            timeout: 30000,

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded; charset=UTF-8",

                "User-Agent":
                    "Mozilla/5.0"
            }
        }
    );

    const data = response.data;

    if (
        !data ||
        data.code !== 0 ||
        !data.data
    ) {
        throw new Error(
            "لم يتم العثور على الفيديو."
        );
    }

    if (!data.data.play) {
        throw new Error(
            "رابط الفيديو غير متوفر."
        );
    }

    return data.data;
}


/*
 * ==========================================
 * تحميل الفيديو
 * ==========================================
 */

async function downloadVideo(url, filePath) {

    const response = await axios.get(
        url,
        {
            responseType: "stream",
            timeout: 60000,

            maxContentLength:
                100 * 1024 * 1024,

            maxBodyLength:
                100 * 1024 * 1024,

            headers: {
                "User-Agent":
                    "Mozilla/5.0"
            }
        }
    );

    const writer =
        fs.createWriteStream(
            filePath
        );

    response.data.pipe(writer);

    await new Promise(
        (resolve, reject) => {

            writer.on(
                "finish",
                resolve
            );

            writer.on(
                "error",
                reject
            );

            response.data.on(
                "error",
                reject
            );
        }
    );

    const exists =
        await fs.pathExists(
            filePath
        );

    if (!exists) {
        throw new Error(
            "فشل إنشاء ملف الفيديو."
        );
    }

    const stats =
        await fs.stat(
            filePath
        );

    if (!stats.size) {
        throw new Error(
            "ملف الفيديو فارغ."
        );
    }

    return true;
}


/*
 * ==========================================
 * الأمر الرئيسي
 * ==========================================
 */

module.exports.run = async function ({
    api,
    event,
    args
}) {

    const {
        threadID,
        messageID
    } = event;

    const url =
        Array.isArray(args)
            ? args[0]
            : "";

    let loadingMessage = null;
    let filePath = null;

    /*
     * ------------------------------------------
     * التحقق من الرابط
     * ------------------------------------------
     */

    if (!url) {

        return api.sendMessage(
`╭──〔 تيك توك 〕──╮
│
│ ⎔ أرسل رابط فيديو TikTok.
│
│ مثال:
│ /تيك https://www.tiktok.com/...
│
╰────────────────`,
            threadID,
            messageID
        );
    }

    if (!isTikTokURL(url)) {

        return api.sendMessage(
`╭──〔 رابط غير صالح 〕──╮
│
│ الرابط المرسل ليس رابط TikTok
│ صحيحًا.
│
╰────────────────`,
            threadID,
            messageID
        );
    }

    /*
     * ------------------------------------------
     * Reaction
     * ------------------------------------------
     */

    try {

        await api.setMessageReaction(
            "⏳",
            messageID,
            () => {},
            true
        );

    } catch (_) {}


    try {

        /*
         * --------------------------------------
         * رسالة التحميل
         * --------------------------------------
         */

        loadingMessage =
            await api.sendMessage(
`╭──〔 تيك توك 〕──╮
│
│ ⎔ جاري جلب الفيديو...
│ ⎔ تحليل الرابط...
│ ⎔ تجهيز الملف...
│
╰────────────────`,
                threadID
            );


        /*
         * --------------------------------------
         * جلب بيانات الفيديو
         * --------------------------------------
         */

        const video =
            await getTikTokData(
                url
            );


        /*
         * --------------------------------------
         * إنشاء مجلد Cache
         * --------------------------------------
         */

        await fs.ensureDir(
            CACHE_DIR
        );


        /*
         * --------------------------------------
         * اسم ملف فريد
         * --------------------------------------
         */

        filePath =
            path.join(
                CACHE_DIR,

                `tiktok_${threadID}_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}.mp4`
            );


        /*
         * --------------------------------------
         * تحميل الفيديو
         * --------------------------------------
         */

        await downloadVideo(
            video.play,
            filePath
        );


        /*
         * --------------------------------------
         * حذف رسالة التحميل
         * --------------------------------------
         */

        try {

            if (
                loadingMessage &&
                loadingMessage.messageID
            ) {

                await api.unsendMessage(
                    loadingMessage.messageID
                );
            }

        } catch (_) {}


        /*
         * --------------------------------------
         * معلومات الفيديو
         * --------------------------------------
         */

        const title =
            video.title
                ? String(video.title)
                : "بدون عنوان";

        const shortTitle =
            title.length > 50
                ? title.slice(0, 50) + "..."
                : title;

        const author =
            video.author?.unique_id ||
            video.author?.nickname ||
            "غير معروف";

        const views =
            Number(
                video.play_count || 0
            ).toLocaleString();

        const likes =
            Number(
                video.digg_count || 0
            ).toLocaleString();


        /*
         * --------------------------------------
         * النص النهائي
         * --------------------------------------
         */

        const body =
`╭──〔 TikTok 〕──╮
│
│ ⎔ العنوان
│ ${shortTitle}
│
│ ⎔ الحساب
│ @${author}
│
│ ⎔ المشاهدات
│ ${views}
│
│ ⎔ الإعجابات
│ ${likes}
│
╰────────────────`;


        /*
         * --------------------------------------
         * إرسال الفيديو
         * --------------------------------------
         */

        await new Promise(
            (resolve, reject) => {

                const stream =
                    fs.createReadStream(
                        filePath
                    );

                stream.on(
                    "error",
                    reject
                );

                api.sendMessage(
                    {
                        body,

                        attachment:
                            stream
                    },

                    threadID,

                    async error => {

                        /*
                         * حذف الملف بعد الإرسال
                         */

                        await removeFile(
                            filePath
                        );

                        filePath = null;

                        if (error) {
                            return reject(
                                error
                            );
                        }

                        resolve();
                    },

                    messageID
                );

            }
        );


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


    } catch (error) {

        console.error(
            "[تيك] Error:",
            error
        );


        /*
         * حذف رسالة الانتظار
         */

        try {

            if (
                loadingMessage &&
                loadingMessage.messageID
            ) {

                await api.unsendMessage(
                    loadingMessage.messageID
                );
            }

        } catch (_) {}


        /*
         * تنظيف الملف في حالة الخطأ
         */

        await removeFile(
            filePath
        );


        /*
         * Reaction خطأ
         */

        try {

            await api.setMessageReaction(
                "❌",
                messageID,
                () => {},
                true
            );

        } catch (_) {}


        /*
         * رسالة الخطأ
         */

        return api.sendMessage(
`╭──〔 تيك توك 〕──╮
│
│ ⎔ فشل تحميل الفيديو.
│
│ تأكد من أن الرابط صحيح
│ وأن الفيديو متاح للعامة.
│
╰────────────────`,
            threadID,
            messageID
        );
    }
};
