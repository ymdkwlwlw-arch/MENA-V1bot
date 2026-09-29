const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");

module.exports.config = {
    name: "ميرا",
    aliases: ["mira", "ميراai"],
    version: "1.4.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "ميرا — تحليل النصوص والصور والفيديوهات والروابط والملفات",
    usePrefix: false,
    commandCategory: "الذكاء الاصطناعي",
    usages: "ميرا [سؤالك] أو بالرد على محتوى",
    cooldowns: 3
};


/* =========================================================
   CONFIG
========================================================= */

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY;

const PRIMARY_MODEL =
    process.env.MIRA_MODEL ||
    "gemini-3.8-flash";

const FALLBACK_MODELS = [
    PRIMARY_MODEL,
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash"
];

const MODELS = [
    ...new Set(
        FALLBACK_MODELS.filter(Boolean)
    )
];

const RETRIES_PER_MODEL = 1;
const RETRY_DELAY = 2500;

const MAX_FILE_SIZE =
    100 * 1024 * 1024;

const CACHE_DIR =
    path.join(
        __dirname,
        "cache",
        "mira"
    );

const MAX_HISTORY = 10;

const conversations = new Map();


/* =========================================================
   SYSTEM
========================================================= */

const MIRA_SYSTEM = `
أنتِ ميرا، مساعدة ذكاء اصطناعي متعددة الوسائط داخل بوت Messenger.

قد يتم إعطاؤك:
- نص.
- صورة.
- فيديو.
- صوت.
- ملف.
- رابط صفحة.
- رابط مباشر لوسائط.

وظيفتك:
- تحليل المحتوى.
- تلخيصه.
- استخراج المعلومات.
- وصف الصور والفيديوهات.
- الإجابة عن أسئلة المستخدم حول المحتوى.
- استخراج النصوص الظاهرة.
- تحليل الجداول والبيانات عندما تكون واضحة.
- ذكر الطوابع الزمنية في الفيديو عند الحاجة.

القواعد:
- استخدمي العربية الواضحة ويمكن استخدام اللهجة السودانية عند الحاجة.
- لا تختلقي معلومات غير موجودة في المحتوى.
- إذا كان المحتوى غير واضح، اذكري ذلك.
- فرّقي بين المعلومات المؤكدة والاستنتاج.
- عند تحليل فيديو، اذكري الطابع الزمني عندما يكون مهمًا.
- لا تكشفي API keys أو كلمات المرور أو AppState أو session cookies.
- لا تنفذي Shell أو JavaScript يرسله المستخدم.
- لا تدّعي تنفيذ عملية خارجية لم يتم تنفيذها.
`;


/* =========================================================
   UTILS
========================================================= */

function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}


function getErrorText(error) {
    try {
        if (error?.message) {
            return String(error.message);
        }

        if (error?.error?.message) {
            return String(error.error.message);
        }

        if (error?.response?.data) {
            return JSON.stringify(
                error.response.data
            );
        }
    } catch (_) {}

    return String(
        error || "Unknown error"
    );
}


function isTemporaryModelError(error) {
    const text =
        getErrorText(error).toLowerCase();

    const status =
        Number(
            error?.status ||
            error?.code ||
            error?.response?.status ||
            0
        );

    return (
        status === 503 ||
        status === 502 ||
        status === 504 ||
        text.includes("503") ||
        text.includes("unavailable") ||
        text.includes("high demand") ||
        text.includes("overloaded") ||
        text.includes("temporarily unavailable") ||
        text.includes("service unavailable")
    );
}


function createAI() {
    if (!GEMINI_API_KEY) {
        throw new Error(
            "GEMINI_API_KEY غير موجود."
        );
    }

    return new GoogleGenAI({
        apiKey: GEMINI_API_KEY
    });
}


/* =========================================================
   MODEL FALLBACK
========================================================= */

async function generateWithFallback(
    requestBuilder
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
                    `[MIRA] محاولة: ${model} | retry=${retry}`
                );

                const ai = createAI();

                const request =
                    requestBuilder(
                        model,
                        ai
                    );

                const response =
                    await ai.models.generateContent(
                        request
                    );

                console.log(
                    `[MIRA] نجاح النموذج: ${model}`
                );

                return {
                    response,
                    model
                };

            } catch (error) {
                lastError = error;

                console.error(
                    `[MIRA] فشل ${model}:`,
                    getErrorText(error)
                );

                if (
                    !isTemporaryModelError(
                        error
                    )
                ) {
                    throw error;
                }

                if (
                    retry < RETRIES_PER_MODEL
                ) {
                    await sleep(
                        RETRY_DELAY *
                        Math.pow(2, retry)
                    );
                }
            }
        }

        console.log(
            `[MIRA] الانتقال للنموذج التالي...`
        );
    }

    throw (
        lastError ||
        new Error(
            "جميع نماذج Gemini غير متاحة حاليًا."
        )
    );
}


