const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { spawn } = require("child_process");

const CACHE_DIR = path.join(__dirname, "cache");
const MAX_SIZE = 25 * 1024 * 1024;

module.exports.config = {
    name: "تحميل",
    aliases: ["download", "dl", "تنزيل", "داونلود"],
    version: "3.2.0",
    hasPermssion: 0,
    credits: "ڪولو سآن",
    description: "تحميل الفيديوهات والصوتيات من المواقع المدعومة بواسطة yt-dlp",
    usePrefix: true,
    commandCategory: "media",
    usages: "تحميل رابط | تحميل صوت رابط | تحميل 360 رابط | تحميل 480 رابط | تحميل 720 رابط",
    cooldowns: 10
};

/* ╭────────────────────────────────────╮
│ أدوات النظام
╰────────────────────────────────────╯ */

async function ensureCache() {
    await fsp.mkdir(CACHE_DIR, { recursive: true });
}

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "غير معروف";

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let index = 0;

    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }

    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function detectPlatform(url) {
    const value = String(url).toLowerCase();

    if (
        value.includes("youtube.com") ||
        value.includes("youtu.be")
    ) {
        return {
            name: "YouTube",
            icon: "🔴"
        };
    }

    if (value.includes("tiktok.com")) {
        return {
            name: "TikTok",
            icon: "⚫"
        };
    }

    if (value.includes("instagram.com")) {
        return {
            name: "Instagram",
            icon: "🩷"
        };
    }

    if (
        value.includes("facebook.com") ||
        value.includes("fb.watch")
    ) {
        return {
            name: "Facebook",
            icon: "🔵"
        };
    }

    if (
        value.includes("twitter.com") ||
        value.includes("x.com")
    ) {
        return {
            name: "X / Twitter",
            icon: "⚫"
        };
    }

    return {
        name: "موقع مدعوم",
        icon: "⚪"
    };
}

function cleanUrl(value) {
    return String(value || "")
        .trim()
        .replace(/^<|>$/g, "");
}

function isUrl(value) {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
    } catch {
        return false;
    }
}

function cleanTitle(title) {
    if (!title) return "";

    return String(title)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
}

/* ╭────────────────────────────────────╮
│ واجهة الرسائل
╰────────────────────────────────────╯ */

function startMessage(platform, mode, quality) {
    return [
        "╭─── ◸ نـظـام الـتـحـمـيـل ◿ ───╮",
        "│",
        `│ ${platform.icon} المنصة   ⊸ ${platform.name}`,
        `│ ◇ الوضع    ⊸ ${mode}`,
        `│ ◇ الجودة   ⊸ ${quality}`,
        "│",
        "│ ⊸ جارِ تحليل الرابط...",
        "│",
        "╰──────────────────────────────╯"
    ].join("\n");
}

function loadingMessage(platform, mode, quality) {
    return [
        "╭─── ◸ جـارِ الـتـحـمـيـل ◿ ───╮",
        "│",
        `│ ${platform.icon} المنصة   ⊸ ${platform.name}`,
        `│ ◇ النوع    ⊸ ${mode}`,
        `│ ◇ الجودة   ⊸ ${quality}`,
        "│ ◇ الحالة   ⊸ جاري التحميل...",
        "│",
        "│ ⊸ يتم تجهيز الملف للإرسال",
        "│",
        "╰──────────────────────────────╯"
    ].join("\n");
}

function successMessage(platform, mode, quality, size, title) {
    const lines = [
        "╭─── ◸ تـم الـتـحـمـيـل ◿ ───╮",
        "│",
        `│ ${platform.icon} المنصة   ⊸ ${platform.name}`,
        `│ ◇ النوع    ⊸ ${mode}`,
        `│ ◇ الجودة   ⊸ ${quality}`,
        `│ ◇ الحجم    ⊸ ${size}`
    ];

    if (title) {
        lines.push(`│ ◇ العنوان  ⊸ ${title}`);
    }

    lines.push(
        "│ ◇ الحالة   ⊸ اكتمل بنجاح",
        "│",
        "╰────────────────────────────╯"
    );

    return lines.join("\n");
}

function errorMessage(message) {
    return [
        "╭─── ◸ تـعـذر الـتـحـمـيـل ◿ ───╮",
        "│",
        `│ ⊸ ${message}`,
        "│",
        "╰──────────────────────────────╯"
    ].join("\n");
}

/* ╭────────────────────────────────────╮
│ تشغيل yt-dlp
╰────────────────────────────────────╯ */

function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const child = spawn("yt-dlp", args, {
            cwd: CACHE_DIR,
            shell: false
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", data => {
            stdout += data.toString();
        });

        child.stderr.on("data", data => {
            stderr += data.toString();
        });

        child.on("error", error => {
            reject(error);
        });

        child.on("close", code => {
            if (code === 0) {
                resolve({
                    stdout,
                    stderr,
                    code
                });
            } else {
                const error = new Error(
                    stderr ||
                    stdout ||
                    `yt-dlp exited with code ${code}`
                );

                error.code = code;
                reject(error);
            }
        });
    });
}

