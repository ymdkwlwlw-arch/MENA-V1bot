const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const baseApiUrl = async () => {
    try {
        const res = await axios.get(
            "https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json",
            { timeout: 5000 }
        );

        return res.data?.mahmud || null;
    } catch (e) {
        console.log("[SONG] Base API unavailable:", e.message);
        return null;
    }
};

module.exports.config = {
    name: "اغنية",
    aliases: ["اغنيه", "song", "sing"],
    version: "3.0.0",
    hasPermssion: 0,
    credits: "MahMUD & AI / KIROS",
    description: "البحث وتحميل الأغاني والمقاطع الصوتية",
    commandCategory: "الخدمات",
    usages: "اغنية [اسم الأغنية أو رابط يوتيوب]",
    cooldowns: 5,
    usePrefix: true
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const input = args.join(" ").trim();

    if (!input) {
        return api.sendMessage(
            "╭─❖ [ نظام الأغاني ] ❖─╮\n\n" +
            "⚠️ اكتب اسم الأغنية أو أرسل رابط YouTube.\n\n" +
            "📝 مثال:\n" +
            "╰─◗ /اغنية stay\n\n" +
            "╰───────────────╯",
            threadID,
            messageID
        );
    }

    const apiBase = await baseApiUrl();

    if (!apiBase) {
        return api.sendMessage(
            "╭─❖ [ نظام الأغاني ] ❖─╮\n\n" +
            "❌ تعذر الاتصال بخدمة الأغاني حاليًا.\n" +
            "جرّب مرة أخرى بعد قليل.\n\n" +
            "╰───────────────╯",
            threadID,
            messageID
        );
    }

    const youtubeRegex =
        /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;

    if (youtubeRegex.test(input)) {
        const match = input.match(youtubeRegex);
        const videoID = match[1];

        try {
            await api.setMessageReaction(
                "⌛",
                messageID,
                threadID
            );
        } catch (e) {}

        return handleDownload(
            api,
            threadID,
            messageID,
            videoID,
            apiBase
        );
    }

    try {
        await api.setMessageReaction(
            "⏳",
            messageID,
            threadID
        );
    } catch (e) {}

    console.log(`[SONG] Searching: ${input}`);

    const res = await axios.get(
        `${apiBase}/api/ytb/search`,
        {
            params: {
                q: input
            },
            timeout: 30000
        }
    );

    const results = Array.isArray(res.data?.results)
        ? res.data.results.slice(0, 5)
        : [];

    if (!results.length) {
        try {
            await api.setMessageReaction(
                "❌",
                messageID,
                threadID
            );
        } catch (e) {}

        return api.sendMessage(
            "╭─❖ [ نظام الأغاني ] ❖─╮\n\n" +
            "⭕ لم يتم العثور على نتائج مطابقة.\n\n" +
            "╰───────────────╯",
            threadID,
            messageID
        );
    }

    let songList = "";

    for (let i = 0; i < results.length; i++) {
        const item = results[i];

        songList +=
            `│ ${i + 1}. 🎵 ${item.title || "بدون عنوان"}\n` +
            `│ ⏱️ المدة: ${item.time || "غير معروفة"}\n` +
            "├───────────────\n";
    }

    const menu =
        "╭─❖ [ نتائج البحث ] ❖─╮\n\n" +
        songList +
        "\n" +
        "📌 رد على هذه الرسالة برقم الأغنية لتحميلها.\n\n" +
        "╰───────────────╯";

    return api.sendMessage(
        menu,
        threadID,
        (err, info) => {
            if (err || !info) {
                console.log(
                    "[SONG] Failed to send search menu:",
                    err?.message
                );
                return;
            }

            global.client.handleReply.push({
                name: module.exports.config.name,
                messageID: info.messageID,
                author: senderID,
                results,
                apiBase
            });
        },
        messageID
    );

};

module.exports.handleReply = async function ({
    event,
    api,
    handleReply
}) {

    const {
        results,
        author,
        messageID,
        apiBase
    } = handleReply;

    const {
        senderID,
        threadID,
        body
    } = event;

    if (senderID !== author) {
        return;
    }

    const choice = parseInt(
        String(body || "").trim()
    );

    if (
        isNaN(choice) ||
        choice < 1 ||
        choice > results.length
    ) {
        return api.sendMessage(
            "❎ اختر رقمًا صحيحًا من القائمة.",
            threadID,
            event.messageID
        );
    }

    const selected = results[choice - 1];

    const videoID =
        selected.id ||
        selected.videoId ||
        selected.videoID;

    if (!videoID) {
        return api.sendMessage(
            "❌ لم أستطع الحصول على معرف المقطع.",
            threadID,
            event.messageID
        );
    }

    try {
        await api.unsendMessage(
            messageID,
            threadID
        );
    } catch (e) {}

    try {
        await api.setMessageReaction(
            "⌛",
            event.messageID,
            threadID
        );
    } catch (e) {}

    await handleDownload(
        api,
        threadID,
        event.messageID,
        videoID,
        apiBase
    );
};

async function handleDownload(
    api,
    threadID,
    messageID,
    videoID,
    apiBase
) {

    try {

        console.log(
            `[SONG] Downloading: ${videoID}`
        );

        const res = await axios.get(
            `${apiBase}/api/ytb/get`,
            {
                params: {
                    id: videoID,
                    type: "audio"
                },
                timeout: 60000
            }
        );

        const data = res.data?.data;

        if (!data?.downloadLink) {
            throw new Error(
                "Download link not returned"
            );
        }

        const title =
            data.title || "Audio";

        const downloadLink =
            data.downloadLink;

        const response = await axios.get(
            downloadLink,
            {
                responseType: "stream",
                timeout: 120000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0"
                }
            }
        );

        const cacheDir =
            path.join(
                __dirname,
                "cache"
            );

        await fs.ensureDir(cacheDir);

        const filePath =
            path.join(
                cacheDir,
                `music_${Date.now()}.mp3`
            );

        const writer =
            fs.createWriteStream(filePath);

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
            }
        );

        if (
            !fs.existsSync(filePath) ||
            fs.statSync(filePath).size < 1000
        ) {
            throw new Error(
                "Downloaded file is empty"
            );
        }

        console.log(
            `[SONG] SUCCESS: ${title}`
        );

        try {
            await api.setMessageReaction(
                "✅",
                messageID,
                threadID
            );
        } catch (e) {}

        return api.sendMessage(
            {
                body:
                    "╭─❖ [ نجاح التحميل ] ❖─╮\n\n" +
                    `🎵 الأغنية: ${title}\n\n` +
                    "╰───────────────╯",

                attachment:
                    fs.createReadStream(
                        filePath
                    )
            },

            threadID,

            () => {
                setTimeout(
                    () => {
                        try {
                            if (
                                fs.existsSync(
                                    filePath
                                )
                            ) {
                                fs.unlinkSync(
                                    filePath
                                );
                            }
                        } catch (e) {}
                    },
                    30000
                );
            },

            messageID
        );

    } catch (error) {

        console.log(
            "[SONG] Download failed:",
            error.message
        );

        try {
            await api.setMessageReaction(
                "❌",
                messageID,
                threadID
            );
        } catch (e) {}

        return api.sendMessage(
            "╭─❖ [ نظام الأغاني ] ❖─╮\n\n" +
            "❌ فشل تحميل الملف الصوتي.\n\n" +
            "قد تكون الخدمة مشغولة أو أن الرابط لم يعد متاحًا.\n\n" +
            "╰───────────────╯",
            threadID,
            messageID
        );
    }
}