/* =========================================================
   MEMORY
========================================================= */

function getKey(
    threadID,
    senderID
) {
    return `${threadID}:${senderID}`;
}


function getConversation(
    threadID,
    senderID
) {
    const key =
        getKey(
            threadID,
            senderID
        );

    if (!conversations.has(key)) {
        conversations.set(
            key,
            {
                messages: [],
                lastActivity: Date.now()
            }
        );
    }

    const conversation =
        conversations.get(key);

    conversation.lastActivity =
        Date.now();

    return conversation;
}


function addHistory(
    threadID,
    senderID,
    role,
    content
) {
    const conversation =
        getConversation(
            threadID,
            senderID
        );

    conversation.messages.push({
        role,
        content: String(content)
    });

    if (
        conversation.messages.length >
        MAX_HISTORY
    ) {
        conversation.messages =
            conversation.messages.slice(
                -MAX_HISTORY
            );
    }
}


function buildHistory(
    threadID,
    senderID
) {
    const conversation =
        getConversation(
            threadID,
            senderID
        );

    if (
        !conversation.messages.length
    ) {
        return "";
    }

    return conversation.messages
        .map(
            item =>
                `${item.role}: ${item.content}`
        )
        .join("\n");
}


setInterval(() => {
    const now = Date.now();

    for (
        const [key, value]
        of conversations
    ) {
        if (
            now - value.lastActivity >
            60 * 60 * 1000
        ) {
            conversations.delete(key);
        }
    }
}, 10 * 60 * 1000);


/* =========================================================
   REACTION
========================================================= */

async function reaction(
    api,
    messageID,
    emoji
) {
    try {
        if (
            typeof api.setMessageReaction ===
            "function"
        ) {
            await api.setMessageReaction(
                emoji,
                messageID,
                () => {},
                true
            );
        }
    } catch (_) {}
}


/* =========================================================
   TYPING
========================================================= */

async function typing(
    api,
    threadID,
    state
) {
    try {
        if (
            typeof api.sendTypingIndicator ===
            "function"
        ) {
            return await api.sendTypingIndicator(
                threadID,
                state
            );
        }

        if (
            typeof api.sendTyping ===
            "function"
        ) {
            return await api.sendTyping(
                threadID,
                state
            );
        }
    } catch (_) {}
}


/* =========================================================
   SEND
========================================================= */

function send(
    api,
    message,
    threadID,
    replyTo
) {
    return new Promise(resolve => {
        const callback =
            (error, info) => {
                if (error) {
                    console.error(
                        "[MIRA] sendMessage:",
                        error.message
                    );

                    return resolve(null);
                }

                resolve(info || null);
            };

        try {
            if (replyTo) {
                api.sendMessage(
                    {
                        body: message
                    },
                    threadID,
                    callback,
                    replyTo
                );
            } else {
                api.sendMessage(
                    message,
                    threadID,
                    callback
                );
            }
        } catch (error) {
            console.error(
                "[MIRA] send exception:",
                error.message
            );

            resolve(null);
        }
    });
}


/* =========================================================
   URLS
========================================================= */

function extractURLs(text) {
    if (!text) return [];

    const matches =
        String(text).match(
            /https?:\/\/[^\s<>"']+/gi
        );

    if (!matches) return [];

    return [
        ...new Set(
            matches.map(
                url =>
                    url.replace(
                        /[),.!؟]+$/,
                        ""
                    )
            )
        )
    ];
}


/* =========================================================
   ATTACHMENT TYPE
========================================================= */

