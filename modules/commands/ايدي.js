module.exports.config = {
    name: "ايدي",
    aliases: ["uid", "id"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Mirai Team | تعريب: KIROS",
    description: "عرض معرف المستخدم",
    usePrefix: true,
    commandCategory: "other",
    usages: "ايدي",
    cooldowns: 2
};

module.exports.run = async function ({ api, event }) {
    try {
        // إضافة تفاعل انتظار
        try {
            await api.setMessageReaction(
                "⏳",
                event.messageID,
                () => {},
                true
            );
        } catch (e) {}

        // إذا كان هناك منشن
        if (
            event.mentions &&
            Object.keys(event.mentions).length > 0
        ) {
            const results = Object.keys(event.mentions)
                .map(id => String(id));

            return api.sendMessage(
                results.join("\n"),
                event.threadID,
                event.messageID,
                async () => {
                    try {
                        await api.setMessageReaction(
                            "",
                            event.messageID,
                            () => {},
                            true
                        );
                    } catch (e) {}
                }
            );
        }

        // إذا كان الأمر رداً على رسالة
        if (event.messageReply) {
            const senderID = event.messageReply.senderID;

            return api.sendMessage(
                String(senderID),
                event.threadID,
                event.messageID,
                async () => {
                    try {
                        await api.setMessageReaction(
                            "",
                            event.messageID,
                            () => {},
                            true
                        );
                    } catch (e) {}
                }
            );
        }

        // عرض ID صاحب الأمر
        return api.sendMessage(
            String(event.senderID),
            event.threadID,
            event.messageID,
            async () => {
                try {
                    await api.setMessageReaction(
                        "",
                        event.messageID,
                        () => {},
                        true
                    );
                } catch (e) {}
            }
        );

    } catch (error) {
        console.error("[ايدي] Error:", error.message);

        try {
            await api.setMessageReaction(
                "",
                event.messageID,
                () => {},
                true
            );
        } catch (e) {}
    }
};
