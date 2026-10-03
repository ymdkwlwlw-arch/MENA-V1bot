module.exports.config = {
    name: "اصفعي",
    version: "4.1.0",
    hasPermssion: 0,
    credits: "محمد إدريس",
    description: "تصفع عضوًا بالتاغ أو بالرد على رسالته",
    usePrefix: true,
    commandCategory: "الترفيه",
    usages: "اصفعي @الشخص أو بالرد على رسالته",
    cooldowns: 5,

    dependencies: {
        axios: "",
        "fs-extra": "",
        path: "",
        jimp: ""
    }
};


const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const Jimp = require("jimp");


/* ╭─── ◸ إعـدادات الـنـظـام ◿ ───╮ */

const CACHE_DIR = path.join(
    __dirname,
    "cache",
    "canvas"
);

const BASE_IMAGE = path.join(
    CACHE_DIR,
    "sato.png"
);

const BASE_IMAGE_URL =
    "https://i.imgur.com/dsrmtlg.jpg";


/* ╭─── ◸ تـجـهـيـز الـكـاش ◿ ───╮ */

module.exports.onLoad = async function () {

    try {

        await fs.ensureDir(
            CACHE_DIR
        );

        if (
            !fs.existsSync(
                BASE_IMAGE
            )
        ) {

            const response =
                await axios.get(
                    BASE_IMAGE_URL,
                    {
                        responseType:
                            "arraybuffer",
                        timeout: 30000
                    }
                );

            await fs.writeFile(
                BASE_IMAGE,
                Buffer.from(
                    response.data
                )
            );
        }

    } catch (error) {

        console.error(
            "[اصفعي] onLoad Error:",
            error
        );
    }
};


/* ╭─── ◸ تـحـمـيـل صـورة الـعـضـو ◿ ───╮ */

async function downloadAvatar(
    userID,
    filePath
) {

    const response =
        await axios.get(
            `https://graph.facebook.com/${userID}/picture`,
            {
                params: {
                    width: 512,
                    height: 512
                },

                responseType:
                    "arraybuffer",

                timeout: 30000,

                maxRedirects: 5
            }
        );

    await fs.writeFile(
        filePath,
        Buffer.from(
            response.data
        )
    );
}


/* ╭─── ◸ تـحـويـل الـصـورة ◿ ───╮ */

async function makeCircle(
    imagePath
) {

    const image =
        await Jimp.read(
            imagePath
        );

    image.circle();

    return image;
}


/* ╭─── ◸ صـنـاعـة الـصـورة ◿ ───╮ */

async function makeImage({
    senderID,
    targetID
}) {

    await fs.ensureDir(
        CACHE_DIR
    );

    const senderAvatar =
        path.join(
            CACHE_DIR,
            `sender_${senderID}.png`
        );

    const targetAvatar =
        path.join(
            CACHE_DIR,
            `target_${targetID}.png`
        );

    const output =
        path.join(
            CACHE_DIR,
            `اصفعي_${senderID}_${targetID}_${Date.now()}.png`
        );


    try {

        /*
         * تحميل صورة المرسل
         */

        await downloadAvatar(
            senderID,
            senderAvatar
        );


        /*
         * تحميل صورة المستهدف
         */

        await downloadAvatar(
            targetID,
            targetAvatar
        );


        /*
         * الصورة الأساسية
         */

        const background =
            await Jimp.read(
                BASE_IMAGE
            );


        /*
         * الصور الدائرية
         */

        const first =
            await makeCircle(
                senderAvatar
            );

        const second =
            await makeCircle(
                targetAvatar
            );


        /*
         * تغيير الحجم
         */

        first.resize(
            150,
            150
        );

        second.resize(
            150,
            150
        );


        /*
         * تركيب الصور
         */

        background.composite(
            first,
            80,
            190
        );

        background.composite(
            second,
            260,
            80
        );


        /*
         * حفظ الصورة النهائية
         */

        await background.writeAsync(
            output
        );


        return output;

    } finally {

        /*
         * تنظيف صور الأعضاء المؤقتة
         */

        try {

            if (
                fs.existsSync(
                    senderAvatar
                )
            ) {

                await fs.remove(
                    senderAvatar
                );
            }

            if (
                fs.existsSync(
                    targetAvatar
                )
            ) {

                await fs.remove(
                    targetAvatar
                );
            }

        } catch (error) {

            console.error(
                "[اصفعي] Avatar Cleanup:",
                error
            );
        }
    }
}