function getAttachmentType(
    attachment
) {
    const type =
        String(
            attachment?.type || ""
        ).toLowerCase();

    const url =
        String(
            attachment?.url || ""
        ).toLowerCase();

    const name =
        String(
            attachment?.filename ||
            attachment?.name ||
            ""
        ).toLowerCase();

    const source =
        `${type} ${url} ${name}`;

    if (
        type.includes("photo") ||
        type.includes("image") ||
        /\.(jpg|jpeg|png|webp|gif)(\?|$)/i
            .test(source)
    ) {
        return "image";
    }

    if (
        type.includes("video") ||
        /\.(mp4|mov|webm|mkv|avi|wmv|flv|3gp)(\?|$)/i
            .test(source)
    ) {
        return "video";
    }

    if (
        type.includes("audio") ||
        type.includes("voice") ||
        /\.(mp3|wav|m4a|ogg)(\?|$)/i
            .test(source)
    ) {
        return "audio";
    }

    if (
        type.includes("file") ||
        /\.(pdf|txt|csv|json|docx|xlsx)(\?|$)/i
            .test(source)
    ) {
        return "file";
    }

    return "unknown";
}


/* =========================================================
   EXTENSION
========================================================= */

function getExtension(
    attachment
) {
    const name =
        String(
            attachment?.filename ||
            attachment?.name ||
            ""
        );

    const match =
        name.match(
            /\.[a-z0-9]{1,8}$/i
        );

    if (match) {
        return match[0];
    }

    const url =
        String(
            attachment?.url ||
            ""
        );

    const urlMatch =
        url.match(
            /\.(jpg|jpeg|png|webp|gif|pdf|txt|json|csv|mp4|mpeg|mov|avi|webm|wmv|flv|3gp|mp3|wav|m4a|ogg)(?:\?|$)/i
        );

    if (urlMatch) {
        return `.${urlMatch[1]}`;
    }

    return ".bin";
}


/* =========================================================
   MIME
========================================================= */

function getMimeType(
    filePath,
    attachment,
    kind
) {
    const type =
        String(
            attachment?.type || ""
        ).toLowerCase();

    if (
        kind === "image" ||
        type.includes("image") ||
        type.includes("photo")
    ) {
        if (
            /\.png$/i.test(filePath)
        ) {
            return "image/png";
        }

        if (
            /\.webp$/i.test(filePath)
        ) {
            return "image/webp";
        }

        if (
            /\.gif$/i.test(filePath)
        ) {
            return "image/gif";
        }

        return "image/jpeg";
    }

    if (
        kind === "video" ||
        type.includes("video")
    ) {
        if (
            /\.webm$/i.test(filePath)
        ) {
            return "video/webm";
        }

        if (
            /\.mov$/i.test(filePath)
        ) {
            return "video/mov";
        }

        if (
            /\.avi$/i.test(filePath)
        ) {
            return "video/avi";
        }

        if (
            /\.wmv$/i.test(filePath)
        ) {
            return "video/wmv";
        }

        return "video/mp4";
    }

    if (
        kind === "audio" ||
        type.includes("audio") ||
        type.includes("voice")
    ) {
        if (
            /\.wav$/i.test(filePath)
        ) {
            return "audio/wav";
        }

        if (
            /\.ogg$/i.test(filePath)
        ) {
            return "audio/ogg";
        }

        if (
            /\.m4a$/i.test(filePath)
        ) {
            return "audio/mp4";
        }

        return "audio/mpeg";
    }

    if (
        /\.pdf$/i.test(filePath)
    ) {
        return "application/pdf";
    }

    if (
        /\.txt$/i.test(filePath)
    ) {
        return "text/plain";
    }

    if (
        /\.json$/i.test(filePath)
    ) {
        return "application/json";
    }

    if (
        /\.csv$/i.test(filePath)
    ) {
        return "text/csv";
    }

    return "application/octet-stream";
}


/* =========================================================
   DOWNLOAD
========================================================= */

async function downloadURL(
    url
) {
    await fs.ensureDir(
        CACHE_DIR
    );

    const extension =
        path.extname(
            new URL(url).pathname
        ) || ".bin";

    const filePath =
        path.join(
            CACHE_DIR,
            `mira_url_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}${extension}`
        );

    const response =
        await axios.get(
            url,
            {
                responseType:
                    "arraybuffer",

                timeout:
                    60000,

                maxContentLength:
                    MAX_FILE_SIZE,

                maxBodyLength:
                    MAX_FILE_SIZE,

                headers: {
                    "User-Agent":
                        "Mozilla/5.0"
                }
            }
        );

    if (
        !response.data ||
        !response.data.length
    ) {
        throw new Error(
            "الرابط لم يرجع محتوى."
        );
    }

    if (
        response.data.length >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            "حجم الفيديو/الملف أكبر من الحد المسموح."
        );
    }

    await fs.writeFile(
        filePath,
        response.data
    );

    return {
        filePath,
        contentType:
            response.headers[
                "content-type"
            ] || ""
    };
}


