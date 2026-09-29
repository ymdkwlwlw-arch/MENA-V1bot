const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { GoogleGenAI } = require("@google/genai");

/* =========================================================
   MIRA AI V1.5
   BotPack Edition
   ========================================================= */

module.exports.config = {
    name: "ميرا",
    aliases: ["mira", "ميـرا"],
    version: "1.5.0",
    hasPermssion: 0,
    credits: "DANTE SPARDA | تطوير: KIROS",
    description: "مساعد ذكاء اصطناعي متعدد الوسائط مع نظام Fallback من 8 نماذج",
    commandCategory: "AI",
    usages: "ميرا سؤالك",
    cooldowns: 2,
    usePrefix: true
};


/* =========================================================
   SETTINGS
   ========================================================= */

const API_KEY =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";

if (!API_KEY) {
    console.warn("[MIRA] GEMINI_API_KEY غير موجود.");
}

const ai = new GoogleGenAI({
    apiKey: API_KEY
});


/* =========================================================
   8 MODELS FALLBACK
   ========================================================= */

const PRIMARY_MODEL =
    process.env.MIRA_MODEL ||
    "gemini-3.8-flash";

const FALLBACK_MODELS = [
    PRIMARY_MODEL,

    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
];

const MODELS = [
    ...new Set(
        FALLBACK_MODELS.filter(Boolean)
    )
];

const RETRIES_PER_MODEL = 1;
const RETRY_DELAY = 2500;


/* =========================================================
   MEMORY
   ========================================================= */

const memory = new Map();

const MAX_MEMORY = 12;
const MEMORY_EXPIRE = 60 * 60 * 1000;


/* =========================================================
   SESSIONS
   ========================================================= */

const sessions = new Map();


/* =========================================================
   TEMP DIRECTORY
   ========================================================= */

const TEMP_DIR = path.join(
    os.tmpdir(),
    "mira-bot"
);

fs.ensureDirSync(TEMP_DIR);


/* =========================================================
   HELPERS
   ========================================================= */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function getSessionKey(threadID, senderID) {
    return `${threadID}:${senderID}`;
}


function getMemory(threadID, senderID) {

    const key = getSessionKey(
        threadID,
        senderID
    );

    const current = memory.get(key);

    if (!current) {
        const data = {
            messages: [],
            updatedAt: Date.now()
        };

        memory.set(key, data);

        return data;
    }

    if (
        Date.now() - current.updatedAt >
        MEMORY_EXPIRE
    ) {
        current.messages = [];
    }

    current.updatedAt = Date.now();

    return current;
}


function addMemory(
    threadID,
    senderID,
    role,
    content
) {

    const data = getMemory(
        threadID,
        senderID
    );

    data.messages.push({
        role,
        content,
        timestamp: Date.now()
    });

    if (
        data.messages.length >
        MAX_MEMORY
    ) {
        data.messages =
            data.messages.slice(
                -MAX_MEMORY
            );
    }

    data.updatedAt = Date.now();
}


/* =========================================================
   ERROR DETECTION
   ========================================================= */

function isRetryableError(error) {

    const message =
        String(
            error?.message ||
            error ||
            ""
        ).toLowerCase();

    const status =
        Number(
            error?.status ||
            error?.response?.status ||
            0
        );

    if (
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504
    ) {
        return true;
    }

    const retryWords = [
        "503",
        "502",
        "504",
        "429",
        "unavailable",
        "overloaded",
        "high demand",
        "rate limit",
        "rate_limit",
        "resource exhausted",
        "temporarily unavailable",
        "internal server error",
        "deadline exceeded",
        "timeout"
    ];

    return retryWords.some(
        word =>
            message.includes(word)
    );
}


/* =========================================================
   MODEL FALLBACK ENGINE
   ========================================================= */

