const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "عني",
    aliases: ["معلومات", "stalk", "بروفايل", "me"],
    version: "3.0.0",
    hasPermssion: 0,
    credits: "Deku & Yan Maglinte | KIROS",
    description: "عرض معلومات المستخدم",
    usePrefix: true,
    usages: "عني | الرد على رسالة | منشن | ID",
    commandCategory: "info",
    cooldowns: 5
};

function style(title, content = "") {
    return (
        "╭─  ── ── ── ──  ─╮\n" +
        `     ${title}\n` +
        "╰─  ── ── ── ──  ─╯\n" +
        content +
        "\n── ── ── ── ── ── ──"
    );
}

function getTargetID(event, args) {
    // الرد على رسالة
    if (
        event.type === "message_reply" &&
        event.messageReply?.senderID
    ) {
        return String(event.messageReply.senderID);
    }

    // المنشن
    const mentions = Object.keys(event.mentions || {});

    if (mentions.length > 0) {
        return String(mentions[0]);
    }

    // ID مباشر
    if (args[0] && /^\d+$/.test(args[0])) {
        return String(args[0]);
    }

    // المستخدم نفسه
    return String(event.senderID);
}

async function downloadImage(url, filePath) {
    if (!url) return false;

    try {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        await fs.writeFile(filePath, response.data);
        return true;
    } catch (error) {
        console.log(
            "[عني] فشل تحميل الصورة:",
            error.message
        );

        return false;
    }
}

module.exports.run = async function ({
    api,
    event,
    args
}) {
    const {
        threadID,
        messageID
    } = event;

    const cacheDir =
        path.join(__dirname, "cache");

    const imagePath = path.join(
        cacheDir,
        `ani_${threadID}_${Date.now()}.jpg`
    );

    try {
        await fs.ensureDir(cacheDir);

        const targetID =
            getTargetID(event, args);

        if (!targetID) {
            return api.sendMessage(
                "تعذر تحديد المستخدم.",
                threadID,
                messageID
            );
        }

        let userInfo;

        try {
            userInfo =
                await api.getUserInfo(targetID);
        } catch (error) {
            console.error(
                "[عني] getUserInfo:",
                error.message
            );

            return api.sendMessage(
                "تعذر الحصول على معلومات المستخدم.",
                threadID,
                messageID
            );
        }

        const user =
            userInfo?.[targetID];

        if (!user) {
            return api.sendMessage(
                "لم يتم العثور على معلومات هذا المستخدم.",
                threadID,
                messageID
            );
        }

        const name =
            user.name ||
            "غير معروف";

        const profileUrl =
            user.profileUrl ||
            `https://www.facebook.com/${targetID}`;

        const username =
            user.vanity &&
            user.vanity !== "unknown"
                ? user.vanity
                : "غير متوفر";

        const gender =
            user.gender ||
            "غير معروف";

        const type =
            user.type ||
            "مستخدم";

        const isFriend =
            user.isFriend === true
                ? "نعم"
                : user.isFriend === false
                    ? "لا"
                    : "غير معروف";

        const imageUrl =
            user.imageSrc ||
            user.profilePic ||
            user.avatar ||
            null;

        const body = style(
            "نـظـام مـعـلـومـاتـي",
            `⎔ الاسـم: ${name}\n` +
            `⎔ الـمـسـتـخـدم: ${username}\n` +
            `⎔ الـمـعـرف: ${targetID}\n` +
            `⎔ الـرابـط: ${profileUrl}\n` +
            `⎔ الـنـوع: ${type}\n` +
            `⎔ الـجـنـس: ${gender}\n` +
            `⊞ صـديـق: ${isFriend}\n` +
            `⊞ الـحـالـة: مـتـاحـة`
        );

        // إرسال الصورة إذا كانت متوفرة
        if (imageUrl) {
            const downloaded =
                await downloadImage(
                    imageUrl,
                    imagePath
                );

            if (downloaded) {
                return api.sendMessage(
                    {
                        body,
                        attachment:
                            fs.createReadStream(
                                imagePath
                            )
                    },
                    threadID,
                    () => {
                        setTimeout(async () => {
                            try {
                                await fs.remove(
                                    imagePath
                                );
                            } catch {}
                        }, 3000);
                    },
                    messageID
                );
            }
        }

        return api.sendMessage(
            body,
            threadID,
            messageID
        );

    } catch (error) {
        console.error(
            "[عني] Error:",
            error
        );

        try {
            if (
                await fs.pathExists(imagePath)
            ) {
                await fs.remove(imagePath);
            }
        } catch {}

        return api.sendMessage(
            `حدث خطأ أثناء جلب المعلومات.\nالسبب: ${error.message || "غير معروف"}`,
            threadID,
            messageID
        );
    }
};
