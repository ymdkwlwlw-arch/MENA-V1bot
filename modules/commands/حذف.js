module.exports.config = {
    name: "حذف",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Mirai Team",
    description: "حذف رسالة البوت بالرد عليها",
    usePrefix: true,
    commandCategory: "رسائل",
    usages: "حذف",
    cooldowns: 0
};

module.exports.run = function ({ api, event }) {
    try {
        if (!event.messageReply) {
            return api.sendMessage(
                "⚠️ يجب الرد على رسالة البوت أولاً.",
                event.threadID,
                event.messageID
            );
        }

        const botID = String(api.getCurrentUserID());
        const senderID = String(event.messageReply.senderID);

        console.log("━━━━━━━━━━━━━━━━━━");
        console.log("BOT ID    :", botID);
        console.log("SENDER ID :", senderID);
        console.log("MESSAGE ID:", event.messageReply.messageID);
        console.log("━━━━━━━━━━━━━━━━━━");

        if (senderID !== botID) {
            return api.sendMessage(
                "⚠️ الرسالة التي رددت عليها ليست من البوت.",
                event.threadID,
                event.messageID
            );
        }

        return api.unsendMessage(
            event.messageReply.messageID,
            (error) => {
                if (error) {
                    console.error("UNSEND ERROR:", error);

                    return api.sendMessage(
                        "❌ فشل حذف الرسالة.\nتحقق من سجل البوت لمعرفة الخطأ.",
                        event.threadID,
                        event.messageID
                    );
                }

                console.log("✓ تم حذف الرسالة بنجاح.");
            }
        );

    } catch (error) {
        console.error("DELETE ERROR:", error);

        return api.sendMessage(
            "❌ حدث خطأ أثناء تنفيذ الحذف.",
            event.threadID,
            event.messageID
        );
    }
};