async function generateWithFallback(
    contents,
    options = {}
) {

    let lastError = null;

    for (
        let modelIndex = 0;
        modelIndex < MODELS.length;
        modelIndex++
    ) {

        const model =
            MODELS[modelIndex];

        for (
            let retry = 0;
            retry <= RETRIES_PER_MODEL;
            retry++
        ) {

            try {

                console.log(
                    `[MIRA] محاولة ${modelIndex + 1}/${MODELS.length}: ${model}`
                );

                const config = {
                    ...(options.config || {})
                };

                const response =
                    await ai.models.generateContent({
                        model,
                        contents,
                        config
                    });

                if (
                    !response ||
                    !response.text
                ) {
                    throw new Error(
                        "لم يرجع النموذج نتيجة نصية."
                    );
                }

                console.log(
                    `[MIRA] نجح النموذج: ${model}`
                );

                return {
                    response,
                    model
                };

            } catch (error) {

                lastError = error;

                console.error(
                    `[MIRA] فشل ${model}:`,
                    error?.message ||
                    error
                );

                if (
                    !isRetryableError(
                        error
                    )
                ) {
                    throw error;
                }

                if (
                    retry <
                    RETRIES_PER_MODEL
                ) {
                    await sleep(
                        RETRY_DELAY
                    );
                }
            }
        }
    }

    throw lastError ||
        new Error(
            "فشلت جميع نماذج ميرا."
        );
}


/* =========================================================
   URL NORMALIZER
   ========================================================= */

function normalizeURL(url) {

    try {

        let current =
            String(url).trim();

        let parsed =
            new URL(current);

        /*
         * Facebook redirect
         *
         * l.facebook.com/l.php?u=...
         */

        if (
            parsed.hostname ===
                "l.facebook.com" &&
            parsed.pathname ===
                "/l.php"
        ) {

            const target =
                parsed.searchParams.get("u");

            if (target) {
                current =
                    decodeURIComponent(
                        target
                    );
            }
        }

        parsed =
            new URL(current);

        /*
         * إزالة tracking parameters
         */

        const tracking = [
            "fbclid",
            "gclid",
            "dclid",
            "msclkid",
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content"
        ];

        for (
            const key of tracking
        ) {
            parsed.searchParams.delete(
                key
            );
        }

        return parsed.toString();

    } catch (_) {

        return url;
    }
}


/* =========================================================
   URL EXTRACTION
   ========================================================= */

function extractURLs(text) {

    if (!text) return [];

    const matches =
        text.match(
            /https?:\/\/[^\s]+/gi
        ) || [];

    return matches.map(
        normalizeURL
    );
}


/* =========================================================
   DIRECT VIDEO DETECTION
   ========================================================= */

function looksLikeDirectVideoURL(
    url
) {

    try {

        const pathname =
            new URL(url)
                .pathname
                .toLowerCase();

        return /\.(mp4|mpeg|mpg|mov|avi|webm|wmv|flv|3gp)$/i
            .test(pathname);

    } catch (_) {

        return false;
    }
}


/* =========================================================
   MIME DETECTION
   ========================================================= */

function getMimeFromExtension(
    filePath
) {

    const ext =
        path.extname(filePath)
            .toLowerCase();

    const mimeMap = {

        ".mp4": "video/mp4",
        ".mpeg": "video/mpeg",
        ".mpg": "video/mpg",
        ".mov": "video/mov",
        ".avi": "video/avi",
        ".webm": "video/webm",
        ".wmv": "video/wmv",
        ".flv": "video/x-flv",
        ".3gp": "video/3gpp",

        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",

        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".json": "application/json"
    };

    return (
        mimeMap[ext] ||
        "application/octet-stream"
    );
}


/* =========================================================
   DOWNLOAD FILE
   ========================================================= */

