module.exports.config = {
    name: "تحميل",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "محمد إدريس",
    description: "تحميل الفيديوهات من الروابط المدعومة",
    usePrefix: true,
    commandCategory: "الخدمات",
    usages: "تحميل <الرابط>",
    cooldowns: 5
};

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { alldown } = require("rx-dawonload");

const CACHE_DIR = path.join(__dirname, "cache");
const MAX_FILE_SIZE = 50 * 1024 * 1024;


/* ╭─── ◸ أدوات النظام ◿ ───╮ */

function ensureCache() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.ensureDirSync(CACHE_DIR);
    }
}


function getPlatform(url) {

    const value = String(url).toLowerCase();

    if (
        value.includes("youtube.com") ||
        value.includes("youtu.be")
    ) {
        return {
            name: "YouTube",
            reaction: "🔴"
        };
    }

    if (value.includes("tiktok.com")) {
        return {
            name: "TikTok",
            reaction: "⚫"
        };
    }

    if (value.includes("instagram.com")) {
        return {
            name: "Instagram",
            reaction: "🟣"
        };
    }

    if (
        value.includes("facebook.com") ||
        value.includes("fb.watch")
    ) {
        return {
            name: "Facebook",
            reaction: "🔵"
        };
    }

    return {
        name: "غير معروف",
        reaction: "⚪"
    };
}


function isValidUrl(value) {

    try {

        const url = new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );

    } catch {

        return false;
    }
}


function cleanTitle(title) {

    return String(title || "بدون عنوان")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 150);
}


function formatSize(bytes) {

    if (!bytes) return "غير معروف";

    const mb =
        bytes / (1024 * 1024);

    return `${mb.toFixed(1)} MB`;
}


function react(api, emoji, messageID) {

    try {

        api.setMessageReaction(
            emoji,
            messageID,
            () => {},
            true
        );

    } catch {}
}


/* ╭─── ◸ الـتـنـفـيـذ ◿ ───╮ */

