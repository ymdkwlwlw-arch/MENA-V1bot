const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const ytdl = global.nodemodule["@distube/ytdl-core"];
const YouTubeAPI = global.nodemodule["simple-youtube-api"];

const CACHE_DIR = path.join(__dirname, "cache");

module.exports.config = {
    name: "فيديو",
    aliases: ["video", "فديو", "يوتيوب"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "CatalizCS | Đăng | تطوير KIROS",
    description: "البحث وتحميل فيديوهات YouTube",
    usePrefix: true,
    commandCategory: "music",
    usages: "فيديو اسم الفيديو أو رابط YouTube",
    cooldowns: 10,

    dependencies: {
        "@distube/ytdl-core": "",
        "simple-youtube-api": "",
        "fs-extra": "",
        "axios": ""
    },

    envConfig: {
        YOUTUBE_API: process.env.YOUTUBE_API || ""
    }
};


// ==============================
// أدوات مساعدة
// ==============================

async function setReaction(api, reaction, messageID) {
    try {
        await api.setMessageReaction(
            reaction,
            messageID,
            () => {},
            true
        );
    } catch (e) {}
}

async function removeFile(filePath) {
    try {
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }
    } catch (e) {}
}

function getVideoID(url) {
    try {
        const parsed = new URL(url);

        if (parsed.hostname.includes("youtu.be")) {
            return parsed.pathname.replace("/", "").split("/")[0];
        }

        if (parsed.searchParams.get("v")) {
            return parsed.searchParams.get("v");
        }

        const parts = parsed.pathname.split("/");

        const index = parts.findIndex(
            item =>
                item === "shorts" ||
                item === "embed" ||
                item === "v"
        );

        if (index !== -1 && parts[index + 1]) {
            return parts[index + 1];
        }

        return null;
    } catch {
        return null;
    }
}

function isYouTubeURL(text) {
    return /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(
        text
    );
}


// ==============================
// تحميل فيديو مباشر
// ==============================

async function downloadVideo({
    api,
    event,
    videoID,
    sourceURL
}) {
    const {
        threadID,
        messageID
    } = event;

    let filePath = null;

    try {
        await setReaction(
            api,
            "⏳",
            messageID
        );

        await fs.ensureDir(CACHE_DIR);

        const info = await ytdl.getInfo(
            sourceURL || `https://www.youtube.com/watch?v=${videoID}`
        );

        const title =
            info.videoDetails?.title ||
            "فيديو YouTube";

        const safeID =
            String(videoID)
                .replace(/[^a-zA-Z0-9_-]/g, "")
                .slice(0, 30) ||
            String(Date.now());

        filePath = path.join(
            CACHE_DIR,
            `video_${safeID}_${Date.now()}.mp4`
        );

        const stream = ytdl(
            sourceURL ||
            `https://www.youtube.com/watch?v=${videoID}`,
            {
                quality: "18",
                filter: "audioandvideo",
                highWaterMark: 1 << 25
            }
        );

        const writer =
            fs.createWriteStream(filePath);

        stream.pipe(writer);

        await new Promise(
            (resolve, reject) => {
                stream.on(
                    "error",
                    reject
                );

                writer.on(
                    "error",
                    reject
                );

                writer.on(
                    "finish",
                    resolve
                );
            }
        );

        if (
            !(await fs.pathExists(filePath)) ||
            (await fs.stat(filePath)).size < 1000
        ) {
            throw new Error(
                "الفيديو فارغ أو لم يكتمل تحميله."
            );
        }

        const size =
            (await fs.stat(filePath)).size;

        // حد Messenger التقريبي 25MB
        if (size > 25 * 1024 * 1024) {
            await removeFile(filePath);

            await setReaction(
                api,
                "❌",
                messageID
            );

            return api.sendMessage(
                "╭─  ── ── ── ──  ─╮\n" +
                "     نـظـام الـفـيـديـو\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                "⎔ الـحـالـة: الـفـيـديـو أكـبـر مـن الـحـجـم الـمـسـمـوح.\n" +
                "⊞ حـاول اخـتـيـار فـيـديـو أقـصـر.\n" +
                "── ── ── ── ── ── ──",
                threadID,
                messageID
            );
        }

        await setReaction(
            api,
            "✅",
            messageID
        );

        return api.sendMessage(
            {
                body:
                    "╭─  ── ── ── ──  ─╮\n" +
                    "     نـجـاح تـحـمـيـل الـفـيـديـو\n" +
                    "╰─  ── ── ── ──  ─╯\n" +
                    `⎔ الـعـنـوان: ${title}\n` +
                    "⊞ الـحـالـة: تـم الـتـحـمـيـل بـنـجـاح\n" +
                    "── ── ── ── ── ── ──",

                attachment:
                    fs.createReadStream(filePath)
            },

            threadID,

            () => {
                setTimeout(
                    () => removeFile(filePath),
                    30000
                );
            },

            messageID
        );

    } catch (error) {
        console.error(
            "[فيديو] Download Error:",
            error.message
        );

        if (filePath) {
            await removeFile(filePath);
        }

        await setReaction(
            api,
            "❌",
            messageID
        );

        return api.sendMessage(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الـفـيـديـو\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـحـالـة: فـشـل تـحـمـيـل الـفـيـديـو.\n" +
            "⊞ قـد يـكـون الـفـيـديـو غـيـر مـتـاح أو الـخـدمـة مـشـغـولـة.\n" +
            "── ── ── ── ── ── ──",
            threadID,
            messageID
        );
    }
}