async function downloadURL(
    url
) {

    const response =
        await axios.get(
            url,
            {
                responseType: "arraybuffer",
                timeout: 60000,
                maxContentLength:
                    500 * 1024 * 1024,
                maxBodyLength:
                    500 * 1024 * 1024,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0"
                }
            }
        );

    const contentType =
        String(
            response.headers[
                "content-type"
            ] || ""
        ).split(";")[0];

    let extension = "";

    try {

        extension =
            path.extname(
                new URL(url)
                    .pathname
            );

    } catch (_) {}

    if (!extension) {

        const extMap = {
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/mpeg": ".mpeg",
            "video/mov": ".mov",
            "video/avi": ".avi",
            "video/wmv": ".wmv",
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "application/pdf": ".pdf"
        };

        extension =
            extMap[contentType] ||
            ".bin";
    }

    const fileName =
        `mira_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}${extension}`;

    const filePath =
        path.join(
            TEMP_DIR,
            fileName
        );

    await fs.writeFile(
        filePath,
        response.data
    );

    return {
        filePath,
        mimeType:
            contentType ||
            getMimeFromExtension(
                filePath
            )
    };
}


/* =========================================================
   UPLOAD FILE TO GEMINI
   ========================================================= */

async function uploadToGemini(
    filePath,
    mimeType
) {

    console.log(
        `[MIRA] رفع الملف: ${filePath}`
    );

    const uploaded =
        await ai.files.upload({
            file: filePath,
            config: {
                mimeType
            }
        });

    if (!uploaded?.name) {
        throw new Error(
            "فشل رفع الملف إلى Gemini."
        );
    }

    let current =
        uploaded;

    /*
     * انتظار معالجة الملف
     */

    for (
        let i = 0;
        i < 60;
        i++
    ) {

        if (
            current.state ===
            "ACTIVE"
        ) {
            return current;
        }

        if (
            current.state ===
            "FAILED"
        ) {
            throw new Error(
                "فشلت معالجة الملف داخل Gemini."
            );
        }

        await sleep(5000);

        current =
            await ai.files.get({
                name: uploaded.name
            });
    }

    throw new Error(
        "انتهت مهلة انتظار معالجة الملف."
    );
}


/* =========================================================
   BUILD MEMORY CONTEXT
   ========================================================= */

function buildMemoryContext(
    threadID,
    senderID
) {

    const data =
        getMemory(
            threadID,
            senderID
        );

    if (
        !data.messages.length
    ) {
        return "";
    }

    return data.messages
        .map(item => {

            const role =
                item.role === "user"
                    ? "المستخدم"
                    : "ميرا";

            return `${role}: ${item.content}`;

        })
        .join("\n");
}


/* =========================================================
   SYSTEM PROMPT
   ========================================================= */

function buildSystemPrompt(
    threadID,
    senderID
) {

    const memoryContext =
        buildMemoryContext(
            threadID,
            senderID
        );

    return `
أنتِ ميرا، مساعد ذكاء اصطناعي عربي متعدد الوسائط.

مهمتك:
- فهم النصوص.
- تحليل الصور.
- تحليل الفيديو.
- تحليل الملفات.
- تحليل صفحات الويب والروابط العامة.
- شرح الأكواد.
- تحليل البيانات.
- تلخيص المحتوى.
- الإجابة على الأسئلة.
- مساعدة المستخدم في البرمجة.

قواعد مهمة:
1. أجيبي بالعربية ما لم يطلب المستخدم لغة أخرى.
2. كوني واضحة ومباشرة.
3. لا تدّعي أنك شاهدت شيئًا لم تتمكني من الوصول إليه.
4. إذا كان الرابط صفحة ويب، حللي محتوى الصفحة المتاح لك.
5. إذا كان الملف فيديو، استخدمي محتوى الفيديو الفعلي في الإجابة.
6. إذا لم يكن المحتوى متاحًا، أخبري المستخدم بذلك بوضوح.
7. لا تكرري السؤال الموجود في الرسالة.
8. لا تعرضي معلومات تقنية داخلية عن نظام Fallback إلا إذا طلب المستخدم ذلك.

سياق المحادثة السابق:
${memoryContext || "لا يوجد سياق سابق."}
`;
}


/* =========================================================
   TEXT ANALYSIS
   ========================================================= */

