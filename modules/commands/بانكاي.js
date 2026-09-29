const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "بانكاي",
    version: "1.5",
    hasPermssion: 1,
    credits: "Rako San",
    description: "طرد عضو عبر التاغ أو الرد بكلمة بانكاي",
    usePrefix: true,
    commandCategory: "مطور",
    usages: "بانكاي @تاغ | أو رد بكلمة بانكاي",
    cooldowns: 5.
};

const DEVELOPER_ID = "61593519041412";

module.exports.run = async function ({
    api,
    event,
    args
}) {
    const {
        threadID,
        messageID,
        senderID,
        mentions,
        messageReply
    } = event;

    try {
        const threadInfo =
            await api.getThreadInfo(threadID);

        const adminIDs =
            Array.isArray(threadInfo.adminIDs)
                ? threadInfo.adminIDs
                : [];

        // التحقق من صلاحية المستخدم
        const isAdmin = adminIDs.some(
            admin =>
                String(admin.id) ===
                String(senderID)
        );

        if (
            !isAdmin &&
            String(senderID) !==
            String(DEVELOPER_ID)
        ) {
            return api.sendMessage(
                "بتعرف تهز ʕᵕ᷄-ᵕ᷅ʔ؟",
                threadID,
                messageID
            );
        }

        // التحقق من صلاحية البوت
        const botID =
            String(api.getCurrentUserID());

        const isBotAdmin =
            adminIDs.some(
                admin =>
                    String(admin.id) === botID
            );

        if (!isBotAdmin) {
            return api.sendMessage(
                "ارفع ابوك دا اول 🦧📿",
                threadID,
                messageID
            );
        }

        let targetID = null;

        // الهدف عن طريق الرد
        if (
            messageReply &&
            messageReply.senderID
        ) {
            targetID =
                String(
                    messageReply.senderID
                );
        }

        // الهدف عن طريق التاغ
        else if (
            mentions &&
            typeof mentions === "object" &&
            Object.keys(mentions).length > 0
        ) {
            targetID =
                String(
                    Object.keys(mentions)[0]
                );
        }

        // لا يوجد هدف
        if (!targetID) {
            return api.sendMessage(
                "اعمل تاق للعب او رد على رسالتو 🐢",
                threadID,
                messageID
            );
        }

        // منع طرد البوت نفسه
        if (
            String(targetID) === botID
        ) {
            return api.sendMessage(
                "وزع ي عب مبتقدر تطردني ʕᴗᴥdad҂ʔ",
                threadID,
                messageID
            );
        }

        // تنفيذ الطرد
        await api.removeUserFromGroup(
            targetID,
            threadID
        );

        // تجهيز الصورة
        const imageUrl =
            "https://i.ibb.co/bg9N9sqb/received-1070178788428323-jpeg.jpg";

        const cacheDir =
            path.join(
                __dirname,
                "cache"
            );

        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(
                cacheDir,
                { recursive: true }
            );
        }

        const imagePath =
            path.join(
                cacheDir,
                `bankai_${targetID}.jpg`
            );

        const response =
            await axios.get(
                imageUrl,
                {
                    responseType:
                        "arraybuffer",
                    timeout: 15000
                }
            );

        fs.writeFileSync(
            imagePath,
            Buffer.from(
                response.data
            )
        );

        return api.sendMessage(
            {
                body: "بانكاي طلقه فڪِـٰٰٖٖٚ𝑆ــــ꯭​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​🥊ــ۬ꦿ ــݽٖـۦٰۛـِمِۘـ𝑀ــᬼ🔥َ⃟ᬼ‌‍ڪ منشوفك هنا تاني. 𓂍_𓂌",
                attachment:
                    fs.createReadStream(
                        imagePath
                    )
            },
            threadID,
            messageID
        );

    } catch (error) {
        console.error(
            "[بانكاي] Error:",
            error
        );

        return api.sendMessage(
            "⚠️ حدث خطأ، تأكد من إعدادات المجموعة.",
            threadID,
            messageID
        );
    }
};
