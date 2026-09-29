module.exports.config = {
    name: "حذف",
    aliases: ["delete", "مسح"],
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "حذف رسالة البوت عند الرد عليها",
    usePrefix: true,
    commandCategory: "utilities",
    usages: "حذف",
    cooldowns: 1
};

module.exports.run = async function ({ api, event }) {
    try {
        // يجب أن يكون الأمر رداً على رسالة
        if (!event.messageReply) return;

        const repliedMessage = event.messageReply;

        // الحصول على ID البوت الحالي
        const botID = String(api.getCurrentUserID());

        // التأكد أن الرسالة التي يتم الرد عليها من البوت
        const senderID = String(repliedMessage.senderID || "");

        if (senderID !== botID) return;

        // حذف رسالة البوت التي تم الرد عليها
        await api.unsendMessage(repliedMessage.messageID);

        // لا يوجد أي رد
        return;
    } catch (error) {
        // صامت تماماً حتى عند حدوث خطأ
        console.error("[حذف] Error:", error.message);
    }
};