/* =========================================================
   DOWNLOAD ATTACHMENT
========================================================= */

async function downloadAttachment(
    attachment
) {
    if (!attachment?.url) {
        throw new Error(
            "رابط المرفق غير موجود."
        );
    }

    await fs.ensureDir(
        CACHE_DIR
    );

    const extension =
        getExtension(
            attachment
        );

    const filePath =
        path.join(
            CACHE_DIR,
            `mira_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}${extension}`
        );

    const response =
        await axios.get(
            attachment.url,
            {
                responseType:
                    "arraybuffer",

                timeout:
                    60000,

                maxContentLength:
                    MAX_FILE_SIZE,

                maxBodyLength:
                    MAX_FILE_SIZE,

                headers: {
                    "User-Agent":
                        "Mozilla/5.0"
                }
            }
        );

    if (
        !response.data ||
        !response.data.length
    ) {
        throw new Error(
            "المرفق فارغ."
        );
    }

    if (
        response.data.length >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            "حجم المرفق أكبر من الحد المسموح."
        );
    }

    await fs.writeFile(
        filePath,
        response.data
    );

    return filePath;
}


/* =========================================================
   CLEANUP
========================================================= */

async function cleanupFiles(
    files
) {
    for (
        const file of files
    ) {
        try {
            if (
                await fs.pathExists(
                    file
                )
            ) {
                await fs.remove(
                    file
                );
            }
        } catch (_) {}
    }
}


/* =========================================================
   GEMINI TEXT
========================================================= */

function extractGeminiText(
    response
) {
    try {
        if (
            response?.text
        ) {
            return String(
                response.text
            ).trim();
        }

        if (
            response
                ?.candidates?.[0]
                ?.content?.parts
        ) {
            return response
                .candidates[0]
                .content
                .parts
                .filter(
                    part =>
                        typeof part.text ===
                        "string"
                )
                .map(
                    part =>
                        part.text
                )
                .join("\n")
                .trim();
        }
    } catch (_) {}

    return "";
}


/* =========================================================
   TEXT / URL ANALYSIS
========================================================= */

async function analyzeText(
    prompt
) {
    const urls =
        extractURLs(
            prompt
        );

    const result =
        await generateWithFallback(
            (model) => {

                const config = {
                    systemInstruction:
                        MIRA_SYSTEM
                };

                if (
                    urls.length
                ) {
                    config.tools = [
                        {
                            urlContext: {}
                        }
                    ];
                }

                return {
                    model,
                    contents: prompt,
                    config
                };
            }
        );

    return {
        text:
            extractGeminiText(
                result.response
            ),
        model:
            result.model
    };
}


/* =========================================================
   UPLOAD FILE TO GEMINI
========================================================= */

async function uploadToGemini(
    filePath,
    mimeType
) {
    const ai =
        createAI();

    const uploaded =
        await ai.files.upload({
            file: filePath,
            config: {
                mimeType
            }
        });

    if (
        !uploaded?.uri
    ) {
        throw new Error(
            "فشل رفع الملف إلى Gemini."
        );
    }

    /*
     * Gemini يحتاج أن يصبح الفيديو ACTIVE
     * قبل استخدامه.
     */

    let current =
        uploaded;

    for (
        let i = 0;
        i < 60;
        i++
    ) {
        const state =
            String(
                current?.state?.name ||
                current?.state ||
                "ACTIVE"
            ).toUpperCase();

        if (
            state === "ACTIVE"
        ) {
            return current;
        }

        if (
            state === "FAILED"
        ) {
            throw new Error(
                "فشل Gemini في معالجة الفيديو."
            );
        }

        await sleep(3000);

        if (
            current?.name &&
            typeof ai.files.get ===
                "function"
        ) {
            current =
                await ai.files.get({
                    name:
                        current.name
                });
        } else {
            /*
             * إذا كانت نسخة SDK لا توفر
             * files.get بالشكل المتوقع،
             * نخرج من الانتظار.
             */

            break;
        }
    }

    return current;
}


/* =========================================================
   VIDEO ANALYSIS
========================================================= */