/* ╭────────────────────────────────────╮
│ استخراج الملف الناتج
╰────────────────────────────────────╯ */

async function findDownloadedFile(baseName) {
    const files = await fsp.readdir(CACHE_DIR);

    const candidates = files
        .filter(file => file.startsWith(baseName))
        .filter(file => !file.endsWith(".part"))
        .filter(file => !file.endsWith(".ytdl"))
        .filter(file => !file.endsWith(".temp"))
        .map(file => path.join(CACHE_DIR, file));

    if (!candidates.length) {
        return null;
    }

    let best = null;
    let bestSize = -1;

    for (const file of candidates) {
        try {
            const stat = await fsp.stat(file);

            if (stat.isFile() && stat.size > bestSize) {
                best = file;
                bestSize = stat.size;
            }
        } catch (_) {}
    }

    return best;
}

async function removeByBaseName(baseName) {
    try {
        const files = await fsp.readdir(CACHE_DIR);

        for (const file of files) {
            if (!file.startsWith(baseName)) continue;

            try {
                await fsp.unlink(
                    path.join(CACHE_DIR, file)
                );
            } catch (_) {}
        }
    } catch (_) {}
}

async function safeDelete(file) {
    if (!file) return;

    try {
        await fsp.unlink(file);
    } catch (_) {}
}

/* ╭────────────────────────────────────╮
│ التفاعل بشكل آمن
╰────────────────────────────────────╯ */

async function safeReaction(api, reaction, messageID) {
    if (
        !api ||
        typeof api.setMessageReaction !== "function" ||
        !messageID
    ) {
        return false;
    }

    try {
        await new Promise(resolve => {
            let finished = false;

            const done = () => {
                if (finished) return;

                finished = true;
                resolve();
            };

            try {
                api.setMessageReaction(
                    reaction,
                    messageID,
                    done,
                    true
                );

                setTimeout(done, 5000);
            } catch (_) {
                done();
            }
        });

        return true;
    } catch (_) {
        return false;
    }
}

/* ╭────────────────────────────────────╮
│ استخراج العنوان
╰────────────────────────────────────╯ */

async function getTitle(url) {
    try {
        const result = await runYtDlp([
            "--no-playlist",
            "--no-warnings",
            "--skip-download",
            "--print",
            "%(title)s",
            url
        ]);

        return cleanTitle(result.stdout);
    } catch (_) {
        return "";
    }
}

/* ╭────────────────────────────────────╮
│ تحديد الجودة
╰────────────────────────────────────╯ */

function parseQuality(args) {
    if (!args.length) {
        return {
            quality: "480p",
            height: 480
        };
    }

    const first = String(args[0]).toLowerCase();

    const match = first.match(/^(\d{3,4})p?$/);

    if (match) {
        const height = parseInt(match[1], 10);

        if (
            [144, 240, 360, 480, 720, 1080]
                .includes(height)
        ) {
            return {
                quality: `${height}p`,
                height
            };
        }
    }

    return {
        quality: "480p",
        height: 480
    };
}

function extractModeAndUrl(args) {
    if (!args.length) {
        return null;
    }

    let mode = "فيديو";
    let quality = null;
    let url = "";

    const first = String(args[0]).toLowerCase();

    if (
        first === "صوت" ||
        first === "audio" ||
        first === "mp3" ||
        first === "اغنية"
    ) {
        mode = "صوت";
        args.shift();
    }

    const q = parseQuality(args);

    if (
        args.length &&
        /^(\d{3,4})p?$/i.test(String(args[0]))
    ) {
        quality = q;
        args.shift();
    }

    url = cleanUrl(args.join(" "));

    return {
        mode,
        quality: quality || {
            quality: "480p",
            height: 480
        },
        url
    };
}

/* ╭────────────────────────────────────╮
│ الأمر الرئيسي
╰────────────────────────────────────╯ */

