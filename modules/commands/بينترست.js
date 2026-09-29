const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "cache");
const sessions = new Map();

module.exports.config = {
    name: "بينترست",
    aliases: ["pinterest", "بنترست"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Joshua Sy | تعريب وتطوير: KIROS",
    description: "البحث عن صور من Pinterest وعرضها على دفعات",
    usePrefix: true,
    commandCategory: "Search",
    usages: "بينترست اسم البحث",
    cooldowns: 5
};

async function getImages(query) {
    const url =
        `https://api-dien.kira1011.repl.co/pinterest?search=${encodeURIComponent(query)}`;

    const response = await axios.get(url, {
        timeout: 15000
    });

    if (!response.data || !Array.isArray(response.data.data)) {
        throw new Error("لم يتم العثور على نتائج.");
    }

    return response.data.data.filter(Boolean);
}

async function sendResults(api, threadID, messageID, session) {
    const start = session.index;
    const end = Math.min(start + 5, session.images.length);
    const selected = session.images.slice(start, end);

    if (!selected.length) {
        return api.sendMessage(
            "لا توجد نتائج إضافية لهذا البحث.",
            threadID,
            messageID
        );
    }

    const files = [];

    try {
        await api.setMessageReaction(
            "⏳",
            messageID,
            () => {},
            true
        );
    } catch (e) {}

    try {
        await fs.ensureDir(CACHE_DIR);

        for (let i = 0; i < selected.length; i++) {
            const imageURL = selected[i];

            try {
                const response = await axios.get(imageURL, {
                    responseType: "arraybuffer",
                    timeout: 15000,
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                });

                const filePath = path.join(
                    CACHE_DIR,
                    `pinterest_${threadID}_${Date.now()}_${i}.jpg`
                );

                await fs.writeFile(filePath, response.data);
                files.push({
                    path: filePath,
                    stream: fs.createReadStream(filePath)
                });
            } catch (error) {
                console.log(
                    "[بينترست] فشل تحميل صورة:",
                    error.message
                );
            }
        }

        if (!files.length) {
            throw new Error("تعذر تحميل الصور.");
        }

        const shown = end - start;
        const remaining = session.images.length - end;

        let body =
            `نتائج Pinterest\n\n` +
            `البحث: ${session.query}\n` +
            `الصور المعروضة: ${shown}\n`;

        if (remaining > 0) {
            body +=
                `المتبقي: ${remaining}\n\n` +
                `تفاعل بـ ❤️ على هذه الرسالة لعرض المزيد.`;
        } else {
            body += "\nانتهت جميع النتائج.";
        }

        const sent = await api.sendMessage(
            {
                body,
                attachment: files.map(file => file.stream)
            },
            threadID,
            messageID
        );

        // حفظ جلسة هذه الرسالة الجديدة
        if (sent && sent.messageID && remaining > 0) {
            session.index = end;
            sessions.set(String(sent.messageID), session);
        }

        try {
            if (sent && sent.messageID) {
                await api.setMessageReaction(
                    "❤️",
                    sent.messageID,
                    () => {},
                    true
                );
            }
        } catch (e) {}

        // حذف الملفات المؤقتة
        setTimeout(async () => {
            for (const file of files) {
                try {
                    if (await fs.pathExists(file.path)) {
                        await fs.remove(file.path);
                    }
                } catch (e) {}
            }
        }, 10000);

    } catch (error) {
        console.error("[بينترست] Error:", error);

        try {
            await api.sendMessage(
                "حدث خطأ أثناء تحميل نتائج Pinterest.",
                threadID,
                messageID
            );
        } catch (e) {}
    } finally {
        try {
            await api.setMessageReaction(
                "",
                messageID,
                () => {},
                true
            );
        } catch (e) {}
    }
}


// استقبال التفاعل ❤️
module.exports.handleEvent = async function ({ api, event }) {
    try {
        if (event.type !== "message_reaction") return;

        const reaction = event.reaction;
        const messageID = String(event.messageID || "");

        // فقط ❤️
        if (reaction !== "❤️") return;

        const session = sessions.get(messageID);

        if (!session) return;

        // منع أي شخص من متابعة جلسة شخص آخر
        if (
            session.senderID &&
            String(event.userID || event.senderID) !== String(session.senderID)
        ) {
            return;
        }

        // حذف الجلسة القديمة
        sessions.delete(messageID);

        await sendResults(
            api,
            session.threadID,
            messageID,
            session
        );

    } catch (error) {
        console.error("[بينترست] Reaction Error:", error);
    }
};


module.exports.run = async function ({ api, event, args }) {
    const query = args.join(" ").trim();

    if (!query) {
        return api.sendMessage(
            "اكتب اسم الشيء الذي تريد البحث عنه.\n\nمثال:\nبينترست Naruto",
            event.threadID,
            event.messageID
        );
    }

    try {
        const images = await getImages(query);

        if (!images.length) {
            return api.sendMessage(
                "لم يتم العثور على صور لهذا البحث.",
                event.threadID,
                event.messageID
            );
        }

        const session = {
            query,
            images,
            index: 0,
            threadID: event.threadID,
            senderID: event.senderID
        };

        await sendResults(
            api,
            event.threadID,
            event.messageID,
            session
        );

    } catch (error) {
        console.error("[بينترست] Search Error:", error);

        return api.sendMessage(
            "تعذر الوصول إلى خدمة البحث عن الصور حالياً.",
            event.threadID,
            event.messageID
        );
    }
};