async function analyzeVideoFile(
    filePath,
    mimeType,
    prompt
) {
    const uploaded =
        await uploadToGemini(
            filePath,
            mimeType
        );

    if (
        !uploaded?.uri
    ) {
        throw new Error(
            "تعذر تجهيز الفيديو للتحليل."
        );
    }

    const result =
        await generateWithFallback(
            (model) => ({
                model,

                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text:
                                    prompt ||
                                    "حلل الفيديو بالتفصيل، واشرح أهم الأحداث والمعلومات، واذكر الطوابع الزمنية المهمة."
                            },
                            {
                                fileData: {
                                    fileUri:
                                        uploaded.uri,
                                    mimeType:
                                        uploaded.mimeType ||
                                        mimeType
                                }
                            }
                        ]
                    }
                ],

                config: {
                    systemInstruction:
                        MIRA_SYSTEM
                }
            })
        );

    return {
        text:
            extractGeminiText(
                result.response
            ),
        model:
            result.model
    };
}


/* =========================================================
   ATTACHMENT ANALYSIS
========================================================= */

async function analyzeAttachments(
    prompt,
    attachments
) {
    const downloaded = [];

    try {
        const textParts = [];

        for (
            const attachment
            of attachments
        ) {
            const kind =
                getAttachmentType(
                    attachment
                );

            if (
                kind === "unknown"
            ) {
                continue;
            }

            const filePath =
                await downloadAttachment(
                    attachment
                );

            downloaded.push(
                filePath
            );

            const mimeType =
                getMimeType(
                    filePath,
                    attachment,
                    kind
                );

            /*
             * VIDEO
             */

            if (
                kind === "video"
            ) {
                return await analyzeVideoFile(
                    filePath,
                    mimeType,
                    prompt
                );
            }

            /*
             * AUDIO
             */

            if (
                kind === "audio"
            ) {
                const ai =
                    createAI();

                const uploaded =
                    await ai.files.upload({
                        file:
                            filePath,
                        config: {
                            mimeType
                        }
                    });

                if (
                    !uploaded?.uri
                ) {
                    throw new Error(
                        "تعذر تجهيز الصوت للتحليل."
                    );
                }

                const result =
                    await generateWithFallback(
                        (model) => ({
                            model,

                            contents: [
                                {
                                    role:
                                        "user",
                                    parts: [
                                        {
                                            text:
                                                prompt ||
                                                "حلل هذا الملف الصوتي واستخرج أهم المعلومات."
                                        },
                                        {
                                            fileData: {
                                                fileUri:
                                                    uploaded.uri,
                                                mimeType:
                                                    uploaded.mimeType ||
                                                    mimeType
                                            }
                                        }
                                    ]
                                }
                            ],

                            config: {
                                systemInstruction:
                                    MIRA_SYSTEM
                            }
                        })
                    );

                return {
                    text:
                        extractGeminiText(
                            result.response
                        ),
                    model:
                        result.model
                };
            }

            /*
             * IMAGE
             */

            if (
                kind === "image"
            ) {
                const buffer =
                    await fs.readFile(
                        filePath
                    );

                const result =
                    await generateWithFallback(
                        (model) => ({
                            model,

                            contents: [
                                {
                                    role:
                                        "user",
                                    parts: [
                                        {
                                            text:
                                                prompt ||
                                                "حلل الصورة بالتفصيل."
                                        },
                                        {
                                            inlineData: {
                                                mimeType,
                                                data:
                                                    buffer.toString(
                                                        "base64"
                                                    )
                                            }
                                        }
                                    ]
                                }
                            ],

                            config: {
                                systemInstruction:
                                    MIRA_SYSTEM
                            }
                        })
                    );

                return {
                    text:
                        extractGeminiText(
                            result.response
                        ),
                    model:
                        result.model
                };
            }

            /*
             * DOCUMENT / FILE
             */

            const ai =
                createAI();

            const uploaded =
                await ai.files.upload({
                    file:
                        filePath,
                    config: {
                        mimeType
                    }
                });

            if (
                !uploaded?.uri
            ) {
                throw new Error(
                    "فشل رفع الملف إلى Gemini."
                );
            }

            textParts.push({
                fileUri:
                    uploaded.uri,
                mimeType:
                    uploaded.mimeType ||
                    mimeType
            });
        }

        if (
            !textParts.length
        ) {
            throw new Error(
                "لم أتمكن من تجهيز المرفق للتحليل."
            );
        }

        const result =
            await generateWithFallback(
                (model) => ({
                    model,

                    contents: [
                        {
                            role:
                                "user",

                            parts: [
                                {
                                    text:
                                        prompt ||
                                        "حلل الملف واستخرج أهم المعلومات."
                                },

                                ...textParts.map(
                                    file => ({
                                        fileData:
                                            file
                                    })
                                )
                            ]
                        }
                    ],

                    config: {
                        systemInstruction:
                            MIRA_SYSTEM
                    }
                })
            );

        return {
            text:
                extractGeminiText(
                    result.response
                ),
            model:
                result.model
        };

    } finally {
        await cleanupFiles(
            downloaded
        );
    }
}


