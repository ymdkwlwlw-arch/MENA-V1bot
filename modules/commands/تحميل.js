const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { alldown } = require("rx-dawonload");

module.exports.config = {
    name: "تحميل",
    version: "2.1.0",
    hasPermssion: 0,
    credits: "محمد إدريس",
    description: "تحميل فيديو من الرابط",
    commandCategory: "الخدمات",
    usages: "تحميل <الرابط>",
    cooldowns: 5
};

const CACHE_DIR = path.join(__dirname, "cache");

async function ensureCache() {
    await fs.ensureDir(CACHE_DIR);
}

function getPlatform(url) {
    if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
    if (/tiktok\.com/i.test(url)) return "TikTok";
    if (/instagram\.com/i.test(url)) return "Instagram";
    if (/facebook\.com|fb\.watch/i.test(url)) return "Facebook";
    return "Media";
}

function getReaction(platform) {
    const reactions = {
        YouTube: "🔴",
        TikTok: "⚫",
        Instagram: "🟣",
        Facebook: "🔵",
        Media: "⚪"
    };

    return reactions[platform] || "⚪";
}

module.exports.run = async function ({
    api,
    event,
    args
}) {
    const {
        threadID,
        messageID,
        body
    } = event;

    let url = args && args.length
        ? args.join(" ").trim()
        : "";

    if (!url && body) {
        const match = body.match(
            /https?:\/\/[^\s]+/i
        );

        if (match) {
            url = match[0];
        }
    }

    if (!url) {
        return api.sendMessage(
            "استخدم الأمر بهذا الشكل:\nتحميل <الرابط>",
            threadID,
            () => {},
            messageID
        );
    }

    if (!/^https?:\/\/\S+$/i.test(url)) {
        return api.sendMessage(
            "الرابط غير صالح.",
            threadID,
            () => {},
            messageID
        );
    }

    const platform = getPlatform(url);
    const reaction = getReaction(platform);

    let filePath = null;

    try {
        await ensureCache();

        try {
            await api.setMessageReaction(
                reaction,
                messageID,
                () => {},
                true
            );
        } catch {}

        let result;

        try {
            result = await alldown(url);
        } catch (error) {
            console.error("[تحميل] API Error:", error);

            return api.sendMessage(
                "تعذر الحصول على رابط التحميل.",
                threadID,
                () => {},
                messageID
            );
        }

        if (!result) {
            return api.sendMessage(
                "لم يتم العثور على ملف قابل للتحميل.",
                threadID,
                () => {},
                messageID
            );
        }

        const downloadURL =
            result.url ||
            result.download ||
            result.downloadUrl ||
            result.video ||
            result.link;

        if (!downloadURL) {
            return api.sendMessage(
                "لم يتم العثور على رابط مباشر للملف.",
                threadID,
                () => {},
                messageID
            );
        }

        const title =
            result.title ||
            result.name ||
            "ملف بدون عنوان";

        const safeName =
            `${Date.now()}_${Math.floor(Math.random() * 99999)}.mp4`;

        filePath = path.join(
            CACHE_DIR,
            safeName
        );

        await api.setMessageReaction(
            "⬇️",
            messageID,
            () => {},
            true
        ).catch(() => {});

        const response = await axios.get(
            downloadURL,
            {
                responseType: "stream",
                timeout: 120000,
                maxContentLength: 50 * 1024 * 1024,
                maxBodyLength: 50 * 1024 * 1024
            }
        );

        await new Promise((resolve, reject) => {
            const writer =
                fs.createWriteStream(filePath);

            response.data.pipe(writer);

            writer.on("finish", resolve);
            writer.on("error", reject);

            response.data.on(
                "error",
                reject
            );
        });

        if (
            !fs.existsSync(filePath) ||
            fs.statSync(filePath).size === 0
        ) {
            throw new Error(
                "Downloaded file is empty"
            );
        }

        const size =
            fs.statSync(filePath).size;

        const sizeMB =
            (size / 1024 / 1024).toFixed(2);

        const bodyMessage =
            "╭─── ◸ " + platform + " ◿ ───╮\n" +
            "│\n" +
            "│  ◉ " + title + "\n" +
            "│\n" +
            "│  ╭─ معلومات الملف\n" +
            "│  │  " + sizeMB + " MB\n" +
            "│  ╰────────────\n" +
            "│\n" +
            "╰────────────────────────╯";

        return api.sendMessage(
            {
                body: bodyMessage,
                attachment:
                    fs.createReadStream(filePath)
            },
            threadID,
            (error) => {
                try {
                    if (
                        filePath &&
                        fs.existsSync(filePath)
                    ) {
                        fs.unlinkSync(filePath);
                    }
                } catch (cleanupError) {
                    console.error(
                        "[تحميل] Cleanup:",
                        cleanupError
                    );
                }

                if (error) {
                    console.error(
                        "[تحميل] Send Error:",
                        error
                    );
                }
            },
            messageID
        );

    } catch (error) {
        console.error(
            "[تحميل] Error:",
            error
        );

        try {
            if (
                filePath &&
                fs.existsSync(filePath)
            ) {
                fs.unlinkSync(filePath);
            }
        } catch {}

        return api.sendMessage(
            "تعذر تحميل الملف حاليًا، حاول مرة أخرى.",
            threadID,
            () => {},
            messageID
        );
    }
};
