const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const Jimp = require("jimp");

module.exports.config = {
    name: "اصفعي",
    version: "4.0.0",
    hasPermssion: 0,
    credits: "محمد إدريس",
    description: "تنفيذ أمر اصفعي بالتاغ أو بالرد",
    commandCategory: "الترفيه",
    usages: "اصفعي @الشخص",
    cooldowns: 5
};

const CACHE_DIR = path.join(
    __dirname,
    "cache"
);

const BASE_IMAGE =
    path.join(
        CACHE_DIR,
        "اصفعي_base.jpg"
    );

const BASE_IMAGE_URL =
    "https://i.imgur.com/dsrmtlg.jpg";


module.exports.onLoad = async function () {
    try {
        await fs.ensureDir(
            CACHE_DIR
        );

        if (!fs.existsSync(BASE_IMAGE)) {
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
            "[اصفعي] onLoad:",
            error
        );
    }
};


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


async function createCircle(
    filePath
) {
    const image =
        await Jimp.read(
            filePath
        );

    image.circle();

    return image;
}


async function createImage({
    senderID,
    targetID
}) {
    await fs.ensureDir(
        CACHE_DIR
    );

    const senderFile =
        path.join(
            CACHE_DIR,
            `sender_${senderID}_${Date.now()}.png`
        );

    const targetFile =
        path.join(
            CACHE_DIR,
            `target_${targetID}_${Date.now()}.png`
        );

    const outputFile =
        path.join(
            CACHE_DIR,
            `اصفعي_${Date.now()}.png`
        );

    try {
        await downloadAvatar(
            senderID,
            senderFile
        );

        await downloadAvatar(
            targetID,
            targetFile
        );

        const background =
            await Jimp.read(
                BASE_IMAGE
            );

        const senderImage =
            await createCircle(
                senderFile
            );

        const targetImage =
            await createCircle(
                targetFile
            );

        senderImage.resize(
            150,
            150
        );

        targetImage.resize(
            150,
            150
        );

        background.composite(
            senderImage,
            80,
            190
        );

        background.composite(
            targetImage,
            260,
            80
        );

        await background.writeAsync(
            outputFile
        );

        return outputFile;

    } finally {
        try {
            if (
                fs.existsSync(
                    senderFile
                )
            ) {
                await fs.remove(
                    senderFile
                );
            }

            if (
                fs.existsSync(
                    targetFile
                )
            ) {
                await fs.remove(
                    targetFile
                );
            }
        } catch {}
    }
}


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

    let targetID = null;

    /*
     * الأولوية للرد
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
     * ثم التاغ
     */

    else if (
        mentions &&
        typeof mentions === "object" &&
        Object.keys(mentions).length > 0
    ) {
        targetID =
            String(
                Object.keys(
                    mentions
                )[0]
            );
    }

    if (!targetID) {
        return api.sendMessage(
            "قم بعمل تاغ للشخص أو استخدم الأمر بالرد على رسالته.",
            threadID,
            () => {},
            messageID
        );
    }

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
        imagePath =
            await createImage({
                senderID,
                targetID
            });

        const body =
            "╭─── ◸ •-• ◿ ───╮\n" +
            "│\n" +
            "│  ◉ تـم تـنـفـيـذ الـعـمـلـيـة\n" +
            "│\n" +
            "╰──────────────────╯";

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

        return api.sendMessage(
            "تعذر تنفيذ الأمر حاليًا، حاول مرة أخرى.",
            threadID,
            () => {},
            messageID
        );
    }
};