module.exports.run = async function ({
    api,
    event,
    args
}) {

    const {
        threadID,
        messageID
    } = event;


    /*
     * الرابط
     */

    const content =
        Array.isArray(args)
            ? args.join(" ").trim()
            : "";


    if (!content) {

        return api.sendMessage(
            "يرجى وضع الرابط بعد كلمة تحميل.\nمثال: تحميل https://example.com/video",
            threadID,
            messageID
        );
    }


    /*
     * استخراج الرابط
     */

    const urlMatch =
        content.match(
            /https?:\/\/[^\s]+/i
        );


    if (!urlMatch) {

        return api.sendMessage(
            "الرابط غير صالح أو غير موجود.",
            threadID,
            messageID
        );
    }


    const url =
        urlMatch[0]
            .replace(/[)\]}>,"'،]+$/g, "");


    if (!isValidUrl(url)) {

        return api.sendMessage(
            "الرابط غير صالح.",
            threadID,
            messageID
        );
    }


    const platform =
        getPlatform(url);


    const requestId =
        String(messageID || Date.now())
            .replace(
                /[^a-zA-Z0-9_-]/g,
                ""
            )
            .slice(-30);


    let filePath = null;


    try {

        ensureCache();


        /*
         * ╭─◸ التفاعل مع المنصة ◿─╮
         */

        react(
            api,
            platform.reaction,
            messageID
        );


        /*
         * استخراج الفيديو
         */

        const data =
            await alldown(url);


        if (
            !data ||
            !data.url
        ) {

            react(
                api,
                "❌",
                messageID
            );

            return api.sendMessage(
                "تعذر استخراج الفيديو من الرابط.\nتأكد أن الرابط عام وغير خاص.",
                threadID,
                messageID
            );
        }


        const title =
            cleanTitle(data.title);


        const videoUrl =
            data.url;


        /*
         * التفاعل أثناء التحميل
         */

        react(
            api,
            "⬇️",
            messageID
        );


        filePath =
            path.join(
                CACHE_DIR,
                `${requestId}.mp4`
            );


        /*
         * تنزيل Stream
         */

        const response =
            await axios({
                method: "GET",
                url: videoUrl,
                responseType: "stream",
                timeout: 120000,
                maxRedirects: 5
            });


        const contentLength =
            Number(
                response.headers[
                    "content-length"
                ] || 0
            );


        if (
            contentLength &&
            contentLength > MAX_FILE_SIZE
        ) {

            react(
                api,
                "❌",
                messageID
            );

            return api.sendMessage(
                `حجم الفيديو كبير جدًا.\nالحد المسموح: ${formatSize(MAX_FILE_SIZE)}`,
                threadID,
                messageID
            );
        }


        const writer =
            fs.createWriteStream(
                filePath
            );


        let downloaded = 0;


        response.data.on(
            "data",
            chunk => {

                downloaded +=
                    chunk.length;


                if (
                    downloaded >
                    MAX_FILE_SIZE
                ) {

                    response.data.destroy(
                        new Error(
                            "FILE_TOO_LARGE"
                        )
                    );
                }
            }
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


        if (
            !fs.existsSync(filePath)
        ) {

            throw new Error(
                "FILE_NOT_FOUND"
            );
        }


        const fileSize =
            fs.statSync(
                filePath
            ).size;


        /*
         * ╭─── ◸ النتيجة ◿ ───╮
         */

        const body =
            `╭─── ◸ ${platform.name} ◿ ───╮\n` +
            `│\n` +
            `│  ◉ ${title}\n` +
            `│\n` +
            `│  ╭─ معلومات الملف\n` +
            `│  │  ${formatSize(fileSize)}\n` +
            `│  ╰────────────\n` +
            `│\n` +
            `╰────────────────────────╯`;


        /*
         * إرسال الفيديو
         */

        api.sendMessage(
            {
                body,

                attachment:
                    fs.createReadStream(
                        filePath
                    )
            },

            threadID,

            (error) => {

                /*
                 * حذف الملف
                 */

                try {

                    if (
                        filePath &&
                        fs.existsSync(
                            filePath
                        )
                    ) {

                        fs.unlinkSync(
                            filePath
                        );
                    }

                } catch (cleanupError) {

                    console.error(
                        "[تحميل] Cleanup:",
                        cleanupError
                    );
                }


                if (error) {

                    console.error(
                        "[تحميل] Send:",
                        error
                    );

                    react(
                        api,
                        "❌",
                        messageID
                    );

                    return;
                }


                react(
                    api,
                    platform.reaction,
                    messageID
                );
            },

            messageID
        );


    } catch (error) {

        console.error(
            "[تحميل]",
            error
        );


        /*
         * تنظيف الملف
         */

        try {

            if (
                filePath &&
                fs.existsSync(
                    filePath
                )
            ) {

                fs.unlinkSync(
                    filePath
                );
            }

        } catch {}


        react(
            api,
            "❌",
            messageID
        );


        /*
         * رسائل الخطأ بدون استايل
         */

        if (
            error?.message ===
            "FILE_TOO_LARGE"
        ) {

            return api.sendMessage(
                "حجم الفيديو أكبر من الحد المسموح به.",
                threadID,
                messageID
            );
        }


        if (
            error?.code ===
            "ECONNABORTED"
        ) {

            return api.sendMessage(
                "انتهت مهلة التحميل، حاول مرة أخرى.",
                threadID,
                messageID
            );
        }


        if (
            error?.response?.status === 403 ||
            error?.response?.status === 401
        ) {

            return api.sendMessage(
                "تعذر الوصول إلى رابط الفيديو.",
                threadID,
                messageID
            );
        }


        return api.sendMessage(
            "حدث خطأ أثناء تحميل الفيديو، حاول مرة أخرى.",
            threadID,
            messageID
        );
    }
};
