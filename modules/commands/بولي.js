const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "بولي",
    aliases: ["poli", "polli"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "توليد صورة بالذكاء الاصطناعي من وصف نصي",
    usePrefix: true,
    commandCategory: "image",
    usages: "بولي الوصف",
    cooldowns: 5
};

module.exports.run = async function ({
    api,
    event,
    args
}) {
    const {
        threadID,
        messageID
    } = event;

    const query = args
        .join(" ")
        .trim();

    if (!query) {
        return api.sendMessage(
            "اكتب وصف الصورة التي تريد توليدها.\n\n" +
            "مثال:\n" +
            "بولي قطة بيضاء في مدينة مستقبلية",
            threadID,
            messageID
        );
    }

    const cacheDir =
        path.join(__dirname, "cache");

    const filePath =
        path.join(
            cacheDir,
            `poli_${Date.now()}.png`
        );

    try {
        await fs.ensureDir(cacheDir);

        const url =
            `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}`;

        const response = await axios.get(
            url,
            {
                responseType: "arraybuffer",
                timeout: 60000,
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            }
        );

        await fs.writeFile(
            filePath,
            response.data
        );

        return api.sendMessage(
            {
                body: "تم توليد الصورة بنجاح.",
                attachment:
                    fs.createReadStream(filePath)
            },
            threadID,
            () => {
                fs.remove(filePath)
                    .catch(() => {});
            },
            messageID
        );

    } catch (error) {
        console.error(
            "[بولي] Error:",
            error.message
        );

        if (
            await fs.pathExists(filePath)
        ) {
            await fs.remove(filePath)
                .catch(() => {});
        }

        return api.sendMessage(
            `تعذر توليد الصورة.\nالسبب: ${error.message || "خطأ غير معروف"}`,
            threadID,
            messageID
        );
    }
};
