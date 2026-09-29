module.exports.config = {
    name: "ستيكر",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "عرض معلومات الستيكر وإرساله بالمعرف",
    usePrefix: true,
    commandCategory: "الرسائل",
    usages: "ستيكر [ID] أو بالرد على ستيكر",
    cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
    try {
        // بالرد على ستيكر
        if (event.type === "message_reply") {

            const reply = event.messageReply;

            if (
                !reply ||
                !Array.isArray(reply.attachments) ||
                !reply.attachments.length
            ) {
                return api.sendMessage(
                    "يجب الرد على ستيكر.",
                    event.threadID,
                    event.messageID
                );
            }

            const sticker = reply.attachments.find(
                attachment =>
                    attachment &&
                    attachment.type === "sticker"
            );

            if (!sticker) {
                return api.sendMessage(
                    "الرسالة التي رددت عليها ليست ستيكر.",
                    event.threadID,
                    event.messageID
                );
            }

            const stickerID =
                sticker.ID ||
                sticker.id ||
                sticker.stickerID ||
                "غير متوفر";

            const description =
                sticker.description ||
                sticker.caption ||
                "لا يوجد وصف";

            return api.sendMessage(
`معلومات الستيكر:

ID: ${stickerID}
الوصف: ${description}`,
                event.threadID,
                event.messageID
            );
        }

        // إرسال ستيكر بواسطة ID
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
            "استخدم الأمر بالرد على ستيكر، أو أرسل ID الستيكر.",
            event.threadID,
            event.messageID
        );

    } catch (error) {
        console.error("[ستيكر] Error:", error);

        return api.sendMessage(
            "حدث خطأ أثناء معالجة الستيكر.",
            event.threadID,
            event.messageID
        );
    }
};
