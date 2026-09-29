module.exports.config = {
    name: "ملصق",
    aliases: ["idst", "sticker"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Sam & Yan Maglinte | تعريب: KIROS",
    description: "عرض معرف الملصق ووصفه",
    usePrefix: true,
    commandCategory: "message",
    usages: "ملصق",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
    try {
        // إذا كان الأمر رداً على رسالة
        if (event.type === "message_reply") {
            const reply = event.messageReply;

            if (
                reply &&
                Array.isArray(reply.attachments) &&
                reply.attachments.length > 0 &&
                reply.attachments[0].type === "sticker"
            ) {
                const sticker = reply.attachments[0];

                const stickerID = sticker.ID || sticker.id || "غير متوفر";
                const description =
                    sticker.description ||
                    sticker.caption ||
                    "لا يوجد وصف";

                return api.sendMessage(
                    `معرف الملصق: ${stickerID}\nالوصف: ${description}`,
                    event.threadID,
                    event.messageID
                );
            }

            return api.sendMessage(
                "يجب الرد على ملصق.",
                event.threadID,
                event.messageID
            );
        }

        // إذا تم تمرير ID للملصق
        if (args[0]) {
            return api.sendMessage(
                {
                    sticker: args[0]
                },
                event.threadID,
                event.messageID
            );
        }

        return api.sendMessage(
            "يجب الرد على ملصق.",
            event.threadID,
            event.messageID
        );

    } catch (error) {
        console.error("[ملصق] Error:", error);

        return api.sendMessage(
            "حدث خطأ أثناء قراءة معلومات الملصق.",
            event.threadID,
            event.messageID
        );
    }
};