/* ╭─── ◸ تـنـفـيـذ الأمـر ◿ ───╮ */

module.exports.run = async function ({
    api,
    event
}) {

    const {
        threadID,
        messageID,
        senderID,
        mentions,
        messageReply
    } = event;


    /*
     * ==========================================
     * تحديد الشخص المستهدف
     *
     * الأولوية:
     * 1 - الرد
     * 2 - التاغ
     * ==========================================
     */

    let targetID = null;


    /*
     * الرد على رسالة
     */

    if (
        messageReply &&
        messageReply.senderID
    ) {

        targetID =
            String(
                messageReply.senderID
            );
    }


    /*
     * التاغ
     */

    else if (
        mentions &&
        typeof mentions === "object" &&
        Object.keys(
            mentions
        ).length > 0
    ) {

        targetID =
            String(
                Object.keys(
                    mentions
                )[0]
            );
    }


    /*
     * ==========================================
     * لا يوجد شخص مستهدف
     * ==========================================
     */

    if (!targetID) {

        return api.sendMessage(
            "قم بعمل تاغ للشخص أو استخدم الأمر بالرد على رسالته.",
            threadID,
            () => {},
            messageID
        );
    }


    /*
     * ==========================================
     * منع ضرب النفس
     * ==========================================
     */

    if (
        String(targetID) ===
        String(senderID)
    ) {

        return api.sendMessage(
            "ما تقدر تستخدم الأمر على نفسك.",
            threadID,
            () => {},
            messageID
        );
    }


    let imagePath = null;


    try {

        /*
         * ==========================================
         * إنشاء الصورة
         * ==========================================
         */

        imagePath =
            await makeImage({
                senderID,
                targetID
            });


        /*
         * ==========================================
         * رسالة النتيجة
         * ==========================================
         */

        const body =
            "╭─── ◸ اصـفـعـي ◿ ───╮\n" +
            "│\n" +
            "│  ◉ تـم تـنـفـيـذ الـعـمـلـيـة\n" +
            "│\n" +
            "╰──────────────────╯";


        /*
         * ==========================================
         * إرسال المرفق
         *
         * مهم:
         * callback هو الوسيط الثالث
         * messageID هو الوسيط الرابع
         * ==========================================
         */

        return api.sendMessage(
            {
                body: body,

                attachment:
                    fs.createReadStream(
                        imagePath
                    )
            },

            threadID,

            (error) => {

                /*
                 * حذف الصورة بعد الإرسال
                 */

                try {

                    if (
                        imagePath &&
                        fs.existsSync(
                            imagePath
                        )
                    ) {

                        fs.unlinkSync(
                            imagePath
                        );
                    }

                } catch (cleanupError) {

                    console.error(
                        "[اصفعي] Send Cleanup:",
                        cleanupError
                    );
                }


                if (error) {

                    console.error(
                        "[اصفعي] Send Error:",
                        error
                    );
                }
            },

            messageID
        );

    } catch (error) {

        console.error(
            "[اصفعي] Error:",
            error
        );


        /*
         * ==========================================
         * تنظيف الملف في حالة الخطأ
         * ==========================================
         */

        try {

            if (
                imagePath &&
                fs.existsSync(
                    imagePath
                )
            ) {

                fs.unlinkSync(
                    imagePath
                );
            }

        } catch {}


        /*
         * ==========================================
         * رسالة الخطأ
         * ==========================================
         */

        return api.sendMessage(
            "تعذر تنفيذ الأمر حاليًا، حاول مرة أخرى.",
            threadID,
            () => {},
            messageID
        );
    }
};
