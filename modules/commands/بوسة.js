const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { PassThrough } = require("stream");
const { Jimp } = require("jimp");

module.exports.config = {
    name: "بوسة",
    aliases: ["بوس", "kiss"],
    version: "3.0.0",
    hasPermssion: 0,
    credits: "Hakim Tracks | KIROS",
    description: "دمج صورتي شخصين داخل قالب بوسة",
    commandCategory: "Fun",
    usages: "بوسة @منشن أو بالرد",
    cooldowns: 5,
    usePrefix: true
};

/* =========================================================
   قالب البوسة
   ========================================================= */

const BASE_URL =
    "https://i.postimg.cc/3xXSfwLC/b67185ef51e95c164937feb591a23f4c.jpg";

/* =========================================================
   صورة احتياطية
   ========================================================= */

const FALLBACK_AVATAR =
    "https://i.ibb.co/bBSpr5v/143086968-2856368904622192-1959732218791162458-n.png";

/* =========================================================
   مجلد التخزين المؤقت
   ========================================================= */

const CACHE_DIR =
    path.join(
        __dirname,
        "cache"
    );

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(
        CACHE_DIR,
        { recursive: true }
    );
}

/* =========================================================
   الحصول على المستهدف
   ========================================================= */

function getTargetID(event) {

    const {
        senderID,
        messageReply,
        mentions
    } = event;

    if (
        messageReply &&
        messageReply.senderID &&
        String(messageReply.senderID) !==
        String(senderID)
    ) {
        return messageReply.senderID;
    }

    if (
        mentions &&
        Object.keys(mentions).length > 0
    ) {
        return Object.keys(mentions)[0];
    }

    return null;
}

/* =========================================================
   الحصول على صورة البروفايل
   ========================================================= */

async function getAvatarUrl(userID) {

    try {

        const response =
            await axios.post(
                "https://www.facebook.com/api/graphql/",
                null,
                {
                    params: {
                        doc_id:
                            "5341536295888250",

                        variables:
                            JSON.stringify({
                                height: 512,
                                scale: 1,
                                userID:
                                    String(userID),
                                width: 512
                            })
                    },

                    timeout: 15000,

                    headers: {
                        "User-Agent":
                            "Mozilla/5.0"
                    }
                }
            );

        const url =
            response?.data
                ?.data
                ?.profile
                ?.profile_picture
                ?.uri;

        return url || FALLBACK_AVATAR;

    } catch (error) {

        return FALLBACK_AVATAR;
    }
}

/* =========================================================
   تحميل صورة كرابط إلى Buffer
   ========================================================= */

async function downloadBuffer(url) {

    const response =
        await axios.get(
            url,
            {
                responseType:
                    "arraybuffer",

                timeout: 20000,

                headers: {
                    "User-Agent":
                        "Mozilla/5.0"
                }
            }
        );

    return Buffer.from(
        response.data
    );
}

/* =========================================================
   تجهيز صورة دائرية
   ========================================================= */

function makeCircularAvatar(
    image,
    size
) {

    const width =
        image.bitmap.width;

    const height =
        image.bitmap.height;

    const cropSize =
        Math.min(
            width,
            height
        );

    const cropX =
        Math.floor(
            (width - cropSize) / 2
        );

    const cropY =
        Math.floor(
            (height - cropSize) / 2
        );

    const avatar =
        image.clone();

    avatar.crop({
        x: cropX,
        y: cropY,
        w: cropSize,
        h: cropSize
    });

    avatar.resize({
        w: size,
        h: size
    });

    const center =
        size / 2;

    const radius =
        size / 2;

    avatar.scan(
        0,
        0,
        size,
        size,
        function (x, y, idx) {

            const dx =
                x + 0.5 - center;

            const dy =
                y + 0.5 - center;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (
                distance > radius
            ) {
                this.bitmap.data[
                    idx + 3
                ] = 0;
            }
        }
    );

    return avatar;
}

/* =========================================================
   إنشاء صورة البوسة
   ========================================================= */