async function analyzeText(
    prompt,
    threadID,
    senderID,
    extraConfig = {}
) {

    const systemPrompt =
        buildSystemPrompt(
            threadID,
            senderID
        );

    const contents = [
        {
            role: "user",
            parts: [
                {
                    text:
                        `${systemPrompt}\n\n` +
                        `رسالة المستخدم:\n${prompt}`
                }
            ]
        }
    ];

    const result =
        await generateWithFallback(
            contents,
            {
                config: {
                    ...extraConfig,
                    tools: [
                        {
                            urlContext: {}
                        }
                    ]
                }
            }
        );

    return result;
}


/* =========================================================
   IMAGE ANALYSIS
   ========================================================= */

async function analyzeImage(
    imageURL,
    prompt,
    threadID,
    senderID
) {

    const response =
        await axios.get(
            imageURL,
            {
                responseType:
                    "arraybuffer",
                timeout: 60000,
                maxContentLength:
                    100 * 1024 * 1024,
                maxBodyLength:
                    100 * 1024 * 1024,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0"
                }
            }
        );

    const mimeType =
        String(
            response.headers[
                "content-type"
            ] ||
            "image/jpeg"
        ).split(";")[0];

    const base64 =
        Buffer.from(
            response.data
        ).toString("base64");

    const systemPrompt =
        buildSystemPrompt(
            threadID,
            senderID
        );

    const contents = [
        {
            role: "user",
            parts: [
                {
                    text:
                        `${systemPrompt}\n\n` +
                        `حلل الصورة حسب طلب المستخدم:\n${prompt || "حلل الصورة بالتفصيل."}`
                },
                {
                    inlineData: {
                        mimeType,
                        data: base64
                    }
                }
            ]
        }
    ];

    return await generateWithFallback(
        contents
    );
}


/* =========================================================
   VIDEO ANALYSIS
   ========================================================= */

async function analyzeVideoFile(
    filePath,
    mimeType,
    prompt,
    threadID,
    senderID
) {

    const uploaded =
        await uploadToGemini(
            filePath,
            mimeType
        );

    const systemPrompt =
        buildSystemPrompt(
            threadID,
            senderID
        );

    const contents = [
        {
            role: "user",
            parts: [
                {
                    text:
                        `${systemPrompt}\n\n` +
                        `حلل الفيديو حسب طلب المستخدم:\n${prompt || "حلل محتوى الفيديو بالتفصيل."}`
                },
                {
                    fileData: {
                        mimeType:
                            uploaded.mimeType ||
                            mimeType,
                        fileUri:
                            uploaded.uri
                    }
                }
            ]
        }
    ];

    return await generateWithFallback(
        contents
    );
}


/* =========================================================
   DIRECT VIDEO URL
   ========================================================= */

async function analyzeDirectVideoURL(
    url,
    prompt,
    threadID,
    senderID
) {

    const downloaded =
        await downloadURL(
            url
        );

    try {

        const mimeType =
            downloaded.mimeType.startsWith(
                "video/"
            )
                ? downloaded.mimeType
                : getMimeFromExtension(
                    downloaded.filePath
                );

        return await analyzeVideoFile(
            downloaded.filePath,
            mimeType,
            prompt,
            threadID,
            senderID
        );

    } finally {

        await fs.remove(
            downloaded.filePath
        ).catch(() => {});
    }
}


/* =========================================================
   FILE ANALYSIS
   ========================================================= */

async function analyzeFile(
    filePath,
    mimeType,
    prompt,
    threadID,
    senderID
) {

    const uploaded =
        await uploadToGemini(
            filePath,
            mimeType
        );

    const systemPrompt =
        buildSystemPrompt(
            threadID,
            senderID
        );

    const contents = [
        {
            role: "user",
            parts: [
                {
                    text:
                        `${systemPrompt}\n\n` +
                        `حلل الملف حسب طلب المستخدم:\n${prompt || "حلل الملف واشرح محتواه."}`
                },
                {
                    fileData: {
                        mimeType:
                            uploaded.mimeType ||
                            mimeType,
                        fileUri:
                            uploaded.uri
                    }
                }
            ]
        }
    ];

    return await generateWithFallback(
        contents
    );
}


