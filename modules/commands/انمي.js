const axios = require("axios");

module.exports.config = {
    name: "انمي",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "البحث عن الأنمي وعرض معلوماته والمواسم والحلقات",
    usePrefix: true,
    commandCategory: "خدمات",
    usages: "انمي <اسم الأنمي> | انمي حلقات <رقم الصفحة>",
    cooldowns: 5
};

const API = "https://api.jikan.moe/v4";

const cache = new Map();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function clean(text, max = 900) {
    if (!text) return "غير متوفر";
    text = String(text)
        .replace(/\r?\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (text.length > max) {
        return text.slice(0, max) + "...";
    }

    return text;
}

function translateStatus(status) {
    const map = {
        "Finished Airing": "مكتمل",
        "Currently Airing": "يعرض حاليًا",
        "Not yet aired": "لم يبدأ العرض"
    };

    return map[status] || status || "غير معروف";
}

function translateType(type) {
    const map = {
        TV: "مسلسل",
        Movie: "فيلم",
        OVA: "OVA",
        ONA: "ONA",
        Special: "خاص",
        Music: "موسيقى"
    };

    return map[type] || type || "غير معروف";
}

function translateSeason(season) {
    const map = {
        winter: "الشتاء",
        spring: "الربيع",
        summer: "الصيف",
        fall: "الخريف"
    };

    return map[season] || season || "غير معروف";
}

function getGenres(genres) {
    if (!Array.isArray(genres) || !genres.length) {
        return "غير متوفر";
    }

    return genres.map(g => g.name).join(" • ");
}

function getStudios(studios) {
    if (!Array.isArray(studios) || !studios.length) {
        return "غير متوفر";
    }

    return studios.map(s => s.name).join(" • ");
}

async function searchAnime(query) {
    const response = await axios.get(`${API}/anime`, {
        params: {
            q: query,
            page: 1,
            limit: 5,
            sfw: true
        },
        timeout: 15000
    });

    return response.data?.data || [];
}

async function getAnime(id) {
    const response = await axios.get(`${API}/anime/${id}/full`, {
        timeout: 15000
    });

    return response.data?.data;
}

async function getEpisodes(id, page = 1) {
    const response = await axios.get(
        `${API}/anime/${id}/episodes`,
        {
            params: {
                page
            },
            timeout: 15000
        }
    );

    return response.data;
}

function buildAnimeMessage(anime) {
    const images = anime.images?.jpg || {};
    const image = images.large_image_url || images.image_url || "";

    const airedFrom = anime.aired?.from
        ? new Date(anime.aired.from).getFullYear()
        : "؟";

    const airedTo = anime.aired?.to
        ? new Date(anime.aired.to).getFullYear()
        : anime.status === "Currently Airing"
            ? "مستمر"
            : "؟";

    const season = anime.season
        ? `${translateSeason(anime.season)} ${anime.year || ""}`.trim()
        : "غير معروف";

    const score = anime.score
        ? `${anime.score}/10`
        : "غير مقيم";

    let text =
`╭─── ◸ مـعـلـومـات الأنـمـي ◿ ───╮

⊸ الاسم:
${anime.title || "غير معروف"}

⊸ الاسم الإنجليزي:
${anime.title_english || "غير متوفر"}

⊸ الاسم الياباني:
${anime.title_japanese || "غير متوفر"}

⊸ النوع:
${translateType(anime.type)}

⊸ الحالة:
${translateStatus(anime.status)}

⊸ التقييم:
${score}

⊸ الترتيب:
${anime.rank ? `#${anime.rank}` : "غير معروف"}

⊸ الحلقات:
${anime.episodes ?? "غير معروف"}

⊸ مدة الحلقة:
${anime.duration || "غير معروف"}

⊸ التصنيف العمري:
${anime.rating || "غير معروف"}

⊸ الموسم:
${season}

⊸ العرض:
${airedFrom} → ${airedTo}

⊸ التصنيفات:
${getGenres(anime.genres)}

⊸ المصدر:
${anime.source || "غير معروف"}

⊸ الاستوديو:
${getStudios(anime.studios)}

⊸ القصة:
${clean(anime.synopsis, 1000)}

╰────────────────────────╯`;

    if (image) {
        return {
            body: text,
            attachmentUrl: image
        };
    }

    return {
        body: text
    };
}

module.exports.run = async function ({ api, event }) {
    const body = event.body || "";

    const args = body.trim().split(/\s+/).slice(1);

    if (!args.length) {
        return api.sendMessage(
`╭─── ◸ اسـتـخـدام انـمـي ◿ ───╮

⊸ ابحث عن أنمي:
انمي Naruto

⊸ أو:
انمي One Piece

⊸ لعرض الحلقات:
انمي حلقات

╰────────────────────────╯`,
            event.threadID,
            event.messageID
        );
    }

    const first = args[0].toLowerCase();

    if (first === "حلقات" || first === "episodes") {
        const saved = cache.get(event.senderID);

        if (!saved) {
            return api.sendMessage(
`╭─── ◸ الـحـلـقـات ◿ ───╮

⊸ لم يتم اختيار أنمي بعد.

استخدم:
انمي اسم_الأنمي

ثم:
انمي حلقات

╰────────────────────╯`,
                event.threadID,
                event.messageID
            );
        }

        const page = Math.max(
            1,
            parseInt(args[1]) || 1
        );

        try {
            const result = await getEpisodes(
                saved.id,
                page
            );

            const episodes = result?.data || [];
            const pagination = result?.pagination || {};

            if (!episodes.length) {
                return api.sendMessage(
                    "لا توجد حلقات في هذه الصفحة.",
                    event.threadID,
                    event.messageID
                );
            }

            let message =
`╭─── ◸ حـلـقـات الأنـمـي ◿ ───╮

⊸ ${saved.title}

⊸ الصفحة: ${page}
⊸ إجمالي الحلقات: ${saved.episodes ?? "؟"}

`;

            for (const ep of episodes) {
                const aired = ep.aired
                    ? new Date(ep.aired).toLocaleDateString("ar")
                    : "غير معروف";

                message +=
`⊸ الحلقة ${ep.mal_id || "؟"}:
${ep.title || "بدون عنوان"}
التاريخ: ${aired}

`;
            }

            message +=
`⊸ صفحة أخرى:
انمي حلقات ${page + 1}

╰────────────────────────╯`;

            return api.sendMessage(
                message,
                event.threadID,
                event.messageID
            );

        } catch (error) {
            console.error("[ANIME EPISODES]", error);

            return api.sendMessage(
`╭─── ◸ خـطـأ ◿ ───╮

⊸ تعذر تحميل الحلقات حاليًا.

⊸ حاول بعد قليل.

╰────────────────╯`,
                event.threadID,
                event.messageID
            );
        }
    }

    const query = args.join(" ");

    try {
        const results = await searchAnime(query);

        if (!results.length) {
            return api.sendMessage(
`╭─── ◸ لـم يـتـم الـعـثـور ◿ ───╮

⊸ لم أجد أنمي بهذا الاسم.

⊸ جرّب الاسم بالإنجليزية أو اليابانية.

╰────────────────────────╯`,
                event.threadID,
                event.messageID
            );
        }

        const anime = await getAnime(results[0].mal_id);

        if (!anime) {
            throw new Error("Anime data unavailable");
        }

        cache.set(event.senderID, {
            id: anime.mal_id,
            title: anime.title,
            episodes: anime.episodes
        });

        const result = buildAnimeMessage(anime);

        /*
         * إذا كانت مكتبة البوت تدعم إرسال رابط صورة
         * نرسل الصورة مع المعلومات.
         */
        if (result.attachmentUrl) {
            try {
                const imageResponse = await axios.get(
                    result.attachmentUrl,
                    {
                        responseType: "arraybuffer",
                        timeout: 15000
                    }
                );

                return api.sendMessage(
                    {
                        body: result.body,
                        attachment: Buffer.from(
                            imageResponse.data
                        )
                    },
                    event.threadID,
                    event.messageID
                );

            } catch (imageError) {
                console.log(
                    "[ANIME IMAGE] تعذر تحميل الصورة"
                );

                return api.sendMessage(
                    result.body,
                    event.threadID,
                    event.messageID
                );
            }
        }

        return api.sendMessage(
            result.body,
            event.threadID,
            event.messageID
        );

    } catch (error) {
        console.error("[ANIME ERROR]", error);

        if (error.response?.status === 429) {
            return api.sendMessage(
`╭─── ◸ الـAPI مـشـغـول ◿ ───╮

⊸ وصلت طلبات كثيرة إلى خدمة الأنمي.

⊸ انتظر قليلًا ثم حاول مرة أخرى.

╰────────────────────────╯`,
                event.threadID,
                event.messageID
            );
        }

        return api.sendMessage(
`╭─── ◸ خـطـأ الـخـدمـة ◿ ───╮

⊸ حدث خطأ أثناء جلب معلومات الأنمي.

⊸ حاول مرة أخرى بعد قليل.

╰────────────────────────╯`,
            event.threadID,
            event.messageID
        );
    }
};
