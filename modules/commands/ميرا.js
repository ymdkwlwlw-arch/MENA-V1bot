const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");

module.exports.config = {
    name: "ميرا",
    aliases: ["mira", "ميراai"],
    version: "1.3.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "ميرا — محللة ذكية للنصوص والصور والروابط والملفات",
    usePrefix: false,
    commandCategory: "الذكاء الاصطناعي",
    usages: "ميرا [سؤالك] أو بالرد على صورة/ملف",
    cooldowns: 3
};


/* =========================================================
   CONFIG
========================================================= */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/*
 * النموذج الأساسي + النماذج الاحتياطية
 *
 * يمكن تغيير النموذج الأساسي من Render/Termux:
 *
 * MIRA_MODEL=gemini-3.8-flash
 */

const PRIMARY_MODEL =
    process.env.MIRA_MODEL ||
    "gemini-3.8-flash";


/*
 * ترتيب النماذج الاحتياطية
 */

const FALLBACK_MODELS = [
    PRIMARY_MODEL,
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash"
];


/*
 * إزالة التكرار
 */

const MODELS = [
    ...new Set(
        FALLBACK_MODELS.filter(Boolean)
    )
];


/*
 * عدد المحاولات داخل نفس النموذج
 */

const RETRIES_PER_MODEL = 1;


/*
 * التأخير قبل إعادة المحاولة
 * بالميلي ثانية
 */

const RETRY_DELAY = 2500;


/*
 * الحد الأقصى للملف
 */

const MAX_FILE_SIZE =
    25 * 1024 * 1024;


/*
 * مجلد التخزين المؤقت
 */

const CACHE_DIR =
    path.join(
        __dirname,
        "cache",
        "mira"
    );


/*
 * ذاكرة المحادثة
 */

const MAX_HISTORY = 10;

const conversations = new Map();


/* =========================================================
   MIRA SYSTEM
========================================================= */

const MIRA_SYSTEM = `
أنتِ ميرا، مساعدة ذكاء اصطناعي متعددة الوسائط داخل بوت Messenger.

وظيفتك:
- تحليل النصوص.
- تحليل الصور.
- استخراج النصوص والمعلومات من الصور.
- تحليل الروابط وصفحات الويب المتاحة.
- تحليل الملفات المدعومة.
- تلخيص المحتوى.
- استخراج البيانات والجداول.
- مقارنة المعلومات.
- شرح المحتوى بطريقة واضحة.
- الإجابة على أسئلة المستخدم المتعلقة بالمحتوى المرسل.

القواعد:
- استخدمي العربية الواضحة ويمكن استخدام اللهجة السودانية عند الحاجة.
- لا تختلقي معلومات.
- إذا لم تتمكني من الوصول إلى رابط أو ملف، اذكري ذلك بوضوح.
- ميزي بين المعلومات المؤكدة والتخمين.
- إذا كانت الصورة غير واضحة، اذكري أن النتيجة غير مؤكدة.
- عند وجود رابط، اعتمدي على المحتوى الذي تم الوصول إليه فعليًا.
- لا تكشفي API keys أو كلمات المرور أو AppState أو session cookies.
- لا تنفذي Shell أو JavaScript يرسله المستخدم.
- لا تدّعي تنفيذ عملية خارجية لم يتم تنفيذها.
`;


/* =========================================================
   SLEEP
========================================================= */

function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}


/* =========================================================
   ERROR HELPERS
========================================================= */

function getErrorText(error) {

    try {

        if (
            error?.message
        ) {
            return String(
                error.message
            );
        }

        if (
            error?.error?.message
        ) {
            return String(
                error.error.message
            );
        }

        if (
            error?.response?.data
        ) {
            return JSON.stringify(
                error.response.data
            );
        }

    } catch (_) {}

    return String(
        error || "Unknown error"
    );
}


/*
 * هل الخطأ مؤقت ويمكن تجربة نموذج آخر؟
 */