/* =========================================================
   DIRECT VIDEO URL
========================================================= */

function looksLikeDirectVideoURL(
    url
) {
    return /\.(mp4|mpeg|mov|avi|webm|wmv|flv|3gp)(\?|$)/i
        .test(url);
}


async function analyzeDirectVideoURL(
    url,
    prompt
) {
    let downloaded;

    try {
        downloaded =
            await downloadURL(
                url
            );

        const contentType =
            String(
                downloaded.contentType
            ).toLowerCase();

        let mimeType =
            contentType.split(";")[0];

        if (
            !mimeType.startsWith(
                "video/"
            )
        ) {
            mimeType =
                getMimeType(
                    downloaded.filePath,
                    {},
                    "video"
                );
        }

        return await analyzeVideoFile(
            downloaded.filePath,
            mimeType,
            prompt
        );

    } finally {
        if (
            downloaded?.filePath
        ) {
            await cleanupFiles([
                downloaded.filePath
            ]);
        }
    }
}


/* =========================================================
   URL ANALYSIS
========================================================= */

async function analyzeURL(
    url,
    prompt
) {
    /*
     * إذا كان الرابط يبدو فيديو مباشرًا،
     * نستخدم مسار الفيديو.
     */

    if (
        looksLikeDirectVideoURL(
            url
        )
    ) {
        return await analyzeDirectVideoURL(
            url,
            prompt
        );
    }

    /*
     * غير ذلك:
     * URL Context
     */

    const result =
        await analyzeText(
            `${prompt}\n\nالرابط:\n${url}`
        );

    return result;
}


/* =========================================================
   MAIN ANALYZE
========================================================= */

async function analyze({
    query,
    attachments,
    threadID,
    senderID
}) {
    if (
        !GEMINI_API_KEY
    ) {
        throw new Error(
            "GEMINI_API_KEY غير موجود."
        );
    }

    const history =
        buildHistory(
            threadID,
            senderID
        );

    let prompt =
        query ||
        "حلل المحتوى المرفق.";

    if (
        history
    ) {
        prompt =
`السياق السابق للمحادثة:
${history}

الطلب الحالي:
${prompt}

استخدمي السياق السابق فقط عندما يكون مرتبطًا بالطلب الحالي.`;
    }

    /*
     * مرفقات Messenger
     */

    if (
        Array.isArray(
            attachments
        ) &&
        attachments.length
    ) {
        const result =
            await analyzeAttachments(
                prompt,
                attachments
            );

        console.log(
            `[MIRA] تم التحليل بواسطة: ${result.model}`
        );

        return cleanResponse(
            result.text
        );
    }

    /*
     * روابط داخل الرسالة
     */

    const urls =
        extractURLs(
            prompt
        );

    if (
        urls.length
    ) {
        const firstURL =
            urls[0];

        const result =
            await analyzeURL(
                firstURL,
                prompt
            );

        console.log(
            `[MIRA] تم التحليل بواسطة: ${result.model}`
        );

        return cleanResponse(
            result.text
        );
    }

    /*
     * نص عادي
     */

    const result =
        await analyzeText(
            prompt
        );

    console.log(
        `[MIRA] تم التحليل بواسطة: ${result.model}`
    );

    return cleanResponse(
        result.text
    );
}


/* =========================================================
   CLEAN RESPONSE
========================================================= */

function cleanResponse(
    text
) {
    let result =
        String(
            text || ""
        ).trim();

    if (!result) {
        return (
            "ما قدرت أطلع نتيجة " +
            "من المحتوى المرسل."
        );
    }

    if (
        result.length >
        7000
    ) {
        result =
            result.slice(
                0,
                7000
            ) +
            "\n\n[تم اختصار الرد]";
    }

    return result;
}


