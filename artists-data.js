// 画师数据文件 - 包含所有画师的提示词和示例图片
const artistsData = [
    {
        id: 1,
        name: "artist:wlop",
        image1: "",
        image2: "./assets/wlop.png"
    },
    {
        id: 2,
        name: "artist:dikko",
        image1: "",
        image2: "./assets/dikko.png"
    },
    {
        id: 3,
        name: "artist:unfairr",
        image1: "",
        image2: "./assets/unfairr.png"
    },
    {
        id: 4,
        name: "artist:oni-noboru",
        image1: "",
        image2: "./assets/oni-noboru.png"
    },
    {
        id: 5,
        name: "artist:neoartcore",
        image1: "",
        image2: "./assets/neoartcore.png"
    },
    {
        id: 6,
        name: "artist:piromizu",
        image1: "",
        image2: "./assets/piromizu.png"
    },
    {
        id: 7,
        name: "artist:dishwasher1910",
        image1: "",
        image2: "./assets/dishwasher1910.png"
    },
    {
        id: 8,
        name: "artist:asteroid_ill",
        image1: "",
        image2: "./assets/asteroid_ill.png"
    },
    {
        id: 9,
        name: "artist:dino_(dinoartforame)",
        image1: "",
        image2: "./assets/dino_(dinoartforame).png"
    },
    {
        id: 10,
        name: "artist:nababa",
        image1: "",
        image2: "./assets/nababa.png"
    },
    {
        id: 11,
        name: "artist:aoi_ogata",
        image1: "",
        image2: "./assets/aoi_ogata.png"
    },
    {
        id: 12,
        name: "artist:matanonki",
        image1: "",
        image2: "./assets/matanonki.png"
    },
    {
        id: 13,
        name: "artist:yaegashi_nan",
        image1: "",
        image2: "./assets/yaegashi_nan.png"
    },
    {
        id: 14,
        name: "artist:alexander_dinh",
        image1: "",
        image2: "./assets/alexander_dinh.png"
    },
    {
        id: 15,
        name: "artist:minaba_hideo",
        image1: "",
        image2: "./assets/minaba_hideo.png"
    },
    {
        id: 16,
        name: "artist:momoko_(momopoco)",
        image1: "",
        image2: "./assets/momoko_(momopoco).png"
    },
    {
        id: 17,
        name: "artist:rin_yuu",
        image1: "",
        image2: "./assets/rin_yuu.png"
    },
    {
        id: 18,
        name: "artist:fukahire_(ruinon)",
        image1: "",
        image2: "./assets/fukahire_(ruinon).png"
    },
    {
        id: 19,
        name: "artist:timbougami",
        image1: "",
        image2: "./assets/timbougami.png"
    },
    {
        id: 20,
        name: "artist:haneru",
        image1: "",
        image2: "./assets/haneru.png"
    },
    {
        id: 21,
        name: "artist:ask_(askzy)",
        image1: "",
        image2: "./assets/ask_(askzy).png"
    },
    {
        id: 22,
        name: "artist:sage_joh",
        image1: "",
        image2: "./assets/sage_joh.png"
    },
    {
        id: 23,
        name: "artist:jeneral",
        image1: "",
        image2: "./assets/jeneral.png"
    },
    {
        id: 24,
        name: "artist:ogipote",
        image1: "",
        image2: "./assets/ogipote.png"
    },
    {
        id: 25,
        name: "artist:kinta_(distortion)",
        image1: "",
        image2: "./assets/kinta_(distortion).png"
    },
    {
        id: 26,
        name: "artist:blazpu",
        image1: "",
        image2: "./assets/blazpu.png"
    },
    {
        id: 27,
        name: "artist:shamakho",
        image1: "",
        image2: "./assets/shamakho.png"
    },
    {
        id: 28,
        name: "artist:reeh_(yukuri130)",
        image1: "",
        image2: "./assets/reeh_(yukuri130).png"
    },
    {
        id: 29,
        name: "artist:shichigatsu",
        image1: "",
        image2: "./assets/shichigatsu.png"
    },
    {
        id: 30,
        name: "artist:love_cacao",
        image1: "",
        image2: "./assets/love_cacao.png"
    },
    {
        id: 31,
        name: "artist:teffish",
        image1: "",
        image2: "./assets/teffish.png"
    },
    {
        id: 32,
        name: "artist:ebi_193",
        image1: "",
        image2: "./assets/ebi_193.png"
    },
    {
        id: 33,
        name: "artist:oekakizuki",
        image1: "",
        image2: "./assets/oekakizuki.png"
    },
    {
        id: 34,
        name: "artist:aztodio",
        image1: "",
        image2: "./assets/aztodio.png"
    },
    {
        id: 35,
        name: "artist:untue",
        image1: "",
        image2: "./assets/untue.png"
    },
    {
        id: 36,
        name: "artist:lambda_(kusowarota)",
        image1: "",
        image2: "./assets/lambda_(kusowarota).png"
    },
    {
        id: 37,
        name: "artist:shexyo",
        image1: "",
        image2: "./assets/shexyo.png"
    },
    {
        id: 38,
        name: "artist:juurouta",
        image1: "",
        image2: "./assets/juurouta.png"
    },
    {
        id: 39,
        name: "artist:camonome",
        image1: "",
        image2: "./assets/camonome.png"
    },
    {
        id: 40,
        name: "artist:hizuki_akira",
        image1: "",
        image2: "./assets/hizuki_akira.png"
    },
    {
        id: 41,
        name: "artist:siu_(siu0207)",
        image1: "",
        image2: "./assets/siu_(siu0207).png"
    },
    {
        id: 42,
        name: "artist:masami_chie",
        image1: "",
        image2: "./assets/masami_chie.png"
    },
    {
        id: 43,
        name: "artist:misaka_12003-gou",
        image1: "",
        image2: "./assets/misaka_12003-gou.png"
    },
    {
        id: 44,
        name: "artist:milkychu",
        image1: "",
        image2: "./assets/milkychu.png"
    },
    {
        id: 45,
        name: "artist:sen_(sansui)",
        image1: "",
        image2: "./assets/sen_(sansui).png"
    },
    {
        id: 46,
        name: "artist:egami",
        image1: "",
        image2: "./assets/egami.png"
    },
    {
        id: 47,
        name: "artist:cyclone_(reizei)",
        image1: "",
        image2: "./assets/cyclone_(reizei).png"
    },
    {
        id: 48,
        name: "artist:obui",
        image1: "",
        image2: "./assets/obui.png"
    },
    {
        id: 49,
        name: "artist:sayori_(neko_works)",
        image1: "",
        image2: "./assets/sayori_(neko_works).png"
    },
    {
        id: 50,
        name: "artist:happoubi_jin",
        image1: "",
        image2: "./assets/happoubi_jin.png"
    },
    {
        id: 51,
        name: "artist:kase_daiki",
        image1: "",
        image2: "./assets/kase_daiki.png"
    },
    {
        id: 52,
        name: "artist:gentsuki",
        image1: "",
        image2: "./assets/gentsuki.png"
    },
    {
        id: 53,
        name: "artist:kousaki_rui",
        image1: "",
        image2: "./assets/kousaki_rui.png"
    },
    {
        id: 54,
        name: "artist:ryosios",
        image1: "",
        image2: "./assets/ryosios.png"
    },
    {
        id: 55,
        name: "artist:onedoo",
        image1: "",
        image2: "./assets/onedoo.png"
    },
    {
        id: 56,
        name: "artist:weno",
        image1: "",
        image2: "./assets/weno.png"
    },
    {
        id: 57,
        name: "artist:sabamen",
        image1: "",
        image2: "./assets/sabamen.png"
    },
    {
        id: 58,
        name: "artist:miyamoto_issa",
        image1: "",
        image2: "./assets/miyamoto_issa.png"
    },
    {
        id: 59,
        name: "artist:choco_chip",
        image1: "",
        image2: "./assets/choco_chip.png"
    },
    {
        id: 60,
        name: "artist:arsenixc",
        image1: "",
        image2: "./assets/arsenixc.png"
    },
    {
        id: 61,
        name: "artist:nanaken_nana",
        image1: "",
        image2: "./assets/nanaken_nana.png"
    },
    {
        id: 62,
        name: "artist:torino_aqua",
        image1: "",
        image2: "./assets/torino_aqua.png"
    },
    {
        id: 63,
        name: "artist:qiandaiyiyu",
        image1: "",
        image2: "./assets/qiandaiyiyu.png"
    },
    {
        id: 64,
        name: "artist:fjsmu",
        image1: "",
        image2: "./assets/fjsmu.png"
    },
    {
        id: 65,
        name: "artist:sola_(solo0730)",
        image1: "",
        image2: "./assets/sola_(solo0730).png"
    },
    {
        id: 66,
        name: "artist:da_mao_banlangen",
        image1: "",
        image2: "./assets/da_mao_banlangen.png"
    },
    {
        id: 67,
        name: "artist:kome_cola",
        image1: "",
        image2: "./assets/kome_cola.png"
    },
    {
        id: 68,
        name: "artist:sade_abyss",
        image1: "",
        image2: "./assets/sade_abyss.png"
    },
    {
        id: 69,
        name: "artist:rhasta",
        image1: "",
        image2: "./assets/rhasta.png"
    },
    {
        id: 70,
        name: "artist:senri_gan",
        image1: "",
        image2: "./assets/senri_gan.png"
    },
    {
        id: 71,
        name: "artist:gin_mitsu",
        image1: "",
        image2: "./assets/gin_mitsu.png"
    },
    {
        id: 72,
        name: "artist:freng",
        image1: "",
        image2: "./assets/freng.png"
    },
    {
        id: 73,
        name: "artist:akita_hika",
        image1: "",
        image2: "./assets/akita_hika.png"
    },
    {
        id: 74,
        name: "artist:nekobell",
        image1: "",
        image2: "./assets/nekobell.png"
    },
    {
        id: 75,
        name: "artist:void_0",
        image1: "",
        image2: "./assets/void_0.png"
    },
    {
        id: 76,
        name: "artist:hito_komoru",
        image1: "",
        image2: "./assets/hito_komoru.png"
    },
    {
        id: 77,
        name: "artist:alphonse_(white_datura)",
        image1: "",
        image2: "./assets/alphonse_(white_datura).png"
    },
    {
        id: 78,
        name: "artist:cutesexyrobutts",
        image1: "",
        image2: "./assets/cutesexyrobutts.png"
    },
    {
        id: 79,
        name: "artist:onono_imoko",
        image1: "",
        image2: "./assets/onono_imoko.png"
    },
    {
        id: 80,
        name: "artist:ryou(ryoutarou)",
        image1: "",
        image2: "./assets/ryou(ryoutarou).png"
    },
    {
        id: 81,
        name: "artist:eufoniuz",
        image1: "",
        image2: "./assets/eufoniuz.png"
    },
    {
        id: 82,
        name: "artist:xilmo",
        image1: "",
        image2: "./assets/xilmo.png"
    },
    {
        id: 83,
        name: "artist:nixeu",
        image1: "",
        image2: "./assets/nixeu.png"
    },
    {
        id: 84,
        name: "artist:toi8",
        image1: "",
        image2: "./assets/toi8.png"
    },
    {
        id: 85,
        name: "artist:sencha_(senchat)",
        image1: "",
        image2: "./assets/sencha_(senchat).png"
    },
    {
        id: 86,
        name: "artist:stu_dts",
        image1: "",
        image2: "./assets/stu_dts.png"
    },
    {
        id: 87,
        name: "artist:kaede_(sayappa)",
        image1: "",
        image2: "./assets/kaede_(sayappa).png"
    },
    {
        id: 88,
        name: "artist:hagimorijia",
        image1: "",
        image2: "./assets/hagimorijia.png"
    },
    {
        id: 89,
        name: "artist:john_kafka",
        image1: "",
        image2: "./assets/john_kafka.png"
    },
    {
        id: 90,
        name: "artist:rolua",
        image1: "",
        image2: "./assets/rolua.png"
    },
    {
        id: 91,
        name: "artist:au_(d_elete)",
        image1: "",
        image2: "./assets/au_(d_elete).png"
    },
    {
        id: 92,
        name: "artist:suzumi_(ccroquette)",
        image1: "",
        image2: "./assets/suzumi_(ccroquette).png"
    },
    {
        id: 93,
        name: "artist:umishima_senbon",
        image1: "",
        image2: "./assets/umishima_senbon.png"
    },
    {
        id: 94,
        name: "artist:huwari_(dnwls3010)",
        image1: "",
        image2: "./assets/huwari_(dnwls3010).png"
    },
    {
        id: 95,
        name: "artist:z.i",
        image1: "",
        image2: "./assets/z.i.png"
    },
    {
        id: 96,
        name: "artist:dancho_(dancyo)",
        image1: "",
        image2: "./assets/dancho_(dancyo).png"
    },
    {
        id: 97,
        name: "artist:ataruman",
        image1: "",
        image2: "./assets/ataruman.png"
    },
    {
        id: 98,
        name: "artist:osame",
        image1: "",
        image2: "./assets/osame.png"
    },
    {
        id: 99,
        name: "artist:fish.boy",
        image1: "",
        image2: "./assets/fish.boy.png"
    },
    {
        id: 100,
        name: "artist:c.r.",
        image1: "",
        image2: "./assets/c.r..png"
    },
    {
        id: 101,
        name: "artist:ohisashiburi",
        image1: "",
        image2: "./assets/ohisashiburi.png"
    },
    {
        id: 102,
        name: "artist:personal_ami",
        image1: "",
        image2: "./assets/personal_ami.png"
    },
    {
        id: 103,
        name: "artist:kagami_hirotaka",
        image1: "",
        image2: "./assets/kagami_hirotaka.png"
    },
    {
        id: 104,
        name: "artist:eu03",
        image1: "",
        image2: "./assets/eu03.png"
    },
    {
        id: 105,
        name: "artist:aoki_(fumomo)",
        image1: "",
        image2: "./assets/aoki_(fumomo).png"
    },
    {
        id: 106,
        name: "artist:scottie_(phantom2)",
        image1: "",
        image2: "./assets/scottie_(phantom2).png"
    },
    {
        id: 107,
        name: "artist:doitsuken",
        image1: "",
        image2: "./assets/doitsuken.png"
    },
    {
        id: 108,
        name: "artist:cis_(carcharias)",
        image1: "",
        image2: "./assets/cis_(carcharias).png"
    },
    {
        id: 109,
        name: "artist:greem_bang",
        image1: "",
        image2: "./assets/greem_bang.png"
    },
    {
        id: 110,
        name: "artist:magukappu",
        image1: "",
        image2: "./assets/magukappu.png"
    },
    {
        id: 111,
        name: "artist:hotathino",
        image1: "",
        image2: "./assets/hotathino.png"
    },
    {
        id: 112,
        name: "artist:liang_xing",
        image1: "",
        image2: "./assets/liang_xing.png"
    },
    {
        id: 113,
        name: "artist:modare",
        image1: "",
        image2: "./assets/modare.png"
    },
    {
        id: 114,
        name: "artist:welt_(kinsei_koutenkyoku)",
        image1: "",
        image2: "./assets/welt_(kinsei_koutenkyoku).png"
    },
    {
        id: 115,
        name: "artist:whoosaku",
        image1: "",
        image2: "./assets/whoosaku.png"
    },
    {
        id: 116,
        name: "artist:cian_yo",
        image1: "",
        image2: "./assets/cian_yo.png"
    },
    {
        id: 117,
        name: "artist:omone_hokoma_agm",
        image1: "",
        image2: "./assets/omone_hokoma_agm.png"
    },
    {
        id: 118,
        name: "artist:misumi_(niku-kyu)",
        image1: "",
        image2: "./assets/misumi_(niku-kyu).png"
    },
    {
        id: 119,
        name: "artist:xiujia_yihuizi",
        image1: "",
        image2: "./assets/xiujia_yihuizi.png"
    },
    {
        id: 120,
        name: "artist:konno_tohiro",
        image1: "",
        image2: "./assets/konno_tohiro.png"
    },
    {
        id: 121,
        name: "artist:kisetsu",
        image1: "",
        image2: "./assets/kisetsu.png"
    },
    {
        id: 122,
        name: "artist:infukun",
        image1: "",
        image2: "./assets/infukun.png"
    },
    {
        id: 123,
        name: "artist:toraishi_666",
        image1: "",
        image2: "./assets/toraishi_666.png"
    },
    {
        id: 124,
        name: "artist:tanaka_ryou",
        image1: "",
        image2: "./assets/tanaka_ryou.png"
    },
    {
        id: 125,
        name: "artist:akeyama_kitsune",
        image1: "",
        image2: "./assets/akeyama_kitsune.png"
    },
    {
        id: 126,
        name: "artist:free_style_(yohan1754)",
        image1: "",
        image2: "./assets/free_style_(yohan1754).png"
    },
    {
        id: 127,
        name: "artist:gishiki_(gshk)",
        image1: "",
        image2: "./assets/gishiki_(gshk).png"
    },
    {
        id: 128,
        name: "artist:kawase_seiki",
        image1: "",
        image2: "./assets/kawase_seiki.png"
    },
    {
        id: 129,
        name: "artist:you_shimizu",
        image1: "",
        image2: "./assets/you_shimizu.png"
    },
    {
        id: 130,
        name: "artist:binggong_asylum",
        image1: "",
        image2: "./assets/binggong_asylum.png"
    },
    {
        id: 131,
        name: "artist:reddizen",
        image1: "",
        image2: "./assets/reddizen.png"
    },
    {
        id: 132,
        name: "artist:kidmo",
        image1: "",
        image2: "./assets/kidmo.png"
    },
    {
        id: 133,
        name: "artist:kamiya_tomoe",
        image1: "",
        image2: "./assets/kamiya_tomoe.png"
    },
    {
        id: 134,
        name: "artist:kasai_shin",
        image1: "",
        image2: "./assets/kasai_shin.png"
    },
    {
        id: 135,
        name: "artist:araneesama",
        image1: "",
        image2: "./assets/araneesama.png"
    },
    {
        id: 136,
        name: "artist:nia_(nia4294)",
        image1: "",
        image2: "./assets/nia_(nia4294).png"
    },
    {
        id: 137,
        name: "artist:nikichen",
        image1: "",
        image2: "./assets/nikichen.png"
    },
    {
        id: 138,
        name: "artist:nekoshoko",
        image1: "",
        image2: "./assets/nekoshoko.png"
    },
    {
        id: 139,
        name: "artist:ai-wa",
        image1: "",
        image2: "./assets/ai-wa.png"
    },
    {
        id: 140,
        name: "artist:fujieda_uzuki",
        image1: "",
        image2: "./assets/fujieda_uzuki.png"
    },
    {
        id: 141,
        name: "artist:sana_(37pisana)",
        image1: "",
        image2: "./assets/sana_(37pisana).png"
    },
    {
        id: 142,
        name: "artist:sunday_aki",
        image1: "",
        image2: "./assets/sunday_aki.png"
    },
    {
        id: 143,
        name: "artist:pot-de",
        image1: "",
        image2: "./assets/pot-de.png"
    },
    {
        id: 144,
        name: "artist:chocoan",
        image1: "",
        image2: "./assets/chocoan.png"
    },
    {
        id: 145,
        name: "artist:nagatsukiariake",
        image1: "",
        image2: "./assets/nagatsukiariake.png"
    },
    {
        id: 146,
        name: "artist:kazabuki_poni",
        image1: "",
        image2: "./assets/kazabuki_poni.png"
    },
    {
        id: 147,
        name: "artist:aki663",
        image1: "",
        image2: "./assets/aki663.png"
    },
    {
        id: 148,
        name: "artist:tuxedo_de_cat",
        image1: "",
        image2: "./assets/tuxedo_de_cat.png"
    },
    {
        id: 149,
        name: "artist:ame_(uten_cancel)",
        image1: "",
        image2: "./assets/ame_(uten_cancel).png"
    },
    {
        id: 150,
        name: "artist:matanukinuki",
        image1: "",
        image2: "./assets/matanukinuki.png"
    },
    {
        id: 151,
        name: "artist:hamayumiba_sou",
        image1: "",
        image2: "./assets/hamayumiba_sou.png"
    },
    {
        id: 152,
        name: "artist:rinto_(rint_rnt)",
        image1: "",
        image2: "./assets/rinto_(rint_rnt).png"
    },
    {
        id: 153,
        name: "artist:stormcow",
        image1: "",
        image2: "./assets/stormcow.png"
    },
    {
        id: 154,
        name: "artist:sollyz",
        image1: "",
        image2: "./assets/sollyz.png"
    },
    {
        id: 155,
        name: "artist:enma_(enmanuelart)",
        image1: "",
        image2: "./assets/enma_(enmanuelart).png"
    },
    {
        id: 156,
        name: "artist:rikudou_inuhiko",
        image1: "",
        image2: "./assets/rikudou_inuhiko.png"
    },
    {
        id: 157,
        name: "artist:nightcat",
        image1: "",
        image2: "./assets/nightcat.png"
    },
    {
        id: 158,
        name: "artist:ireading",
        image1: "",
        image2: "./assets/ireading.png"
    },
    {
        id: 159,
        name: "artist:viola_(seed)",
        image1: "",
        image2: "./assets/viola_(seed).png"
    },
    {
        id: 160,
        name: "artist:kazami_karasu",
        image1: "",
        image2: "./assets/kazami_karasu.png"
    },
    {
        id: 161,
        name: "artist:paint_musume",
        image1: "",
        image2: "./assets/paint_musume.png"
    },
    {
        id: 162,
        name: "artist:folait",
        image1: "",
        image2: "./assets/folait.png"
    },
    {
        id: 163,
        name: "artist:mieharu",
        image1: "",
        image2: "./assets/mieharu.png"
    },
    {
        id: 164,
        name: "artist:tatekawa_mako",
        image1: "",
        image2: "./assets/tatekawa_mako.png"
    },
    {
        id: 165,
        name: "artist:hirose_(mokiki)",
        image1: "",
        image2: "./assets/hirose_(mokiki).png"
    },
    {
        id: 166,
        name: "artist:jiffic",
        image1: "",
        image2: "./assets/jiffic.png"
    },
    {
        id: 167,
        name: "artist:obj_shep",
        image1: "",
        image2: "./assets/obj_shep.png"
    },
    {
        id: 168,
        name: "artist:omutatsu",
        image1: "",
        image2: "./assets/omutatsu.png"
    },
    {
        id: 169,
        name: "artist:musen-shiki_sanhankikan",
        image1: "",
        image2: "./assets/musen-shiki_sanhankikan.png"
    },
    {
        id: 170,
        name: "artist:isamu-ki_(yuuki)",
        image1: "",
        image2: "./assets/isamu-ki_(yuuki).png"
    },
    {
        id: 171,
        name: "artist:unime_seaflower",
        image1: "",
        image2: "./assets/unime_seaflower.png"
    },
    {
        id: 172,
        name: "artist:puge",
        image1: "",
        image2: "./assets/puge.png"
    },
    {
        id: 173,
        name: "artist:ssambatea",
        image1: "",
        image2: "./assets/ssambatea.png"
    },
    {
        id: 174,
        name: "artist:oopartz_yang",
        image1: "",
        image2: "./assets/oopartz_yang.png"
    },
    {
        id: 175,
        name: "artist:casul",
        image1: "",
        image2: "./assets/casul.png"
    },
    {
        id: 176,
        name: "artist:rea_loixacra",
        image1: "",
        image2: "./assets/rea_loixacra.png"
    },
    {
        id: 177,
        name: "artist:ikeda_ruriko",
        image1: "",
        image2: "./assets/ikeda_ruriko.png"
    },
    {
        id: 178,
        name: "artist:rikumaru",
        image1: "",
        image2: "./assets/rikumaru.png"
    },
    {
        id: 179,
        name: "artist:kataku_musou",
        image1: "",
        image2: "./assets/kataku_musou.png"
    },
    {
        id: 180,
        name: "artist:nextoad",
        image1: "",
        image2: "./assets/nextoad.png"
    },
    {
        id: 181,
        name: "artist:tsunoji",
        image1: "",
        image2: "./assets/tsunoji.png"
    },
    {
        id: 182,
        name: "artist:mogskg",
        image1: "",
        image2: "./assets/mogskg.png"
    },
    {
        id: 183,
        name: "artist:endou_okito",
        image1: "",
        image2: "./assets/endou_okito.png"
    },
    {
        id: 184,
        name: "artist:andou_you",
        image1: "",
        image2: "./assets/andou_you.png"
    },
    {
        id: 185,
        name: "artist:harusame_(rueken)",
        image1: "",
        image2: "./assets/harusame_(rueken).png"
    },
    {
        id: 186,
        name: "artist:sazamiso_rx",
        image1: "",
        image2: "./assets/sazamiso_rx.png"
    },
    {
        id: 187,
        name: "artist:kannazuki_hato",
        image1: "",
        image2: "./assets/kannazuki_hato.png"
    },
    {
        id: 188,
        name: "artist:reoen",
        image1: "",
        image2: "./assets/reoen.png"
    },
    {
        id: 189,
        name: "artist:nami_(nyaa)",
        image1: "",
        image2: "./assets/nami_(nyaa).png"
    },
    {
        id: 190,
        name: "artist:gamuo",
        image1: "",
        image2: "./assets/gamuo.png"
    },
    {
        id: 191,
        name: "artist:fadingz",
        image1: "",
        image2: "./assets/fadingz.png"
    },
    {
        id: 192,
        name: "artist:huu_(dighapdlxm12)",
        image1: "",
        image2: "./assets/huu_(dighapdlxm12).png"
    },
    {
        id: 193,
        name: "artist:ebonyxh",
        image1: "",
        image2: "./assets/ebonyxh.png"
    },
    {
        id: 194,
        name: "artist:mikomachi_(35machi)",
        image1: "",
        image2: "./assets/mikomachi_(35machi).png"
    },
    {
        id: 195,
        name: "artist:rougetsu_(eclipse)",
        image1: "",
        image2: "./assets/rougetsu_(eclipse).png"
    },
    {
        id: 196,
        name: "artist:sakimichan",
        image1: "",
        image2: "./assets/sakimichan.png"
    },
    {
        id: 197,
        name: "artist:lexaiduer",
        image1: "",
        image2: "./assets/lexaiduer.png"
    },
    {
        id: 198,
        name: "artist:chunhwei-lee",
        image1: "",
        image2: "./assets/chunhwei-lee.png"
    },
    {
        id: 199,
        name: "artist:DADACHYO",
        image1: "",
        image2: "./assets/DADACHYO.png"
    },
    {
        id: 200,
        name: "artist:ayyasap",
        image1: "",
        image2: "./assets/ayyasap.png"
    },
    {
        id: 201,
        name: "artist:LoganCure",
        image1: "",
        image2: "./assets/LoganCure.png"
    },
    {
        id: 202,
        name: "artist:RyanReos",
        image1: "",
        image2: "./assets/RyanReos.png"
    },
    {
        id: 203,
        name: "artist:nanabe_78",
        image1: "",
        image2: "./assets/nanabe_78.png"
    },
    {
        id: 204,
        name: "artist:sciamano240",
        image1: "",
        image2: "./assets/sciamano240.png"
    },
    {
        id: 205,
        name: "artist:delta26",
        image1: "",
        image2: "./assets/delta26.png"
    },
    {
        id: 206,
        name: "artist:isemori",
        image1: "",
        image2: "./assets/isemori.png"
    },
    {
        id: 207,
        name: "artist:oyuwari",
        image1: "",
        image2: "./assets/oyuwari.png"
    },
    {
        id: 208,
        name: "artist:sashimi_(o_3_4_3)",
        image1: "",
        image2: "./assets/sashimi_(o_3_4_3).png"
    },
    {
        id: 209,
        name: "artist:wasabishouyu",
        image1: "",
        image2: "./assets/wasabishouyu.png"
    },
    {
        id: 210,
        name: "artist:xter",
        image1: "",
        image2: "./assets/xter.png"
    },
    {
        id: 211,
        name: "artist:mg991998",
        image1: "",
        image2: "./assets/mg991998.png"
    },
    {
        id: 212,
        name: "artist:fukuda_tomonori",
        image1: "",
        image2: "./assets/fukuda_tomonori.png"
    },
    {
        id: 213,
        name: "artist:rara8hachi",
        image1: "",
        image2: "./assets/rara8hachi.png"
    },
    {
        id: 214,
        name: "artist:mimonel",
        image1: "",
        image2: "./assets/mimonel.png"
    },
    {
        id: 215,
        name: "artist:alvsdraws",
        image1: "",
        image2: "./assets/alvsdraws.png"
    },
    {
        id: 216,
        name: "artist:maki_ikazuya",
        image1: "",
        image2: "./assets/maki_ikazuya.png"
    },
    {
        id: 217,
        name: "artist:alios_arvin",
        image1: "",
        image2: "./assets/alios_arvin.png"
    },
    {
        id: 218,
        name: "artist:minamoto_(mutton)",
        image1: "",
        image2: "./assets/minamoto_(mutton).png"
    },
    {
        id: 219,
        name: "artist:neige_(pixiv6850453)",
        image1: "",
        image2: "./assets/neige_(pixiv6850453).png"
    },
    {
        id: 220,
        name: "artist:mugi_(mugit49)",
        image1: "",
        image2: "./assets/mugi_(mugit49).png"
    },
    {
        id: 221,
        name: "artist:roborobocap",
        image1: "",
        image2: "./assets/roborobocap.png"
    },
    {
        id: 222,
        name: "artist:harihisa",
        image1: "",
        image2: "./assets/harihisa.png"
    },
    {
        id: 223,
        name: "artist:kagematsuri",
        image1: "",
        image2: "./assets/kagematsuri.png"
    },
    {
        id: 224,
        name: "artist:tsuranukko",
        image1: "",
        image2: "./assets/tsuranukko.png"
    },
    {
        id: 225,
        name: "artist:nyantcha",
        image1: "",
        image2: "./assets/nyantcha.png"
    },
    {
        id: 226,
        name: "artist:puddinghomhom",
        image1: "",
        image2: "./assets/puddinghomhom.png"
    },
    {
        id: 227,
        name: "artist:derauea",
        image1: "",
        image2: "./assets/derauea.png"
    },
    {
        id: 228,
        name: "artist:ishikei",
        image1: "",
        image2: "./assets/ishikei.png"
    },
    {
        id: 229,
        name: "artist:ano_(gccx8784)",
        image1: "",
        image2: "./assets/ano_(gccx8784).png"
    },
    {
        id: 230,
        name: "artist:yukimaru_ai",
        image1: "",
        image2: "./assets/yukimaru_ai.png"
    },
    {
        id: 231,
        name: "artist:kawa_kit",
        image1: "",
        image2: "./assets/kawa_kit.png"
    },
    {
        id: 232,
        name: "artist:joacy",
        image1: "",
        image2: "./assets/joacy.png"
    },
    {
        id: 233,
        name: "artist:ardenlolo",
        image1: "",
        image2: "./assets/ardenlolo.png"
    },
    {
        id: 234,
        name: "artist:hayakawa_akari",
        image1: "",
        image2: "./assets/hayakawa_akari.png"
    },
    {
        id: 235,
        name: "artist:omoti_(1201208)",
        image1: "",
        image2: "./assets/omoti_(1201208).png"
    },
    {
        id: 236,
        name: "artist:qizhu",
        image1: "",
        image2: "./assets/qizhu.png"
    },
    {
        id: 237,
        name: "artist:goldenmiocola",
        image1: "",
        image2: "./assets/goldenmiocola.png"
    },
    {
        id: 238,
        name: "artist:turewindwalker",
        image1: "",
        image2: "./assets/turewindwalker.png"
    },
    {
        id: 239,
        name: "artist:han_keshi_chao_mang_de",
        image1: "",
        image2: "./assets/han_keshi_chao_mang_de.png"
    },
    {
        id: 240,
        name: "artist:bigroll",
        image1: "",
        image2: "./assets/bigroll.png"
    },
    {
        id: 241,
        name: "artist:kan_liu_(666k)",
        image1: "",
        image2: "./assets/kan_liu_(666k).png"
    },
    {
        id: 242,
        name: "artist:ebifurya",
        image1: "",
        image2: "./assets/ebifurya.png"
    },
    {
        id: 243,
        name: "artist:hara_(harayutaka)",
        image1: "",
        image2: "./assets/hara_(harayutaka).png"
    },
    {
        id: 244,
        name: "artist:ixy",
        image1: "",
        image2: "./assets/ixy.png"
    },
    {
        id: 245,
        name: "artist:a1_(initial-g)",
        image1: "",
        image2: "./assets/a1_(initial-g).png"
    },
    {
        id: 246,
        name: "artist:hews",
        image1: "",
        image2: "./assets/hews.png"
    },
    {
        id: 247,
        name: "artist:hungry_clicker",
        image1: "",
        image2: "./assets/hungry_clicker.png"
    },
    {
        id: 248,
        name: "artist:yohane",
        image1: "",
        image2: "./assets/yohane.png"
    },
    {
        id: 249,
        name: "artist:m-da_s-tarou",
        image1: "",
        image2: "./assets/m-da_s-tarou.png"
    },
    {
        id: 250,
        name: "artist:carnelian",
        image1: "",
        image2: "./assets/carnelian.png"
    },
    {
        id: 251,
        name: "artist:avogado6",
        image1: "",
        image2: "./assets/avogado6.png"
    },
    {
        id: 252,
        name: "artist:sincos",
        image1: "",
        image2: "./assets/sincos.png"
    },
    {
        id: 253,
        name: "artist:izumi_tsubasu",
        image1: "",
        image2: "./assets/izumi_tsubasu.png"
    },
    {
        id: 254,
        name: "artist:ginhaha",
        image1: "",
        image2: "./assets/ginhaha.png"
    },
    {
        id: 255,
        name: "artist:toosaka_asagi",
        image1: "",
        image2: "./assets/toosaka_asagi.png"
    },
    {
        id: 256,
        name: "artist:lolita_channel",
        image1: "",
        image2: "./assets/lolita_channel.png"
    },
    {
        id: 257,
        name: "artist:mochi_au_lait",
        image1: "",
        image2: "./assets/mochi_au_lait.png"
    },
    {
        id: 258,
        name: "artist:enkyo_yuuichirou",
        image1: "",
        image2: "./assets/enkyo_yuuichirou.png"
    },
    {
        id: 259,
        name: "artist:tomose_shunsaku",
        image1: "",
        image2: "./assets/tomose_shunsaku.png"
    },
    {
        id: 260,
        name: "artist:yd_(orange_maru)",
        image1: "",
        image2: "./assets/yd_(orange_maru).png"
    },
    {
        id: 261,
        name: "artist:ayu_(mog)",
        image1: "",
        image2: "./assets/ayu_(mog).png"
    },
    {
        id: 262,
        name: "artist:mery_(yangmalgage)",
        image1: "",
        image2: "./assets/mery_(yangmalgage).png"
    },
    {
        id: 263,
        name: "artist:ilya_kuvshinov",
        image1: "",
        image2: "./assets/ilya_kuvshinov.png"
    },
    {
        id: 264,
        name: "artist:shimada_fumikane",
        image1: "",
        image2: "./assets/shimada_fumikane.png"
    },
    {
        id: 265,
        name: "artist:tsuruse",
        image1: "",
        image2: "./assets/tsuruse.png"
    },
    {
        id: 266,
        name: "artist:nanmokaken",
        image1: "",
        image2: "./assets/nanmokaken.png"
    },
    {
        id: 267,
        name: "artist:momozu_komamochi",
        image1: "",
        image2: "./assets/momozu_komamochi.png"
    },
    {
        id: 268,
        name: "artist:onineko",
        image1: "",
        image2: "./assets/onineko.png"
    },
    {
        id: 269,
        name: "artist:soho_(user dphk5745)",
        image1: "",
        image2: "./assets/soho_(user dphk5745).png"
    },
    {
        id: 270,
        name: "artist:kedama_milk",
        image1: "",
        image2: "./assets/kedama_milk.png"
    },
    {
        id: 271,
        name: "artist:chen_bin",
        image1: "",
        image2: "./assets/chen_bin.png"
    },
    {
        id: 272,
        name: "artist:kusami_toka_naku_au",
        image1: "",
        image2: "./assets/kusami_toka_naku_au.png"
    },
    {
        id: 273,
        name: "artist:tatami_to_hinoki",
        image1: "",
        image2: "./assets/tatami_to_hinoki.png"
    },
    {
        id: 274,
        name: "artist:kuroida",
        image1: "",
        image2: "./assets/kuroida.png"
    },
    {
        id: 275,
        name: "artist:yaungpeng",
        image1: "",
        image2: "./assets/yaungpeng.png"
    },
    {
        id: 276,
        name: "artist:baibaibaizai",
        image1: "",
        image2: "./assets/baibaibaizai.png"
    },
    {
        id: 277,
        name: "artist:wang-xi",
        image1: "",
        image2: "./assets/wang-xi.png"
    },
    {
        id: 278,
        name: "artist:pmg",
        image1: "",
        image2: "./assets/pmg.png"
    },
    {
        id: 279,
        name: "artist:red_medicine",
        image1: "",
        image2: "./assets/red_medicine.png"
    },
    {
        id: 280,
        name: "artist:sukaliya",
        image1: "",
        image2: "./assets/sukaliya.png"
    },
    {
        id: 281,
        name: "artist:xi_xeong",
        image1: "",
        image2: "./assets/xi_xeong.png"
    },
    {
        id: 282,
        name: "artist:diurtion",
        image1: "",
        image2: "./assets/diurtion.png"
    },
    {
        id: 283,
        name: "artist:daram_(shappydude)",
        image1: "",
        image2: "./assets/daram_(shappydude).png"
    },
    {
        id: 284,
        name: "artist:billyhhyb",
        image1: "",
        image2: "./assets/billyhhyb.png"
    },
    {
        id: 285,
        name: "artist:amam_(64943468)",
        image1: "",
        image2: "./assets/amam_(64943468).png"
    },
    {
        id: 286,
        name: "artist:popqn",
        image1: "",
        image2: "./assets/popqn.png"
    },
    {
        id: 287,
        name: "artist:hirasawa_seiji",
        image1: "",
        image2: "./assets/hirasawa_seiji.png"
    },
    {
        id: 288,
        name: "artist:bee(deadflow)",
        image1: "",
        image2: "./assets/bee(deadflow).png"
    },
    {
        id: 289,
        name: "artist:musouzuki",
        image1: "",
        image2: "./assets/musouzuki.png"
    },
    {
        id: 290,
        name: "artist:pottsness",
        image1: "",
        image2: "./assets/pottsness.png"
    },
    {
        id: 291,
        name: "artist:eien no 24-sai no shakai hito",
        image1: "",
        image2: "./assets/eien no 24-sai no shakai hito.png"
    },
    {
        id: 292,
        name: "artist:kupa (jesterwii)",
        image1: "",
        image2: "./assets/kupa (jesterwii).png"
    },
    {
        id: 293,
        name: "artist:vicineko",
        image1: "",
        image2: "./assets/vicineko.png"
    },
    {
        id: 294,
        name: "artist:waka (wk4444)",
        image1: "",
        image2: "./assets/waka (wk4444).png"
    },
    {
        id: 295,
        name: "artist:sy4",
        image1: "",
        image2: "./assets/sy4.png"
    },
    {
        id: 296,
        name: "artist:lam (ramdayo)",
        image1: "",
        image2: "./assets/lam (ramdayo).png"
    },
    {
        id: 297,
        name: "artist:yuyu (yuyuworks)",
        image1: "",
        image2: "./assets/yuyu (yuyuworks).png"
    },
    {
        id: 298,
        name: "artist:noyu (noyu23386566)",
        image1: "",
        image2: "./assets/noyu (noyu23386566).png"
    },
    {
        id: 299,
        name: "artist:sho (sho lwlw)",
        image1: "",
        image2: "./assets/sho (sho lwlw).png"
    },
    {
        id: 300,
        name: "artist:ogata tei",
        image1: "",
        image2: "./assets/ogata tei.png"
    },
    {
        id: 301,
        name: "artist:gootai",
        image1: "",
        image2: "./assets/gootai.png"
    },
    {
        id: 302,
        name: "artist:kb beary",
        image1: "",
        image2: "./assets/kb beary.png"
    },
    {
        id: 303,
        name: "artist:rurudo",
        image1: "",
        image2: "./assets/rurudo.png"
    },
    {
        id: 304,
        name: "artist:sleepless (wrysmile)",
        image1: "",
        image2: "./assets/sleepless (wrysmile).png"
    },
    {
        id: 305,
        name: "artist:pumpkinspicelatte",
        image1: "",
        image2: "./assets/pumpkinspicelatte.png"
    },
    {
        id: 306,
        name: "artist:kasa (hitori sanka)",
        image1: "",
        image2: "./assets/kasa (hitori sanka).png"
    },
    {
        id: 307,
        name: "artist:malphier",
        image1: "",
        image2: "./assets/malphier.png"
    },
    {
        id: 308,
        name: "artist:sreliata",
        image1: "",
        image2: "./assets/sreliata.png"
    },
    {
        id: 309,
        name: "artist:hydrafxx",
        image1: "",
        image2: "./assets/hydrafxx.png"
    },
    {
        id: 310,
        name: "artist:ria (baka-neearts)",
        image1: "",
        image2: "./assets/ria (baka-neearts).png"
    },
    {
        id: 311,
        name: "artist:ciloranko",
        image1: "",
        image2: "./assets/ciloranko.png"
    },
    {
        id: 312,
        name: "artist:kiira",
        image1: "",
        image2: "./assets/kiira.png"
    },
    {
        id: 313,
        name: "artist:ke-ta",
        image1: "",
        image2: "./assets/ke-ta.png"
    },
    {
        id: 314,
        name: "artist:tokkyu",
        image1: "",
        image2: "./assets/tokkyu.png"
    },
    {
        id: 315,
        name: "artist:choco (chocolate shop)",
        image1: "",
        image2: "./assets/choco (chocolate shop).png"
    },
    {
        id: 316,
        name: "artist:Rella",
        image1: "",
        image2: "./assets/Rella.png"
    },
    {
        id: 317,
        name: "artist:Yoneyama Mai",
        image1: "",
        image2: "./assets/Yoneyama Mai.png"
    },
    {
        id: 318,
        name: "artist:40hara",
        image1: "",
        image2: "./assets/40hara.png"
    },
    {
        id: 319,
        name: "artist:neco",
        image1: "",
        image2: "./assets/neco.png"
    },
    {
        id: 320,
        name: "artist:momokan (kandume200)",
        image1: "",
        image2: "./assets/momokan (kandume200).png"
    },
    {
        id: 321,
        name: "artist:wanke",
        image1: "",
        image2: "./assets/wanke.png"
    },
    {
        id: 322,
        name: "artist:free style (yohan1754)",
        image1: "",
        image2: "./assets/free style (yohan1754).png"
    },
    {
        id: 323,
        name: "artist:azuuru",
        image1: "",
        image2: "./assets/azuuru.png"
    },
    {
        id: 324,
        name: "artist:fuzichoco",
        image1: "",
        image2: "./assets/fuzichoco.png"
    },
    {
        id: 325,
        name: "artist:atdan",
        image1: "",
        image2: "./assets/atdan.png"
    },
    {
        id: 326,
        name: "artist:hito",
        image1: "",
        image2: "./assets/hito.png"
    },
    {
        id: 327,
        name: "artist:hiten",
        image1: "",
        image2: "./assets/hiten.png"
    },
    {
        id: 328,
        name: "artist:mignon",
        image1: "",
        image2: "./assets/mignon.png"
    },
    {
        id: 329,
        name: "artist:shu bing",
        image1: "",
        image2: "./assets/shu bing.png"
    },
    {
        id: 330,
        name: "artist:pentagon (railgun ky1206)",
        image1: "",
        image2: "./assets/pentagon (railgun ky1206).png"
    },
    {
        id: 331,
        name: "artist:qosic",
        image1: "",
        image2: "./assets/qosic.png"
    },
    {
        id: 332,
        name: "artist:kanda done",
        image1: "",
        image2: "./assets/kanda done.png"
    },
    {
        id: 333,
        name: "artist:kouyafu",
        image1: "",
        image2: "./assets/kouyafu.png"
    },
    {
        id: 334,
        name: "artist:umou (umouawa)",
        image1: "",
        image2: "./assets/umou (umouawa).png"
    },
    {
        id: 335,
        name: "artist:drowzzi",
        image1: "",
        image2: "./assets/drowzzi.png"
    },
    {
        id: 336,
        name: "artist:banishment",
        image1: "",
        image2: "./assets/banishment.png"
    },
    {
        id: 337,
        name: "artist:fov ps",
        image1: "",
        image2: "./assets/fov ps.png"
    },
    {
        id: 338,
        name: "artist:chitu hefeng zhong",
        image1: "",
        image2: "./assets/chitu hefeng zhong.png"
    },
    {
        id: 339,
        name: "artist:abubu",
        image1: "",
        image2: "./assets/abubu.png"
    },
    {
        id: 340,
        name: "artist:chamchami",
        image1: "",
        image2: "./assets/chamchami.png"
    },
    {
        id: 341,
        name: "artist:zuikillme",
        image1: "",
        image2: "./assets/zuikillme.png"
    },
    {
        id: 342,
        name: "artist:shhilee",
        image1: "",
        image2: "./assets/shhilee.png"
    },
    {
        id: 343,
        name: "artist:buri (retty9349)",
        image1: "",
        image2: "./assets/buri (retty9349).png"
    },
    {
        id: 344,
        name: "artist:mokumokuren (atariya kyoushitsu)",
        image1: "",
        image2: "./assets/mokumokuren (atariya kyoushitsu).png"
    },
    {
        id: 345,
        name: "artist:lrrer",
        image1: "",
        image2: "./assets/lrrer.png"
    },
    {
        id: 346,
        name: "artist:kyanonpan50",
        image1: "",
        image2: "./assets/kyanonpan50.png"
    },
    {
        id: 347,
        name: "artist:lillly",
        image1: "",
        image2: "./assets/lillly.png"
    },
    {
        id: 348,
        name: "artist:chixiao",
        image1: "",
        image2: "./assets/chixiao.png"
    },
    {
        id: 349,
        name: "artist:vizaz",
        image1: "",
        image2: "./assets/vizaz.png"
    },
    {
        id: 350,
        name: "artist:junpaku karen",
        image1: "",
        image2: "./assets/junpaku karen.png"
    },
    {
        id: 351,
        name: "artist:ssr (azmr2828)",
        image1: "",
        image2: "./assets/ssr (azmr2828).png"
    },
    {
        id: 352,
        name: "artist:monori rogue",
        image1: "",
        image2: "./assets/monori rogue.png"
    },
    {
        id: 353,
        name: "artist:maria (maria rose)",
        image1: "",
        image2: "./assets/maria (maria rose).png"
    },
    {
        id: 354,
        name: "artist:orphen (pink seito)",
        image1: "",
        image2: "./assets/orphen (pink seito).png"
    },
    {
        id: 355,
        name: "artist:akisuko",
        image1: "",
        image2: "./assets/akisuko.png"
    },
    {
        id: 356,
        name: "artist:raru (nanaharararu)",
        image1: "",
        image2: "./assets/raru (nanaharararu).png"
    },
    {
        id: 357,
        name: "artist:darkmaya",
        image1: "",
        image2: "./assets/darkmaya.png"
    },
    {
        id: 358,
        name: "artist:zucchini",
        image1: "",
        image2: "./assets/zucchini.png"
    },
    {
        id: 359,
        name: "artist:machi",
        image1: "",
        image2: "./assets/machi.png"
    },
    {
        id: 360,
        name: "artist:shiun",
        image1: "",
        image2: "./assets/shiun.png"
    },
    {
        id: 361,
        name: "artist:chen wang",
        image1: "",
        image2: "./assets/chen wang.png"
    },
    {
        id: 362,
        name: "artist:sei (0724sei6)",
        image1: "",
        image2: "./assets/sei (0724sei6).png"
    },
    {
        id: 363,
        name: "artist:hood (james x)",
        image1: "",
        image2: "./assets/hood (james x).png"
    },
    {
        id: 364,
        name: "artist:ruberule",
        image1: "",
        image2: "./assets/ruberule.png"
    },
    {
        id: 365,
        name: "artist:studiopokotan",
        image1: "",
        image2: "./assets/studiopokotan.png"
    },
    {
        id: 366,
        name: "artist:dearonnus",
        image1: "",
        image2: "./assets/dearonnus.png"
    },
    {
        id: 367,
        name: "artist:yabacha",
        image1: "",
        image2: "./assets/yabacha.png"
    },
    {
        id: 368,
        name: "artist:hintobento",
        image1: "",
        image2: "./assets/hintobento.png"
    },
    {
        id: 369,
        name: "artist:kitsune-neko",
        image1: "",
        image2: "./assets/kitsune-neko.png"
    },
    {
        id: 370,
        name: "artist:benz (rita29)",
        image1: "",
        image2: "./assets/benz (rita29).png"
    },
    {
        id: 371,
        name: "artist:joosi",
        image1: "",
        image2: "./assets/joosi.png"
    },
    {
        id: 372,
        name: "artist:ei (eiei e1)",
        image1: "",
        image2: "./assets/ei (eiei e1).png"
    },
    {
        id: 373,
        name: "artist:hyuk (yeayeo)",
        image1: "",
        image2: "./assets/hyuk (yeayeo).png"
    },
    {
        id: 374,
        name: "artist:rucarachi",
        image1: "",
        image2: "./assets/rucarachi.png"
    },
    {
        id: 375,
        name: "artist:whoisshe",
        image1: "",
        image2: "./assets/whoisshe.png"
    },
    {
        id: 376,
        name: "artist:calder",
        image1: "",
        image2: "./assets/calder.png"
    },
    {
        id: 377,
        name: "artist:queasy s",
        image1: "",
        image2: "./assets/queasy s.png"
    },
    {
        id: 378,
        name: "artist:fantongjun",
        image1: "",
        image2: "./assets/fantongjun.png"
    },
    {
        id: 379,
        name: "artist:redi (rasec asdjh)",
        image1: "",
        image2: "./assets/redi (rasec asdjh).png"
    },
    {
        id: 380,
        name: "artist:ushikani kassen",
        image1: "",
        image2: "./assets/ushikani kassen.png"
    },
    {
        id: 381,
        name: "artist:aoi sakura (seak5545)",
        image1: "",
        image2: "./assets/aoi sakura (seak5545).png"
    },
    {
        id: 382,
        name: "artist:raskasar",
        image1: "",
        image2: "./assets/raskasar.png"
    },
    {
        id: 383,
        name: "artist:ru zhai",
        image1: "",
        image2: "./assets/ru zhai.png"
    },
    {
        id: 384,
        name: "artist:ririko (fhnngririko)",
        image1: "",
        image2: "./assets/ririko (fhnngririko).png"
    },
    {
        id: 385,
        name: "artist:aoi nagisa (metalder)",
        image1: "",
        image2: "./assets/aoi nagisa (metalder).png"
    },
    {
        id: 386,
        name: "artist:fei (maidoll)",
        image1: "",
        image2: "./assets/fei (maidoll).png"
    },
    {
        id: 387,
        name: "artist:oda non",
        image1: "",
        image2: "./assets/oda non.png"
    },
    {
        id: 388,
        name: "artist:dk.senie",
        image1: "",
        image2: "./assets/dk.senie.png"
    },
    {
        id: 389,
        name: "artist:shano hiyori",
        image1: "",
        image2: "./assets/shano hiyori.png"
    },
    {
        id: 390,
        name: "artist:silence girl",
        image1: "",
        image2: "./assets/silence girl.png"
    },
    {
        id: 391,
        name: "artist:liduke",
        image1: "",
        image2: "./assets/liduke.png"
    },
    {
        id: 392,
        name: "artist:houkisei",
        image1: "",
        image2: "./assets/houkisei.png"
    },
    {
        id: 393,
        name: "artist:ohkurrva",
        image1: "",
        image2: "./assets/ohkurrva.png"
    },
    {
        id: 394,
        name: "artist:machi (machi0910)",
        image1: "",
        image2: "./assets/machi (machi0910).png"
    },
    {
        id: 395,
        name: "artist:kcccc",
        image1: "",
        image2: "./assets/kcccc.png"
    },
    {
        id: 396,
        name: "artist:ndgd",
        image1: "",
        image2: "./assets/ndgd.png"
    },
    {
        id: 397,
        name: "artist:bm94199",
        image1: "",
        image2: "./assets/bm94199.png"
    },
    {
        id: 398,
        name: "artist:ruanjia",
        image1: "",
        image2: "./assets/ruanjia.png"
    },
    {
        id: 399,
        name: "artist:wo jiushi kanbudong",
        image1: "",
        image2: "./assets/wo jiushi kanbudong.png"
    },
    {
        id: 400,
        name: "artist:seven (sixplusone)",
        image1: "",
        image2: "./assets/seven (sixplusone).png"
    },
    {
        id: 401,
        name: "artist:shal.e",
        image1: "",
        image2: "./assets/shal.e.png"
    },
    {
        id: 402,
        name: "artist:rei (sanbonzakura)",
        image1: "",
        image2: "./assets/rei (sanbonzakura).png"
    },
    {
        id: 403,
        name: "artist:sushispin",
        image1: "",
        image2: "./assets/sushispin.png"
    },
    {
        id: 404,
        name: "artist:phantom ix row",
        image1: "",
        image2: "./assets/phantom ix row.png"
    },
    {
        id: 405,
        name: "artist:fkey",
        image1: "",
        image2: "./assets/fkey.png"
    },
    {
        id: 406,
        name: "artist:xoxzxox",
        image1: "",
        image2: "./assets/xoxzxox.png"
    },
    {
        id: 407,
        name: "artist:lin qing (phosphorus_1104)",
        image1: "",
        image2: "./assets/lin qing (phosphorus_1104).png"
    },
    {
        id: 408,
        name: "artist:konya karasue",
        image1: "",
        image2: "./assets/konya karasue.png"
    },
    {
        id: 409,
        name: "artist:urabe michiru",
        image1: "",
        image2: "./assets/urabe michiru.png"
    },
    {
        id: 410,
        name: "artist:niukou kouzi",
        image1: "",
        image2: "./assets/niukou kouzi.png"
    },
    {
        id: 411,
        name: "artist:shycocoa",
        image1: "",
        image2: "./assets/shycocoa.png"
    },
    {
        id: 412,
        name: "artist:mafuyu (chibi21)",
        image1: "",
        image2: "./assets/mafuyu (chibi21).png"
    },
    {
        id: 413,
        name: "artist:hiro (dismaless)",
        image1: "",
        image2: "./assets/hiro (dismaless).png"
    },
    {
        id: 414,
        name: "artist:mikami mika",
        image1: "",
        image2: "./assets/mikami mika.png"
    },
    {
        id: 415,
        name: "artist:surreal",
        image1: "",
        image2: "./assets/surreal.png"
    },
    {
        id: 416,
        name: "artist:tokyogenso",
        image1: "",
        image2: "./assets/tokyogenso.png"
    },
    {
        id: 417,
        name: "artist:mocha (cotton)",
        image1: "",
        image2: "./assets/mocha (cotton).png"
    },
    {
        id: 418,
        name: "artist:hiten (hitenkei)",
        image1: "",
        image2: "./assets/hiten (hitenkei).png"
    },
    {
        id: 419,
        name: "artist:qys3",
        image1: "",
        image2: "./assets/qys3.png"
    },
    {
        id: 420,
        name: "artist:tyouya",
        image1: "",
        image2: "./assets/tyouya.png"
    },
    {
        id: 421,
        name: "artist:zhibuji loom",
        image1: "",
        image2: "./assets/zhibuji loom.png"
    },
    {
        id: 422,
        name: "artist:miv4t",
        image1: "",
        image2: "./assets/miv4t.png"
    },
    {
        id: 423,
        name: "artist:fajyobore",
        image1: "",
        image2: "./assets/fajyobore.png"
    },
    {
        id: 424,
        name: "artist:skyrick9413",
        image1: "",
        image2: "./assets/skyrick9413.png"
    },
    {
        id: 425,
        name: "artist:yumenouchi chiharu",
        image1: "",
        image2: "./assets/yumenouchi chiharu.png"
    },
    {
        id: 426,
        name: "artist:mochizuki kei",
        image1: "",
        image2: "./assets/mochizuki kei.png"
    },
    {
        id: 427,
        name: "artist:quan (kurisu tina)",
        image1: "",
        image2: "./assets/quan (kurisu tina).png"
    },
    {
        id: 428,
        name: "artist:maximalism",
        image1: "",
        image2: "./assets/maximalism.png"
    },
    {
        id: 429,
        name: "artist:hong (white spider)",
        image1: "",
        image2: "./assets/hong (white spider).png"
    },
    {
        id: 430,
        name: "artist:tab head",
        image1: "",
        image2: "./assets/tab head.png"
    },
    {
        id: 431,
        name: "artist:quasarcake",
        image1: "",
        image2: "./assets/quasarcake.png"
    },
    {
        id: 432,
        name: "artist:kim eb",
        image1: "",
        image2: "./assets/kim eb.png"
    },
    {
        id: 433,
        name: "artist:douya(233)",
        image1: "",
        image2: "./assets/douya(233).png"
    },
    {
        id: 434,
        name: "artist:iizuki tasuku",
        image1: "",
        image2: "./assets/iizuki tasuku.png"
    },
    {
        id: 435,
        name: "artist:watao",
        image1: "",
        image2: "./assets/watao.png"
    },
    {
        id: 436,
        name: "artist:z3zz4",
        image1: "",
        image2: "./assets/z3zz4.png"
    },
    {
        id: 437,
        name: "artist:nana mikoto",
        image1: "",
        image2: "./assets/nana mikoto.png"
    },
    {
        id: 438,
        name: "artist:yao liao wang",
        image1: "",
        image2: "./assets/yao liao wang.png"
    },
    {
        id: 439,
        name: "artist:meinoss",
        image1: "",
        image2: "./assets/meinoss.png"
    },
    {
        id: 440,
        name: "artist:some1else45",
        image1: "",
        image2: "./assets/some1else45.png"
    },
    {
        id: 441,
        name: "artist:akipeko",
        image1: "",
        image2: "./assets/akipeko.png"
    },
    {
        id: 442,
        name: "artist:chuck (harfmoondark)",
        image1: "",
        image2: "./assets/chuck (harfmoondark).png"
    },
    {
        id: 443,
        name: "artist:takeda hiromitsu",
        image1: "",
        image2: "./assets/takeda hiromitsu.png"
    },
    {
        id: 444,
        name: "artist:aiue oka",
        image1: "",
        image2: "./assets/aiue oka.png"
    },
    {
        id: 445,
        name: "artist:starshadowmagic",
        image1: "",
        image2: "./assets/starshadowmagic.png"
    },
    {
        id: 446,
        name: "artist:hisona",
        image1: "",
        image2: "./assets/hisona.png"
    },
    {
        id: 447,
        name: "artist:suaritesumi",
        image1: "",
        image2: "./assets/suaritesumi.png"
    },
    {
        id: 448,
        name: "artist:syhan",
        image1: "",
        image2: "./assets/syhan.png"
    },
    {
        id: 449,
        name: "artist:ribiadan",
        image1: "",
        image2: "./assets/ribiadan.png"
    },
    {
        id: 450,
        name: "artist:kitaku",
        image1: "",
        image2: "./assets/kitaku.png"
    },
    {
        id: 451,
        name: "artist:nakamachi machi",
        image1: "",
        image2: "./assets/nakamachi machi.png"
    },
    {
        id: 452,
        name: "artist:morino hon",
        image1: "",
        image2: "./assets/morino hon.png"
    },
    {
        id: 453,
        name: "artist:10mo",
        image1: "",
        image2: "./assets/10mo.png"
    },
    {
        id: 454,
        name: "artist:coyucom",
        image1: "",
        image2: "./assets/coyucom.png"
    },
    {
        id: 455,
        name: "artist:ame usari",
        image1: "",
        image2: "./assets/ame usari.png"
    },
    {
        id: 456,
        name: "artist:mika pikazo",
        image1: "",
        image2: "./assets/mika pikazo.png"
    },
    {
        id: 457,
        name: "artist:ningen mame",
        image1: "",
        image2: "./assets/ningen mame.png"
    },
    {
        id: 458,
        name: "artist:tianliang duohe fangdongye",
        image1: "",
        image2: "./assets/tianliang duohe fangdongye.png"
    },
    {
        id: 459,
        name: "artist:jyt",
        image1: "",
        image2: "./assets/jyt.png"
    },
    {
        id: 460,
        name: "artist:anmi",
        image1: "",
        image2: "./assets/anmi.png"
    },
    {
        id: 461,
        name: "artist:alchemaniac",
        image1: "",
        image2: "./assets/alchemaniac.png"
    },
    {
        id: 462,
        name: "artist:shuri (84k)",
        image1: "",
        image2: "./assets/shuri (84k).png"
    },
    {
        id: 463,
        name: "artist:jihua tong",
        image1: "",
        image2: "./assets/jihua tong.png"
    },
    {
        id: 464,
        name: "artist:kirisamede gzr",
        image1: "",
        image2: "./assets/kirisamede gzr.png"
    },
    {
        id: 465,
        name: "artist:kono (xerondan321)",
        image1: "",
        image2: "./assets/kono (xerondan321).png"
    },
    {
        id: 466,
        name: "artist:shiratsuyu mone",
        image1: "",
        image2: "./assets/shiratsuyu mone.png"
    },
    {
        id: 467,
        name: "artist:lwj",
        image1: "",
        image2: "./assets/lwj.png"
    },
    {
        id: 468,
        name: "artist:himeliofon",
        image1: "",
        image2: "./assets/himeliofon.png"
    },
    {
        id: 469,
        name: "artist:eric (tianqijiang)",
        image1: "",
        image2: "./assets/eric (tianqijiang).png"
    },
    {
        id: 470,
        name: "artist:nea (nea 77)",
        image1: "",
        image2: "./assets/nea (nea 77).png"
    },
    {
        id: 471,
        name: "artist:sankyo (821-scoville)",
        image1: "",
        image2: "./assets/sankyo (821-scoville).png"
    },
    {
        id: 472,
        name: "artist:tachikawa mushimaro",
        image1: "",
        image2: "./assets/tachikawa mushimaro.png"
    },
    {
        id: 473,
        name: "artist:yoshida iyo",
        image1: "",
        image2: "./assets/yoshida iyo.png"
    },
    {
        id: 474,
        name: "artist:nixue",
        image1: "",
        image2: "./assets/nixue.png"
    },
    {
        id: 475,
        name: "artist:reinama",
        image1: "",
        image2: "./assets/reinama.png"
    },
    {
        id: 476,
        name: "artist:criin",
        image1: "",
        image2: "./assets/criin.png"
    },
    {
        id: 477,
        name: "artist:tenobe",
        image1: "",
        image2: "./assets/tenobe.png"
    },
    {
        id: 478,
        name: "artist:oro (sumakaita)",
        image1: "",
        image2: "./assets/oro (sumakaita).png"
    },
    {
        id: 479,
        name: "artist:tyone",
        image1: "",
        image2: "./assets/tyone.png"
    },
    {
        id: 480,
        name: "artist:sgk",
        image1: "",
        image2: "./assets/sgk.png"
    },
    {
        id: 481,
        name: "artist:hoshi (snacherubi)",
        image1: "",
        image2: "./assets/hoshi (snacherubi).png"
    },
    {
        id: 482,
        name: "artist:nyamota",
        image1: "",
        image2: "./assets/nyamota.png"
    },
    {
        id: 483,
        name: "artist:gale kawaii",
        image1: "",
        image2: "./assets/gale kawaii.png"
    },
    {
        id: 484,
        name: "artist:tidsean",
        image1: "",
        image2: "./assets/tidsean.png"
    },
    {
        id: 485,
        name: "artist:miyako (naotsugu)",
        image1: "",
        image2: "./assets/miyako (naotsugu).png"
    },
    {
        id: 486,
        name: "artist:nishizuki shino",
        image1: "",
        image2: "./assets/nishizuki shino.png"
    },
    {
        id: 487,
        name: "artist:ekita kuro",
        image1: "",
        image2: "./assets/ekita kuro.png"
    },
    {
        id: 488,
        name: "artist:kurowa",
        image1: "",
        image2: "./assets/kurowa.png"
    },
    {
        id: 489,
        name: "artist:mac star",
        image1: "",
        image2: "./assets/mac star.png"
    },
    {
        id: 490,
        name: "artist:menyoujan",
        image1: "",
        image2: "./assets/menyoujan.png"
    },
    {
        id: 491,
        name: "artist:tanihara natsuki",
        image1: "",
        image2: "./assets/tanihara natsuki.png"
    },
    {
        id: 492,
        name: "artist:myusha",
        image1: "",
        image2: "./assets/myusha.png"
    },
    {
        id: 493,
        name: "artist:hsin",
        image1: "",
        image2: "./assets/hsin.png"
    },
    {
        id: 494,
        name: "artist:nohito",
        image1: "",
        image2: "./assets/nohito.png"
    },
    {
        id: 495,
        name: "artist:hominamia",
        image1: "",
        image2: "./assets/hominamia.png"
    },
    {
        id: 496,
        name: "artist:niy (nenenoa)",
        image1: "",
        image2: "./assets/niy (nenenoa).png"
    },
    {
        id: 497,
        name: "artist:hana mori",
        image1: "",
        image2: "./assets/hana mori.png"
    },
    {
        id: 498,
        name: "artist:enami katsumi",
        image1: "",
        image2: "./assets/enami katsumi.png"
    },
    {
        id: 499,
        name: "artist:nanao (mahaya)",
        image1: "",
        image2: "./assets/nanao (mahaya).png"
    },
    {
        id: 500,
        name: "artist:rei kun",
        image1: "",
        image2: "./assets/rei kun.png"
    },
    {
        id: 501,
        name: "artist:jasony",
        image1: "",
        image2: "./assets/jasony.png"
    },
    {
        id: 502,
        name: "artist:mizuta kenji",
        image1: "",
        image2: "./assets/mizuta kenji.png"
    },
    {
        id: 503,
        name: "artist:maccha (mochancc)",
        image1: "",
        image2: "./assets/maccha (mochancc).png"
    },
    {
        id: 504,
        name: "artist:hatori mia",
        image1: "",
        image2: "./assets/hatori mia.png"
    },
    {
        id: 505,
        name: "artist:huke",
        image1: "",
        image2: "./assets/huke.png"
    },
    {
        id: 506,
        name: "artist:marushin (denwa0214)",
        image1: "",
        image2: "./assets/marushin (denwa0214).png"
    },
    {
        id: 507,
        name: "artist:thomasz",
        image1: "",
        image2: "./assets/thomasz.png"
    },
    {
        id: 508,
        name: "artist:momisan",
        image1: "",
        image2: "./assets/momisan.png"
    },
    {
        id: 509,
        name: "artist:komori kei",
        image1: "",
        image2: "./assets/komori kei.png"
    },
    {
        id: 510,
        name: "artist:jagaimo (kkamja)",
        image1: "",
        image2: "./assets/jagaimo (kkamja).png"
    },
    {
        id: 511,
        name: "artist:a.x.",
        image1: "",
        image2: "./assets/a.x..png"
    },
    {
        id: 512,
        name: "artist:shunichi",
        image1: "",
        image2: "./assets/shunichi.png"
    },
    {
        id: 513,
        name: "artist:sei shoujo",
        image1: "",
        image2: "./assets/sei shoujo.png"
    },
    {
        id: 514,
        name: "artist:gorgeous mushroom",
        image1: "",
        image2: "./assets/gorgeous mushroom.png"
    },
    {
        id: 515,
        name: "artist:kakage",
        image1: "",
        image2: "./assets/kakage.png"
    },
    {
        id: 516,
        name: "artist:kujou ichiso",
        image1: "",
        image2: "./assets/kujou ichiso.png"
    },
    {
        id: 517,
        name: "artist:okitakung",
        image1: "",
        image2: "./assets/okitakung.png"
    },
    {
        id: 518,
        name: "artist:abpart",
        image1: "",
        image2: "./assets/abpart.png"
    },
    {
        id: 519,
        name: "artist:puuzaki puuna",
        image1: "",
        image2: "./assets/puuzaki puuna.png"
    },
    {
        id: 520,
        name: "artist:kannko bokujou",
        image1: "",
        image2: "./assets/kannko bokujou.png"
    },
    {
        id: 521,
        name: "artist:nagioka",
        image1: "",
        image2: "./assets/nagioka.png"
    },
    {
        id: 522,
        name: "artist:kitahara tomoe (kitahara koubou)",
        image1: "",
        image2: "./assets/kitahara tomoe (kitahara koubou).png"
    },
    {
        id: 523,
        name: "artist:colorful palette",
        image1: "",
        image2: "./assets/colorful palette.png"
    },
    {
        id: 524,
        name: "artist:cofffee",
        image1: "",
        image2: "./assets/cofffee.png"
    },
    {
        id: 525,
        name: "artist:guweiz",
        image1: "",
        image2: "./assets/guweiz.png"
    },
    {
        id: 526,
        name: "artist:mondi hl",
        image1: "",
        image2: "./assets/mondi hl.png"
    },
    {
        id: 527,
        name: "artist:ao banana",
        image1: "",
        image2: "./assets/ao banana.png"
    },
    {
        id: 528,
        name: "artist:sunhyun",
        image1: "",
        image2: "./assets/sunhyun.png"
    },
    {
        id: 529,
        name: "artist:deyui",
        image1: "",
        image2: "./assets/deyui.png"
    },
    {
        id: 530,
        name: "artist:kyokucho",
        image1: "",
        image2: "./assets/kyokucho.png"
    },
    {
        id: 531,
        name: "artist:meion",
        image1: "",
        image2: "./assets/meion.png"
    },
    {
        id: 532,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 533,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 534,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 535,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 536,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 537,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 538,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 539,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 540,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 541,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 542,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 543,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 544,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 545,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 546,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 547,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 548,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 549,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    {
        id: 550,
        name: "artist:test",
        image1: "",
        image2: "./assets/test.png"
    },
    
];

// 生成更多示例数据以演示性能优化
const additionalArtists = [
    "albrecht durer", "alphonse mucha", "artemisia gentileschi", "banksy", "basquiat",
    "caravaggio", "caspar david friedrich", "cezanne", "chagall", "dali",
    "degas", "el greco", "francis bacon", "gauguin", "gustav klimt",
    "henri matisse", "hieronymus bosch", "hokusai", "jackson pollock", "jean-michel basquiat",
    "kandinsky", "keith haring", "kerry james marshall", "kaws", "leonardo da vinci",
    "manet", "mark rothko", "michelangelo", "munch", "picasso",
    "pollock", "raphael", "rembrandt", "renoir", "rodin",
    "rothko", "rousseau", "seurat", "toulouse-lautrec", "turner",
    "van gogh", "vermeer", "warhol", "whistler", "yves klein",
    "zaha hadid", "ai weiwei", "takashi murakami", "david hockney", "gerhard richter"
];

// 颜色数组用于生成占位图片
const colors = [
    "6366f1", "a855f7", "10b981", "f59e0b", "ef4444", "8b5cf6",
    "06b6d4", "84cc16", "f97316", "ec4899", "3b82f6", "14b8a6",
    "f43f5e", "dc2626", "059669", "7c3aed", "ea580c", "1d4ed8",
    "be123c", "0891b2", "16a34a", "ca8a04", "dc2626", "9333ea"
];

// 生成完整的画师数据数组
function generateFullArtistsData() {
    const fullData = [...artistsData];
    
    // 添加更多画师数据
    // additionalArtists.forEach((artist, index) => {
    //     const id = fullData.length + 1;
    //     const color1 = colors[index % colors.length];
    //     const color2 = colors[(index + 1) % colors.length];
        
    //     fullData.push({
    //         id: id,
    //         name: `by ${artist}`,
    //         image1: `https://via.placeholder.com/400x400/${color1}/ffffff?text=${encodeURIComponent(artist.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('+') + '+1')}`,
    //         image2: `https://via.placeholder.com/400x400/${color2}/ffffff?text=${encodeURIComponent(artist.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('+') + '+2')}`
    //     });
    // });
    
    // 如果需要更多数据来演示性能，可以继续添加
    // const targetCount = 150; // 目标画师数量
    // while (fullData.length < targetCount) {
    //     const baseIndex = fullData.length % additionalArtists.length;
    //     const artist = additionalArtists[baseIndex];
    //     const id = fullData.length + 1;
    //     const colorIndex = fullData.length % colors.length;
    //     const color1 = colors[colorIndex];
    //     const color2 = colors[(colorIndex + 1) % colors.length];
        
    //     fullData.push({
    //         id: id,
    //         name: `by ${artist} (style ${Math.floor(fullData.length / additionalArtists.length) + 1})`,
    //         image1: `https://via.placeholder.com/400x400/${color1}/ffffff?text=${encodeURIComponent('Style+' + id + '+A')}`,
    //         image2: `https://via.placeholder.com/400x400/${color2}/ffffff?text=${encodeURIComponent('Style+' + id + '+B')}`
    //     });
    // }
    
    return fullData;
}

// 导出完整的画师数据
const FULL_ARTISTS_DATA = generateFullArtistsData();

// 搜索函数
function searchArtists(query) {
    if (!query.trim()) {
        return FULL_ARTISTS_DATA;
    }
    
    const lowerQuery = query.toLowerCase();
    return FULL_ARTISTS_DATA.filter(artist => 
        artist.name.toLowerCase().includes(lowerQuery)
    );
}

// 获取收藏的画师
function getFavoriteArtists() {
    const favorites = JSON.parse(localStorage.getItem('favoriteArtists') || '[]');
    return FULL_ARTISTS_DATA.filter(artist => favorites.includes(artist.id));
}

// 添加到收藏
function addToFavorites(artistId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteArtists') || '[]');
    if (!favorites.includes(artistId)) {
        favorites.push(artistId);
        localStorage.setItem('favoriteArtists', JSON.stringify(favorites));
    }
}

// 从收藏中移除
function removeFromFavorites(artistId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteArtists') || '[]');
    const index = favorites.indexOf(artistId);
    if (index > -1) {
        favorites.splice(index, 1);
        localStorage.setItem('favoriteArtists', JSON.stringify(favorites));
    }
}

// 检查是否已收藏
function isFavorited(artistId) {
    const favorites = JSON.parse(localStorage.getItem('favoriteArtists') || '[]');
    return favorites.includes(artistId);
}

// 导出收藏列表
function exportFavorites() {
    const favorites = getFavoriteArtists();
    const data = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        favorites: favorites
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nai-artists-favorites-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 导入收藏列表
function importFavorites(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.favorites && Array.isArray(data.favorites)) {
                    const favoriteIds = data.favorites.map(artist => artist.id);
                    localStorage.setItem('favoriteArtists', JSON.stringify(favoriteIds));
                    resolve(data.favorites.length);
                } else {
                    reject('无效的文件格式');
                }
            } catch (error) {
                reject('文件解析失败');
            }
        };
        reader.onerror = () => reject('文件读取失败');
        reader.readAsText(file);
    });
} 