function isTemporaryModelError(error) {

    const text =
        getErrorText(
            error
        ).toLowerCase();


    const status =
        Number(
            error?.status ||
            error?.code ||
            error?.response?.status ||
            0
        );


    if (
        status === 503 ||
        status === 502 ||
        status === 504
    ) {
        return true;
    }


    if (
        text.includes("503") ||
        text.includes("unavailable") ||
        text.includes("high demand") ||
        text.includes("overloaded") ||
        text.includes("temporarily unavailable") ||
        text.includes("service unavailable")
    ) {
        return true;
    }


    return false;
}


/* =========================================================
   GEMINI CLIENT
========================================================= */

function createAI() {

    if (!GEMINI_API_KEY) {
        throw new Error(
            "GEMINI_API_KEY غير موجود."
        );
    }


    return new GoogleGenAI({
        apiKey:
            GEMINI_API_KEY
    });
}


/* =========================================================
   MODEL EXECUTOR
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
                    `[MIRA] محاولة النموذج: ${model}` +
                    ` | retry=${retry}`
                );


                const ai =
                    createAI();


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
                    `[MIRA] النموذج نجح: ${model}`
                );


                return {
                    response,
                    model
                };


            } catch (error) {

                lastError =
                    error;


                console.error(
                    `[MIRA] فشل النموذج ${model}:`,
                    getErrorText(
                        error
                    )
                );


                /*
                 * إذا لم يكن الخطأ 503
                 * لا ننتقل إلى نموذج آخر.
                 */

                if (
                    !isTemporaryModelError(
                        error
                    )
                ) {
                    throw error;
                }


                /*
                 * إعادة محاولة واحدة
                 * لنفس النموذج.
                 */

                if (
                    retry <
                    RETRIES_PER_MODEL
                ) {

                    const delay =
                        RETRY_DELAY *
                        Math.pow(
                            2,
                            retry
                        );


                    console.log(
                        `[MIRA] إعادة المحاولة بعد ${delay}ms`
                    );


                    await sleep(
                        delay
                    );

                    continue;
                }


                /*
                 * انتهت محاولات النموذج.
                 * ننتقل للنموذج التالي.
                 */

                console.log(
                    `[MIRA] الانتقال للنموذج الاحتياطي...`
                );

                break;
            }
        }
    }


    throw (
        lastError ||
        new Error(
            "جميع نماذج Gemini غير متاحة حاليًا."
        )
    );
}


/* =========================================================
   CONVERSATION
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


    if (
        !conversations.has(key)
    ) {

        conversations.set(
            key,
            {
                messages: [],
                lastActivity:
                    Date.now()
            }
        );
    }


    const conversation =
        conversations.get(
            key
        );


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

        content:
            String(content)

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


/*
 * تنظيف الذاكرة القديمة
 */

