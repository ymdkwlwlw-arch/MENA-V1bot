const axios = require("axios");

module.exports.config = {
    name: "طقس",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "عرض حالة الطقس الحالية لمدينة",
    usePrefix: true,
    commandCategory: "خدمات",
    usages: "طقس اسم_المدينة",
    cooldowns: 5
};

const GEO_API =
    "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
    "https://api.open-meteo.com/v1/forecast";

function weatherDescription(code) {
    const descriptions = {
        0: "سماء صافية",
        1: "غائم جزئيًا",
        2: "غائم جزئيًا",
        3: "غائم",
        45: "ضباب",
        48: "ضباب متجمد",
        51: "رذاذ خفيف",
        53: "رذاذ متوسط",
        55: "رذاذ كثيف",
        56: "رذاذ متجمد خفيف",
        57: "رذاذ متجمد كثيف",
        61: "مطر خفيف",
        63: "مطر متوسط",
        65: "مطر غزير",
        66: "مطر متجمد خفيف",
        67: "مطر متجمد غزير",
        71: "ثلج خفيف",
        73: "ثلج متوسط",
        75: "ثلج غزير",
        77: "حبيبات ثلج",
        80: "زخات مطر خفيفة",
        81: "زخات مطر متوسطة",
        82: "زخات مطر قوية",
        85: "زخات ثلج خفيفة",
        86: "زخات ثلج قوية",
        95: "عاصفة رعدية",
        96: "عاصفة رعدية مع برد",
        99: "عاصفة رعدية قوية مع برد"
    };

    return descriptions[code] || "حالة جوية غير معروفة";
}

function getWeatherIcon(code) {
    if ([0].includes(code)) return "☀️";
    if ([1, 2].includes(code)) return "⛅";
    if ([3].includes(code)) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if (
        [51, 53, 55, 56, 57,
         61, 63, 65,
         66, 67,
         80, 81, 82].includes(code)
    ) return "🌧️";

    if (
        [71, 73, 75,
         77, 85, 86].includes(code)
    ) return "🌨️";

    if (
        [95, 96, 99].includes(code)
    ) return "⛈️";

    return "🌤️";
}

async function findCity(city) {
    const response = await axios.get(
        GEO_API,
        {
            params: {
                name: city,
                count: 1,
                language: "ar",
                format: "json"
            },
            timeout: 15000
        }
    );

    if (
        !response.data ||
        !Array.isArray(response.data.results) ||
        response.data.results.length === 0
    ) {
        return null;
    }

    return response.data.results[0];
}

async function getWeather(latitude, longitude) {
    const response = await axios.get(
        WEATHER_API,
        {
            params: {
                latitude,
                longitude,
                current: [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "apparent_temperature",
                    "precipitation",
                    "weather_code",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "cloud_cover"
                ].join(","),
                timezone: "auto",
                temperature_unit: "celsius",
                wind_speed_unit: "kmh"
            },
            timeout: 15000
        }
    );

    if (
        !response.data ||
        !response.data.current
    ) {
        throw new Error(
            "لم يتم الحصول على بيانات الطقس."
        );
    }

    return response.data;
}

function windDirection(degrees) {
    if (degrees === undefined || degrees === null) {
        return "غير معروف";
    }

    const directions = [
        "شمال",
        "شمال شرقي",
        "شرق",
        "جنوب شرقي",
        "جنوب",
        "جنوب غربي",
        "غرب",
        "شمال غربي"
    ];

    const index =
        Math.round(degrees / 45) % 8;

    return directions[index];
}

module.exports.run = async function ({
    api,
    event,
    args
}) {
    const {
        threadID,
        messageID
    } = event;

    const send = text =>
        api.sendMessage(
            text,
            threadID,
            messageID
        );

    const city =
        args.join(" ").trim();

    if (!city) {
        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            "       نـظـام الـطـقـس\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـطـريـقـة:\n" +
            "⊞ طقس الخرطوم\n" +
            "⊞ طقس أم درمان\n" +
            "⊞ طقس دبي\n" +
            "⊞ طقس القاهرة\n" +
            "── ── ── ── ── ── ──"
        );
    }

    try {
        await api.setMessageReaction(
            "⏳",
            messageID,
            threadID
        );
    } catch (e) {}

    try {
        /*
         * البحث عن المدينة
         */
        const location =
            await findCity(city);

        if (!location) {
            try {
                await api.setMessageReaction(
                    "❌",
                    messageID,
                    threadID
                );
            } catch (e) {}

            return send(
                "╭─  ── ── ── ──  ─╮\n" +
                "       نـظـام الـطـقـس\n" +
                "╰─  ── ── ── ──  ─╯\n" +
                "⎔ لـم يـتـم الـعـثـور عـلـى الـمـديـنـة\n" +
                `⊞ الـبـحـث: ${city}\n` +
                "⊞ جـرب اسـم الـمـديـنـة بـشـكـل أوضـح\n" +
                "── ── ── ── ── ── ──"
            );
        }

        /*
         * جلب الطقس
         */
        const weather =
            await getWeather(
                location.latitude,
                location.longitude
            );

        const current =
            weather.current;

        const code =
            current.weather_code;

        const icon =
            getWeatherIcon(code);

        const description =
            weatherDescription(code);

        const temperature =
            current.temperature_2m;

        const feelsLike =
            current.apparent_temperature;

        const humidity =
            current.relative_humidity_2m;

        const wind =
            current.wind_speed_10m;

        const windDir =
            windDirection(
                current.wind_direction_10m
            );

        const precipitation =
            current.precipitation;

        const cloud =
            current.cloud_cover;

        const country =
            location.country ||
            "";

        const admin =
            location.admin1 ||
            "";

        try {
            await api.setMessageReaction(
                "🌤️",
                messageID,
                threadID
            );
        } catch (e) {}

        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            `       ${icon} طـقـس ${location.name}\n` +
            "╰─  ── ── ── ──  ─╯\n" +

            `⎔ الـحـالـة: ${description}\n` +
            `⎔ درجـة الـحـرارة: ${temperature}°C\n` +
            `⊞ المحسوسة: ${feelsLike}°C\n` +
            `⊞ الرطوبة: ${humidity}%\n` +
            `⊞ سرعة الرياح: ${wind} كم/س\n` +
            `⊞ اتجاه الرياح: ${windDir}\n` +
            `⊞ الأمطار: ${precipitation} مم\n` +
            `⊞ الغيوم: ${cloud}%\n\n` +

            `✦ الموقع: ${location.name}` +
            (admin ? `، ${admin}` : "") +
            (country ? `، ${country}` : "") +
            "\n" +

            "── ── ── ── ── ── ──"
        );

    } catch (error) {

        console.error(
            "[طقس]",
            error.message
        );

        try {
            await api.setMessageReaction(
                "❌",
                messageID,
                threadID
            );
        } catch (e) {}

        return send(
            "╭─  ── ── ── ──  ─╮\n" +
            "       نـظـام الـطـقـس\n" +
            "╰─  ── ── ── ──  ─╯\n" +
            "⎔ الـحـالـة: فـشـل جـلـب الـطـقـس\n" +
            "⊞ تـأكـد مـن اتـصـال الـبـوت بـالإنـتـرنـت.\n" +
            `⊞ الـخـطـأ: ${error.message}\n` +
            "── ── ── ── ── ── ──"
        );
    }
};
