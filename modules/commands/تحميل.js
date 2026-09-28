const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { alldown } = require("shaon-videos-downloader");

module.exports.config = {
    name: "تحميل",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "DANTE SPARDA | تعديل: كولو سان",
    description: "تحميل فيديو من رابط مباشر عبر خدمة التحميل",
    commandCategory: "الوسائط",
    usages: "تحميل <الرابط>",
    cooldowns: 5
};

/* =========================================================
   إعدادات الأمر
========================================================= */

const CACHE_DIR = path.join(
    __dirname,
    "cache"
);

const MAX_FILE_SIZE =
    50 * 1024 * 1024; // 50MB

/* =========================================================
   معرفة المنصة
========================================================= */

function detectPlatform(url) {

    const value =
        String(url || "")
            .toLowerCase();

    if (
        value.includes("tiktok.com") ||
        value.includes("vm.tiktok.com")
    ) {
        return {
            name: "TikTok",
            emoji: "⚫"
        };
    }

    if (
        value.includes("facebook.com") ||
        value.includes("fb.watch")
    ) {
        return {
            name: "Facebook",
            emoji: "🔵"
        };
    }

    if (
        value.includes("instagram.com")
    ) {
        return {
            name: "Instagram",
            emoji: "🟣"
        };
    }

    if (
        value.includes("youtube.com") ||
        value.includes("youtu.be")
    ) {
        return {
            name: "YouTube",
            emoji: "🔴"
        };
    }

    if (
        value.includes("twitter.com") ||
        value.includes("x.com")
    ) {
        return {
            name: "X / Twitter",
            emoji: "⚫"
        };
    }

    return {
        name: "غير معروفة",
        emoji: "⚪"
    };
}

/* =========================================================
   تنظيف اسم الملف
========================================================= */

function safeFileName(name) {

    return String(name || "video")
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            ""
        )
        .replace(/\s+/g, "_")
        .slice(0, 80);
}

/* =========================================================
   حذف الملف بأمان
========================================================= */

async function removeFile(file) {

    try {

        if (
            file &&
            await fs.pathExists(file)
        ) {
            await fs.remove(file);
        }

    } catch (error) {

        console.log(
            "[تحميل] Cleanup:",
            error.message
        );
    }
}

/* =========================================================
   جلب الفيديو
========================================================= */

async function downloadVideo(url) {

    /*
     * API / Downloader الأساسي
     */

    let data;

    try {

        data =
            await alldown(url);

    } catch (error) {

        console.error(
            "[تحميل] Downloader error:",
            error.message
        );

        throw new Error(
            "خدمة التحميل لم تستطع معالجة الرابط."
        );
    }

    if (
        !data ||
        !data.url
    ) {
        throw new Error(
            "لم يتم العثور على رابط فيديو مباشر."
        );
    }

    return data;
}

/* =========================================================
   تشغيل الأمر
========================================================= */

module.exports.run = async function ({
    api,
    event,
    args
}) {

    const {
        threadID,
        messageID
    } = event;

    const content =
        Array.isArray(args)
            ? args.join(" ").trim()
            : "";

    /*
     * التحقق من الرابط
     */

    if (
        !content ||
        !/^https?:\/\/\S+$/i.test(content)
    ) {

        return api.sendMessage(
            "يرجى وضع رابط فيديو صحيح بعد اسم الأمر.",
            threadID,
            messageID
        );
    }

    const platform =
        detectPlatform(content);

    const pathVideo =
        path.join(
            CACHE_DIR,
            `download_${messageID}_${Date.now()}.mp4`
        );

    try {

        /*
         * إنشاء مجلد التخزين
         */

        await fs.ensureDir(
            CACHE_DIR
        );

        /*
         * تفاعل البداية
         */

        try {

            await api.setMessageReaction(
                platform.emoji,
                messageID,
                () => {},
                true
            );

        } catch (error) {}

        /*
         * جلب بيانات الفيديو
         */

        const data =
            await downloadVideo(
                content
            );

        const directURL =
            data.url;

        /*
         * تنزيل الفيديو
         */

        const response =
            await axios.get(
                directURL,
                {
                    responseType:
                        "arraybuffer",

                    timeout:
                        60000,

                    maxContentLength:
                        MAX_FILE_SIZE,

                    maxBodyLength:
                        MAX_FILE_SIZE,

                    headers: {
                        "User-Agent":
                            "Mozilla/5.0"
                    }
                }
            );

        if (
            !response ||
            !response.data
        ) {
            throw new Error(
                "لم يتم استلام ملف الفيديو."
            );
        }

        const buffer =
            Buffer.from(
                response.data
            );

        /*
         * حماية من الملفات الكبيرة
         */

        if (
            buffer.length >
            MAX_FILE_SIZE
        ) {

            throw new Error(
                "حجم الفيديو أكبر من الحد المسموح."
            );
        }

        /*
         * الكتابة الصحيحة للـ Buffer
         */

        await fs.writeFile(
            pathVideo,
            buffer
        );

        /*
         * التأكد أن الملف موجود
         */

        if (
            !(await fs.pathExists(
                pathVideo
            ))
        ) {
            throw new Error(
                "فشل إنشاء ملف الفيديو."
            );
        }

        const title =
            safeFileName(
                data.title ||
                "فيديو"
            );

        const source =
            data.source ||
            platform.name ||
            "Unknown";

        const sizeMB =
            (
                buffer.length /
                (1024 * 1024)
            ).toFixed(2);

        /*
         * الرسالة النهائية
         */

        const responseMsg =
`╭─  ── ── ── ──  ─╮
     نـظـام الـتـحـمـيـل
╰─  ── ── ── ──  ─╯
⎔ الـعـنـوان: ${title}
⎔ الـمـنـصـة: ${source}
⎔ الـحـجـم: ${sizeMB} MB
⊞ الـحـالـة: مكتمل التجهيز
── ── ── ── ── ── ──`;

        /*
         * إرسال الفيديو
         */

        await new Promise(
            (resolve, reject) => {

                api.sendMessage(
                    {
                        body:
                            responseMsg,

                        attachment:
                            fs.createReadStream(
                                pathVideo
                            )
                    },

                    threadID,

                    error => {

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
         * تنظيف الملف بعد الإرسال
         */

        await removeFile(
            pathVideo
        );

    } catch (error) {

        console.error(
            "[تحميل] Error:",
            error
        );

        /*
         * تفاعل الخطأ
         */

        try {

            await api.setMessageReaction(
                "⚠️",
                messageID,
                () => {},
                true
            );

        } catch (reactionError) {}

        /*
         * حذف الملف المؤقت
         */

        await removeFile(
            pathVideo
        );

        /*
         * رسالة الخطأ
         */

        return api.sendMessage(
            `╭─  ── ── ── ──  ─╮
     نـظـام الـتـحـمـيـل
╰─  ── ── ── ──  ─╯
⎔ الـمـنـصـة: ${platform.name}
⊞ الـحـالـة: فشل التحميل
⎔ الـسـبـب: ${error.message}
── ── ── ── ── ── ──`,
            threadID,
            messageID
        );
    }
};
