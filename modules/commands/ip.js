const axios = require("axios");

module.exports.config = {
    name: "ip",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "KIROS",
    description: "عرض معلومات عنوان IP",
    usePrefix: true,
    commandCategory: "خدمات",
    usages: "ip <address>",
    cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
    const args = event.body
        ? event.body.trim().split(/\s+/).slice(1)
        : [];

    const ip = args[0] || "";

    try {
        let data;

        if (ip) {
            const response = await axios.get(
                `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,query,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as`,
                { timeout: 10000 }
            );

            data = response.data;
        } else {
            const response = await axios.get(
                "https://ipapi.co/json/",
                { timeout: 10000 }
            );

            data = {
                status: "success",
                query: response.data.ip,
                country: response.data.country_name,
                countryCode: response.data.country_code,
                regionName: response.data.region,
                city: response.data.city,
                zip: response.data.postal,
                lat: response.data.latitude,
                lon: response.data.longitude,
                timezone: response.data.timezone,
                isp: response.data.org,
                org: response.data.org,
                as: ""
            };
        }

        if (!data || data.status === "fail") {
            return api.sendMessage(
                `╭─── ◸ خـطـأ ◿ ───╮

⊸ لم أتمكن من العثور على معلومات هذا الـIP.

╰────────────────╯`,
                event.threadID,
                event.messageID
            );
        }

        const message =
`╭─── ◸ مـعـلـومـات IP ◿ ───╮

⊸ IP       : ${data.query || "غير معروف"}
⊸ الدولة   : ${data.country || "غير معروف"} ${data.countryCode ? `(${data.countryCode})` : ""}
⊸ المنطقة  : ${data.regionName || "غير معروف"}
⊸ المدينة  : ${data.city || "غير معروف"}
⊸ الرمز     : ${data.zip || "غير معروف"}

⊸ Latitude  : ${data.lat ?? "غير معروف"}
⊸ Longitude : ${data.lon ?? "غير معروف"}

⊸ المنطقة الزمنية:
${data.timezone || "غير معروف"}

⊸ ISP:
${data.isp || "غير معروف"}

⊸ المنظمة:
${data.org || "غير معروف"}

⊸ الشبكة:
${data.as || "غير معروف"}

╰────────────────────────╯`;

        return api.sendMessage(
            message,
            event.threadID,
            event.messageID
        );

    } catch (error) {
        console.error("[IP ERROR]", error);

        return api.sendMessage(
`╭─── ◸ خـطـأ الـخـدمـة ◿ ───╮

⊸ تعذر الاتصال بخدمة معلومات الـIP.

⊸ حاول مرة أخرى لاحقًا.

╰────────────────────────╯`,
            event.threadID,
            event.messageID
        );
    }
};