setInterval(
    () => {

        const now =
            Date.now();


        for (
            const [
                key,
                value
            ] of conversations
        ) {

            if (
                now -
                value.lastActivity >
                60 * 60 * 1000
            ) {

                conversations.delete(
                    key
                );
            }
        }

    },
    10 * 60 * 1000
);


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

    return new Promise(
        resolve => {

            const callback =
                (
                    error,
                    info
                ) => {

                    if (error) {

                        console.error(
                            "[MIRA] sendMessage:",
                            error.message
                        );

                        return resolve(
                            null
                        );
                    }


                    resolve(
                        info || null
                    );
                };


            try {

                if (replyTo) {

                    api.sendMessage(
                        {
                            body:
                                message
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
        }
    );
}


/* =========================================================
   URL EXTRACTION
========================================================= */

function extractURLs(
    text
) {

    if (!text) {
        return [];
    }


    const matches =
        String(text).match(
            /https?:\/\/[^\s<>"']+/gi
        );


    if (!matches) {
        return [];
    }


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
            attachment?.type ||
            ""
        ).toLowerCase();


    const url =
        String(
            attachment?.url ||
            ""
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
        /\.(mp4|mov|webm|mkv)(\?|$)/i
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
            /\.(jpg|jpeg|png|webp|gif|pdf|txt|json|csv|mp4|mp3|wav|m4a|ogg)(?:\?|$)/i
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
            attachment?.type ||
            ""
        ).toLowerCase();


    if (
        kind === "image" ||
        type.includes("image") ||
        type.includes("photo")
    ) {

        if (
            /\.png$/i.test(
                filePath
            )
        ) {
            return "image/png";
        }


        if (
            /\.webp$/i.test(
                filePath
            )
        ) {
            return "image/webp";
        }


        if (
            /\.gif$/i.test(
                filePath
            )
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
            /\.webm$/i.test(
                filePath
            )
        ) {
            return "video/webm";
        }


        if (
            /\.mov$/i.test(
                filePath
            )
        ) {
            return "video/quicktime";
        }


        return "video/mp4";
    }


    if (
        kind === "audio" ||
        type.includes("audio") ||
        type.includes("voice")
    ) {

        if (
            /\.wav$/i.test(
                filePath
            )
        ) {
            return "audio/wav";
        }


        if (
            /\.ogg$/i.test(
                filePath
            )
        ) {
            return "audio/ogg";
        }


        if (
            /\.m4a$/i.test(
                filePath
            )
        ) {
            return "audio/mp4";
        }


        return "audio/mpeg";
    }


    if (
        /\.pdf$/i.test(
            filePath
        )
    ) {
        return "application/pdf";
    }


    if (
        /\.txt$/i.test(
            filePath
        )
    ) {
        return "text/plain";
    }


    if (
        /\.json$/i.test(
            filePath
        )
    ) {
        return "application/json";
    }


    if (
        /\.csv$/i.test(
            filePath
        )
    ) {
        return "text/csv";
    }


    return "application/octet-stream";
}


/* =========================================================
   DOWNLOAD
========================================================= */

async function downloadAttachment(
    attachment
) {

    if (
        !attachment?.url
    ) {

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
                    30000,

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
   TEXT ANALYSIS
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


                /*
                 * تفعيل URL Context
                 * عندما يحتوي الطلب على رابط.
                 */

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

                    contents:
                        prompt,

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
   FILE ANALYSIS
========================================================= */

async function analyzeFiles(
    prompt,
    attachments
) {

    const downloaded = [];


    try {

        const parts = [

            {
                text:
                    prompt ||
                    "حلل المحتوى المرفق واستخرج أهم المعلومات."
            }

        ];


        for (
            const attachment of
            attachments
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


            /*
             * الفيديو والصوت غير مفعّلين
             * في مسار هذه النسخة.
             */

            if (
                kind === "video" ||
                kind === "audio"
            ) {

                parts.push({

                    text:
                        `يوجد مرفق من نوع ${kind}. ` +
                        `هذا النوع غير مفعّل للتحليل المباشر ` +
                        `في مسار ميرا الحالي.`

                });


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
             * IMAGE
             */

            if (
                kind === "image"
            ) {

                const buffer =
                    await fs.readFile(
                        filePath
                    );


                parts.push({

                    inlineData: {

                        mimeType,

                        data:
                            buffer.toString(
                                "base64"
                            )

                    }

                });


                continue;
            }


            /*
             * FILE
             */

            const ai =
                createAI();


            const uploadedFile =
                await ai.files.upload({

                    file:
                        filePath,

                    config: {

                        mimeType

                    }

                });


            if (
                !uploadedFile?.uri
            ) {

                throw new Error(
                    "فشل رفع الملف إلى Gemini."
                );
            }


            parts.push({

                fileData: {

                    fileUri:
                        uploadedFile.uri,

                    mimeType:
                        uploadedFile.mimeType ||
                        mimeType

                }

            });
        }


        if (
            parts.length === 1
        ) {

            throw new Error(
                "لم أتمكن من تجهيز المرفق للتحليل."
            );
        }


        /*
         * استخدام fallback للنماذج
         */

        const result =
            await generateWithFallback(
                (model) => {

                    return {

                        model,

                        contents: [

                            {

                                role:
                                    "user",

                                parts

                            }

                        ],

                        config: {

                            systemInstruction:
                                MIRA_SYSTEM

                        }

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


    } finally {

        await cleanupFiles(
            downloaded
        );
    }
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
     * يوجد مرفق
     */

    if (
        Array.isArray(
            attachments
        ) &&
        attachments.length
    ) {

        const result =
            await analyzeFiles(
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
     * نص / رابط
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
     * 🧠 ميرا تعمل
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


        /*
         * حفظ المستخدم
         */

        addHistory(

            threadID,

            senderID,

            "user",

            query ||
            "[مرفق]"

        );


        /*
         * حفظ رد ميرا
         */

        addHistory(

            threadID,

            senderID,

            "assistant",

            answer

        );


        /*
         * ✅ نجاح
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


        /*
         * ❌ فشل
         */

        await reaction(

            api,

            messageID,

            "❌"

        );


        const errorText =
            getErrorText(
                error
            );


        /*
         * رسالة مفهومة للمستخدم
         */

        if (
            isTemporaryModelError(
                error
            )
        ) {

            return (
                "ميرا ما قدرت تنفذ التحليل حاليًا.\n\n" +
                "جميع نماذج Gemini الاحتياطية غير متاحة مؤقتًا.\n" +
                "جرّب مرة ثانية بعد قليل."
            );
        }


        return (
            "ما قدرت أحلل المحتوى حاليًا.\n\n" +
            `السبب: ${errorText}`
        );
    }


    finally {

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
            ? args
                .join(" ")
                .trim()
            : "";


    /*
     * المرفقات الموجودة
     * في الرسالة الحالية
     */

    const currentAttachments =
        Array.isArray(
            event.attachments
        )
            ? event.attachments
            : [];


    /*
     * المرفقات الموجودة
     * في الرسالة التي يتم الرد عليها
     */

    const replyAttachments =
        Array.isArray(
            event.messageReply
                ?.attachments
        )
            ? event.messageReply
                .attachments
            : [];


    /*
     * دمج المرفقات
     */

    const attachments = [

        ...currentAttachments,

        ...replyAttachments

    ];


    /*
     * لا يوجد طلب
     */

    if (
        !query &&
        !attachments.length
    ) {

        return send(

            api,

`╭──〔 ميرا 〕──╮
│
│ أنا جاهزة لتحليل:
│
│ ⎔ النصوص
│ ⎔ الصور
│ ⎔ الروابط
│ ⎔ الملفات
│ ⎔ البيانات
│
│ مثال:
│ ميرا حللي الصورة دي
│
│ أو:
│ ميرا حللي الرابط دا
│
╰────────────────`,

            event.threadID,

            event.messageID

        );
    }


    /*
     * تشغيل التحليل
     */

    const answer =
        await processRequest({

            api,

            event,

            query,

            attachments

        });


    /*
     * إرسال النتيجة
     */

    const info =
        await send(

            api,

            answer,

            event.threadID,

            event.messageID

        );


    /*
     * تسجيل الرسالة
     * لنظام handleReply
     */

    if (

        info?.messageID &&

        Array.isArray(
            global.client?.handleReply
        )

    ) {

        global.client.handleReply.push({

            name:
                "ميرا",

            messageID:
                info.messageID,

            author:
                event.senderID,

            threadID:
                event.threadID,

            type:
                "mira",

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

    if (
        !handleReply
    ) {
        return;
    }


    /*
     * نفس المجموعة
     */

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


    /*
     * النص
     */

    const query =
        String(
            event.body ||
            ""
        ).trim();


    /*
     * المرفقات الجديدة
     */

    const attachments =
        Array.isArray(
            event.attachments
        )
            ? event.attachments
            : [];


    /*
     * مرفقات الرسالة التي نرد عليها
     */

    const replyAttachments =
        Array.isArray(
            event.messageReply
                ?.attachments
        )
            ? event.messageReply
                .attachments
            : [];


    /*
     * دمج
     */

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


    /*
     * تشغيل ميرا
     */

    const answer =
        await processRequest({

            api,

            event,

            query,

            attachments:
                allAttachments

        });


    /*
     * إرسال الرد
     */

    const info =
        await send(

            api,

            answer,

            event.threadID,

            event.messageID

        );


    /*
     * استمرار handleReply
     */

    if (

        info?.messageID &&

        Array.isArray(
            global.client?.handleReply
        )

    ) {

        global.client.handleReply.push({

            name:
                "ميرا",

            messageID:
                info.messageID,

            author:
                event.senderID,

            threadID:
                event.threadID,

            type:
                "mira",

            createdAt:
                Date.now()

        });
    }


    return info;
};
