module.exports.config = {
    name: "ارفعي",
    aliases: ["ارفع", "رفع"],
    version: "2.0.0",
    hasPermssion: 0,
    credits: "ڪولو سان",
    description: "رفع المطور أو عضو إلى أدمن",
    commandCategory: "مطور",
    usages: "/ارفعي | بالرد | منشن",
    cooldowns: 3,
    usePrefix: true
};

const DEVELOPER_ID = "61593958054356";

module.exports.run = async function ({ api, event }) {
    const { threadID, senderID, messageID, mentions, messageReply } = event;

    // المطور فقط
    if (String(senderID) !== DEVELOPER_ID) {
        return;
    }

    try {
        let targetID = null;

        // بالرد على رسالة
        if (messageReply && messageReply.senderID) {
            targetID = String(messageReply.senderID);
        }

        // بالمنشن
        if (!targetID && mentions && Object.keys(mentions).length > 0) {
            targetID = String(Object.keys(mentions)[0]);
        }

        // بدون رد أو منشن = المطور
        if (!targetID) {
            targetID = DEVELOPER_ID;
        }

        if (typeof api.changeAdminStatus !== "function") {
            return api.sendMessage(
                "وظيفة رفع الأدمن غير متوفرة في نسخة البوت الحالية.",
                threadID,
                messageID
            );
        }

        api.changeAdminStatus(
            threadID,
            targetID,
            true,
            (error) => {
                if (error) {
                    console.error(
                        "[ارفعي] فشل رفع الأدمن:",
                        error.message || error
                    );

                    return api.sendMessage(
                        "فشل رفع الشخص. تأكد أن البوت أدمن في المجموعة.",
                        threadID,
                        messageID
                    );
                }

                return api.sendMessage(
                    "تم رفع الشخص إلى أدمن.",
                    threadID,
                    messageID
                );
            }
        );

    } catch (error) {
        console.error(
            "[ارفعي] Error:",
            error.message || error
        );

        return api.sendMessage(
            "حدث خطأ أثناء تنفيذ الأمر.",
            threadID,
            messageID
        );
    }
};