module.exports.run = async function ({
    api,
    event,
    args
}) {
    const threadID = event.threadID;
    const messageID = event.messageID;

    if (!args || !args.length) {
        return api.sendMessage(
            [
                "╭─── ◸ طـريـقـة الاسـتـخـدام ◿ ───╮",
                "│",
                "│ ⊸ تحميل رابط",
                "│ ⊸ تحميل صوت رابط",
                "│ ⊸ تحميل 360 رابط",
                "│ ⊸ تحميل 480 رابط",
                "│ ⊸ تحميل 720 رابط",
                "│",
                "│ ◇ مثال:",
                "│ ⊸ تحميل https://youtu.be/xxxx",
                "│",
                "╰──────────────────────────────╯"
            ].join("\n"),
            threadID,
            messageID
        );
    }

    const parsed = extractModeAndUrl([...args]);

    if (!parsed || !parsed.url) {
        return api.sendMessage(
            errorMessage(
                "أرسل رابطًا صالحًا بعد الأمر."
            ),
            threadID,
            messageID
        );
    }

    if (!isUrl(parsed.url)) {
        return api.sendMessage(
            errorMessage(
                "الرابط غير صالح أو غير مدعوم."
            ),
            threadID,
            messageID
        );
    }

    const platform = detectPlatform(parsed.url);

    const mode = parsed.mode;
    const quality = parsed.quality;

    await ensureCache();

    /*
     * ① تفاعل المنصة
     */
    await safeReaction(
        api,
        platform.icon,
        messageID
    );

    /*
     * ② رسالة البداية
     */
    await new Promise(resolve => {
        api.sendMessage(
            startMessage(
                platform,
                mode,
                quality.quality
            ),
            threadID,
            () => resolve()
        );
    });

    /*
     * ③ جاري التحميل
     */
    await safeReaction(
        api,
        "⏳",
        messageID
    );

    const baseName =
        `download_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    let outputFile = null;

    try {
        /*
         * الصوت
         */
        if (mode === "صوت") {
            const outputTemplate =
                path.join(
                    CACHE_DIR,
                    `${baseName}.%(ext)s`
                );

            await runYtDlp([
                "--no-playlist",
                "--no-warnings",
                "--no-update",
                "--retries",
                "10",
                "--fragment-retries",
                "10",
                "--socket-timeout",
                "30",
                "--extractor-retries",
                "3",
                "--js-runtimes",
                "deno",
                "-x",
                "--audio-format",
                "mp3",
                "--audio-quality",
                "128K",
                "-o",
                outputTemplate,
                parsed.url
            ]);
        }

        /*
         * الفيديو
         */
        else {
            const outputTemplate =
                path.join(
                    CACHE_DIR,
                    `${baseName}.%(ext)s`
                );

            await runYtDlp([
                "--no-playlist",
                "--no-warnings",
                "--no-update",
                "--retries",
                "10",
                "--fragment-retries",
                "10",
                "--file-access-retries",
                "5",
                "--extractor-retries",
                "3",
                "--socket-timeout",
                "30",
                "--js-runtimes",
                "deno",
                "-f",
                `best[ext=mp4][height<=${quality.height}]/best[height<=${quality.height}]/best[ext=mp4]/best`,
                "--merge-output-format",
                "mp4",
                "-o",
                outputTemplate,
                parsed.url
            ]);
        }

        outputFile =
            await findDownloadedFile(baseName);

        if (!outputFile) {
            throw new Error(
                "لم يتم العثور على الملف بعد انتهاء التحميل."
            );
        }

        const stat =
            await fsp.stat(outputFile);

        if (!stat.isFile() || stat.size <= 0) {
            throw new Error(
                "الملف الناتج غير صالح."
            );
        }

        /*
         * منع الملفات الكبيرة
         */
        if (stat.size > MAX_SIZE) {
            await safeDelete(outputFile);

            await safeReaction(
                api,
                "❌",
                messageID
            );

            return api.sendMessage(
                errorMessage(
                    `حجم الملف ${formatBytes(stat.size)} ويتجاوز الحد المسموح 25 MB.`
                ),
                threadID,
                messageID
            );
        }

        const title =
            mode === "فيديو"
                ? await getTitle(parsed.url)
                : "";

        const report =
            successMessage(
                platform,
                mode,
                quality.quality,
                formatBytes(stat.size),
                title
            );

        /*
         * ④ نجاح
         */
        await safeReaction(
            api,
            "✅",
            messageID
        );

        /*
         * ⑤ إرسال الملف
         */
        await new Promise((resolve, reject) => {
            api.sendMessage(
                {
                    body: report,
                    attachment:
                        fs.createReadStream(
                            outputFile
                        )
                },
                threadID,
                err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                }
            );
        });

    } catch (error) {
        console.error(
            "[تحميل] Error:",
            error && error.stack
                ? error.stack
                : error
        );

        /*
         * ❌ فشل
         */
        await safeReaction(
            api,
            "❌",
            messageID
        );

        let reason =
            "تعذر تحميل الرابط حاليًا.";

        const errorText =
            String(
                error && error.message
                    ? error.message
                    : error
            ).toLowerCase();

        if (
            errorText.includes("unsupported") ||
            errorText.includes("no suitable") ||
            errorText.includes("not supported")
        ) {
            reason =
                "المنصة أو الرابط غير مدعوم حاليًا.";
        }

        else if (
            errorText.includes("private") ||
            errorText.includes("login") ||
            errorText.includes("sign in")
        ) {
            reason =
                "هذا المحتوى خاص أو يحتاج تسجيل دخول.";
        }

        else if (
            errorText.includes("too large") ||
            errorText.includes("25 mb")
        ) {
            reason =
                "الملف أكبر من الحد المسموح للإرسال.";
        }

        else if (
            errorText.includes("403") ||
            errorText.includes("forbidden")
        ) {
            reason =
                "المنصة رفضت طلب التحميل. جرّب الرابط مرة أخرى.";
        }

        else if (
            errorText.includes("timed out") ||
            errorText.includes("connection") ||
            errorText.includes("reset")
        ) {
            reason =
                "الاتصال انقطع أثناء التحميل. أعد المحاولة.";
        }

        await api.sendMessage(
            errorMessage(reason),
            threadID,
            messageID
        );

    } finally {
        await removeByBaseName(baseName);
    }
};
