const fs = require("fs-extra");
const path = require("path");
const { PassThrough } = require("stream");
const {
    createCanvas,
    loadImage
} = require("canvas");


module.exports.config = {
    name: "بوسة",
    aliases: ["بوس", "kiss"],
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "إنشاء صورة باستخدام صورتي صاحب الأمر والمستهدف",
    commandCategory: "Fun",
    usages: "بوسة @منشن أو بالرد على رسالة",
    cooldowns: 5,
    usePrefix: true
};


/* =========================================================
   إعدادات القالب
   ========================================================= */

const TEMPLATE = path.join(
    __dirname,
    "kiss.png"
);


/*
 * الدائرة اليسرى
 * = الشخص المستهدف
 */
const TARGET_AVATAR = {
    x: 300,
    y: 360,
    radius: 150
};


/*
 * الدائرة اليمنى
 * = صاحب الأمر
 */
const SENDER_AVATAR = {
    x: 720,
    y: 440,
    radius: 150
};


/* =========================================================
   تحميل صورة البروفايل
   ========================================================= */

async function getAvatar(api, userID) {

    try {

        const info =
            await api.getUserInfo(userID);

        const user =
            info?.[userID];

        if (!user) {
            throw new Error(
                "لم يتم العثور على بيانات المستخدم."
            );
        }

        const avatar =
            user.thumbSrc ||
            user.profileUrl ||
            user.picture?.data?.url;

        if (!avatar) {
            throw new Error(
                "رابط صورة البروفايل غير موجود."
            );
        }

        return avatar;

    } catch (error) {

        throw new Error(
            `تعذر الحصول على صورة المستخدم ${userID}`
        );
    }
}


/* =========================================================
   استخراج الشخص المستهدف
   ========================================================= */

function getTargetUserID(
    event,
    args
) {

    /*
     * أولاً: الشخص الذي تم الرد على رسالته
     */

    if (
        event.messageReply &&
        event.messageReply.senderID
    ) {

        return event.messageReply.senderID;
    }


    /*
     * ثانياً: المنشن
     */

    if (
        event.mentions &&
        Object.keys(event.mentions).length
    ) {

        return Object.keys(
            event.mentions
        )[0];
    }


    return null;
}


/* =========================================================
   قص الصورة داخل دائرة
   ========================================================= */

async function drawCircularAvatar(
    ctx,
    avatar,
    x,
    y,
    radius
) {

    const size =
        radius * 2;


    /*
     * نأخذ مربعاً من منتصف الصورة
     * حتى لا يتم تشويه الوجه.
     */

    const sourceSize =
        Math.min(
            avatar.width,
            avatar.height
        );


    const sourceX =
        (avatar.width -
            sourceSize) / 2;


    const sourceY =
        (avatar.height -
            sourceSize) / 2;


    ctx.save();


    /*
     * إنشاء الدائرة
     */

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    ctx.closePath();

    ctx.clip();


    /*
     * رسم الصورة داخل الدائرة
     */

    ctx.drawImage(
        avatar,

        sourceX,
        sourceY,
        sourceSize,
        sourceSize,

        x - radius,
        y - radius,
        size,
        size
    );


    ctx.restore();
}


/* =========================================================
   إنشاء الصورة النهائية
   ========================================================= */

async function generateKissImage(
    senderAvatarUrl,
    targetAvatarUrl
) {

    if (
        !fs.existsSync(TEMPLATE)
    ) {

        throw new Error(
            "ملف kiss.png غير موجود بجانب الأمر."
        );
    }


    /*
     * تحميل القالب
     */

    const baseImage =
        await loadImage(
            TEMPLATE
        );


    /*
     * إنشاء Canvas بنفس أبعاد القالب
     */

    const canvas =
        createCanvas(
            baseImage.width,
            baseImage.height
        );


    const ctx =
        canvas.getContext("2d");


    /*
     * رسم القالب
     */

    ctx.drawImage(
        baseImage,
        0,
        0,
        baseImage.width,
        baseImage.height
    );


    /*
     * تحميل صور البروفايلات
     */

    const senderAvatar =
        await loadImage(
            senderAvatarUrl
        );

    const targetAvatar =
        await loadImage(
            targetAvatarUrl
        );


    /*
     * =====================================
     * اليسار = المستهدف
     * =====================================
     */

    await drawCircularAvatar(
        ctx,
        targetAvatar,
        TARGET_AVATAR.x,
        TARGET_AVATAR.y,
        TARGET_AVATAR.radius
    );


    /*
     * =====================================
     * اليمين = صاحب الأمر
     * =====================================
     */

    await drawCircularAvatar(
        ctx,
        senderAvatar,
        SENDER_AVATAR.x,
        SENDER_AVATAR.y,
        SENDER_AVATAR.radius
    );


    /*
     * تحويل Canvas إلى Buffer
     */

    return canvas.toBuffer(
        "image/png"
    );
}


/* =========================================================
   إرسال Buffer إلى Messenger
   ========================================================= */

async function sendImage(
    api,
    threadID,
    buffer
) {

    const stream =
        new PassThrough();

    stream.end(buffer);


    return api.sendMessage(
        {
            attachment: stream
        },
        threadID
    );
}


/* =========================================================
   الأمر الرئيسي
   ========================================================= */

module.exports.run = async function ({
    api,
    event,
    args
}) {

    try {

        /*
         * الحصول على المستهدف
         */

        const targetID =
            getTargetUserID(
                event,
                args
            );


        if (!targetID) {

            return api.sendMessage(
                "💋 قم بالرد على رسالة الشخص أو منشن الشخص المستهدف.",
                event.threadID
            );
        }


        /*
         * منع استهداف نفس الشخص
         */

        if (
            String(targetID) ===
            String(event.senderID)
        ) {

            return api.sendMessage(
                "😹 لازم تختار شخصًا آخر.",
                event.threadID
            );
        }


        /*
         * إرسال حالة المعالجة
         */

        const processing =
            await api.sendMessage(
                "⏳ جاري تجهيز الصورة...",
                event.threadID
            );


        /*
         * صور البروفايل
         */

        const senderAvatar =
            await getAvatar(
                api,
                event.senderID
            );


        const targetAvatar =
            await getAvatar(
                api,
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

        if (processing) {

            try {

                await api.unsendMessage(
                    processing
                );

            } catch (_) {}
        }


        /*
         * إرسال الصورة
         */

        return await sendImage(
            api,
            event.threadID,
            image
        );

    } catch (error) {

        console.error(
            "[بوسة ERROR]",
            error
        );


        return api.sendMessage(
            "❌ حصل خطأ أثناء تجهيز الصورة.\n\n" +
            `السبب: ${error.message || "خطأ غير معروف"}`,
            event.threadID
        );
    }
};
