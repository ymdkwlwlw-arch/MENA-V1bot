module.exports.config = {
    name: "حذف",
    aliases: ["delete", "مسح"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "حذف رسالة البوت عند الرد عليها",
    usePrefix: true,
    commandCategory: "utilities",
    usages: "حذف",
    cooldowns: 1
};

module.exports.run = async function ({ api, event }) {
    const { messageReply, threadID, messageID } = event;

    // لازم يكون في رد
    if (!messageReply) {
        return;
    }

    const botID = String(api.getCurrentUserID());
    const repliedSenderID = String(messageReply.senderID || "");

    // الرسالة ليست من البوت
    if (repliedSenderID !== botID) {
        return api.sendMessage(
            "دي م رسالتي 🦧",
            threadID,
            messageID
        );
    }

    // حذف رسالة البوت
    try {
        return await api.unsendMessage(messageReply.messageID);
    } catch (error) {
        console.error("[حذف] Error:", error);
    }
};

module.exports.languages = {
    ar: {}
};
