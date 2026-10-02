const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { loadImage, createCanvas } = require("canvas");

module.exports.config = {
    name: "سجن",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Developer",
    description: "سجن المستخدم داخل صورة قضبان",
    usePrefix: true,
    commandCategory: "عامة",
    usages: "سجن | سجن @منشن | بالرد على رسالة",
    cooldowns: 3
};

module.exports.run = async function ({ api, event }) {
    const { senderID, messageReply, mentions, threadID } = event;

    let targetID = String(senderID);

    /*
    ╭────────────────────────────╮
    │       تحديد الهدف         │
    ╰────────────────────────────╯
    */

    // الأولوية للرد على رسالة
    if (
        messageReply &&
        messageReply.senderID &&
        String(messageReply.senderID) !== String(senderID)
    ) {
        targetID = String(messageReply.senderID);
    }

    // ثم المنشن
    else if (
        mentions &&
        Object.keys(mentions).length > 0
    ) {
        targetID = String(Object.keys(mentions)[0]);
    }

    const cacheDir = path.join(__dirname, "cache");

    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    const avatarPath = path.join(
        cacheDir,
        `sjn_avatar_${targetID}.png`
    );

    const prisonPath = path.join(
        cacheDir,
        "sjn_prison_overlay.png"
    );

    const outputPath = path.join(
        cacheDir,
        `sjn_${targetID}_${Date.now()}.png`
    );

    /*
    ╭────────────────────────────╮
    │       روابط الصور          │
    ╰────────────────────────────╯
    */

    const prisonURL =
        "https://i.postimg.cc/Hxx4pNj0/pngtree-prison-bars-isolated-on-transparent-png-image-5489739.png";

    const fallbackAvatar =
        "https://i.ibb.co/bBSpr5v/143086968-2856368904622192-1959732218791162458-n.png";

    /*
    ╭────────────────────────────╮
    │       الحصول على الصورة    │
    ╰────────────────────────────╯
    */

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

            const avatar =
                response?.data?.data?.profile?.profile_picture?.uri;

            if (avatar) {
                return avatar;
            }

            return fallbackAvatar;

        } catch (error) {
            return fallbackAvatar;
        }
    }

    /*
    ╭────────────────────────────╮
    │       تحميل الصور          │
    ╰────────────────────────────╯
    */

    async function downloadImage(url, filePath) {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 20000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0"
            }
        });

        fs.writeFileSync(
            filePath,
            Buffer.from(response.data)
        );
    }

    try {
        /*
        الحصول على صورة المستخدم
        */

        const avatarURL =
            await getAvatarUrl(targetID);

        /*
        تحميل الصورتين
        */

        await Promise.all([
            downloadImage(
                avatarURL,
                avatarPath
            ),

            downloadImage(
                prisonURL,
                prisonPath
            )
        ]);

        /*
        ╭────────────────────────────╮
        │       تركيب الصورة        │
        ╰────────────────────────────╯
        */

        const [
            avatarImg,
            prisonImg
        ] = await Promise.all([
            loadImage(avatarPath),
            loadImage(prisonPath)
        ]);

        const canvasSize = 512;

        const canvas =
            createCanvas(
                canvasSize,
                canvasSize
            );

        const ctx =
            canvas.getContext("2d");

        /*
        رسم صورة المستخدم
        */

        ctx.drawImage(
            avatarImg,
            0,
            0,
            canvasSize,
            canvasSize
        );

        /*
        رسم القضبان فوق الصورة
        */

        ctx.drawImage(
            prisonImg,
            0,
            0,
            canvasSize,
            canvasSize
        );

        /*
        حفظ الصورة
        */

        fs.writeFileSync(
            outputPath,
            canvas.toBuffer("image/png")
        );

        /*
        ╭────────────────────────────╮
        │       الحصول على الاسم     │
        ╰────────────────────────────╯
        */

        let nameTarget = "الزول";

        try {
            const info =
                await api.getUserInfo(targetID);

            if (
                info &&
                info[targetID] &&
                info[targetID].name
            ) {
                nameTarget =
                    info[targetID].name;
            }

        } catch (error) {
            nameTarget = "الزول";
        }

        /*
        ╭────────────────────────────╮
        │          الإرسال          │
        ╰────────────────────────────╯
        */

        return api.sendMessage(
            {
                body:
                    `╭─── ◸ 🚔 سِجـن ◿ ───╮\n` +
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
                /*
                تنظيف الملفات
                */

                const files = [
                    avatarPath,
                    prisonPath,
                    outputPath
                ];

                for (const file of files) {
                    try {
                        if (fs.existsSync(file)) {
                            fs.unlinkSync(file);
                        }
                    } catch (e) {}
                }
            },
            event.messageID
        );

    } catch (error) {

        console.error(
            "[سجن] Error:",
            error
        );

        /*
        تنظيف الملفات في حالة الخطأ
        */

        const files = [
            avatarPath,
            prisonPath,
            outputPath
        ];

        for (const file of files) {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (e) {}
        }

        return api.sendMessage(
            "╭─── ◸ سِجـن ◿ ───╮\n" +
            "⊸ تعذر إنشاء صورة السجن.\n" +
            "⊸ حاول مرة أخرى لاحقاً.\n" +
            "╰────────────────────╯",
            threadID,
            event.messageID
        );
    }
};