/* =========================================================
   URL ANALYSIS
   ========================================================= */

async function analyzeURL(
    url,
    prompt,
    threadID,
    senderID
) {

    const normalizedURL =
        normalizeURL(url);

    /*
     * إذا كان رابط فيديو مباشر
     */

    if (
        looksLikeDirectVideoURL(
            normalizedURL
        )
    ) {

        return await analyzeDirectVideoURL(
            normalizedURL,
            prompt,
            threadID,
            senderID
        );
    }

    /*
     * صفحة ويب عادية
     */

    const fullPrompt = `
${prompt || "حلل الرابط التالي."}

الرابط:
${normalizedURL}

قم بتحليل المحتوى الموجود في الرابط.
إذا كان الرابط صفحة ويب، اعتمد على محتوى الصفحة المتاح.
إذا كان المحتوى غير قابل للوصول، وضح ذلك ولا تخمّن.
`;

    return await analyzeText(
        fullPrompt,
        threadID,
        senderID,
        {
            tools: [
                {
                    urlContext: {}
                }
            ]
        }
    );
}


/* =========================================================
   ATTACHMENT URL
   ========================================================= */

function getAttachmentURL(
    attachment
) {

    return (
        attachment?.url ||
        attachment?.href ||
        attachment?.source
    );
}


/* =========================================================
   PROCESS REQUEST
   ========================================================= */

async function processRequest({
    api,
    event,
    prompt,
    attachment
}) {

    const threadID =
        event.threadID;

    const senderID =
        event.senderID;

    let waitingMessageID =
        null;

    /*
     * 🧠 في بداية كل رسالة
     */

    try {

        waitingMessageID =
            await api.sendMessage(
                "🧠",
                threadID
            );

    } catch (_) {}

    try {

        let result;

        /*
         * =====================================
         * Attachment
         * =====================================
         */

        if (attachment) {

            const attachmentURL =
                getAttachmentURL(
                    attachment
                );

            const attachmentType =
                String(
                    attachment.type ||
                    ""
                ).toLowerCase();

            /*
             * فيديو
             */

            if (
                attachmentType ===
                    "video" ||
                attachmentType ===
                    "animated_image"
            ) {

                if (!attachmentURL) {
                    throw new Error(
                        "لم يتم العثور على رابط الفيديو."
                    );
                }

                const downloaded =
                    await downloadURL(
                        attachmentURL
                    );

                try {

                    result =
                        await analyzeVideoFile(
                            downloaded.filePath,
                            downloaded.mimeType,
                            prompt,
                            threadID,
                            senderID
                        );

                } finally {

                    await fs.remove(
                        downloaded.filePath
                    ).catch(
                        () => {}
                    );
                }

            /*
             * صورة
             */

            } else if (
                attachmentType ===
                    "photo" ||
                attachmentType ===
                    "image"
            ) {

                if (!attachmentURL) {
                    throw new Error(
                        "لم يتم العثور على رابط الصورة."
                    );
                }

                result =
                    await analyzeImage(
                        attachmentURL,
                        prompt,
                        threadID,
                        senderID
                    );

            /*
             * ملف
             */

            } else if (
                attachmentURL
            ) {

                const downloaded =
                    await downloadURL(
                        attachmentURL
                    );

                try {

                    result =
                        await analyzeFile(
                            downloaded.filePath,
                            downloaded.mimeType,
                            prompt,
                            threadID,
                            senderID
                        );

                } finally {

                    await fs.remove(
                        downloaded.filePath
                    ).catch(
                        () => {}
                    );
                }

            } else {

                throw new Error(
                    "لم أتمكن من الوصول إلى المرفق."
                );
            }

        /*
         * =====================================
         * URL
         * =====================================
         */

        } else {

            const urls =
                extractURLs(
                    prompt
                );

            if (urls.length) {

                result =
                    await analyzeURL(
                        urls[0],
                        prompt,
                        threadID,
                        senderID
                    );

            } else {

                result =
                    await analyzeText(
                        prompt,
                        threadID,
                        senderID
                    );
            }
        }

        const answer =
            result?.response?.text ||
            "";

        if (!answer.trim()) {
            throw new Error(
                "النموذج لم يرجع إجابة."
            );
        }

        /*
         * حفظ الذاكرة
         */

        addMemory(
            threadID,
            senderID,
            "user",
            prompt ||
                "تم إرسال مرفق للتحليل."
        );

        addMemory(
            threadID,
            senderID,
            "assistant",
            answer
        );

        /*
         * حذف 🧠
         */

        if (waitingMessageID) {

            try {

                await api.unsendMessage(
                    waitingMessageID
                );

            } catch (_) {}
        }

        /*
         * ✅ نجاح
         */

        const finalMessage =
            `✅\n\n${answer}`;

        return api.sendMessage(
            finalMessage,
            threadID
        );

    } catch (error) {

        console.error(
            "[MIRA ERROR]",
            error
        );

        /*
         * حذف 🧠
         */

        if (waitingMessageID) {

            try {

                await api.unsendMessage(
                    waitingMessageID
                );

            } catch (_) {}
        }

        /*
         * ❌ فقط بعد فشل كل المحاولات
         */

        const message =
            String(
                error?.message ||
                error ||
                "حدث خطأ غير معروف."
            );

        return api.sendMessage(
            `❌\n\nلم أتمكن من إكمال التحليل.\n\nالسبب: ${message}`,
            threadID
        );
    }
}