async function generateKissImage(
    senderURL,
    targetURL
) {

    /*
     * تحميل القالب
     */

    const baseBuffer =
        await downloadBuffer(
            BASE_URL
        );

    /*
     * تحميل صور الأشخاص
     */

    const senderBuffer =
        await downloadBuffer(
            senderURL
        );

    const targetBuffer =
        await downloadBuffer(
            targetURL
        );

    /*
     * تحويلها إلى Jimp
     */

    const base =
        await Jimp.read(
            baseBuffer
        );

    const sender =
        await Jimp.read(
            senderBuffer
        );

    const target =
        await Jimp.read(
            targetBuffer
        );

    /*
     * حجم الصور
     */

    const imgSize = 160;

    /*
     * تجهيز الدوائر
     */

    const avatar1 =
        makeCircularAvatar(
            sender,
            imgSize
        );

    const avatar2 =
        makeCircularAvatar(
            target,
            imgSize
        );

    /*
     * أبعاد القالب
     */

    const centerX =
        base.bitmap.width / 2;

    const centerY =
        base.bitmap.height / 2;

    /*
     * مكان صاحب الأمر
     */

    const pos1 = {
        x:
            Math.round(
                centerX -
                imgSize -
                45
            ),

        y:
            Math.round(
                centerY -
                imgSize -
                10
            )
    };

    /*
     * مكان المستهدف
     */

    const pos2 = {
        x:
            Math.round(
                centerX + 40
            ),

        y:
            Math.round(
                centerY -
                imgSize / 4
            )
    };

    /*
     * دمج الصور
     */

    base.composite(
        avatar1,
        pos1.x,
        pos1.y
    );

    base.composite(
        avatar2,
        pos2.x,
        pos2.y
    );

    /*
     * إخراج PNG
     */

    return await base.getBuffer(
        "image/jpeg"
    );
}

/* =========================================================
   إرسال الصورة
   ========================================================= */

async function sendImage(
    api,
    threadID,
    buffer
) {

    const outputPath =
        path.join(
            CACHE_DIR,
            `kiss_${Date.now()}.jpg`
        );

    const image =
        await Jimp.read(buffer);

    await image.write(outputPath);

    return new Promise((resolve, reject) => {

        api.sendMessage(
            {
                attachment:
                    fs.createReadStream(
                        outputPath
                    )
            },
            threadID,
            (error, info) => {

                try {
                    fs.unlinkSync(outputPath);
                } catch (_) {}

                if (error) {
                    return reject(error);
                }

                resolve(info);
            }
        );

    });
}

/* =========================================================
   تشغيل الأمر
   ========================================================= */

module.exports.run =
async function ({
    api,
    event
}) {

    let processing = null;

    try {

        const {
            senderID,
            threadID
        } = event;

        /*
         * تحديد المستهدف
         */

        const targetID =
            getTargetID(event);

        if (!targetID) {

            return api.sendMessage(
                "لازم تعمل منشن أو ترد على شخص.",
                threadID
            );
        }

        /*
         * منع بوسة النفس
         */

        if (
            String(targetID) ===
            String(senderID)
        ) {

            return api.sendMessage(
                "ما ينفع تستهدف نفسك.",
                threadID
            );
        }

        /*
         * رسالة انتظار
         */

        processing =
            await api.sendMessage(
                "جاري تجهيز الصورة...",
                threadID
            );

        /*
         * الحصول على الصور
         */

        const senderAvatar =
            await getAvatarUrl(
                senderID
            );

        const targetAvatar =
            await getAvatarUrl(
                targetID
            );

        /*
         * إنشاء الصورة
         */

        const image =
            await generateKissImage(
                senderAvatar,
                targetAvatar
            );

        /*
         * حذف رسالة الانتظار
         */

        if (
            processing &&
            processing.messageID
        ) {

            try {

                await api.unsendMessage(
                    processing.messageID
                );

            } catch (_) {}
        }

        /*
         * إرسال النتيجة
         */

        return await sendImage(
            api,
            threadID,
            image
        );

    } catch (error) {

        console.error(
            "[بوسة ERROR]",
            error
        );

        /*
         * محاولة حذف الانتظار
         */

        if (
            processing &&
            processing.messageID
        ) {

            try {

                await api.unsendMessage(
                    processing.messageID
                );

            } catch (_) {}
        }

        return api.sendMessage(
            "حصل خطأ أثناء تجهيز الصورة.\n\n" +
            `السبب: ${
                error.message ||
                "خطأ غير معروف"
            }`,
            event.threadID
        );
    }
};
