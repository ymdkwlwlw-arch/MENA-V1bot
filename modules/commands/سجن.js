const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { Jimp } = require("jimp");

module.exports.config = {
    name: "سجن",
    aliases: ["سجني", "prison"],
    version: "3.0.0",
    hasPermssion: 0,
    credits: "Hakim Tracks | KIROS",
    description: "سجن المستخدم داخل صورة قضبان",
    commandCategory: "عامة",
    usages: "سجن | بالرد | منشن",
    cooldowns: 3,
    usePrefix: true
};

const CACHE_DIR = path.join(__dirname, "cache");

const PRISON_URL =
    "https://i.postimg.cc/Hxx4pNj0/pngtree-prison-bars-isolated-on-transparent-png-image-5489739.png";

const FALLBACK_AVATAR =
    "https://i.ibb.co/bBSpr5v/143086968-2856368904622192-1959732218791162458-n.png";

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function getAvatarUrl(userID) {
    try {
        const response = await axios.post(
            "https://www.facebook.com/api/graphql/",
            null,
            {
                params: {
                    doc_id: "5341536295888250",
                    variables: JSON.stringify({
                        height: 512,
                        scale: 1,
                        userID: String(userID),
                        width: 512
                    })
                },
                timeout: 15000
            }
        );

        return (
            response?.data?.data?.profile?.profile_picture?.uri ||
            FALLBACK_AVATAR
        );
    } catch (_) {
        return FALLBACK_AVATAR;
    }
}

async function downloadImage(url, filePath) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    });

    fs.writeFileSync(
        filePath,
        Buffer.from(response.data)
    );
}

function removeFile(file) {
    try {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    } catch (_) {}
}

module.exports.run = async function ({
    api,
    event
}) {
    const {
        senderID,
        messageReply,
        mentions,
        threadID,
        messageID
    } = event;

    let targetID = String(senderID);

    if (
        messageReply &&
        messageReply.senderID
    ) {
        targetID =
            String(messageReply.senderID);
    } else if (
        mentions &&
        Object.keys(mentions).length > 0
    ) {
        targetID =
            String(Object.keys(mentions)[0]);
    }

    const avatarPath = path.join(
        CACHE_DIR,
        `sjn_avatar_${targetID}_${Date.now()}.jpg`
    );

    const prisonPath = path.join(
        CACHE_DIR,
        `sjn_prison_${Date.now()}.png`
    );

    const outputPath = path.join(
        CACHE_DIR,
        `sjn_${targetID}_${Date.now()}.jpg`
    );

    try {
        const avatarURL =
            await getAvatarUrl(targetID);

        await Promise.all([
            downloadImage(
                avatarURL,
                avatarPath
            ),
            downloadImage(
                PRISON_URL,
                prisonPath
            )
        ]);

        const avatar =
            await Jimp.read(avatarPath);

        const prison =
            await Jimp.read(prisonPath);

        const SIZE = 512;

        avatar.cover({
            w: SIZE,
            h: SIZE
        });

        prison.cover({
            w: SIZE,
            h: SIZE
        });

        avatar.composite(
            prison,
            0,
            0
        );

        await avatar.write(outputPath);

        let nameTarget = "الزول";

        try {
            const info =
                await api.getUserInfo(
                    targetID
                );

            if (
                info &&
                info[targetID] &&
                info[targetID].name
            ) {
                nameTarget =
                    info[targetID].name;
            }
        } catch (_) {}

        api.sendMessage(
            {
                body:
                    `╭─── ◸ سِجـن ◿ ───╮\n` +
                    `⊸ تم سجن: ${nameTarget}\n` +
                    `⊸ خلف القضبان بنجاح.\n` +
                    `╰────────────────────╯`,

                attachment:
                    fs.createReadStream(
                        outputPath
                    )
            },

            threadID,

            () => {
                removeFile(avatarPath);
                removeFile(prisonPath);
                removeFile(outputPath);
            },

            messageID
        );

    } catch (error) {

        console.error(
            "[سجن ERROR]",
            error?.message || error
        );

        removeFile(avatarPath);
        removeFile(prisonPath);
        removeFile(outputPath);

        api.sendMessage(
            "حدث خطأ أثناء إنشاء صورة السجن.\nحاول مرة أخرى.",
            threadID,
            messageID
        );
    }
};