/* =========================================================
   MAIN COMMAND
   ========================================================= */

module.exports.run = async function ({
    api,
    event,
    args
}) {

    const prompt =
        Array.isArray(args)
            ? args.join(" ").trim()
            : String(args || "").trim();

    const reply =
        event.messageReply;

    let attachment =
        null;

    /*
     * إذا كان الأمر ردًا على رسالة تحتوي مرفق
     */

    if (
        reply &&
        Array.isArray(
            reply.attachments
        ) &&
        reply.attachments.length
    ) {

        attachment =
            reply.attachments[0];
    }

    /*
     * لو لا يوجد شيء
     */

    if (
        !prompt &&
        !attachment
    ) {

        return api.sendMessage(
            "🧠\n\nاكتب سؤالك أو أرسل صورة/فيديو/ملف/رابط مع الأمر.",
            event.threadID
        );
    }

    return processRequest({
        api,
        event,
        prompt:
            prompt ||
            "حلل المرفق المرسل.",
        attachment
    });
};


/* =========================================================
   HANDLE REPLY
   ========================================================= */

module.exports.handleReply =
async function ({
    api,
    event,
    handleReply
}) {

    if (!handleReply) {
        return;
    }

    const prompt =
        String(
            event.body ||
            ""
        ).trim();

    const reply =
        event.messageReply;

    let attachment =
        null;

    if (
        reply &&
        Array.isArray(
            reply.attachments
        ) &&
        reply.attachments.length
    ) {

        attachment =
            reply.attachments[0];
    }

    if (
        !prompt &&
        !attachment
    ) {
        return;
    }

    return processRequest({
        api,
        event,
        prompt:
            prompt ||
            "حلل المرفق.",
        attachment
    });
};


/* =========================================================
   OPTIONAL EVENT SUPPORT
   ========================================================= */

module.exports.handleEvent =
async function ({
    api,
    event
}) {

    /*
     * لا نعالج كل الرسائل هنا حتى لا تتكرر
     * الاستجابة مع run.
     *
     * هذا المكان جاهز لو أردت لاحقًا:
     * - تفعيل ميرا بدون prefix
     * - الرد على كلمات معينة
     * - متابعة جلسات التحليل
     */

    return;
};