// ==============================
// البحث
// ==============================

module.exports.run = async function ({
    api,
    event,
    args
}) {
    const {
        threadID,
        messageID,
        senderID
    } = event;

    const query =
        args.join(" ").trim();

    if (!query) {
        return api.sendMessage(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الـفـيـديـو\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ اكتب اسم الفيديو أو أرسل رابط YouTube.\n" +
            "⊞ مثال: فيديو Naruto\n" +
            "── ── ── ── ── ── ──",
            threadID,
            messageID
        );
    }

    // رابط مباشر
    if (isYouTubeURL(query)) {
        const videoID =
            getVideoID(query);

        if (!videoID) {
            return api.sendMessage(
                "تعذر استخراج معرف فيديو YouTube.",
                threadID,
                messageID
            );
        }

        return downloadVideo({
            api,
            event,
            videoID,
            sourceURL: query
        });
    }

    const keyapi =
        process.env.YOUTUBE_API ||
        global.configModule?.فيديو?.YOUTUBE_API ||
        "";

    if (!keyapi) {
        return api.sendMessage(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الـفـيـديـو\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـحـالـة: مـفـتـاح YouTube API غـيـر مـوجـود.\n" +
            "⊞ أضـف YOUTUBE_API إلـى إعدادات البوت.\n" +
            "── ── ── ── ── ── ──",
            threadID,
            messageID
        );
    }

    try {
        await setReaction(
            api,
            "⏳",
            messageID
        );

        const youtube =
            new YouTubeAPI(keyapi);

        const results =
            await youtube.searchVideos(
                query,
                6
            );

        if (!results?.length) {
            await setReaction(
                api,
                "❌",
                messageID
            );

            return api.sendMessage(
                "╭─  ── ── ── ──  ─╮\n" +
                "     نـظـام الـفـيـديـو\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                "⎔ لـم يـتـم الـعـثـور عـلـى نـتـائـج.\n" +
                "⊞ حـاول بـكـلـمـات بـحـث أخـرى.\n" +
                "── ── ── ── ── ── ──",
                threadID,
                messageID
            );
        }

        const links = [];
        const thumbnails = [];
        let list = "";

        await fs.ensureDir(
            CACHE_DIR
        );

        for (
            let i = 0;
            i < results.length;
            i++
        ) {
            const item =
                results[i];

            if (!item?.id) continue;

            links.push(
                item.id
            );

            let duration =
                "غير معروفة";

            let channel =
                "غير معروف";

            try {
                const details =
                    await axios.get(
                        "https://www.googleapis.com/youtube/v3/videos",
                        {
                            params: {
                                part: "contentDetails,snippet",
                                id: item.id,
                                key: keyapi
                            },
                            timeout: 15000
                        }
                    );

                const data =
                    details.data?.items?.[0];

                if (data) {
                    duration =
                        data.contentDetails?.duration ||
                        duration;

                    channel =
                        data.snippet?.channelTitle ||
                        channel;
                }
            } catch (e) {
                console.log(
                    "[فيديو] YouTube API details:",
                    e.message
                );
            }

            const imagePath =
                path.join(
                    CACHE_DIR,
                    `thumb_${threadID}_${Date.now()}_${i}.jpg`
                );

            try {
                const image =
                    await axios.get(
                        `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
                        {
                            responseType:
                                "arraybuffer",
                            timeout: 15000
                        }
                    );

                await fs.writeFile(
                    imagePath,
                    image.data
                );

                thumbnails.push(
                    fs.createReadStream(
                        imagePath
                    )
                );
            } catch (e) {
                console.log(
                    "[فيديو] Thumbnail Error:",
                    e.message
                );
            }

            list +=
                `⎔ ${i + 1}. ${item.title || "بدون عنوان"}\n` +
                `⊞ المدة: ${duration}\n` +
                `⊞ القناة: ${channel}\n` +
                "── ── ── ── ──\n";
        }

        const body =
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـتـائـج بـحـث الـفـيـديـو\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            list +
            "\n" +
            "⎔ رد على هذه الرسالة برقم الفيديو المطلوب.\n" +
            "⊞ سيتم تحميل الفيديو بعد اختيار الرقم.\n" +
            "── ── ── ── ── ── ──";

        return api.sendMessage(
            {
                body,
                attachment:
                    thumbnails
            },
            threadID,

            async (error, info) => {
                // تنظيف الصور المؤقتة
                for (
                    const stream of thumbnails
                ) {
                    try {
                        if (
                            stream.path
                        ) {
                            await removeFile(
                                stream.path
                            );
                        }
                    } catch (e) {}
                }

                if (
                    error ||
                    !info
                ) {
                    console.log(
                        "[فيديو] Failed to send results:",
                        error?.message
                    );
                    return;
                }

                global.client.handleReply.push({
                    name:
                        module.exports.config.name,

                    messageID:
                        info.messageID,

                    author:
                        senderID,

                    link:
                        links
                });
            },

            messageID
        );

    } catch (error) {
        console.error(
            "[فيديو] Search Error:",
            error.message
        );

        await setReaction(
            api,
            "❌",
            messageID
        );

        return api.sendMessage(
            "╭─  ── ── ── ──  ─╮\n" +
            "     نـظـام الـفـيـديـو\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ فـشـل الـبـحـث عـن الـفـيـديـو.\n" +
            "⊞ تـأكـد مـن الاتـصـال والـخـدمـة.\n" +
            "── ── ── ── ── ── ──",
            threadID,
            messageID
        );
    }
};


// ==============================
// اختيار نتيجة البحث
// ==============================

module.exports.handleReply = async function ({
    api,
    event,
    handleReply
}) {
    const {
        threadID,
        messageID,
        senderID,
        body
    } = event;

    if (
        String(senderID) !==
        String(handleReply.author)
    ) {
        return;
    }

    const choice =
        parseInt(
            String(body || "").trim(),
            10
        );

    if (
        Number.isNaN(choice) ||
        choice < 1 ||
        choice > handleReply.link.length
    ) {
        return api.sendMessage(
            "اختر رقمًا صحيحًا من قائمة النتائج.",
            threadID,
            messageID
        );
    }

    const videoID =
        handleReply.link[
            choice - 1
        ];

    try {
        await api.unsendMessage(
            handleReply.messageID
        );
    } catch (e) {}

    return downloadVideo({
        api,
        event,
        videoID,
        sourceURL:
            `https://www.youtube.com/watch?v=${videoID}`
    });
};