/* =========================================================
   PROCESS REQUEST
========================================================= */

async function processRequest({
    api,
    event,
    query,
    attachments
}) {
    const {
        threadID,
        senderID,
        messageID
    } = event;

    /*
     * 🧠 في بداية كل عملية
     */

    await reaction(
        api,
        messageID,
        "🧠"
    );

    await typing(
        api,
        threadID,
        true
    );

    try {
        const answer =
            await analyze({
                query,
                attachments,
                threadID,
                senderID
            });

        addHistory(
            threadID,
            senderID,
            "user",
            query || "[مرفق]"
        );

        addHistory(
            threadID,
            senderID,
            "assistant",
            answer
        );

        /*
         * نجاح
         */

        await reaction(
            api,
            messageID,
            "✅"
        );

        return answer;

    } catch (error) {
        console.error(
            "[MIRA ERROR]",
            error
        );

        await reaction(
            api,
            messageID,
            "❌"
        );

        if (
            isTemporaryModelError(
                error
            )
        ) {
            return (
                "ميرا ما قدرت تنفذ التحليل حاليًا.\n\n" +
                "نماذج Gemini الاحتياطية غير متاحة مؤقتًا.\n" +
                "جرّب مرة ثانية بعد قليل."
            );
        }

        return (
            "ما قدرت أحلل المحتوى حاليًا.\n\n" +
            `السبب: ${getErrorText(error)}`
        );

    } finally {
        await typing(
            api,
            threadID,
            false
        );
    }
}


/* =========================================================
   RUN
========================================================= */

module.exports.run =
async function ({
    api,
    event,
    args
}) {
    const query =
        Array.isArray(args)
            ? args.join(" ").trim()
            : "";

    const currentAttachments =
        Array.isArray(
            event.attachments
        )
            ? event.attachments
            : [];

    const replyAttachments =
        Array.isArray(
            event.messageReply?.attachments
        )
            ? event.messageReply.attachments
            : [];

    const attachments = [
        ...currentAttachments,
        ...replyAttachments
    ];

    if (
        !query &&
        !attachments.length
    ) {
        return send(
            api,

`╭──〔 ميرا V1.4 〕──╮
│
│ 🧠 ميرا جاهزة
│
│ ⎔ النصوص
│ ⎔ الصور
│ ⎔ الفيديو
│ ⎔ الصوت
│ ⎔ الروابط
│ ⎔ الملفات
│
│ مثال:
│ ميرا حللي الصورة دي
│
│ أو:
│ ميرا حللي الرابط دا
│
╰──────────────────`,

            event.threadID,
            event.messageID
        );
    }

    const answer =
        await processRequest({
            api,
            event,
            query,
            attachments
        });

    const info =
        await send(
            api,
            answer,
            event.threadID,
            event.messageID
        );

    if (
        info?.messageID &&
        Array.isArray(
            global.client?.handleReply
        )
    ) {
        global.client.handleReply.push({
            name: "ميرا",
            messageID:
                info.messageID,
            author:
                event.senderID,
            threadID:
                event.threadID,
            type: "mira",
            createdAt:
                Date.now()
        });
    }

    return info;
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

    if (
        String(
            handleReply.threadID
        ) !==
        String(
            event.threadID
        )
    ) {
        return;
    }

    const query =
        String(
            event.body || ""
        ).trim();

    const attachments =
        Array.isArray(
            event.attachments
        )
            ? event.attachments
            : [];

    const replyAttachments =
        Array.isArray(
            event.messageReply?.attachments
        )
            ? event.messageReply.attachments
            : [];

    const allAttachments = [
        ...attachments,
        ...replyAttachments
    ];

    if (
        !query &&
        !allAttachments.length
    ) {
        return;
    }

    const answer =
        await processRequest({
            api,
            event,
            query,
            attachments:
                allAttachments
        });

    const info =
        await send(
            api,
            answer,
            event.threadID,
            event.messageID
        );

    if (
        info?.messageID &&
        Array.isArray(
            global.client?.handleReply
        )
    ) {
        global.client.handleReply.push({
            name: "ميرا",
            messageID:
                info.messageID,
            author:
                event.senderID,
            threadID:
                event.threadID,
            type: "mira",
            createdAt:
                Date.now()
        });
    }

    return info;
};
