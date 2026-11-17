// Question bank for כורה נדיר (Rare Miner). Minecraft facts checked against Java + Bedrock up to 26.3
// (Wilderness Bound, Sept 2026): Mounts of Mayhem (nautilus, camel husk, parched, spears, Lunge), Copper Age,
// Chase the Skies (happy ghast), Chaos Cubed (sulfur cube, sulfur caves), Dappled Forest + poplar.
// No April-fools, spin-off, Education-only, unused or removed content.
//
// tier t: 1 = the obvious answer (25%+ of kids would say it, max 2 per prompt), 2 = common (8-25%),
// 3 = medium (3-8%), 4 = rare (1-3%), 5 = very rare but valid (<1%).
// Each answer: { he: Hebrew display name, en: official English name, t: tier, alias: [every way a kid might type it] }
// Plurals, the article ה, case, spaces, punctuation, niqqud and small typos are handled by js/match.js.
// The bank is checked by `node tests/validate.mjs`.

const D = {};
/** Register a reusable answer (mobs, blocks and items that appear in several prompts). */
function def(key, he, en, alias) {
  if (D[key]) throw new Error('duplicate answer key ' + key);
  D[key] = { he, en, alias: split(alias) };
}
function split(s) { return s ? s.split('|').map(x => x.trim()).filter(Boolean) : []; }
/** A registered answer at tier t, with optional extra aliases for this prompt only. */
function A(key, t, extra) {
  const d = D[key];
  if (!d) throw new Error('unknown answer key ' + key);
  return { he: d.he, en: d.en, t, alias: [...d.alias, ...split(extra)] };
}
/** A one-off answer. */
function X(he, en, t, alias) { return { he, en, t, alias: split(alias) }; }

// ───────────────────────── mobs ─────────────────────────
def("zombie", "זומבי", "Zombie", "זומבי|זומבים|זומביז|zombi|zomby|zombe|zombies");
def("skeleton", "סקלטון", "Skeleton", "שלד|שלדים|סקלטון|סקלטונים|סקלטן|סקלאטון|skeleton|skeletons|skeliton|skeleten|skelaton|skelly");
def("creeper", "קריפר", "Creeper", "קריפר|קריפרים|קרייפר|קריפפר|creeper|creepers|creper|creepr|kreeper");
def("charged_creeper", "צ'ארג'ד קריפר", "Charged Creeper", "קריפר טעון|קריפר חשמלי|קריפר מחושמל|קריפר כחול|צ'ארג'ד קריפר|charged creeper|supercharged creeper|electric creeper");
def("spider", "עכביש", "Spider", "עכביש|עכבישים|ספיידר|ספיידרים|spider|spiders|spidr|spyder");
def("cave_spider", "קייב ספיידר", "Cave Spider", "עכביש מערות|עכביש מערה|עכביש כחול|עכביש רעיל|קייב ספיידר|cave spider|cavespider|cave spiders");
def("enderman", "אנדרמן", "Enderman", "אנדרמן|אנדרמנים|אנדר מן|אנדרמאן|enderman|endermen|ender man|endarman|enderma");
def("endermite", "אנדרמייט", "Endermite", "אנדרמייט|אנדרמיט|אנדר מייט|endermite|ender mite|endermites");
def("silverfish", "סילברפיש", "Silverfish", "דג כסף|דגי כסף|סילברפיש|סילבר פיש|silverfish|silver fish|silverfishes");
def("slime", "סליים", "Slime", "סליים|סליימים|סלים|slime|slimes|slim");
def("magma_cube", "מאגמה קיוב", "Magma Cube", "קוביית מאגמה|קוביית מגמה|קוביות מאגמה|מאגמה קיוב|מגמה קיוב|מאגמה|מגמה|קוביית לבה|magma cube|magmacube|magma cubes|magma slime|magma");
def("witch", "מכשפה", "Witch", "מכשפה|מכשפות|וויץ'|ויץ'|וויטש|witch|wich|witches");
def("phantom", "פאנטום", "Phantom", "פנטום|פנטומים|פאנטום|phantom|phantoms|fantom");
def("drowned", "דראונד", "Drowned", "דראונד|דרואנד|דראונדד|טבוע|זומבי טבוע|זומבי מים|זומבי תת ימי|drowned|drownd|drowned zombie|drown");
def("husk", "האסק", "Husk", "האסק|האסקים|הוסק|הסק|זומבי מדבר|husk|husks|husck");
def("stray", "סטריי", "Stray", "סטריי|סטרי|סטראי|סטרייז|שלד קרח|שלד שלג|שלד קפוא|stray|strays|strey");
def("bogged", "בוגד", "Bogged", "בוגד|בוגדד|בוגדים|שלד ביצה|שלד פטריות|bogged|boged|bogd");
def("parched", "פרצ'ד", "Parched", "פרצ'ד|פארצ'ד|פרצ'ט|שלד מדבר|parched|parchd|parch");
def("wither_skeleton", "ויתר סקלטון", "Wither Skeleton", "שלד וויתר|שלד ויתר|שלד ווית'ר|שלדי וויתר|וויתר סקלטון|ויתר סקלטון|ווית'ר סקלטון|שלד שחור|wither skeleton|witherskeleton|wither skelly|wither skeletons");
def("wither", "ויתר", "Wither", "וויתר|ויתר|ווית'ר|וודר|ווידר|wither|withr|the wither|withers");
def("ender_dragon", "אנדר דרגון", "Ender Dragon", "דרקון האנדר|דרקון אנדר|דרקון|הדרקון|אנדר דרגון|אנדר דראגון|ender dragon|enderdragon|dragon|the ender dragon|ender dragn");
def("blaze", "בלייז", "Blaze", "בלייז|בלייזים|בלייס|בלז|blaze|blazes|blaz|blase");
def("ghast", "גאסט", "Ghast", "גאסט|גאסטים|גסט|גוסט|ghast|ghasts|gast|ghost");
def("happy_ghast", "האפי גאסט", "Happy Ghast", "גאסט שמח|גאסטים שמחים|הפי גאסט|האפי גאסט|גאסטלינג|גאסט חמוד|גאסט לבן|happy ghast|happyghast|ghastling|happy ghost");
def("piglin", "פיגלין", "Piglin", "פיגלין|פיגלינים|פיגלן|piglin|piglins|piglen");
def("piglin_brute", "פיגלין ברוט", "Piglin Brute", "פיגלין ברוט|פיגלין ברוטה|פיגלין אכזרי|ברוט|piglin brute|piglinbrute|brute");
def("zombified_piglin", "זומבי פיגלין", "Zombified Piglin", "פיגלין זומבי|זומבי פיגלין|זומביפייד פיגלין|זומבי פיגמן|זומבי פיג מן|פיגמן|zombified piglin|zombie piglin|zombie pigman|pigman|zombified pigman");
def("hoglin", "הוגלין", "Hoglin", "הוגלין|הוגלינים|הוגלן|חזיר נתר|hoglin|hoglins|hoglen|hogling");
def("zoglin", "זוגלין", "Zoglin", "זוגלין|זוגלן|הוגלין זומבי|zoglin|zoglins|zogling");
def("strider", "סטרידר", "Strider", "סטריידר|סטריידרים|סטרידר|strider|striders|stryder|straider");
def("guardian", "גרדיאן", "Guardian", "גרדיאן|גארדיאן|גרדיאנים|שומר|guardian|guardians|gardian|guardien");
def("elder_guardian", "אלדר גרדיאן", "Elder Guardian", "גרדיאן זקן|אלדר גרדיאן|אלדר גארדיאן|גארדיאן זקן|שומר זקן|elder guardian|elderguardian|elder gardian");
def("shulker", "שולקר", "Shulker", "שולקר|שולקרים|שאלקר|שלקר|shulker|shulkers|shulkr|schulker");
def("vex", "וקס", "Vex", "וקס|ווקס|vex|vexes");
def("vindicator", "וינדיקטור", "Vindicator", "וינדיקייטור|וינדיקטור|וינדיקייטר|vindicator|vindicater|vindicators");
def("evoker", "אבוקר", "Evoker", "אבוקר|איבוקר|אווקר|evoker|evocker|evokers");
def("pillager", "פילג'ר", "Pillager", "פילג'ר|פילאג'ר|פילגר|פילג'רים|pillager|pilager|pillagers|piliger");
def("ravager", "ראבג'ר", "Ravager", "ראבג'ר|רבג'ר|רוואג'ר|ראווג'ר|רבגר|ravager|ravenger|ravagr|ravagers");
def("warden", "וורדן", "Warden", "וורדן|ורדן|וארדן|הוורדן|warden|wardin|the warden");
def("breeze", "בריז", "Breeze", "בריז|ברייז|בריזה|breeze|breez|brise");
def("creaking", "קריקינג", "Creaking", "קריקינג|קריקין|קרקינג|creaking|creeking|kreaking|the creaking");
def("zombie_villager", "זומבי וילג'ר", "Zombie Villager", "כפרי זומבי|זומבי כפרי|זומבי וילג'ר|זומבי וילאג'ר|zombie villager|zombievillager|zombie villagers");
def("zombie_horse", "סוס זומבי", "Zombie Horse", "סוס זומבי|זומבי סוס|זומבי הורס|zombie horse|zombiehorse");
def("skeleton_horse", "סוס סקלטון", "Skeleton Horse", "סוס שלד|שלד סוס|סוס סקלטון|סקלטון הורס|skeleton horse|skeletonhorse|skelly horse");
def("camel_husk", "גמל האסק", "Camel Husk", "גמל האסק|האסק גמל|גמל זומבי|גמל מת|קאמל האסק|camel husk|camelhusk|zombie camel|husk camel");
def("zombie_nautilus", "נאוטילוס זומבי", "Zombie Nautilus", "נאוטילוס זומבי|זומבי נאוטילוס|נוטילוס זומבי|zombie nautilus|zombienautilus");
def("nautilus", "נאוטילוס", "Nautilus", "נאוטילוס|נוטילוס|נאוטלוס|נאוטילוסים|nautilus|nautilous|nautalus|nautilis");
def("iron_golem", "איירון גולם", "Iron Golem", "גולם ברזל|גולם הברזל|גולמי ברזל|איירון גולם|iron golem|irongolem|iron golum");
def("snow_golem", "סנו גולם", "Snow Golem", "גולם שלג|גולם השלג|סנו גולם|איש שלג|snow golem|snowgolem|snowman|snow man");
def("wolf", "זאב", "Wolf", "זאב|זאבים|כלב|כלבים|כלבלב|וולף|wolf|wolves|dog|dogs|doggo");
def("cat", "חתול", "Cat", "חתול|חתולים|חתולה|חתלתול|קט|cat|cats|kitty|kitten");
def("ocelot", "אוסלוט", "Ocelot", "אוסלוט|אוצלוט|אוסלוטים|ocelot|ocelots|oselot");
def("parrot", "תוכי", "Parrot", "תוכי|תוכים|פארוט|parrot|parrots|parot");
def("horse", "סוס", "Horse", "סוס|סוסים|סוסה|הורס|horse|horses|hors");
def("donkey", "חמור", "Donkey", "חמור|חמורים|דונקי|donkey|donkeys|donky");
def("mule", "פרד", "Mule", "פרד|פרדה|פרדים|מיול|mule|mules");
def("llama", "לאמה", "Llama", "לאמה|לאמות|למה|לאמא|אלפקה|llama|llamas|lama|alpaca");
def("trader_llama", "לאמה סוחר", "Trader Llama", "לאמת סוחר|לאמה של סוחר|לאמה של הסוחר|לאמה סוחר|טריידר לאמה|trader llama|traderllama|trader lama|wandering trader llama");
def("camel", "גמל", "Camel", "גמל|גמלים|קאמל|camel|camels|kamel");
def("pig", "חזיר", "Pig", "חזיר|חזירים|חזירה|פיג|pig|pigs|piggy");
def("cow", "פרה", "Cow", "פרה|פרות|קאו|cow|cows");
def("sheep", "כבשה", "Sheep", "כבשה|כבשות|כבש|כבשים|שיפ|sheep|sheeps");
def("chicken", "תרנגולת", "Chicken", "תרנגולת|תרנגולות|תרנגול|תרנגולים|צ'יקן|chicken|chickens|chiken|hen");
def("rabbit", "ארנב", "Rabbit", "ארנב|ארנבים|ארנבת|ארנבון|ארנבונים|ראביט|rabbit|rabbits|rabit|bunny|bunnies");
def("mooshroom", "מושרום", "Mooshroom", "פרת פטריות|פרת פטריה|פרה פטריה|פרות פטריות|פרה אדומה|מושרום|מוש רום|mooshroom|mooshrooms|mushroom cow|moshroom|mooshrom");
def("turtle", "צב", "Turtle", "צב|צבים|צב ים|צבי ים|טרטל|turtle|turtles|tortoise");
def("panda", "פנדה", "Panda", "פנדה|פנדות|פאנדה|panda|pandas");
def("fox", "שועל", "Fox", "שועל|שועלים|שועלה|פוקס|fox|foxes|foxs");
def("bee", "דבורה", "Bee", "דבורה|דבורים|בי|bee|bees");
def("goat", "עז", "Goat", "עז|עזים|עיזים|עזה|גואט|גוט|goat|goats");
def("axolotl", "אקסולוטל", "Axolotl", "אקסולוטל|אקסולוטלים|אקסלוטל|אקסולוטול|אקסולוט|אקסולטל|axolotl|axolotls|axolotel|axolot|axalotl|axolottl");
def("frog", "צפרדע", "Frog", "צפרדע|צפרדעים|צפרדעה|פרוג|frog|frogs");
def("tadpole", "ראשן", "Tadpole", "ראשן|ראשנים|ראשני|טדפול|tadpole|tadpoles|tadpol|baby frog|צפרדע תינוק");
def("sniffer", "סניפר", "Sniffer", "סניפר|סניפרים|סנפר|sniffer|sniffers|snifer");
def("armadillo", "ארמדילו", "Armadillo", "ארמדילו|ארמדילואים|ארמדיו|armadillo|armadillos|armadilo");
def("villager", "וילג'ר", "Villager", "כפרי|כפריים|וילג'ר|וילאג'ר|וילג'רים|villager|villagers|villiger|vilager");
def("polar_bear", "דוב קוטב", "Polar Bear", "דוב קוטב|דוב קוטבי|דובי קוטב|דוב לבן|דוב|פולר בר|polar bear|polarbear|bear");
def("dolphin", "דולפין", "Dolphin", "דולפין|דולפינים|dolphin|dolphins|dolfin");
def("squid", "סקוויד", "Squid", "דיונון|דיונונים|סקוויד|סקויד|תמנון|תמנונים|squid|squids|octopus");
def("glow_squid", "גלואו סקוויד", "Glow Squid", "דיונון זוהר|תמנון זוהר|גלו סקוויד|גלו סקויד|glow squid|glowsquid|glowing squid");
def("cod", "דג", "Cod", "דג|דגים|דג רגיל|קוד|קאד|בקלה|cod|fish|fishes|raw cod|cooked cod|דג מבושל|דג נא");
def("salmon", "סלמון", "Salmon", "סלמון|סלמונים|סאלמון|אלתית|salmon|salmons|samon|raw salmon|cooked salmon");
def("pufferfish", "פאפרפיש", "Pufferfish", "אבו נפחא|אבונפחא|דג נפוח|דג קוצני|פאפרפיש|פאפר פיש|pufferfish|puffer fish|puffer|blowfish|blow fish");
def("tropical_fish", "דג טרופי", "Tropical Fish", "דג טרופי|דגים טרופיים|דג צבעוני|טרופיקל פיש|tropical fish|tropicalfish|tropical");
def("bat", "עטלף", "Bat", "עטלף|עטלפים|בט|bat|bats");
def("allay", "אלאיי", "Allay", "אליי|אלאי|אלי|allay|allays|alay|allai");
def("sulfur_cube", "סולפר קיוב", "Sulfur Cube", "קוביית גופרית|קוביות גופרית|סולפור קיוב|סלפור קיוב|גופרית|sulfur cube|sulphur cube|sulfurcube|sulfur slime");

// ───────────────────────── blocks ─────────────────────────
def("tnt", "טי אן טי", "TNT", "tnt|טי אן טי|טיאנטי|טי.אן.טי|דינמיט|חומר נפץ|dynamite|tnt block|TNT");
def("end_crystal", "אנד קריסטל", "End Crystal", "קריסטל אנד|קריסטל האנד|קריסטלי אנד|גביש אנד|אנד קריסטל|קריסטל|end crystal|endcrystal|ender crystal|crystal");
def("bed", "מיטה", "Bed", "מיטה|מיטות|בד|bed|beds");
def("respawn_anchor", "ריספאון אנקר", "Respawn Anchor", "עוגן תחייה|עוגן|ריספון אנקור|ריספאון אנקור|respawn anchor|anchor");
def("torch", "לפיד", "Torch", "לפיד|לפידים|טורץ'|אבוקה|torch|torches|tourch");
def("soul_torch", "סול טורץ'", "Soul Torch", "לפיד נשמות|לפיד נשמה|לפיד כחול|סול טורץ'|soul torch");
def("copper_torch", "קופר טורץ'", "Copper Torch", "לפיד נחושת|לפיד ירוק|קופר טורץ'|copper torch");
def("redstone_torch", "לפיד רדסטון", "Redstone Torch", "לפיד רדסטון|לפיד אדום|רדסטון טורץ'|redstone torch");
def("lantern", "פנס", "Lantern", "פנס|לנטרן|lantern|lanterns|latern");
def("soul_lantern", "סול לנטרן", "Soul Lantern", "פנס נשמות|פנס נשמה|פנס כחול|סול לנטרן|soul lantern");
def("copper_lantern", "קופר לנטרן", "Copper Lantern", "פנס נחושת|פנס ירוק|קופר לנטרן|copper lantern");
def("glowstone", "גלואוסטון", "Glowstone", "גלוסטון|גלו סטון|אבן זוהרת|glowstone|glow stone|glowstone block");
def("sea_lantern", "סי לנטרן", "Sea Lantern", "פנס ים|סי לנטרן|sea lantern|sealantern");
def("jack_o_lantern", "ג'ק או לנטרן", "Jack o'Lantern", "ג'ק או לנטרן|ג'ק או'לנטרן|ג'ק אולנטרן|דלעת מוארת|דלעת עם לפיד|דלעת זוהרת|jack o lantern|jack o'lantern|jackolantern|jack lantern");
def("lava", "לבה", "Lava", "לבה|לאבה|לבות|lava|lave");
def("fire", "אש", "Fire", "אש|פייר|להבות|אש נשמות|אש כחולה|fire|flames|soul fire");
def("campfire", "מדורה", "Campfire", "מדורה|מדורות|קמפפייר|campfire|camp fire");
def("soul_campfire", "סול קמפייר", "Soul Campfire", "מדורת נשמות|מדורה כחולה|סול קמפפייר|soul campfire");
def("shroomlight", "שרומלייט", "Shroomlight", "שרומלייט|שרום לייט|אור פטריות|shroomlight|shroom light");
def("redstone_lamp", "מנורת רדסטון", "Redstone Lamp", "מנורת רדסטון|מנורה|מנורות|רדסטון לאמפ|redstone lamp|lamp");
def("end_rod", "אנד רוד", "End Rod", "מוט אנד|מוט האנד|אנד רוד|end rod|endrod");
def("beacon", "ביקון", "Beacon", "משואה|ביקון|ביקן|beacon|becon");
def("froglight", "פרוגלייט", "Froglight", "אור צפרדע|פרוגלייט|froglight|frog light|ochre froglight|verdant froglight|pearlescent froglight");
def("sea_pickle", "סי פיקל", "Sea Pickle", "מלפפון ים|מלפפוני ים|סי פיקל|sea pickle|seapickle|sea pickles");
def("glow_lichen", "גלואו ליקן", "Glow Lichen", "חזזית זוהרת|גלו לייקן|גלו ליכן|glow lichen|lichen");
def("magma_block", "בלוק מאגמה", "Magma Block", "בלוק מאגמה|בלוק מגמה|מאגמה|מגמה|מאגמה בלוק|magma block|magma");
def("crying_obsidian", "קריינג אובסידיאן", "Crying Obsidian", "אובסידיאן בוכה|אובסידיאן סגול|קריינג אובסידיאן|crying obsidian");
def("obsidian", "אובסידיאן", "Obsidian", "אובסידיאן|אובסידיין|אובזידיאן|obsidian|obsidion|obisidian");
def("candle", "נר", "Candle", "נר|נרות|קנדל|candle|candles");
def("conduit", "קונדואיט", "Conduit", "קונדואיט|קונדויט|צינור|conduit");
def("amethyst_cluster", "אמטיסט קלאסטר", "Amethyst Cluster", "אשכול אמטיסט|גביש אמטיסט|קריסטל אמטיסט|אמטיסט|amethyst cluster|amethyst bud|amethyst crystal|amethyst");
def("brewing_stand", "בריוינג סטנד", "Brewing Stand", "מעבדת שיקויים|עמדת שיקויים|דוכן שיקויים|מבשלת שיקויים|ברואינג סטנד|brewing stand|brewing station|potion stand");
def("dragon_egg", "ביצת דרקון", "Dragon Egg", "ביצת דרקון|ביצת הדרקון|דרגון אג|dragon egg");
def("end_portal", "פורטל אנד", "End Portal", "פורטל אנד|פורטל לאנד|פורטל האנד|אנד פורטל|end portal|exit portal");
def("nether_portal", "פורטל נת'ר", "Nether Portal", "פורטל נתר|פורטל לנתר|פורטל הנתר|נתר פורטל|פורטל|nether portal|portal");
def("end_gateway", "אנד גייטווי", "End Gateway", "שער אנד|שער מעבר|אנד גייטוויי|גייטוויי|end gateway|gateway");
def("end_portal_frame", "מסגרת פורטל אנד", "End Portal Frame", "מסגרת פורטל אנד|מסגרת פורטל|מסגרת אנד|אנד פורטל פריים|end portal frame|portal frame|end frame");
def("furnace", "פרנס", "Furnace", "כבשן|כבשנים|תנור|פרנס|furnace|furnance|furnice");
def("smoker", "סמוקר", "Smoker", "מעשנה|סמוקר|smoker");
def("blast_furnace", "בלאסט פרנס", "Blast Furnace", "כבשן היתוך|כבשן פיצוץ|תנור היתוך|בלאסט פרנס|blast furnace|blastfurnace");
def("enchanting_table", "אנצ'נטינג טייבל", "Enchanting Table", "שולחן כישוף|שולחן כישופים|שולחן קסמים|אנצ'נטינג טייבל|enchanting table|enchantment table|enchant table");
def("ender_chest", "תיבת אנדר", "Ender Chest", "תיבת אנדר|אנדר צ'סט|ender chest|enderchest");
def("sculk_sensor", "סקאלק סנסור", "Sculk Sensor", "חיישן סקאלק|חיישן סקולק|סקאלק סנסור|sculk sensor|skulk sensor");
def("calibrated_sculk_sensor", "קליברייטד סקאלק סנסור", "Calibrated Sculk Sensor", "חיישן סקאלק מכויל|חיישן מכויל|calibrated sculk sensor|calibrated sensor");
def("sculk_catalyst", "סקאלק קטליסט", "Sculk Catalyst", "זרז סקאלק|זרז סקולק|סקאלק קטליסט|sculk catalyst|skulk catalyst");
def("copper_bulb", "קופר בולב", "Copper Bulb", "נורת נחושת|נורה|קופר באלב|copper bulb|bulb");
def("firefly_bush", "שיח גחליליות", "Firefly Bush", "שיח גחליליות|גחליליות|פיירפליי בוש|firefly bush|fireflies");
def("redstone_ore", "רדסטון אור", "Redstone Ore", "עפרת רדסטון|רדסטון אור|redstone ore");
def("brown_mushroom", "פטרייה חומה", "Brown Mushroom", "פטרייה חומה|פטריה חומה|פטריות חומות|brown mushroom");
def("light_block", "לייט בלוק", "Light", "בלוק אור|בלוק אור בלתי נראה|לייט בלוק|light block|light");
def("glow_berries", "גלואו ברי", "Glow Berries", "פירות יער זוהרים|גרגרים זוהרים|גלו ברי|גלו בריז|glow berries|glow berry|glowberries|cave vines");
def("sand", "חול", "Sand", "חול|חולות|סנד|sand");
def("red_sand", "חול אדום", "Red Sand", "חול אדום|רד סנד|red sand");
def("gravel", "חצץ", "Gravel", "חצץ|גרבל|גראבל|gravel|gravle");
def("concrete_powder", "קונקרט פאודר", "Concrete Powder", "אבקת בטון|אבקת מלט|קונקריט פאודר|concrete powder|cement powder");
def("anvil", "סדן", "Anvil", "סדן|סדנים|אנביל|anvil|anvils|chipped anvil|damaged anvil");
def("scaffolding", "פיגום", "Scaffolding", "פיגום|פיגומים|סקפולדינג|scaffolding|scaffold");
def("pointed_dripstone", "דריפסטון", "Pointed Dripstone", "נטיף|נטיפים|זקיף|זקיפים|דריפסטון|pointed dripstone|dripstone|stalactite|stalagmite");
def("suspicious_sand", "חול חשוד", "Suspicious Sand", "חול חשוד|סוספישס סנד|suspicious sand|sus sand");
def("suspicious_gravel", "חצץ חשוד", "Suspicious Gravel", "חצץ חשוד|סוספישס גרבל|suspicious gravel|sus gravel");
def("sulfur_spike", "סולפר ספייק", "Sulfur Spike", "קוץ גופרית|נטיף גופרית|סולפור ספייק|sulfur spike|sulphur spike");
def("netherrack", "נת'רראק", "Netherrack", "נתרראק|נתרק|נתר ראק|נתרק|אבן נתר|netherrack|nether rack|netherack");
def("soul_sand", "סול סנד", "Soul Sand", "חול נשמות|חול הנשמות|סול סנד|soul sand|soulsand");
def("soul_soil", "סול סויל", "Soul Soil", "אדמת נשמות|סול סויל|soul soil");
def("basalt", "באזלט", "Basalt", "בזלת|בזלט|basalt");
def("polished_basalt", "פולישד באזלט", "Polished Basalt", "בזלת מלוטשת|polished basalt");
def("blackstone", "בלקסטון", "Blackstone", "אבן שחורה|בלאקסטון|בלקסטון|blackstone|black stone");
def("gilded_blackstone", "גילדד בלקסטון", "Gilded Blackstone", "אבן שחורה מוזהבת|בלאקסטון מוזהב|גילדד בלאקסטון|gilded blackstone");
def("polished_blackstone_bricks", "פולישד בלקסטון בריקס", "Polished Blackstone Bricks", "לבני אבן שחורה|לבני בלאקסטון|polished blackstone bricks|blackstone bricks|polished blackstone|cracked polished blackstone bricks|chiseled polished blackstone|לבני אבן שחורה מלוטשת");
def("crimson_nylium", "קרימזון נילייום", "Crimson Nylium", "ניליום ארגמן|ניליום אדום|קרימזון ניליום|crimson nylium|red nylium");
def("warped_nylium", "וורפד נילייום", "Warped Nylium", "ניליום מעוות|ניליום כחול|וורפד ניליום|warped nylium|blue nylium");
def("crimson_stem", "קרימזון סטם", "Crimson Stem", "גבעול ארגמן|גזע ארגמן|קרימזון סטם|crimson stem|crimson log|crimson wood");
def("warped_stem", "וורפד סטם", "Warped Stem", "גבעול מעוות|גזע מעוות|וורפד סטם|warped stem|warped log|warped wood");
def("nether_wart_block", "נת'ר וורט בלוק", "Nether Wart Block", "בלוק יבלת נתר|בלוק נתר וורט|נתר וורט בלוק|nether wart block|crimson wart block");
def("warped_wart_block", "וורפד וורט בלוק", "Warped Wart Block", "בלוק יבלת מעוות|וורפד וורט בלוק|warped wart block|warped wart");
def("crimson_fungus", "קרימזון פאנגוס", "Crimson Fungus", "פטריית ארגמן|פטרייה אדומה של נתר|קרימזון פונגוס|crimson fungus|crimson mushroom");
def("warped_fungus", "וורפד פאנגוס", "Warped Fungus", "פטרייה מעוותת|פטריית וורפד|פטרייה כחולה|וורפד פונגוס|warped fungus|warped mushroom");
def("crimson_roots", "קרימזון רוטס", "Crimson Roots", "שורשי ארגמן|קרימזון רוטס|crimson roots");
def("warped_roots", "וורפד רוטס", "Warped Roots", "שורשים מעוותים|וורפד רוטס|warped roots");
def("weeping_vines", "וויפינג ויינס", "Weeping Vines", "גפנים בוכים|גפן בוכה|וויפינג ויינס|weeping vines|weeping vine");
def("twisting_vines", "טוויסטינג ויינס", "Twisting Vines", "גפנים מתפתלים|גפן מתפתל|טוויסטינג ויינס|twisting vines|twisting vine");
def("nether_sprouts", "נת'ר ספראוטס", "Nether Sprouts", "נבטי נתר|נבט נתר|נתר ספראוטס|nether sprouts|nether sprout");
def("nether_wart", "נת'ר וורט", "Nether Wart", "יבלת נתר|יבלות נתר|נתר וורט|נת'ר וורט|נתר וארט|nether wart|netherwart|wart");
def("nether_bricks", "נת'ר בריקס", "Nether Bricks", "לבני נתר|לבנת נתר|נתר בריקס|nether bricks|nether brick");
def("nether_brick_fence", "גדר נת'ר בריקס", "Nether Brick Fence", "גדר לבני נתר|גדר נתר|nether brick fence|nether fence");
def("ancient_debris", "אנשנט דבריס", "Ancient Debris", "שרידים עתיקים|אנשנט דבריס|אנשיינט דבריס|עפרת נתרייט|נתרייט|ancient debris|ancient debri|netherite ore|netherite");
def("nether_quartz_ore", "נת'ר קוורץ אור", "Nether Quartz Ore", "עפרת קוורץ|עפרת קווארץ|קוורץ|קווארץ|עפרת קוורץ נתר|quartz ore|nether quartz ore|quartz|nether quartz");
def("nether_gold_ore", "נת'ר גולד אור", "Nether Gold Ore", "עפרת זהב נתר|עפרת זהב של נתר|זהב נתר|נתר גולד|nether gold ore|nether gold");
def("bone_block", "בלוק עצם", "Bone Block", "בלוק עצם|בלוק עצמות|בון בלוק|bone block|fossil block");
def("gold_block", "בלוק זהב", "Block of Gold", "בלוק זהב|בלוק של זהב|קוביית זהב|gold block|block of gold|golden block");
def("chest", "תיבה", "Chest", "תיבה|תיבות|ארגז|צ'סט|chest|chests");
def("spawner", "ספאונר", "Spawner", "ספאונר|ספונר|מזמן מפלצות|כלוב מפלצות|spawner|monster spawner|mob spawner");
def("mushroom", "פטרייה", "Mushroom", "פטרייה|פטריה|פטריות|פטרייה אדומה|פטרייה חומה|מאשרום|mushroom|mushrooms|red mushroom|brown mushroom");
def("chain", "שרשרת", "Iron Chain", "שרשרת|שרשראות|שרשרת ברזל|צ'יין|chain|chains|iron chain");
def("dried_ghast", "דרייד גאסט", "Dried Ghast", "גאסט מיובש|גאסט יבש|דרייד גאסט|dried ghast|dry ghast");
def("end_stone", "אנד סטון", "End Stone", "אבן אנד|אבן האנד|אנד סטון|end stone|endstone");
def("end_stone_bricks", "אנד סטון בריקס", "End Stone Bricks", "לבני אבן אנד|לבני אנד|אנד סטון בריקס|end stone bricks|end bricks");
def("purpur", "בלוק פורפור", "Purpur Block", "בלוק פורפור|פורפור|פרפור|purpur|purpur block|purpur pillar");
def("chorus_plant", "כורוס פלנט", "Chorus Plant", "צמח כורוס|עץ כורוס|צמח קורוס|כורוס פלאנט|chorus plant|chorus tree");
def("chorus_flower", "כורוס פלאואר", "Chorus Flower", "פרח כורוס|פרח קורוס|כורוס פלאוור|chorus flower");
def("chorus_fruit", "כורוס פרוט", "Chorus Fruit", "פרי כורוס|פירות כורוס|כורוס|קורוס|כורוס פרוט|chorus fruit|chorus|corus fruit");
def("bedrock", "בדרוק", "Bedrock", "סלע יסוד|בדרוק|בד רוק|סלע אם|bedrock|bed rock");
def("iron_bars", "סורגי ברזל", "Iron Bars", "סורגי ברזל|סורגים|איירון בארס|iron bars|bars|iron bar");
def("lever", "ידית", "Lever", "ידית|ידיות|מנוף|לבר|ליבר|lever|levers");
def("button", "כפתור", "Button", "כפתור|כפתורים|באטן|button|buttons|stone button|wooden button");
def("pressure_plate", "פרשר פלייט", "Pressure Plate", "לוחית לחץ|לוחיות לחץ|משטח לחץ|פרשר פלייט|pressure plate|presure plate|stone pressure plate|wooden pressure plate");
def("weighted_pressure_plate", "וייטד פרשר פלייט", "Weighted Pressure Plate", "לוחית לחץ משוקללת|לוחית לחץ מזהב|לוחית לחץ מברזל|weighted pressure plate|heavy weighted pressure plate|light weighted pressure plate|gold pressure plate|iron pressure plate");
def("redstone_block", "בלוק רדסטון", "Block of Redstone", "בלוק רדסטון|רדסטון בלוק|redstone block|block of redstone");
def("daylight_detector", "דיילייט דיטקטור", "Daylight Detector", "חיישן אור יום|חיישן אור|חיישן שמש|דיילייט דטקטור|daylight detector|daylight sensor|light sensor");
def("observer", "אובזרבר", "Observer", "צופה|משקיף|אובזרבר|אובסרבר|observer|obsever");
def("tripwire_hook", "טריפווייר הוק", "Tripwire Hook", "וו מלכודת|וו חוט|טריפוויר הוק|טריפוויר|tripwire hook|trip wire hook|tripwire");
def("target", "מטרה", "Target", "מטרה|בלוק מטרה|טרגט|target|target block");
def("trapped_chest", "תיבה ממולכדת", "Trapped Chest", "תיבה ממולכדת|תיבת מלכודת|טראפד צ'סט|trapped chest|trap chest");
def("detector_rail", "דיטקטור ריל", "Detector Rail", "מסילת גלאי|מסילת חיישן|דטקטור ריל|detector rail");
def("activator_rail", "אקטיבייטור ריל", "Activator Rail", "מסילת הפעלה|אקטיבייטור ריל|activator rail");
def("powered_rail", "פאוורד ריל", "Powered Rail", "מסילה מונעת|מסילת זהב|מסילה מחושמלת|פאוורד ריל|powered rail|golden rail|power rail|booster rail");
def("lectern", "לקטרן", "Lectern", "דוכן קריאה|דוכן|עמוד קריאה|לקטרן|lectern|lecturn");
def("lightning_rod", "מוט ברק", "Lightning Rod", "כליל ברק|מוט ברק|מוט ברקים|לייטנינג רוד|lightning rod|lighting rod");
def("piston", "פיסטון", "Piston", "בוכנה|בוכנות|פיסטון|piston|pistons|pistion");
def("sticky_piston", "סטיקי פיסטון", "Sticky Piston", "בוכנה דביקה|פיסטון דביק|סטיקי פיסטון|sticky piston|stickypiston");
def("door", "דלת", "Door", "דלת|דלתות|דלת עץ|דור|door|doors|wooden door|oak door");
def("iron_door", "דלת ברזל", "Iron Door", "דלת ברזל|דלתות ברזל|איירון דור|iron door");
def("copper_door", "דלת נחושת", "Copper Door", "דלת נחושת|קופר דור|copper door");
def("trapdoor", "טראפדור", "Trapdoor", "דלת מלכודת|דלת רצפה|טראפדור|trapdoor|trap door|wooden trapdoor");
def("iron_trapdoor", "איירון טראפדור", "Iron Trapdoor", "דלת מלכודת מברזל|דלת מלכודת ברזל|איירון טראפדור|iron trapdoor|iron trap door");
def("copper_trapdoor", "טראפדור נחושת", "Copper Trapdoor", "דלת מלכודת מנחושת|דלת מלכודת נחושת|copper trapdoor|copper trap door");
def("fence_gate", "שער גדר", "Fence Gate", "שער גדר|שער|פנס גייט|fence gate|gate");
def("dispenser", "דיספנסר", "Dispenser", "מתקן|מפזר|דיספנסר|dispenser|dispencer");
def("dropper", "דרופר", "Dropper", "מפיל|דרופר|dropper|droper");
def("hopper", "הופר", "Hopper", "משפך|הופר|hopper|hoper");
def("note_block", "נוט בלוק", "Note Block", "בלוק צלילים|בלוק תווים|בלוק נגינה|נוט בלוק|note block|noteblock|music block");
def("bell", "פעמון", "Bell", "פעמון|פעמונים|בל|bell");
def("crafter", "קראפטר", "Crafter", "יוצר אוטומטי|קראפטר|crafter|auto crafter");
def("command_block", "קומנד בלוק", "Command Block", "בלוק פקודות|בלוק פקודה|קומנד בלוק|command block|commandblock|repeating command block|chain command block");
def("composter", "קומפוסטר", "Composter", "קומפוסטר|מקמפסת|קומפוסט|composter|compost bin");
def("smithing_table", "סמיתינג טייבל", "Smithing Table", "שולחן נפחות|שולחן נפח|שולחן חישול|סמית'ינג טייבל|smithing table|smithing");
def("barrel", "חבית", "Barrel", "חבית|חביות|בארל|barrel");
def("loom", "לום", "Loom", "נול|נולים|לום|loom");
def("cartography_table", "שולחן מפות", "Cartography Table", "שולחן מפות|שולחן קרטוגרפיה|קרטוגרפי טייבל|cartography table|map table");
def("grindstone", "גרינדסטון", "Grindstone", "אבן משחזת|משחזת|גריינדסטון|grindstone|grind stone");
def("fletching_table", "פלצ'ינג טייבל", "Fletching Table", "שולחן חצים|שולחן חצנות|פלצ'ינג טייבל|fletching table|fletching");
def("stonecutter", "סטונקאטר", "Stonecutter", "חותך אבנים|חותך אבן|מסור אבן|סטונקאטר|stonecutter|stone cutter");
def("cauldron", "קדרה", "Cauldron", "קדרה|יורה|קלדרון|cauldron|caldron");
def("crafting_table", "קראפטינג טייבל", "Crafting Table", "שולחן יצירה|שולחן עבודה|שולחן בנייה|קראפטינג טייבל|crafting table|workbench|craft table|crafting bench");
def("shulker_box", "שולקר בוקס", "Shulker Box", "קופסת שולקר|שולקר בוקס|shulker box|shulkerbox");
def("copper_chest", "תיבת נחושת", "Copper Chest", "תיבת נחושת|קופר צ'סט|copper chest");
def("sign", "שלט", "Sign", "שלט|שלטים|סיין|sign|signs|hanging sign");
def("glass", "זכוכית", "Glass", "זכוכית|גלאס|glass");
def("glass_pane", "זכוכית דקה", "Glass Pane", "שמשת זכוכית|חלון|זכוכית דקה|גלאס פיין|glass pane|window|pane");
def("stained_glass", "זכוכית צבעונית", "Stained Glass", "זכוכית צבעונית|זכוכית צבועה|סטיינד גלאס|stained glass|colored glass|stained glass pane");
def("ice", "קרח", "Ice", "קרח|אייס|ice");
def("packed_ice", "פקד אייס", "Packed Ice", "קרח דחוס|פאקד אייס|packed ice");
def("blue_ice", "בלו אייס", "Blue Ice", "קרח כחול|בלו אייס|blue ice");
def("grass_block", "בלוק דשא", "Grass Block", "בלוק דשא|דשא|אדמת דשא|גראס בלוק|grass block|grass");
def("mycelium", "מייסיליום", "Mycelium", "תפטיר|מיסיליום|מייסיליום|mycelium|mycellium");
def("podzol", "פודזול", "Podzol", "פודזול|פודזל|podzol|podsol");
def("bookshelf", "מדף ספרים", "Bookshelf", "מדף ספרים|ספרייה|בוקשלף|bookshelf|book shelf|bookcase");
def("melon_block", "בלוק אבטיח", "Melon", "אבטיח|בלוק אבטיח|מלון|melon|melon block|watermelon|אבטיח (בלוק)");
def("stone", "אבן", "Stone", "אבן|סטון|stone");
def("deepslate", "דיפסלייט", "Deepslate", "דיפסלייט|דיפ סלייט|אבן עמוקה|deepslate|deep slate");
def("coral", "אלמוג", "Coral", "אלמוג|אלמוגים|קורל|coral|corals|coral block|coral fan");
def("clay", "חימר", "Clay", "חימר|בלוק חימר|קליי|clay|clay block");
def("snow", "שלג", "Snow", "שלג|בלוק שלג|שכבת שלג|סנו|snow|snow block|snow layer");
def("turtle_egg", "ביצת צב", "Turtle Egg", "ביצת צב|ביצי צב|טרטל אג|turtle egg|turtle eggs");
def("bee_nest", "קן דבורים", "Bee Nest", "קן דבורים|קן דבורה|כוורת|בי נסט|bee nest|beehive|bee hive");
def("sculk", "סקאלק", "Sculk", "סקאלק|סקולק|בלוק סקאלק|sculk|skulk|sculk block");
def("sculk_shrieker", "סקאלק שריקר", "Sculk Shrieker", "צווחן סקאלק|צורח סקאלק|שריקר|sculk shrieker|shrieker|skulk shrieker");
def("sculk_vein", "סקאלק וויין", "Sculk Vein", "וריד סקאלק|ורידי סקאלק|sculk vein|sculk veins");
def("mushroom_block", "בלוק פטרייה", "Mushroom Block", "בלוק פטרייה|בלוק פטריה|פטרייה ענקית|mushroom block|huge mushroom|red mushroom block|brown mushroom block");
def("nylium", "נילייום", "Nylium", "ניליום|נייליום|nylium|crimson nylium|warped nylium");
def("leaves", "עלים", "Leaves", "עלים|עלה|עלווה|ליבס|leaves|leaf|oak leaves");
def("cobweb", "קורי עכביש", "Cobweb", "קורי עכביש|קור עכביש|רשת עכביש|קוב ווב|cobweb|cob web|web|spider web");
def("ores", "עפרות", "Ores", "עפרה|עפרות|אור|ore|ores|diamond ore|iron ore|gold ore|coal ore|emerald ore|redstone ore|lapis ore|copper ore|quartz ore|nether gold ore|עפרת יהלום|עפרת ברזל|עפרת זהב|עפרת פחם|עפרת אמרלד|עפרת אזמרגד|עפרת רדסטון|עפרת לאפיס|עפרת נחושת|עפרת קוורץ|diamond|יהלום");
def("barrier", "מחסום", "Barrier", "מחסום|בלוק מחסום|באריר|בארייר|barrier|barrier block");
def("structure_block", "סטרקצ'ר בלוק", "Structure Block", "בלוק מבנה|בלוק מבנים|סטרקצ'ר בלוק|structure block");
def("jigsaw", "ג'יגסו בלוק", "Jigsaw Block", "בלוק פאזל|פאזל|ג'יגסו|jigsaw|jigsaw block");
def("reinforced_deepslate", "ריינפורסד דיפסלייט", "Reinforced Deepslate", "דיפסלייט מחוזק|דיפסלייט משוריין|ריאינפורסד דיפסלייט|reinforced deepslate");
def("budding_amethyst", "באדינג אמטיסט", "Budding Amethyst", "אמטיסט מנביט|אמטיסט מצמיח|באדינג אמטיסט|budding amethyst");
def("trial_spawner", "טריאל ספאונר", "Trial Spawner", "ספאונר ניסיון|ספאונר מבחן|טריאל ספאונר|trial spawner");
def("vault", "וולט", "Vault", "כספת|ווֹלט|וולט|vault|ominous vault");
def("farmland", "אדמה חרושה", "Farmland", "אדמה חרושה|אדמה מעובדת|שדה|פארמלנד|farmland|farm land|tilled dirt");
def("frosted_ice", "פרוסטד אייס", "Frosted Ice", "קרח כפור|קרח מכפור|frosted ice");
def("player_head", "ראש שחקן", "Player Head", "ראש שחקן|ראש של שחקן|פלייר הד|player head|steve head");
def("air", "אוויר", "Air", "אוויר|אויר|אייר|air");
def("test_block", "טסט בלוק", "Test Block", "בלוק בדיקה|טסט בלוק|test block|test instance block");
def("infested_stone", "אבן נגועה", "Infested Stone", "אבן נגועה|בלוק נגוע|אבן עם דג כסף|infested stone|infested block|silverfish block|monster egg");
def("ladder", "סולם", "Ladder", "סולם|סולמות|לאדר|ladder|ladders");
def("shelf", "מדף", "Shelf", "מדף|מדפים|שלף|shelf|shelves|wooden shelf");
def("item_frame", "אייטם פריים", "Item Frame", "מסגרת|מסגרת חפצים|מסגרת פריטים|אייטם פריים|item frame|frame|glow item frame");

// ───────────────────────── items ─────────────────────────
def("firework_rocket", "זיקוק", "Firework Rocket", "זיקוק|זיקוקים|זיקוקין|רקטת זיקוקים|רקטה|פיירוורק|firework|fireworks|firework rocket|rocket");
def("wind_charge", "ווינד צ'ארג'", "Wind Charge", "מטען רוח|מטעני רוח|ווינד צ'ארג'|ווינד צארג|wind charge|windcharge|wind charges");
def("steak", "סטייק", "Steak", "סטייק|סטייקים|בשר|בשר בקר|בשר פרה|בקר|סטיק|steak|stake|beef|raw beef|cooked beef");
def("porkchop", "צלע חזיר", "Porkchop", "צלע חזיר|צלעות חזיר|בשר חזיר|פורקצ'ופ|פורק צ'ופ|בייקון|porkchop|pork chop|pork|raw porkchop|cooked porkchop|bacon");
def("chicken_food", "עוף", "Chicken", "עוף|עוף צלוי|תרנגולת|בשר עוף|צ'יקן|chicken|raw chicken|cooked chicken|chiken");
def("mutton", "בשר כבש", "Mutton", "בשר כבש|כבש|מאטון|מטון|mutton|muton|lamb|raw mutton|cooked mutton");
def("rabbit_meat", "בשר ארנב", "Rabbit", "בשר ארנב|ארנב|ראביט|rabbit|raw rabbit|cooked rabbit");
def("potato", "תפוח אדמה", "Potato", "תפוח אדמה|תפוחי אדמה|תפוא|פוטטו|פוטייטו|potato|potatoes|potatos|baked potato|תפוח אדמה אפוי");
def("poisonous_potato", "תפוח אדמה רעיל", "Poisonous Potato", "תפוח אדמה רעיל|תפוא רעיל|תפוח אדמה ירוק|poisonous potato|poison potato");
def("carrot", "גזר", "Carrot", "גזר|גזרים|קרוט|carrot|carrots|carot");
def("golden_carrot", "גזר זהב", "Golden Carrot", "גזר זהב|גזר מוזהב|גזרי זהב|גולדן קרוט|golden carrot|gold carrot");
def("apple", "תפוח", "Apple", "תפוח|תפוחים|אפל|apple|apples|aple");
def("golden_apple", "תפוח זהב", "Golden Apple", "תפוח זהב|תפוחי זהב|תפוח מוזהב|גולדן אפל|גאפל|golden apple|gold apple|gapple|gaple");
def("enchanted_golden_apple", "תפוח זהב מכושף", "Enchanted Golden Apple", "תפוח זהב מכושף|תפוח מכושף|תפוח נוטש|נוטש אפל|enchanted golden apple|enchanted apple|notch apple|god apple|enchanted gapple");
def("bread", "לחם", "Bread", "לחם|לחמים|ברד|bread|bred");
def("cake", "עוגה", "Cake", "עוגה|עוגות|קייק|cake|cakes");
def("cookie", "עוגייה", "Cookie", "עוגייה|עוגיה|עוגיות|קוקי|cookie|cookies|coockie");
def("pumpkin_pie", "פאי דלעת", "Pumpkin Pie", "פאי דלעת|עוגת דלעת|פאי|פמפקין פאי|pumpkin pie|pie");
def("melon_slice", "פרוסת אבטיח", "Melon Slice", "פרוסת אבטיח|אבטיח|מלון|מלון סלייס|melon|melon slice|watermelon");
def("mushroom_stew", "מרק פטריות", "Mushroom Stew", "מרק פטריות|נזיד פטריות|מרק|מאשרום סטו|mushroom stew|mushroom soup|soup|stew");
def("rabbit_stew", "נזיד ארנב", "Rabbit Stew", "נזיד ארנב|מרק ארנב|ראביט סטו|rabbit stew|rabbit soup");
def("beetroot", "סלק", "Beetroot", "סלק|ביטרוט|beetroot|beetroots|beet root|beet");
def("beetroot_soup", "מרק סלק", "Beetroot Soup", "מרק סלק|נזיד סלק|בורשט|ביטרוט סופ|beetroot soup|beet soup|borscht");
def("suspicious_stew", "נזיד חשוד", "Suspicious Stew", "נזיד חשוד|מרק חשוד|סוספישס סטו|suspicious stew|sus stew|suspicious soup");
def("sweet_berries", "סוויט ברי", "Sweet Berries", "פירות יער מתוקים|פירות יער|גרגרים מתוקים|גרגרי יער|ברי|סוויט ברי|סוויט בריז|sweet berries|sweet berry|berries|berry");
def("honey_bottle", "בקבוק דבש", "Honey Bottle", "בקבוק דבש|בקבוקי דבש|דבש|האני|honey bottle|honey|bottle of honey");
def("dried_kelp", "קלפ מיובש", "Dried Kelp", "אצה מיובשת|אצות מיובשות|קלפ מיובש|דרייד קלפ|dried kelp|dry kelp");
def("kelp", "קלפ", "Kelp", "אצה|אצות|קלפ|kelp");
def("rotten_flesh", "בשר רקוב", "Rotten Flesh", "בשר רקוב|בשר זומבי|רוטן פלש|rotten flesh|rotten|flesh|rotton flesh");
def("spider_eye", "עין עכביש", "Spider Eye", "עין עכביש|עיני עכביש|ספיידר איי|spider eye|spidereye|spider eyes");
def("fermented_spider_eye", "עין עכביש מותססת", "Fermented Spider Eye", "עין עכביש מותססת|עין עכביש מותסס|עין עכביש תסוסה|פרמנטד ספיידר איי|fermented spider eye|fermented eye");
def("blaze_powder", "אבקת בלייז", "Blaze Powder", "אבקת בלייז|בלייז פאודר|אבקת להבה|blaze powder|blaze dust");
def("redstone_dust", "רדסטון", "Redstone Dust", "רדסטון|רד סטון|אבקת רדסטון|אבן אדומה|redstone|red stone|redstone dust");
def("glowstone_dust", "אבקת גלואוסטון", "Glowstone Dust", "אבקת גלוסטון|גלוסטון|גלו סטון|glowstone dust|glowstone|glow stone");
def("gunpowder", "אבק שריפה", "Gunpowder", "אבק שריפה|אבק שרפה|אבקת שריפה|גאנפאודר|גאן פאודר|gunpowder|gun powder");
def("sugar", "סוכר", "Sugar", "סוכר|שוגר|sugar|suger");
def("ghast_tear", "דמעת גאסט", "Ghast Tear", "דמעת גאסט|דמעות גאסט|דמעה של גאסט|גאסט טיר|ghast tear|ghast tears|tear");
def("magma_cream", "קרם מאגמה", "Magma Cream", "קרם מאגמה|קרם מגמה|מאגמה קרים|magma cream|magmacream");
def("glistering_melon", "אבטיח זהב", "Glistering Melon Slice", "אבטיח נוצץ|אבטיח זהב|אבטיח מוזהב|גליסטרינג מלון|glistering melon|glistering melon slice|golden melon|shiny melon");
def("rabbit_foot", "רגל ארנב", "Rabbit's Foot", "רגל ארנב|רגל של ארנב|רגלי ארנב|כף רגל ארנב|ראביט פוט|rabbit foot|rabbits foot|rabbit's foot|rabbit feet");
def("turtle_shell", "קסדת צב", "Turtle Shell", "שריון צב|קונכיית צב|קסדת צב|טרטל של|turtle shell|turtle helmet|turtle scute|scute|קשקש צב");
def("phantom_membrane", "קרום פאנטום", "Phantom Membrane", "קרום פנטום|ממברנת פנטום|עור פנטום|פנטום ממברן|phantom membrane|membrane");
def("dragon_breath", "דרגון ברת'", "Dragon's Breath", "נשימת דרקון|נשימת הדרקון|דרגון ברת'|dragon breath|dragons breath|dragon's breath");
def("breeze_rod", "מוט בריז", "Breeze Rod", "מוט בריז|מוטות בריז|בריז רוד|breeze rod|breezerod");
def("slime_block", "בלוק סליים", "Slime Block", "בלוק סליים|סליים בלוק|slime block|slimeblock");
def("ender_pearl", "אנדר פרל", "Ender Pearl", "פנינת אנדר|פנינת אנדרמן|פנינה|אנדר פרל|ender pearl|enderpearl|pearl|ender pearls");
def("eye_of_ender", "עין אנדר", "Eye of Ender", "עין אנדר|עין האנדר|עין של אנדר|אנדר איי|eye of ender|ender eye|endereye");
def("snowball", "כדור שלג", "Snowball", "כדור שלג|כדורי שלג|סנובול|snowball|snow ball");
def("egg", "ביצה", "Egg", "ביצה|ביצים|אג|egg|eggs|blue egg|brown egg|ביצה כחולה|ביצה חומה");
def("trident", "טריידנט", "Trident", "קלשון|קלשונים|טריידנט|טרידנט|trident|tridant");
def("splash_potion", "שיקוי ספלאש", "Splash Potion", "שיקוי התזה|שיקוי זריקה|שיקוי זורק|ספלאש פושן|splash potion|throwable potion|splash");
def("lingering_potion", "שיקוי לינג'רינג", "Lingering Potion", "שיקוי מתמשך|שיקוי ענן|לינגרינג פושן|lingering potion|lingering");
def("xp_bottle", "בקבוק אקספי", "Bottle o' Enchanting", "בקבוק ניסיון|בקבוק אקספי|בקבוק כישוף|בקבוק xp|xp bottle|bottle o enchanting|bottle of enchanting|experience bottle|exp bottle");
def("fishing_rod", "חכה", "Fishing Rod", "חכה|חכות|חכת דיג|פישינג רוד|fishing rod|fishingrod|rod");
def("shears", "מספריים", "Shears", "מספריים|שירס|shears|sheers|scissors");
def("bucket", "דלי", "Bucket", "דלי|דליים|באקט|bucket|buckets|bukket");
def("compass", "מצפן", "Compass", "מצפן|מצפנים|קומפס|compass|compas");
def("shield", "מגן", "Shield", "מגן|מגינים|שילד|shield|sheild");
def("flint_and_steel", "מצית", "Flint and Steel", "צור ופלדה|מצית|פלינט אנד סטיל|flint and steel|flint n steel|lighter");
def("crossbow", "קרוסבואו", "Crossbow", "קשת מוצלבת|רובה קשת|קרוסבו|crossbow|cross bow");
def("bow", "קשת", "Bow", "קשת|קשתות|באו|bow|bows");
def("minecart", "מיינקארט", "Minecart", "עגלה|עגלת מכרה|עגלות|מיינקארט|minecart|mine cart|cart");
def("rail", "מסילה", "Rail", "מסילה|מסילות|פסים|ריל|rail|rails|track|tracks");
def("lodestone", "לודסטון", "Lodestone", "אבן שואבת|לודסטון|lodestone|load stone");
def("saddle", "אוכף", "Saddle", "אוכף|אוכפים|סאדל|saddle|sadle");
def("name_tag", "ניים טאג", "Name Tag", "תגית שם|תג שם|תווית שם|ניימטאג|ניים טאג|name tag|nametag");
def("clock", "שעון", "Clock", "שעון|שעונים|קלוק|clock|watch");
def("lead", "רצועה", "Lead", "רצועה|רצועות|ליד|lead|leash");
def("bundle", "באנדל", "Bundle", "צרור|תיק|שקית|באנדל|bundle|bag");
def("harness", "רתמה", "Harness", "רתמה|רתמות|הרנס|harness|harnes");
def("book", "ספר", "Book", "ספר|ספרים|בוק|book|books");
def("string", "חוט", "String", "חוט|חוטים|סטרינג|string|thread");
def("bone", "עצם", "Bone", "עצם|עצמות|בון|bone|bones");
def("leather", "עור", "Leather", "עור|לדר|leather|lether");
def("leather_boots", "מגפי עור", "Leather Boots", "מגפי עור|מגפיים מעור|לדר בוטס|leather boots");
def("ink_sac", "שק דיו", "Ink Sac", "שק דיו|דיו|שקית דיו|אינק סאק|ink sac|ink sack|ink");
def("bowl", "קערה", "Bowl", "קערה|קערות|באול|bowl|bowls");
def("stick", "מקל", "Stick", "מקל|מקלות|סטיק|stick|sticks");
def("lily_pad", "ליליפד", "Lily Pad", "עלה לוטוס|נופר|עלה נופר|לילי פד|lily pad|lilypad|lily");
def("nautilus_shell", "קונכיית נאוטילוס", "Nautilus Shell", "קונכיית נאוטילוס|קונכייה|קונכיה|נאוטילוס של|nautilus shell|shell");
def("enchanted_book", "אנצ'נטד בוק", "Enchanted Book", "ספר מכושף|ספרים מכושפים|ספר כישוף|אנצ'נטד בוק|enchanted book|enchant book");
def("water_bottle", "בקבוק מים", "Water Bottle", "בקבוק מים|בקבוקי מים|ווטר בוטל|water bottle|bottle of water|potion of water");
def("bamboo", "במבוק", "Bamboo", "במבוק|במבוקים|bamboo|bambo");
def("wool", "צמר", "Wool", "צמר|בלוק צמר|וול|wool|wools|white wool");
def("carved_pumpkin", "דלעת מגולפת", "Carved Pumpkin", "דלעת מגולפת|דלעת חצובה|דלעת|קארבד פמפקין|carved pumpkin|pumpkin|pumpkin head");
def("honeycomb", "חלת דבש", "Honeycomb", "חלת דבש|חלות דבש|האניקום|honeycomb|honey comb");
def("wolf_armor", "שריון זאב", "Wolf Armor", "שריון זאב|שריון כלב|וולף ארמור|wolf armor|dog armor|wolf armour");
def("shulker_shell", "קונכיית שולקר", "Shulker Shell", "קונכיית שולקר|קליפת שולקר|שולקר של|shulker shell|shulker shells");
def("elytra", "אליטרה", "Elytra", "אליטרה|אלייטרה|אליטרא|כנפיים|elytra|elytras|wings|elitra");
def("dragon_head", "ראש דרקון", "Dragon Head", "ראש דרקון|ראש הדרקון|דרגון הד|dragon head|dragon skull");
def("iron_nugget", "נאגט ברזל", "Iron Nugget", "גוש ברזל קטן|נאגט ברזל|גושון ברזל|גרגר ברזל|איירון נאגט|iron nugget|iron nuggets");
def("gold_nugget", "נאגט זהב", "Gold Nugget", "גוש זהב קטן|נאגט זהב|גושון זהב|גרגר זהב|גולד נאגט|gold nugget|gold nuggets|golden nugget");
def("golden_dandelion", "שן הארי זהובה", "Golden Dandelion", "שן הארי זהובה|שן הארי זהב|שן ארי זהב|גולדן דנדליון|golden dandelion|gold dandelion");

// ───────────────────────── enchantments ─────────────────────────
def("protection", "פרוטקשן", "Protection", "הגנה|פרוטקשן|פרוטקשין|protection|protecion|prot");
def("fire_protection", "פייר פרוטקשן", "Fire Protection", "הגנה מאש|הגנת אש|פייר פרוטקשן|fire protection|fire prot");
def("blast_protection", "בלאסט פרוטקשן", "Blast Protection", "הגנה מפיצוצים|הגנה מפיצוץ|הגנת פיצוץ|בלאסט פרוטקשן|blast protection|blast prot");
def("projectile_protection", "פרוג'קטייל פרוטקשן", "Projectile Protection", "הגנה מקליעים|הגנה מחיצים|הגנת קליעים|פרוג'קטייל פרוטקשן|projectile protection|projectile prot|proj prot");
def("feather_falling", "פיתר פולינג", "Feather Falling", "נפילת נוצה|נפילה כנוצה|פת'ר פולינג|פדר פולינג|feather falling|featherfalling|feather fall");
def("respiration", "רספירציה", "Respiration", "נשימה|רספירציה|ריספירציה|respiration|respiraton");
def("aqua_affinity", "אקווה אפיניטי", "Aqua Affinity", "זיקה למים|אקווה אפיניטי|אקוואה אפיניטי|aqua affinity|aqua afinity");
def("thorns", "ת'ורנס", "Thorns", "קוצים|קוץ|ת'ורנס|תורנס|thorns|thorn");
def("depth_strider", "דפת' סטרידר", "Depth Strider", "צועד מעמקים|דפת' סטריידר|דפת סטריידר|דפט סטריידר|depth strider|depthstrider");
def("frost_walker", "פרוסט ווקר", "Frost Walker", "הולך כפור|הולך על קרח|פרוסט ווקר|frost walker|frostwalker");
def("curse_binding", "קרס אוף בינדינג", "Curse of Binding", "קללת הקשירה|קללת קשירה|קשירה|קרס אוף ביינדינג|curse of binding|binding curse|binding");
def("soul_speed", "סול ספיד", "Soul Speed", "מהירות נשמה|מהירות נשמות|סול ספיד|soul speed|soulspeed");
def("swift_sneak", "סוויפט סניק", "Swift Sneak", "התגנבות מהירה|סוויפט סניק|swift sneak|swiftsneak");
def("sharpness", "שארפנס", "Sharpness", "חדות|שארפנס|שרפנס|שארפ|sharpness|sharpnes|sharp");
def("smite", "סמייט", "Smite", "הכאה|סמייט|מכת אל מתים|smite|smight");
def("bane", "ביין אוף ארת'רופודס", "Bane of Arthropods", "אויב פרוקי הרגליים|פרוקי רגליים|ביין אוף ארתרופודס|bane of arthropods|bane|arthropods|bane of arthropod");
def("knockback", "נוקבק", "Knockback", "הדיפה|נוקבק|נוק בק|knockback|knock back|kb");
def("fire_aspect", "פייר אספקט", "Fire Aspect", "היבט אש|פייר אספקט|חרב אש|fire aspect|fireaspect");
def("looting", "לוטינג", "Looting", "ביזה|שלל|לוטינג|looting|loting");
def("sweeping_edge", "סוויפינג אדג'", "Sweeping Edge", "להב סוחף|סוויפינג אדג'|sweeping edge|sweeping|sweep");
def("efficiency", "אפישנסי", "Efficiency", "יעילות|אפישנסי|איפישנסי|efficiency|efficency|eff");
def("silk_touch", "סילק טאץ'", "Silk Touch", "מגע משי|סילק טאץ'|silk touch|silktouch|silk");
def("unbreaking", "אנבריקינג", "Unbreaking", "בלתי שביר|אנבריקינג|אן ברייקינג|עמידות|unbreaking|unbreakable|unbreak");
def("fortune", "פורצ'ן", "Fortune", "פורצ'ן|פורצן|מזל|עושר|fortune|fortun");
def("power", "פאוור", "Power", "עוצמה|כוח|כח|פאוור|power");
def("punch", "פאנץ'", "Punch", "אגרוף|פאנץ'|punch");
def("flame", "פליים", "Flame", "להבה|פליים|flame");
def("infinity", "אינפיניטי", "Infinity", "אינסוף|אינפיניטי|infinity|infinite|infinty");
def("luck_of_the_sea", "לאק אוף דה סי", "Luck of the Sea", "מזל הים|לאק אוף דה סי|luck of the sea|luck of sea");
def("lure", "לור", "Lure", "פיתיון|פתיון|לור|lure");
def("loyalty", "לויאלטי", "Loyalty", "נאמנות|לויאלטי|loyalty|loyality");
def("impaling", "אימפיילינג", "Impaling", "שיפוד|אימפיילינג|impaling|impale");
def("riptide", "ריפטייד", "Riptide", "זרם קורע|ריפטייד|riptide|rip tide");
def("channeling", "צ'אנלינג", "Channeling", "תיעול|צ'אנלינג|channeling|channelling|chaneling");
def("multishot", "מולטישוט", "Multishot", "ירי מרובה|מולטישוט|מולטי שוט|multishot|multi shot");
def("quick_charge", "קוויק צ'ארג'", "Quick Charge", "טעינה מהירה|קוויק צ'ארג'|quick charge|quickcharge");
def("piercing", "פירסינג", "Piercing", "חודר|חדירה|פירסינג|piercing|pierce");
def("mending", "מנדינג", "Mending", "תיקון|מנדינג|mending|mend|meding");
def("curse_vanishing", "קרס אוף ונישינג", "Curse of Vanishing", "קללת ההיעלמות|קללת היעלמות|היעלמות|curse of vanishing|vanishing curse|vanishing");
def("density", "דנסיטי", "Density", "צפיפות|דנסיטי|density");
def("breach", "בריץ'", "Breach", "פריצה|ביקוע|ברץ'|breach");
def("wind_burst", "ווינד בורסט", "Wind Burst", "פרץ רוח|ווינד ברסט|wind burst|windburst");
def("lunge", "לאנג'", "Lunge", "זינוק|לאנג'|lunge");

// ───────────────────────── biomes ─────────────────────────
def("plains", "פליינס", "Plains", "מישור|מישורים|פליינס|plains|plain|grassland");
def("sunflower_plains", "סאנפלאואר פליינס", "Sunflower Plains", "מישור חמניות|מישור חמנית|סאנפלאואר פליינס|sunflower plains");
def("snowy_plains", "סנואי פליינס", "Snowy Plains", "מישור מושלג|מישור שלג|מישורים מושלגים|שלג|טונדרה|snowy plains|snow plains|snowy tundra|tundra|snow|ice plains");
def("ice_spikes", "אייס ספייקס", "Ice Spikes", "קוצי קרח|קוצי הקרח|ספייקים של קרח|אייס ספייקס|ice spikes|ice spike");
def("desert", "דזרט", "Desert", "מדבר|מדבריות|דזרט|desert|dessert|desrt");
def("swamp", "סוואמפ", "Swamp", "ביצה|ביצות|סוואמפ|swamp|swamps|swampland");
def("mangrove_swamp", "מנגרוב סוואמפ", "Mangrove Swamp", "ביצת מנגרובים|ביצת מנגרוב|מנגרוב|מנגרובים|mangrove swamp|mangrove");
def("forest", "יער", "Forest", "יער|יערות|פורסט|forest|forrest");
def("flower_forest", "פלאואר פורסט", "Flower Forest", "יער פרחים|יער הפרחים|פלאוור פורסט|flower forest");
def("birch_forest", "ברץ' פורסט", "Birch Forest", "יער ליבנה|יער בירץ'|בירץ' פורסט|birch forest|birch");
def("old_growth_birch", "אולד גרואת' ברץ' פורסט", "Old Growth Birch Forest", "יער ליבנה עתיק|יער ליבנה גבוה|old growth birch forest|tall birch forest");
def("dark_forest", "דארק פורסט", "Dark Forest", "יער אפל|יער חשוך|יער כהה|דארק פורסט|dark forest|roofed forest|dark oak forest");
def("pale_garden", "פייל גארדן", "Pale Garden", "גן חיוור|הגן החיוור|גן לבן|פייל גארדן|pale garden|pale forest");
def("taiga", "טייגה", "Taiga", "טייגה|טאיגה|טיגה|taiga|tiaga|taega");
def("snowy_taiga", "סנואי טייגה", "Snowy Taiga", "טייגה מושלגת|טייגה שלג|טייגה קרה|snowy taiga|cold taiga|snow taiga");
def("old_growth_pine", "אולד גרואת' פיין טייגה", "Old Growth Pine Taiga", "טייגת אורנים עתיקה|טייגה עתיקה|טייגת אורנים|old growth pine taiga|giant tree taiga|mega taiga|pine taiga");
def("old_growth_spruce", "אולד גרואת' ספרוס טייגה", "Old Growth Spruce Taiga", "טייגת אשוחים עתיקה|טייגת אשוחים|old growth spruce taiga|giant spruce taiga|mega spruce taiga|spruce taiga");
def("savanna", "סוואנה", "Savanna", "סוואנה|סבאנה|סוונה|סאוונה|savanna|savannah|savana");
def("savanna_plateau", "סוואנה פלאטו", "Savanna Plateau", "רמת סוואנה|סוואנה גבוהה|savanna plateau|savannah plateau");
def("windswept_hills", "ווינדסוופט הילס", "Windswept Hills", "גבעות סוערות|גבעות רוח|הרים|הרים קיצוניים|הר|וינדסוופט הילס|windswept hills|extreme hills|mountains|mountain");
def("windswept_gravelly", "ווינדסוופט גרבלי הילס", "Windswept Gravelly Hills", "גבעות חצץ סוערות|גבעות חצץ|windswept gravelly hills|gravelly mountains|gravel hills");
def("windswept_forest", "ווינדסוופט פורסט", "Windswept Forest", "יער סוער|יער רוח|windswept forest|wooded mountains|extreme hills forest");
def("windswept_savanna", "ווינדסוופט סוואנה", "Windswept Savanna", "סוואנה סוערת|windswept savanna|shattered savanna");
def("jungle", "ג'ונגל", "Jungle", "ג'ונגל|צ'ונגל|jungle|jungel");
def("sparse_jungle", "ספארס ג'ונגל", "Sparse Jungle", "ג'ונגל דליל|ג'ונגל קטן|sparse jungle|jungle edge");
def("bamboo_jungle", "במבוק ג'ונגל", "Bamboo Jungle", "ג'ונגל במבוק|ג'ונגל במבוקים|יער במבוק|bamboo jungle|bamboo forest");
def("badlands", "בדלנדס", "Badlands", "בדלנדס|באדלנדס|מסה|מזה|אדמות רעות|badlands|bad lands|mesa");
def("eroded_badlands", "ארודד בדלנדס", "Eroded Badlands", "בדלנדס שחוק|בדלנדס סחוף|eroded badlands|eroded mesa|mesa bryce");
def("wooded_badlands", "וודד בדלנדס", "Wooded Badlands", "בדלנדס מיוער|wooded badlands|wooded badlands plateau|mesa plateau");
def("meadow", "מדו", "Meadow", "אחו|כר דשא|מדו|meadow|medow");
def("cherry_grove", "צ'רי גרוב", "Cherry Grove", "חורשת דובדבן|חורשת דובדבנים|יער דובדבן|יער דובדבנים|צ'רי גרוב|ביום הדובדבן|cherry grove|cherry blossom|cherry forest|cherry");
def("grove", "גרוב", "Grove", "חורשה|גרוב|grove");
def("snowy_slopes", "סנואי סלופס", "Snowy Slopes", "מדרונות מושלגים|מדרון מושלג|סנואי סלופס|snowy slopes|snow slopes");
def("frozen_peaks", "פרוזן פיקס", "Frozen Peaks", "פסגות קפואות|פסגה קפואה|פרוזן פיקס|frozen peaks");
def("jagged_peaks", "ג'אגד פיקס", "Jagged Peaks", "פסגות משוננות|פסגות חדות|ג'אגד פיקס|jagged peaks");
def("stony_peaks", "סטוני פיקס", "Stony Peaks", "פסגות סלעיות|פסגות אבן|סטוני פיקס|stony peaks|stone peaks");
def("river", "נהר", "River", "נהר|נהרות|ריבר|river");
def("frozen_river", "פרוזן ריבר", "Frozen River", "נהר קפוא|פרוזן ריבר|frozen river");
def("beach", "חוף", "Beach", "חוף|חוף ים|ביץ'|beach|beatch");
def("snowy_beach", "סנואי ביץ'", "Snowy Beach", "חוף מושלג|חוף שלג|snowy beach|cold beach|snow beach");
def("stony_shore", "סטוני שור", "Stony Shore", "חוף סלעי|חוף אבנים|stony shore|stone shore|stone beach");
def("ocean", "אושן", "Ocean", "אוקיינוס|אוקיאנוס|ים|אושן|ocean|sea|oceans");
def("deep_ocean", "דיפ אושן", "Deep Ocean", "אוקיינוס עמוק|ים עמוק|דיפ אושן|deep ocean");
def("warm_ocean", "וורם אושן", "Warm Ocean", "אוקיינוס חם|ים חם|וורם אושן|שונית אלמוגים|warm ocean|coral reef");
def("lukewarm_ocean", "לוקוורם אושן", "Lukewarm Ocean", "אוקיינוס פושר|ים פושר|lukewarm ocean");
def("deep_lukewarm_ocean", "דיפ לוקוורם אושן", "Deep Lukewarm Ocean", "אוקיינוס פושר עמוק|deep lukewarm ocean");
def("cold_ocean", "קולד אושן", "Cold Ocean", "אוקיינוס קר|ים קר|cold ocean");
def("deep_cold_ocean", "דיפ קולד אושן", "Deep Cold Ocean", "אוקיינוס קר עמוק|deep cold ocean");
def("frozen_ocean", "פרוזן אושן", "Frozen Ocean", "אוקיינוס קפוא|ים קפוא|פרוזן אושן|frozen ocean");
def("deep_frozen_ocean", "דיפ פרוזן אושן", "Deep Frozen Ocean", "אוקיינוס קפוא עמוק|deep frozen ocean");
def("mushroom_fields", "מאשרום פילדס", "Mushroom Fields", "אי פטריות|איי פטריות|שדות פטריות|ביום פטריות|מאשרום פילדס|mushroom fields|mushroom island|mushroom biome");
def("dripstone_caves", "דריפסטון קייבס", "Dripstone Caves", "מערות נטיפים|מערת נטיפים|דריפסטון קייבס|dripstone caves|dripstone cave|dripstone");
def("lush_caves", "לאש קייבס", "Lush Caves", "מערות שופעות|מערות ירוקות|מערה ירוקה|מערות פורחות|לאש קייבס|lush caves|lush cave");
def("deep_dark", "דיפ דארק", "Deep Dark", "האופל העמוק|אופל עמוק|החושך העמוק|דיפ דארק|deep dark|deepdark");
def("sulfur_caves", "סולפר קייבס", "Sulfur Caves", "מערות גופרית|מערת גופרית|sulfur caves|sulphur caves|sulfur cave");
def("dappled_forest", "דאפלד פורסט", "Dappled Forest", "יער מנומר|יער סתיו|יער שלכת|דאפלד פורסט|dappled forest|autumn forest");
def("nether_wastes", "נת'ר ווייסטס", "Nether Wastes", "שממות הנתר|שממת נתר|נתר|נתר וויסטס|nether wastes|nether waste|nether");
def("soul_sand_valley", "סול סנד ואלי", "Soul Sand Valley", "עמק חול הנשמות|עמק חול נשמות|עמק הנשמות|סול סנד וואלי|soul sand valley|soulsand valley|soul valley");
def("crimson_forest", "קרימזון פורסט", "Crimson Forest", "יער ארגמן|יער אדום|קרימזון פורסט|crimson forest|red forest");
def("warped_forest", "וורפד פורסט", "Warped Forest", "יער מעוות|יער כחול|וורפד פורסט|warped forest|blue forest");
def("basalt_deltas", "באזלט דלטס", "Basalt Deltas", "דלתות בזלת|דלתא בזלת|דלתת בזלת|בזלט דלתאס|basalt deltas|basalt delta");
def("the_end", "האנד", "The End", "אנד|האנד|דה אנד|the end|end|end dimension");
def("end_highlands", "אנד היילנדס", "End Highlands", "רמות האנד|end highlands");
def("end_midlands", "אנד מידלנדס", "End Midlands", "אמצע האנד|end midlands");
def("small_end_islands", "סמול אנד איילנדס", "Small End Islands", "איי אנד קטנים|איים קטנים באנד|small end islands|end islands");
def("end_barrens", "אנד בארנס", "End Barrens", "שממות האנד|end barrens");
def("the_void", "הוויד", "The Void", "ריק|הריק|וויד|the void|void");

// ───────────────────────── structures ─────────────────────────
def("village", "וילג'", "Village", "כפר|כפרים|וילג'|village|villages|vilage");
def("desert_pyramid", "דזרט טמפל", "Desert Pyramid", "מקדש מדבר|מקדש המדבר|פירמידה|פירמידת מדבר|מקדש|desert temple|desert pyramid|pyramid|temple");
def("jungle_pyramid", "ג'ונגל טמפל", "Jungle Pyramid", "מקדש ג'ונגל|מקדש הג'ונגל|jungle temple|jungle pyramid");
def("stronghold", "סטרונגהולד", "Stronghold", "מבצר|סטרונגהולד|סטרונג הולד|stronghold|strong hold|strongold");
def("mineshaft", "מיינשפט", "Mineshaft", "מכרה נטוש|מכרה|מכרות|מיינשאפט|mineshaft|mine shaft|abandoned mineshaft|mine");
def("ocean_monument", "אושן מונומנט", "Ocean Monument", "מקדש תת ימי|מקדש תת-ימי|מקדש מים|מונומנט|אושן מונומנט|ocean monument|monument|water temple|ocean temple");
def("woodland_mansion", "וודלנד מאנשן", "Woodland Mansion", "אחוזת יער|אחוזה|ארמון|וודלנד מנשן|מנשן|woodland mansion|mansion|woodland mension");
def("shipwreck", "ספינה טרופה", "Shipwreck", "ספינה טרופה|ספינה שטבעה|ספינה|שיפרק|shipwreck|ship wreck|ship");
def("ruined_portal", "פורטל הרוס", "Ruined Portal", "פורטל הרוס|פורטל שבור|רואינד פורטל|ruined portal|broken portal");
def("nether_fortress", "נת'ר פורטרס", "Nether Fortress", "מבצר נתר|מבצר הנתר|נתר פורטרס|פורטרס|nether fortress|fortress|nether fort");
def("bastion", "בסטיון", "Bastion Remnant", "בסטיון|באסטיון|שרידי בסטיון|bastion|bastion remnant|bastian|piglin castle");
def("end_city", "אנד סיטי", "End City", "עיר אנד|עיר האנד|ערי אנד|אנד סיטי|end city|endcity");
def("pillager_outpost", "פילג'ר אאוטפוסט", "Pillager Outpost", "מוצב פילג'רים|מגדל פילג'רים|מוצב|אאוטפוסט|pillager outpost|outpost|pillager tower");
def("igloo", "איגלו", "Igloo", "איגלו|igloo|iglo");
def("witch_hut", "בקתת מכשפה", "Swamp Hut", "בקתת מכשפה|בית מכשפה|בקתת המכשפה|witch hut|swamp hut|witch house");
def("ancient_city", "אנשנט סיטי", "Ancient City", "עיר עתיקה|העיר העתיקה|ערים עתיקות|אנשנט סיטי|ancient city|ancient cities");
def("trail_ruins", "טרייל רואינס", "Trail Ruins", "חורבות שביל|חורבות|טרייל רואינס|trail ruins|trail ruin");
def("trial_chambers", "טריאל צ'יימבר", "Trial Chambers", "חדרי ניסיון|חדר ניסיון|חדרי מבחן|טריאל צ'יימברס|trial chambers|trial chamber");
def("ocean_ruins", "אושן רואינס", "Ocean Ruins", "חורבות ים|חורבות אוקיינוס|חורבות תת ימיות|ocean ruins|underwater ruins");
def("buried_treasure", "אוצר קבור", "Buried Treasure", "אוצר קבור|אוצר|תיבת אוצר|buried treasure|treasure");
def("desert_well", "באר מדבר", "Desert Well", "באר מדבר|באר במדבר|באר|desert well|well");
def("dungeon", "דאנג'ן", "Monster Room", "צינוק|דאנג'ן|דנג'ן|חדר מפלצות|חדר ספאונר|dungeon|monster room|spawner room");
def("fossil", "מאובן", "Fossil", "מאובן|מאובנים|שלד דינוזאור|fossil|fosil|dinosaur");
def("geode", "גאודת אמטיסט", "Amethyst Geode", "גאודה|גיאודה|גאודת אמטיסט|אמטיסט|geode|amethyst geode|amethyst");
def("abandoned_camp", "מחנה נטוש", "Abandoned Camp", "מחנה נטוש|מחנה|קמפ|abandoned camp|camp");
def("nether_fossil", "נת'ר פוסיל", "Nether Fossil", "מאובן נתר|nether fossil");

// Effects (also used by potions)
def("speed", "ספיד", "Speed", "מהירות|מהיר|ספיד|speed|swiftness");
def("strength", "כוח", "Strength", "כוח|כח|סטרנגת'|strength|strenght|strengh");
def("regeneration", "ריג'ן", "Regeneration", "התחדשות|ריג'ן|רגנרציה|ריג'נרציה|רג'נרציה|regeneration|regen|regenaration");
def("invisibility", "בלתי נראה", "Invisibility", "היעלמות|בלתי נראה|אי נראות|שקיפות|אינביזיביליטי|invisibility|invisible|invis|invisibilty");
def("night_vision", "נייט ויז'ן", "Night Vision", "ראיית לילה|ראייה לילית|ראייה בלילה|נייט ויז'ן|night vision|nightvision");
def("poison", "פויזן", "Poison", "רעל|הרעלה|פויזן|poison|poisen");
def("fire_resistance", "עמידות לאש", "Fire Resistance", "עמידות לאש|חסינות לאש|פייר רזיסטנס|fire resistance|fire res");
def("water_breathing", "נשימה מתחת למים", "Water Breathing", "נשימה מתחת למים|נשימה במים|נשימת מים|ווטר ברידינג|water breathing");
def("slowness", "סלואו", "Slowness", "איטיות|האטה|סלואונס|slowness|slow");
def("weakness", "חולשה", "Weakness", "חולשה|ויקנס|weakness|weak");
def("slow_falling", "נפילה איטית", "Slow Falling", "נפילה איטית|נפילה רכה|סלואו פולינג|slow falling|slowfall|slow fall");

// ───────────────────────── the questions ─────────────────────────
export const QUESTIONS = [
  // ── mobs ──
  {
    id: 'mob-undead', cat: 'mobs', q: "תנו שם של מוב אנדד (מת-חי)",
    answers: [
      A('zombie', 1), A('skeleton', 1), A('drowned', 2), A('wither_skeleton', 2), A('husk', 3), A('stray', 3),
      A('zombie_villager', 3), A('zombified_piglin', 3), A('phantom', 3), A('wither', 3), A('zoglin', 4),
      A('skeleton_horse', 4), A('zombie_horse', 4), A('bogged', 4), A('parched', 5), A('camel_husk', 5), A('zombie_nautilus', 5),
    ],
  },
  {
    id: 'mob-tameable', cat: 'mobs', q: "תנו שם של מוב שאפשר לאלף",
    answers: [
      A('wolf', 1), A('cat', 2), A('horse', 2), A('parrot', 3), A('donkey', 3), A('llama', 3), A('mule', 4),
      A('nautilus', 4), A('zombie_horse', 4), A('trader_llama', 5), A('skeleton_horse', 5), A('zombie_nautilus', 5),
    ],
  },
  {
    id: 'mob-rideable', cat: 'mobs', q: "תנו שם של מוב שאפשר לרכוב עליו",
    answers: [
      A('horse', 1), A('pig', 2), A('camel', 2), A('happy_ghast', 2), A('donkey', 3), A('llama', 3), A('strider', 3),
      A('mule', 4), A('skeleton_horse', 4), A('zombie_horse', 4), A('nautilus', 4), A('trader_llama', 5),
      A('camel_husk', 5), A('zombie_nautilus', 5),
    ],
  },
  {
    id: 'mob-flying', cat: 'mobs', q: "תנו שם של מוב שיכול לעוף",
    answers: [
      A('ender_dragon', 1), A('phantom', 1), A('bat', 2), A('parrot', 2), A('bee', 2), A('ghast', 2),
      A('happy_ghast', 3), A('wither', 3), A('allay', 4), A('blaze', 4), A('vex', 4),
    ],
  },
  {
    id: 'mob-leather', cat: 'mobs', q: "תנו שם של מוב שמפיל עור",
    answers: [
      A('cow', 1), A('horse', 2), A('mooshroom', 3), A('donkey', 3), A('llama', 3), A('mule', 4), A('hoglin', 4), A('trader_llama', 5),
    ],
  },
  {
    id: 'mob-raw-food', cat: 'mobs', q: "תנו שם של מוב שמפיל אוכל שאפשר לבשל",
    answers: [
      A('cow', 1), A('pig', 1), A('chicken', 2, 'עוף'), A('sheep', 2), A('cod', 2), A('rabbit', 3), A('mooshroom', 3),
      A('salmon', 3), A('hoglin', 4), A('polar_bear', 4), A('dolphin', 5), A('guardian', 5), A('elder_guardian', 5),
    ],
  },
  {
    id: 'mob-breed', cat: 'mobs', q: "תנו שם של חיה שאפשר להרביע ולקבל בייבי",
    answers: [
      A('cow', 1), A('pig', 1), A('sheep', 2), A('chicken', 2), A('horse', 2), A('wolf', 2), A('cat', 3), A('rabbit', 3),
      A('donkey', 3), A('llama', 3), A('turtle', 3), A('panda', 3), A('fox', 3), A('bee', 3), A('goat', 3), A('axolotl', 3),
      A('mooshroom', 4), A('frog', 4), A('camel', 4), A('sniffer', 4), A('armadillo', 4), A('hoglin', 4), A('strider', 4),
      A('ocelot', 4), A('villager', 5), A('nautilus', 5), A('trader_llama', 5),
    ],
  },
  {
    id: 'mob-ranged', cat: 'mobs', q: "תנו שם של מוב שתוקף מרחוק (יורה, זורק או יורק)",
    answers: [
      A('skeleton', 1), A('ghast', 2), A('blaze', 2), A('pillager', 2), A('witch', 3), A('stray', 3), A('drowned', 3),
      A('shulker', 3), A('snow_golem', 3), A('wither', 3), A('ender_dragon', 3), A('breeze', 3), A('llama', 4),
      A('piglin', 4), A('guardian', 4), A('warden', 4), A('evoker', 4), A('bogged', 4), A('parched', 5),
      A('elder_guardian', 5), A('trader_llama', 5),
    ],
  },
  {
    id: 'mob-rotten-flesh', cat: 'mobs', q: "תנו שם של מוב שמפיל בשר רקוב",
    answers: [
      A('zombie', 1), A('drowned', 2), A('zombie_villager', 2), A('husk', 3), A('zombified_piglin', 3), A('zoglin', 4),
      A('zombie_horse', 4), A('camel_husk', 5), A('zombie_nautilus', 5),
    ],
  },
  {
    id: 'mob-can-attack', cat: 'mobs', q: "תנו שם של מוב שיכול לתקוף אותך",
    answers: [
      A('zombie', 1), A('creeper', 1), A('skeleton', 2), A('spider', 2), A('enderman', 2), A('witch', 3), A('slime', 3),
      A('phantom', 3), A('drowned', 3), A('husk', 3), A('stray', 3), A('cave_spider', 3), A('silverfish', 3), A('blaze', 3),
      A('ghast', 3), A('magma_cube', 3), A('piglin', 3), A('zombified_piglin', 3), A('hoglin', 3), A('wither_skeleton', 3),
      A('guardian', 3), A('vindicator', 3), A('pillager', 3), A('ravager', 3), A('warden', 3), A('creaking', 3),
      A('ender_dragon', 3), A('wither', 3), A('wolf', 3), A('iron_golem', 3, 'גולם|golem'), A('bee', 3),
      A('endermite', 4), A('zoglin', 4), A('piglin_brute', 4), A('elder_guardian', 4), A('shulker', 4), A('vex', 4),
      A('evoker', 4), A('breeze', 4), A('bogged', 4), A('zombie_villager', 4), A('polar_bear', 4), A('llama', 4),
      A('goat', 4), A('pufferfish', 4), A('parched', 5), A('trader_llama', 5), A('panda', 5), A('dolphin', 5),
      A('nautilus', 5), A('zombie_nautilus', 5),
    ],
  },
  {
    id: 'mob-bucket', cat: 'mobs', q: "תנו שם של מוב שאפשר להשתמש עליו בדלי",
    answers: [
      A('cow', 1), A('axolotl', 1), A('cod', 2), A('goat', 3), A('salmon', 3), A('pufferfish', 3), A('tropical_fish', 4),
      A('mooshroom', 4), A('tadpole', 4), A('sulfur_cube', 5),
    ],
  },
  {
    id: 'mob-villager-job', cat: 'mobs', q: "תנו שם של מקצוע של וילג'ר",
    answers: [
      X('ספרן', 'Librarian', 1, 'ספרן|ספרנית|ספרנים|לייבררין|ליברריאן|librarian|libraian|librarien'),
      X('חקלאי', 'Farmer', 1, 'חקלאי|חקלאים|איכר|פרמר|farmer|famer'),
      X('דייג', 'Fisherman', 2, 'דייג|דייגים|פישרמן|fisherman|fishermen|fisher'),
      X('קצב', 'Butcher', 3, 'קצב|קצבים|בוצ\'ר|butcher|bucher'),
      X("קלריק", 'Cleric', 3, "כומר|כמרים|כוהן|כהן|קלריק|cleric|priest|kleric"),
      X('רועה', 'Shepherd', 3, 'רועה|רועה צאן|שפרד|shepherd|sheperd|shepard'),
      X('קרטוגרף', 'Cartographer', 3, 'קרטוגרף|קרטוגרפר|ממפה|יוצר מפות|cartographer|cartografer|mapmaker'),
      X("פלצ'ר", 'Fletcher', 3, "חצן|יוצר חיצים|פלצ'ר|פלטשר|fletcher|flecher"),
      X("ארמורר", 'Armorer', 4, "שריונאי|שריונר|ארמורר|ארמרר|armorer|armourer|armor smith"),
      X("וופנסמית'", 'Weaponsmith', 4, "נפח נשק|נפח נשקים|וופונסמית'|weaponsmith|weapon smith"),
      X("טולסמית'", 'Toolsmith', 4, "נפח כלים|טולסמית'|toolsmith|tool smith"),
      X("מייסון", 'Mason', 4, "בנאי|סתת|מייסון|מסון|mason|stone mason|stonemason"),
      X("לד'רוורקר", 'Leatherworker', 4, "עבדן עורות|עבדן|עובד עור|לדרוורקר|leatherworker|leather worker"),
      X('ניטוויט', 'Nitwit', 5, 'ניטוויט|נטוויט|כפרי טיפש|כפרי ירוק|nitwit|nit wit'),
    ],
  },

  // ── nether ──
  {
    id: 'nether-mobs', cat: 'nether', q: "תנו שם של מוב שחי בנת'ר",
    answers: [
      A('ghast', 1), A('piglin', 1), A('blaze', 2), A('zombified_piglin', 2), A('magma_cube', 2), A('wither_skeleton', 3),
      A('hoglin', 3), A('strider', 3), A('piglin_brute', 4), A('enderman', 4), A('skeleton', 5),
    ],
  },
  {
    id: 'nether-blocks', cat: 'nether', q: "תנו שם של בלוק שיש בנת'ר באופן טבעי",
    answers: [
      A('netherrack', 1), A('soul_sand', 2), A('glowstone', 2), A('lava', 2), A('magma_block', 3), A('nether_quartz_ore', 3),
      A('ancient_debris', 3), A('basalt', 3), A('blackstone', 3), A('nether_bricks', 3), A('soul_soil', 4),
      A('crimson_nylium', 4), A('warped_nylium', 4), A('crimson_stem', 4), A('warped_stem', 4), A('nether_wart_block', 4),
      A('warped_wart_block', 4), A('shroomlight', 4), A('nether_gold_ore', 4), A('crimson_fungus', 4), A('warped_fungus', 4),
      A('weeping_vines', 4), A('twisting_vines', 4), A('nether_wart', 4), A('gravel', 4), A('obsidian', 4),
      A('crying_obsidian', 4), A('fire', 4), A('gold_block', 4), A('spawner', 4), A('nether_portal', 4),
      A('gilded_blackstone', 5), A('crimson_roots', 5), A('warped_roots', 5), A('nether_sprouts', 5), A('nether_brick_fence', 5),
      A('bone_block', 5), A('chest', 5), A('mushroom', 5), A('polished_blackstone_bricks', 5), A('polished_basalt', 5),
      A('chain', 5), A('dried_ghast', 5),
    ],
  },
  {
    id: 'nether-barter', cat: 'nether', q: "תנו שם של משהו שפיגלין נותן לך כשזורקים לו זהב",
    answers: [
      A('ender_pearl', 1), A('obsidian', 2), A('crying_obsidian', 2),
      X('שיקוי עמידות לאש', 'Potion of Fire Resistance', 3, 'שיקוי עמידות לאש|שיקוי חסינות לאש|עמידות לאש|fire resistance|potion of fire resistance|fire resistance potion|splash potion of fire resistance|fire res potion'),
      A('enchanted_book', 3, 'soul speed book|ספר מהירות נשמה|ספר סול ספיד'), A('string', 3), X('קוורץ', 'Nether Quartz', 3, 'קוורץ|קווארץ|קוורץ נתר|quartz|nether quartz'),
      A('iron_nugget', 3), X("פייר צ'ארג'", 'Fire Charge', 3, "כדור אש|כדורי אש|פייר צ'ארג'|fire charge|firecharge|fireball"),
      A('soul_sand', 3), A('gravel', 4), A('blackstone', 4), A('leather', 4),
      X("נת'ר בריק", 'Nether Brick', 4, "לבנת נתר|לבני נתר|נתר בריק|nether brick|nether bricks"),
      X("חץ ספקטרלי", 'Spectral Arrow', 4, "חץ זוהר|חיצים זוהרים|ספקטרל ארו|spectral arrow|spectral arrows|glowing arrow"),
      X('מגפי ברזל', 'Iron Boots', 4, 'מגפי ברזל|מגפיים מברזל|איירון בוטס|iron boots|soul speed boots'),
      A('water_bottle', 5),
    ],
  },

  // ── ocean ──
  {
    id: 'ocean-mobs', cat: 'ocean', q: "תנו שם של מוב שחי במים",
    answers: [
      A('cod', 1), A('squid', 1), A('dolphin', 2), A('pufferfish', 2), A('turtle', 2), A('axolotl', 2), A('salmon', 3),
      A('tropical_fish', 3), A('glow_squid', 3), A('drowned', 3), A('guardian', 3), A('elder_guardian', 4),
      A('nautilus', 4), A('frog', 4), A('tadpole', 5), A('zombie_nautilus', 5),
    ],
  },
  {
    id: 'ocean-monument', cat: 'ocean', q: "תנו שם של משהו שמוצאים באושן מונומנט",
    answers: [
      A('guardian', 1), A('elder_guardian', 1), A('sea_lantern', 2),
      X('ספוג', 'Sponge', 2, 'ספוג|ספוגים|ספוג רטוב|ספאנג\'|sponge|sponges|wet sponge'),
      X('פריזמרין', 'Prismarine', 2, 'פריזמרין|פריזמארין|פריזמרינים|prismarine|prismarin'),
      A('gold_block', 3),
      X("פריזמרין בריקס", 'Prismarine Bricks', 3, "לבני פריזמרין|פריזמרין בריקס|prismarine bricks|prismarine brick"),
      X("דארק פריזמרין", 'Dark Prismarine', 3, "פריזמרין כהה|דארק פריזמרין|dark prismarine"),
      X("פריזמרין שארד", 'Prismarine Shard', 4, "רסיס פריזמרין|רסיסי פריזמרין|פריזמרין שארד|prismarine shard|prismarine shards"),
      X("פריזמרין קריסטלס", 'Prismarine Crystals', 4, "גבישי פריזמרין|קריסטלי פריזמרין|פריזמרין קריסטלס|prismarine crystals|prismarine crystal"),
      X("מיינינג פטיג", 'Mining Fatigue', 4, "עייפות כרייה|עייפות חפירה|עייפות|מיינינג פטיג|mining fatigue|fatigue"),
      X("טייד טרים", 'Tide Armor Trim', 5, "קישוט שריון גאות|קישוט גאות|טייד טרים|tide armor trim|tide trim|tide smithing template|tide"),
    ],
  },
  {
    id: 'ocean-fishing', cat: 'ocean', q: "תנו שם של משהו שאפשר לדוג עם חכה",
    answers: [
      A('cod', 1), A('salmon', 2), A('pufferfish', 2), A('enchanted_book', 2), A('tropical_fish', 3), A('name_tag', 3),
      A('saddle', 3), A('bow', 3), A('fishing_rod', 3), A('nautilus_shell', 3), A('leather_boots', 3), A('rotten_flesh', 3),
      A('lily_pad', 4), A('bowl', 4), A('leather', 4), A('stick', 4), A('string', 4), A('bone', 4), A('ink_sac', 4),
      A('tripwire_hook', 5), A('water_bottle', 5), A('bamboo', 5),
    ],
  },

  // ── end ──
  {
    id: 'end-things', cat: 'end', q: "תנו שם של משהו שמוצאים באנד",
    answers: [
      A('end_stone', 1), A('ender_dragon', 1), A('enderman', 2), A('obsidian', 2), A('end_crystal', 2), A('shulker', 3),
      A('end_city', 3), A('chorus_plant', 3), A('chorus_fruit', 3), A('elytra', 3), A('dragon_egg', 3),
      A('purpur', 4), A('end_rod', 4), X("אנד שיפ", 'End Ship', 4, "ספינת אנד|ספינת האנד|ספינה|אנד שיפ|end ship|ship"),
      A('end_gateway', 4), A('end_portal', 4), A('bedrock', 4), A('dragon_head', 4), A('end_stone_bricks', 4),
      A('shulker_shell', 4), A('dragon_breath', 4), A('chorus_flower', 4), A('the_void', 4),
      A('iron_bars', 5), A('brewing_stand', 5), X("זכוכית מג'נטה", 'Magenta Stained Glass', 5, "זכוכית סגולה|זכוכית ורודה|זכוכית מג'נטה|magenta stained glass|magenta glass|purple glass"),
      A('item_frame', 5), A('chest', 5), A('ladder', 5),
    ],
  },

  // ── blocks ──
  {
    id: 'blocks-ores', cat: 'blocks', q: "תנו שם של אור (עפרה) שאפשר לכרות במיינקראפט",
    answers: [
      X("דיימונד אור", 'Diamond Ore', 1, "עפרת יהלום|עפרת יהלומים|יהלום|יהלומים|דיימונד|diamond ore|diamond|diamonds|diamon ore"),
      X("איירון אור", 'Iron Ore', 2, "עפרת ברזל|ברזל|איירון|iron ore|iron"),
      X("גולד אור", 'Gold Ore', 2, "עפרת זהב|זהב|גולד|gold ore|gold"),
      X("קואל אור", 'Coal Ore', 2, "עפרת פחם|פחם|קול|coal ore|coal"),
      X("אמרלד אור", 'Emerald Ore', 3, "עפרת אמרלד|עפרת אזמרגד|אמרלד|אזמרגד|ברקת|emerald ore|emerald"),
      X("רדסטון אור", 'Redstone Ore', 3, "עפרת רדסטון|רדסטון|redstone ore|redstone"),
      X("לאפיס אור", 'Lapis Lazuli Ore', 3, "עפרת לאפיס|לאפיס|לאפיס לזולי|לפיס|lapis ore|lapis lazuli ore|lapis|lapis lazuli"),
      X("קופר אור", 'Copper Ore', 3, "עפרת נחושת|נחושת|קופר|copper ore|copper"),
      X("נת'ר קוורץ אור", 'Nether Quartz Ore', 4, "עפרת קוורץ|עפרת קווארץ|קוורץ|קווארץ|nether quartz ore|quartz ore|quartz|nether quartz"),
      X("נת'ר גולד אור", 'Nether Gold Ore', 4, "עפרת זהב נתר|עפרת זהב של נתר|זהב נתר|nether gold ore|nether gold"),
      A('ancient_debris', 4),
      X("דיפסלייט דיימונד אור", 'Deepslate Diamond Ore', 5, "עפרת יהלום בדיפסלייט|עפרת יהלום דיפסלייט|דיפסלייט יהלום|יהלום דיפסלייט|deepslate diamond ore|deepslate diamond"),
      X("דיפסלייט איירון אור", 'Deepslate Iron Ore', 5, "עפרת ברזל בדיפסלייט|עפרת ברזל דיפסלייט|דיפסלייט ברזל|ברזל דיפסלייט|deepslate iron ore|deepslate iron"),
      X("דיפסלייט גולד אור", 'Deepslate Gold Ore', 5, "עפרת זהב בדיפסלייט|עפרת זהב דיפסלייט|דיפסלייט זהב|זהב דיפסלייט|deepslate gold ore|deepslate gold"),
      X("דיפסלייט קואל אור", 'Deepslate Coal Ore', 5, "עפרת פחם בדיפסלייט|עפרת פחם דיפסלייט|דיפסלייט פחם|פחם דיפסלייט|deepslate coal ore|deepslate coal"),
      X("דיפסלייט אמרלד אור", 'Deepslate Emerald Ore', 5, "עפרת אמרלד בדיפסלייט|עפרת אמרלד דיפסלייט|דיפסלייט אמרלד|אמרלד דיפסלייט|deepslate emerald ore|deepslate emerald"),
      X("דיפסלייט רדסטון אור", 'Deepslate Redstone Ore', 5, "עפרת רדסטון בדיפסלייט|עפרת רדסטון דיפסלייט|דיפסלייט רדסטון|רדסטון דיפסלייט|deepslate redstone ore|deepslate redstone"),
      X("דיפסלייט לאפיס אור", 'Deepslate Lapis Lazuli Ore', 5, "עפרת לאפיס בדיפסלייט|עפרת לאפיס דיפסלייט|דיפסלייט לאפיס|לאפיס דיפסלייט|deepslate lapis ore|deepslate lapis|deepslate lapis lazuli ore"),
      X("דיפסלייט קופר אור", 'Deepslate Copper Ore', 5, "עפרת נחושת בדיפסלייט|עפרת נחושת דיפסלייט|דיפסלייט נחושת|נחושת דיפסלייט|deepslate copper ore|deepslate copper"),
    ],
  },
  {
    id: 'blocks-light', cat: 'blocks', q: "תנו שם של בלוק שנותן אור",
    answers: [
      A('torch', 1), A('glowstone', 1), A('lantern', 2), A('lava', 2), A('sea_lantern', 3), A('jack_o_lantern', 3),
      A('fire', 3), A('campfire', 3), A('redstone_lamp', 3), A('end_rod', 3), A('beacon', 3), A('redstone_torch', 3),
      A('candle', 3), A('soul_torch', 4), A('soul_lantern', 4), A('soul_campfire', 4), A('shroomlight', 4),
      A('glow_lichen', 4), A('magma_block', 4), A('nether_portal', 4), A('furnace', 4, 'כבשן דולק|lit furnace'),
      A('copper_bulb', 4), A('copper_torch', 4), A('copper_lantern', 4),
      A('froglight', 5), A('sea_pickle', 5), A('crying_obsidian', 5), A('conduit', 5), A('respawn_anchor', 5),
      A('glow_berries', 5), A('amethyst_cluster', 5), A('brewing_stand', 5), A('dragon_egg', 5), A('end_portal', 5),
      A('end_gateway', 5), A('smoker', 5), A('blast_furnace', 5), A('enchanting_table', 5), A('ender_chest', 5),
      A('sculk_sensor', 5), A('calibrated_sculk_sensor', 5), A('sculk_catalyst', 5), A('firefly_bush', 5),
      A('redstone_ore', 5), A('brown_mushroom', 5), A('end_portal_frame', 5), A('light_block', 5),
    ],
  },
  {
    id: 'blocks-wood-types', cat: 'blocks', q: "תנו שם של סוג עץ שאפשר להכין ממנו פלאנקס",
    answers: [
      X("אוק", 'Oak', 1, "אלון|אוק|oak|oak planks|oak wood"),
      X("ברץ'", 'Birch', 2, "ליבנה|בירץ'|בירץ|birch|birch planks|birch wood"),
      X("ספרוס", 'Spruce', 2, "אשוח|ספרוס|ספרוס|spruce|spruce planks|spruce wood|pine"),
      X('ג\'ונגל', 'Jungle', 2, 'ג\'ונגל|צ\'ונגל|עץ ג\'ונגל|jungle|jungle planks|jungle wood'),
      X("אקשיה", 'Acacia', 3, "שיטה|אקציה|אקסיה|אקאציה|acacia|acacia planks|acacia wood|accacia"),
      X("דארק אוק", 'Dark Oak', 3, "אלון כהה|אלון שחור|דארק אוק|dark oak|darkoak|dark oak planks"),
      X("צ'רי", 'Cherry', 3, "דובדבן|דובדבנים|צ'רי|cherry|cherry planks|cherry wood|cherry blossom"),
      X('מנגרוב', 'Mangrove', 4, 'מנגרוב|מנגרובים|mangrove|mangrove planks|mangrove wood'),
      X("פייל אוק", 'Pale Oak', 4, "אלון חיוור|אלון לבן|פייל אוק|pale oak|paleoak|pale oak planks"),
      X('במבוק', 'Bamboo', 4, 'במבוק|bamboo|bamboo planks|bamboo block'),
      X("קרימזון", 'Crimson', 4, "ארגמן|קרימזון|עץ נתר אדום|crimson|crimson planks|crimson stem"),
      X("וורפד", 'Warped', 4, "מעוות|וורפד|ווארפד|עץ נתר כחול|warped|warped planks|warped stem"),
      X('צפצפה', 'Poplar', 5, 'צפצפה|צפצפות|פופלר|poplar|poplar planks|poplar wood'),
    ],
  },
  {
    id: 'blocks-flowers', cat: 'blocks', q: "תנו שם של פרח במיינקראפט",
    answers: [
      X("פרג", 'Poppy', 1, "פרג|פרגים|ורד|ורד אדום|פופי|poppy|poppies|rose|red rose|red flower|פרג (ורד)"),
      X('חמנייה', 'Sunflower', 2, 'חמנייה|חמניה|חמניות|סאנפלאוור|sunflower|sun flower|sunflowers'),
      X('צבעוני', 'Tulip', 2, 'צבעוני|צבעונים|טוליפ|tulip|tulips|red tulip|orange tulip|white tulip|pink tulip|צבעוני אדום|צבעוני כתום|צבעוני לבן|צבעוני ורוד'),
      X('שן הארי', 'Dandelion', 2, 'שן הארי|שן ארי|שיני הארי|דנדליון|פרח צהוב|dandelion|dandelions|dandilion|yellow flower'),
      X("ויתר רוז", 'Wither Rose', 3, "ורד וויתר|ורד ויתר|ורד שחור|וויתר רוז|wither rose|black rose"),
      X('סחלב כחול', 'Blue Orchid', 3, 'סחלב כחול|סחלב|בלו אורקיד|blue orchid|orchid'),
      X("קורנפלאואר", 'Cornflower', 3, "דגנייה|דגניה|קורנפלאוור|פרח כחול|cornflower|corn flower|blue flower"),
      X('אליום', 'Allium', 3, 'אליום|שום נוי|פרח סגול|allium|alium|purple flower'),
      X('שושנת העמקים', 'Lily of the Valley', 3, 'שושנת העמקים|שושנת עמקים|לילי אוף דה ואלי|lily of the valley|lily of valley|white flower'),
      X('מרגנית', 'Oxeye Daisy', 3, 'מרגנית|מרגניות|חרצית|אוקסאיי דייזי|oxeye daisy|ox eye daisy|daisy'),
      X("אזור בלואט", 'Azure Bluet', 4, "כחולית|אז'ור בלוט|אזור בלוט|azure bluet|bluet|azure"),
      X('לילך', 'Lilac', 4, 'לילך|לילאק|lilac|lilacs'),
      X('אדמונית', 'Peony', 4, 'אדמונית|פיוני|פאוני|peony|peonies|pink flower'),
      X('שיח ורדים', 'Rose Bush', 4, 'שיח ורדים|שיח ורד|רוז בוש|rose bush|rosebush'),
      X("טורצ'פלאואר", 'Torchflower', 4, "פרח לפיד|טורץ'פלאוור|torchflower|torch flower"),
      X("פיצ'ר פלנט", 'Pitcher Plant', 4, "צמח כד|פרח כד|פיצ'ר פלאנט|pitcher plant|pitcher"),
      X("פינק פטלס", 'Pink Petals', 4, "עלי כותרת ורודים|עלי כותרת|פינק פטלס|pink petals|petals"),
      X("איי בלוסם", 'Eyeblossom', 4, "פרח עין|פרחי עין|איי בלוסום|eyeblossom|eye blossom|open eyeblossom|closed eyeblossom"),
      X("ספור בלוסם", 'Spore Blossom', 5, "פריחת נבגים|ספור בלוסום|spore blossom"),
      X('פרחי בר', 'Wildflowers', 5, 'פרחי בר|פרח בר|ווילדפלאוורס|wildflowers|wildflower|wild flowers'),
      X('פרח קקטוס', 'Cactus Flower', 5, 'פרח קקטוס|פרחי קקטוס|קקטוס פלאוור|cactus flower'),
      A('golden_dandelion', 5), A('chorus_flower', 5),
      X('אזליאה פורחת', 'Flowering Azalea', 5, 'אזליאה פורחת|אזליה פורחת|אזליאה|פלאוורינג אזליאה|flowering azalea|azalea'),
    ],
  },
  {
    id: 'blocks-gravity', cat: 'blocks', q: "תנו שם של בלוק שנופל כשאין מתחתיו כלום",
    answers: [
      A('sand', 1), A('gravel', 1), A('red_sand', 3), A('concrete_powder', 3), A('anvil', 3), A('dragon_egg', 4),
      A('scaffolding', 4), A('pointed_dripstone', 4), A('suspicious_sand', 4), A('suspicious_gravel', 5), A('sulfur_spike', 5),
    ],
  },
  {
    id: 'blocks-villager-job', cat: 'blocks', q: "תנו שם של ג'וב בלוק של וילג'ר",
    answers: [
      A('lectern', 1), A('composter', 2), A('smithing_table', 2), A('blast_furnace', 2), A('brewing_stand', 3), A('smoker', 3),
      A('barrel', 3), A('loom', 3), A('cartography_table', 3), A('grindstone', 4), A('fletching_table', 4),
      A('stonecutter', 4), A('cauldron', 4),
    ],
  },
  {
    id: 'blocks-gui', cat: 'blocks', q: "תנו שם של בלוק שנפתח בו חלון כשלוחצים עליו",
    answers: [
      A('crafting_table', 1), A('chest', 1), A('furnace', 2), A('enchanting_table', 2), A('anvil', 2), A('ender_chest', 3),
      A('barrel', 3), A('shulker_box', 3), A('brewing_stand', 3), A('hopper', 3), A('smithing_table', 3), A('blast_furnace', 3),
      A('smoker', 3), A('dispenser', 4), A('dropper', 4), A('grindstone', 4), A('stonecutter', 4), A('loom', 4),
      A('cartography_table', 4), A('beacon', 4), A('crafter', 4), A('lectern', 5), A('trapped_chest', 5), A('copper_chest', 5),
      A('command_block', 5), A('sign', 5),
    ],
  },
  {
    id: 'blocks-silk-touch', cat: 'enchant', q: "תנו שם של בלוק שצריך סילק טאץ' כדי להשיג",
    answers: [
      A('glass', 1), A('ores', 2), A('ice', 2), A('grass_block', 2), A('ender_chest', 3), A('glowstone', 3), A('bookshelf', 3),
      A('glass_pane', 3), A('stained_glass', 3), A('packed_ice', 3), A('blue_ice', 3), A('stone', 3), A('sea_lantern', 3),
      A('mycelium', 4), A('podzol', 4), A('melon_block', 4), A('deepslate', 4), A('coral', 4), A('campfire', 4, 'soul campfire|מדורת נשמות'),
      A('clay', 4), A('snow', 4), A('turtle_egg', 4), A('bee_nest', 4), A('amethyst_cluster', 4), A('sculk', 4),
      A('sculk_sensor', 4), A('sculk_shrieker', 4), A('sculk_catalyst', 4), A('leaves', 4), A('cobweb', 4),
      A('mushroom_block', 5), A('nylium', 5), A('sculk_vein', 5), A('calibrated_sculk_sensor', 5),
    ],
  },
  {
    id: 'blocks-unobtainable', cat: 'blocks', q: "תנו שם של בלוק שאי אפשר להשיג בסרבייבל",
    answers: [
      A('bedrock', 1), A('command_block', 2), A('barrier', 2), A('end_portal_frame', 2), A('spawner', 2),
      A('reinforced_deepslate', 3), A('end_portal', 3), A('nether_portal', 3), A('budding_amethyst', 4),
      A('structure_block', 4), A('light_block', 4), A('trial_spawner', 4), A('vault', 4), A('farmland', 4), A('fire', 4),
      A('end_gateway', 4), A('chorus_plant', 5), A('suspicious_sand', 5), A('suspicious_gravel', 5), A('frosted_ice', 5),
      A('player_head', 5), A('jigsaw', 5), A('air', 5), A('test_block', 5), A('infested_stone', 5),
    ],
  },

  // ── redstone ──
  {
    id: 'redstone-power', cat: 'redstone', q: "תנו שם של בלוק שנותן כוח לרדסטון",
    answers: [
      A('lever', 1), A('redstone_torch', 1), A('button', 2), A('pressure_plate', 2), A('redstone_block', 2),
      A('daylight_detector', 3), A('observer', 3), A('tripwire_hook', 3), A('target', 4), A('trapped_chest', 4),
      A('detector_rail', 4), A('weighted_pressure_plate', 4), A('sculk_sensor', 4), A('calibrated_sculk_sensor', 5),
      A('lectern', 5), A('lightning_rod', 5),
    ],
  },
  {
    id: 'redstone-activated', cat: 'redstone', q: "תנו שם של בלוק שרדסטון יכול להפעיל",
    answers: [
      A('piston', 1), A('redstone_lamp', 1), A('tnt', 2), A('door', 2), A('iron_door', 3), A('trapdoor', 3),
      A('sticky_piston', 3), A('dispenser', 3), A('dropper', 3), A('note_block', 3), A('iron_trapdoor', 4),
      A('fence_gate', 4), A('hopper', 4), A('powered_rail', 4), A('bell', 4), A('crafter', 4), A('command_block', 4),
      A('activator_rail', 5), A('copper_bulb', 5), A('copper_door', 5), A('copper_trapdoor', 5), A('shelf', 5),
    ],
  },

  // ── food ──
  {
    id: 'food-hunger', cat: 'food', q: "תנו שם של אוכל שממלא את פס הרעב",
    answers: [
      A('steak', 1), A('bread', 1), A('apple', 2), A('golden_apple', 2), A('carrot', 2), A('potato', 2), A('porkchop', 2),
      A('chicken_food', 2), A('cake', 2), A('cookie', 3), A('melon_slice', 3), A('golden_carrot', 3), A('pumpkin_pie', 3),
      A('mutton', 3), A('cod', 3), A('salmon', 3), A('mushroom_stew', 3), A('sweet_berries', 3), A('rotten_flesh', 3),
      A('enchanted_golden_apple', 3), A('rabbit_meat', 4), A('rabbit_stew', 4), A('beetroot', 4), A('beetroot_soup', 4),
      A('glow_berries', 4), A('honey_bottle', 4), A('dried_kelp', 4), A('chorus_fruit', 4), A('spider_eye', 4),
      A('suspicious_stew', 4), A('poisonous_potato', 5), A('pufferfish', 5), A('tropical_fish', 5),
    ],
  },
  {
    id: 'food-furnace', cat: 'food', q: "תנו שם של אוכל שאפשר לבשל בפרנס",
    answers: [
      A('steak', 1), A('porkchop', 2), A('chicken_food', 2), A('potato', 2), A('mutton', 3), A('cod', 3),
      A('salmon', 4), A('rabbit_meat', 4), A('kelp', 4),
    ],
  },
  {
    id: 'food-crafted', cat: 'food', q: "תנו שם של אוכל שמכינים בקראפטינג טייבל",
    answers: [
      A('bread', 1), A('cake', 1), A('cookie', 2), A('pumpkin_pie', 2), A('golden_apple', 2), A('golden_carrot', 3),
      A('mushroom_stew', 3), A('rabbit_stew', 4), A('beetroot_soup', 4), A('suspicious_stew', 4), A('dried_kelp', 5),
      A('honey_bottle', 5),
    ],
  },
  {
    id: 'food-farm-plants', cat: 'food', q: "תנו שם של צמח שאפשר לגדל בחווה",
    answers: [
      X('חיטה', 'Wheat', 1, 'חיטה|חיטים|ויט|wheat|wheat seeds|seeds|זרעים|זרעי חיטה'),
      A('carrot', 1), A('potato', 2), A('melon_block', 2), X('דלעת', 'Pumpkin', 2, 'דלעת|דלעות|פמפקין|pumpkin|pumpkins'),
      X('קני סוכר', 'Sugar Cane', 2, 'קני סוכר|קנה סוכר|שוגר קיין|sugar cane|sugarcane|sugar canes|reeds'),
      A('beetroot', 3), A('bamboo', 3), X('קקטוס', 'Cactus', 3, 'קקטוס|קקטוסים|cactus|cacti|kaktus'),
      A('sweet_berries', 3), A('nether_wart', 3),
      X('שתיל', 'Sapling', 3, 'שתיל|שתילים|עץ|עצים|ספלינג|sapling|saplings|tree|trees'),
      X('פולי קקאו', 'Cocoa Beans', 4, 'פולי קקאו|קקאו|פול קקאו|קוקואה|cocoa beans|cocoa|cocoa bean|coco beans'),
      A('kelp', 4), A('glow_berries', 4), A('mushroom', 4),
      X("כורוס פלאואר", 'Chorus Flower', 5, "פרח כורוס|צמח כורוס|כורוס|chorus flower|chorus plant|chorus"),
      X("טורצ'פלאואר", 'Torchflower', 5, "פרח לפיד|זרעי פרח לפיד|טורץ'פלאוור|torchflower|torch flower|torchflower seeds"),
      X("פיצ'ר פלנט", 'Pitcher Plant', 5, "צמח כד|פרח כד|פיצ'ר פלאנט|pitcher plant|pitcher pod|pitcher"),
      X("פאנגוס", 'Fungus', 5, "פטריית נתר|פונגוס|fungus|crimson fungus|warped fungus|nether fungus"),
    ],
  },

  // ── items ──
  {
    id: 'items-potion-ingredients', cat: 'items', q: "תנו שם של מרכיב שמכניסים לברוינג סטנד",
    answers: [
      A('nether_wart', 1), A('blaze_powder', 1), A('redstone_dust', 2), A('glowstone_dust', 2), A('gunpowder', 2),
      A('sugar', 3), A('spider_eye', 3), A('fermented_spider_eye', 3), A('ghast_tear', 3), A('magma_cream', 3),
      A('glistering_melon', 3), A('golden_carrot', 3), A('rabbit_foot', 4), A('pufferfish', 4), A('phantom_membrane', 4),
      A('turtle_shell', 4), A('dragon_breath', 4), A('breeze_rod', 4), A('slime_block', 5), A('stone', 5), A('cobweb', 5),
    ],
  },
  {
    id: 'items-potions', cat: 'items', q: "תנו שם של שיקוי שאפשר להכין בברוינג סטנד",
    answers: [
      X("שיקוי הילינג", 'Potion of Healing', 1, "שיקוי ריפוי|ריפוי|שיקוי בריאות|הילינג|potion of healing|healing potion|healing|instant health|heal|health potion"),
      X('שיקוי כוח', 'Potion of Strength', 2, 'שיקוי כוח|שיקוי כח|כוח|כח|potion of strength|strength potion|strength'),
      X("שיקוי ספיד", 'Potion of Swiftness', 2, "שיקוי מהירות|מהירות|potion of swiftness|potion of speed|swiftness|speed potion|speed"),
      X("שיקוי בלתי נראה", 'Potion of Invisibility', 2, "שיקוי היעלמות|היעלמות|שיקוי בלתי נראה|potion of invisibility|invisibility potion|invisibility|invis"),
      X('שיקוי עמידות לאש', 'Potion of Fire Resistance', 2, 'שיקוי עמידות לאש|שיקוי חסינות לאש|עמידות לאש|potion of fire resistance|fire resistance potion|fire resistance|fire res'),
      X("שיקוי ריג'נרציה", 'Potion of Regeneration', 2, "שיקוי התחדשות|התחדשות|שיקוי ריג'ן|רגנרציה|potion of regeneration|regeneration potion|regeneration|regen"),
      X("שיקוי נייט ויז'ן", 'Potion of Night Vision', 2, "שיקוי ראיית לילה|ראיית לילה|potion of night vision|night vision potion|night vision"),
      X("שיקוי פויזן", 'Potion of Poison', 3, "שיקוי רעל|רעל|potion of poison|poison potion|poison"),
      X('שיקוי נשימה מתחת למים', 'Potion of Water Breathing', 3, 'שיקוי נשימה מתחת למים|שיקוי נשימה במים|נשימה מתחת למים|potion of water breathing|water breathing potion|water breathing'),
      X('שיקוי קפיצה', 'Potion of Leaping', 3, 'שיקוי קפיצה|שיקוי קפיצה גבוהה|קפיצה|potion of leaping|leaping potion|leaping|jump boost|jump potion'),
      X("שיקוי סלואו", 'Potion of Slowness', 3, "שיקוי איטיות|איטיות|potion of slowness|slowness potion|slowness"),
      X('שיקוי חולשה', 'Potion of Weakness', 3, 'שיקוי חולשה|חולשה|potion of weakness|weakness potion|weakness'),
      X('שיקוי נזק', 'Potion of Harming', 3, 'שיקוי נזק|שיקוי פגיעה|נזק|potion of harming|harming potion|harming|instant damage'),
      X('שיקוי נפילה איטית', 'Potion of Slow Falling', 3, 'שיקוי נפילה איטית|נפילה איטית|potion of slow falling|slow falling potion|slow falling'),
      X("שיקוי טרטל מאסטר", 'Potion of the Turtle Master', 4, "שיקוי אמן הצבים|שיקוי צב|אמן הצבים|טרטל מאסטר|potion of the turtle master|turtle master|turtle potion"),
      X("שיקוי אוקוורד", 'Awkward Potion', 4, "שיקוי מגושם|שיקוי מביך|אוקוורד|awkward potion|awkward"),
      X("שיקוי מנדיין", 'Mundane Potion', 5, "שיקוי תפל|שיקוי רגיל|מנדיין|mundane potion|mundane"),
      X('שיקוי סמיך', 'Thick Potion', 5, 'שיקוי סמיך|שיקוי עבה|ת\'יק פושן|thick potion|thick'),
      X("שיקוי ווינד צ'ארג'ינג", 'Potion of Wind Charging', 5, "שיקוי טעינת רוח|שיקוי רוח|טעינת רוח|potion of wind charging|wind charging"),
      X("שיקוי ויווינג", 'Potion of Weaving', 5, "שיקוי אריגה|אריגה|potion of weaving|weaving"),
      X("שיקוי אוזינג", 'Potion of Oozing', 5, "שיקוי נזילה|שיקוי סליים|נזילה|potion of oozing|oozing"),
      X("שיקוי אינפסטיישן", 'Potion of Infestation', 5, "שיקוי הדבקה|שיקוי דגי כסף|הדבקה|potion of infestation|infestation|infested"),
    ],
  },
  {
    id: 'items-effects', cat: 'items', q: "תנו שם של אפקט במיינקראפט",
    answers: [
      A('speed', 1), A('strength', 2), A('regeneration', 2), A('invisibility', 2), A('night_vision', 2), A('poison', 2),
      A('fire_resistance', 2), X('ריפוי מיידי', 'Instant Health', 2, 'ריפוי מיידי|ריפוי|בריאות מיידית|הילינג|instant health|healing|heal|health'),
      X("ג'אמפ בוסט", 'Jump Boost', 3, "קפיצה|קפיצה גבוהה|ג'אמפ בוסט|jump boost|jump|leaping"),
      A('slowness', 3), A('weakness', 3), A('water_breathing', 3), A('slow_falling', 3),
      X('נזק מיידי', 'Instant Damage', 3, 'נזק מיידי|נזק|פגיעה|הארמינג|instant damage|harming|damage|harm'),
      X('עמידות', 'Resistance', 3, 'עמידות|התנגדות|רזיסטנס|resistance'),
      X("הייסט", 'Haste', 4, "זריזות|חיפזון|הייסט|haste"),
      X("מיינינג פטיג", 'Mining Fatigue', 4, "עייפות כרייה|עייפות חפירה|עייפות|מיינינג פטיג|mining fatigue|fatigue"),
      X("אבסורפשן", 'Absorption', 4, "ספיגה|אבזורפשן|אבסורפשן|לבבות זהב|לבבות צהובים|absorption|absorbtion"),
      X("סטורציה", 'Saturation', 4, "רוויה|שובע|סטורציה|saturation"),
      X('רעב', 'Hunger', 4, 'רעב|האנגר|hunger'),
      X('בחילה', 'Nausea', 4, 'בחילה|סחרחורת|נוזיאה|נאוזיאה|nausea'),
      X('עיוורון', 'Blindness', 4, 'עיוורון|עוורון|בליינדנס|blindness|blind'),
      X("ויתר", 'Wither', 4, "וויתר|ויתר|קמילה|wither|withering"),
      X('ריחוף', 'Levitation', 4, 'ריחוף|רחיפה|לויטציה|levitation|levitate'),
      X('זוהר', 'Glowing', 4, 'זוהר|זוהרת|גלואינג|glowing|glow'),
      X("באד אומן", 'Bad Omen', 4, "אות רע|סימן רע|באד אומן|bad omen|omen"),
      X('גיבור הכפר', 'Hero of the Village', 4, 'גיבור הכפר|גיבור כפר|hero of the village|hero of village|hero'),
      X('חושך', 'Darkness', 4, 'חושך|חשכה|דארקנס|darkness|dark'),
      X('מזל', 'Luck', 5, 'מזל|לאק|luck'),
      X('חוסר מזל', 'Bad Luck', 5, 'חוסר מזל|מזל רע|באד לאק|bad luck|unluck'),
      X("קונדואיט פאוור", 'Conduit Power', 5, "כוח צינור|כוח קונדואיט|קונדואיט|conduit power|conduit"),
      X("דולפין גרייס", 'Dolphin\'s Grace', 5, "חסד הדולפין|חסד דולפין|דולפינס גרייס|dolphins grace|dolphin grace|dolphin's grace"),
      X("הלת' בוסט", 'Health Boost', 5, "הגברת בריאות|בוסט בריאות|הלת' בוסט|health boost"),
      X("טריאל אומן", 'Trial Omen', 5, "אות ניסיון|אות מבחן|טריאל אומן|trial omen"),
      X("רייד אומן", 'Raid Omen', 5, "אות פשיטה|רייד אומן|ראיד אומן|raid omen"),
      X("ווינד צ'ארג'ד", 'Wind Charged', 5, "טעון רוח|טעינת רוח|ווינד צ'ארג'ד|wind charged"),
      X("ויווינג", 'Weaving', 5, "אריגה|וויבינג|weaving"),
      X("אוזינג", 'Oozing', 5, "נזילה|הזלה|אוזינג|oozing"),
      X("אינפסטד", 'Infested', 5, "הדבקה|נגוע|אינפסטד|infested|infestation"),
      X('רעל קטלני', 'Fatal Poison', 5, 'רעל קטלני|רעל מוות|fatal poison'),
      X('נשימת הנאוטילוס', 'Breath of the Nautilus', 5, 'נשימת הנאוטילוס|נשימת נאוטילוס|breath of the nautilus|breath of nautilus'),
    ],
  },
  {
    id: 'items-armor-material', cat: 'items', q: "תנו שם של חומר שמכינים ממנו ארמור",
    answers: [
      X('יהלום', 'Diamond', 1, 'יהלום|יהלומים|דיימונד|diamond|diamonds|diamond armor'),
      X('ברזל', 'Iron', 1, 'ברזל|איירון|iron|iron armor'),
      X("נת'רייט", 'Netherite', 2, "נתרייט|נתריט|נת'רייט|netherite|netherrite|netherite armor"),
      X('זהב', 'Gold', 2, 'זהב|גולד|gold|golden|gold armor|golden armor'),
      X('עור', 'Leather', 2, 'עור|לדר|leather|leather armor'),
      X('נחושת', 'Copper', 3, 'נחושת|קופר|copper|copper armor'),
      X("צ'יינמייל", 'Chainmail', 4, "שרשראות|שרשרת|שריון שרשראות|צ'יין|chainmail|chain mail|chain|chain armor"),
      X('קשקש צב', 'Turtle Scute', 4, 'קשקש צב|שריון צב|צב|turtle scute|turtle shell|turtle|scute'),
      X('קשקש ארמדילו', 'Armadillo Scute', 5, 'קשקש ארמדילו|ארמדילו|שריון זאב|armadillo scute|armadillo|wolf armor'),
    ],
  },
  {
    id: 'items-tool-material', cat: 'items', q: "תנו שם של חומר שמכינים ממנו פיקאקס",
    answers: [
      X('יהלום', 'Diamond', 1, 'יהלום|יהלומים|דיימונד|diamond|diamonds|diamond pickaxe'),
      X('ברזל', 'Iron', 1, 'ברזל|איירון|iron|iron pickaxe'),
      X('אבן', 'Stone', 2, 'אבן|קובלסטון|אבן מרוצפת|stone|cobblestone|cobble|stone pickaxe'),
      X('עץ', 'Wood', 2, 'עץ|קרשים|wood|wooden|planks|wooden pickaxe'),
      X("נת'רייט", 'Netherite', 2, "נתרייט|נתריט|נת'רייט|netherite|netherrite|netherite pickaxe"),
      X('זהב', 'Gold', 2, 'זהב|גולד|gold|golden|golden pickaxe|gold pickaxe'),
      X('נחושת', 'Copper', 4, 'נחושת|קופר|copper|copper pickaxe'),
      X("בלקסטון", 'Blackstone', 4, "אבן שחורה|בלאקסטון|בלקסטון|blackstone|black stone"),
      X("קובלד דיפסלייט", 'Cobbled Deepslate', 4, "דיפסלייט מרוצף|דיפסלייט|cobbled deepslate|deepslate"),
    ],
  },
  {
    id: 'items-throwable', cat: 'items', q: "תנו שם של משהו שזורקים בקליק ימני והוא עף",
    answers: [
      A('snowball', 1), A('ender_pearl', 1), A('egg', 2), A('trident', 2), A('splash_potion', 3), A('eye_of_ender', 3),
      A('wind_charge', 3), A('xp_bottle', 4), A('lingering_potion', 4), A('fishing_rod', 5),
    ],
  },
  {
    id: 'items-wearable-head', cat: 'items', q: "תנו שם של משהו שאפשר לשים על הראש",
    answers: [
      X('קסדת יהלום', 'Diamond Helmet', 1, 'קסדת יהלום|קסדת יהלומים|קסדה מיהלום|דיימונד הלמט|diamond helmet|diamond helm'),
      X('קסדת ברזל', 'Iron Helmet', 2, 'קסדת ברזל|קסדה מברזל|קסדה|איירון הלמט|iron helmet|helmet'),
      X("קסדת נת'רייט", 'Netherite Helmet', 2, "קסדת נתרייט|קסדה מנתרייט|netherite helmet"),
      A('carved_pumpkin', 2),
      X('קסדת זהב', 'Golden Helmet', 3, 'קסדת זהב|קסדה מזהב|golden helmet|gold helmet'),
      X('כובע עור', 'Leather Cap', 3, 'כובע עור|קסדת עור|כובע|leather cap|leather helmet|cap'),
      A('turtle_shell', 3),
      X('ראש קריפר', 'Creeper Head', 3, 'ראש קריפר|ראש של קריפר|creeper head|creeper skull'),
      X('ראש זומבי', 'Zombie Head', 3, 'ראש זומבי|ראש של זומבי|zombie head|zombie skull'),
      X("גולגולת סקלטון", 'Skeleton Skull', 3, "גולגולת שלד|ראש שלד|גולגולת|skeleton skull|skeleton head|skull"),
      X("קסדת צ'יינמייל", 'Chainmail Helmet', 4, "קסדת שרשראות|קסדת שרשרת|chainmail helmet|chain helmet"),
      X('קסדת נחושת', 'Copper Helmet', 4, 'קסדת נחושת|קסדה מנחושת|copper helmet'),
      X("גולגולת ויתר סקלטון", 'Wither Skeleton Skull', 4, "גולגולת שלד וויתר|גולגולת וויתר|ראש וויתר|ראש שלד וויתר|wither skeleton skull|wither skull|wither skeleton head"),
      A('dragon_head', 4),
      X('ראש פיגלין', 'Piglin Head', 4, 'ראש פיגלין|ראש של פיגלין|piglin head|piglin skull'),
      A('player_head', 4),
    ],
  },
  {
    id: 'items-shears', cat: 'items', q: "תנו שם של משהו שמקבלים בעזרת מספריים",
    answers: [
      A('wool', 1), A('leaves', 2), A('cobweb', 2), X("ויינס", 'Vines', 3, "גפנים|גפן|קיסוס|ויינס|vines|vine|ivy"),
      A('carved_pumpkin', 3), A('mushroom', 3), A('honeycomb', 3),
      X('דשא', 'Short Grass', 3, 'דשא|עשב|דשא גבוה|עשב גבוה|גראס|grass|short grass|tall grass'),
      X('שרך', 'Fern', 4, 'שרך|שרכים|פרן|fern|ferns|large fern'),
      X('עשב ים', 'Seagrass', 4, 'עשב ים|עשבי ים|אצת ים|סיגראס|seagrass|sea grass|tall seagrass'),
      A('glow_lichen', 4), X('שיח מת', 'Dead Bush', 4, 'שיח מת|שיחים מתים|דד בוש|dead bush|deadbush'),
      X('זרעי דלעת', 'Pumpkin Seeds', 4, 'זרעי דלעת|גרעיני דלעת|פמפקין סידס|pumpkin seeds|pumpkin seed'),
      X('שורשים תלויים', 'Hanging Roots', 5, 'שורשים תלויים|שורשים|hanging roots|roots'),
      A('nether_sprouts', 5), A('weeping_vines', 5, 'twisting vines|גפנים מתפתלים'), A('saddle', 5), A('wolf_armor', 5),
      A('string', 5), X("סמול דריפליף", 'Small Dripleaf', 5, "עלה טחב קטן|עלה טפטוף קטן|small dripleaf|dripleaf"),
    ],
  },
  {
    id: 'items-music-discs', cat: 'misc', q: "תנו שם של מיוזיק דיסק במיינקראפט",
    answers: [
      X('פיגסטפ', 'Pigstep', 1, 'פיגסטפ|פיג סטפ|pigstep|pig step'),
      X('לאבה צ\'יקן', 'Lava Chicken', 2, 'לאבה צ\'יקן|לבה צ\'יקן|תרנגולת לבה|lava chicken|lavachicken'),
      X('אאוטרסייד', 'otherside', 2, 'אאוטרסייד|אות\'רסייד|אדרסייד|otherside|other side'),
      X('קאט', 'cat', 3, 'קאט|קט|cat|disc cat'),
      X('13', '13', 3, '13|שלוש עשרה|thirteen|disc 13'),
      X('בלוקס', 'blocks', 4, 'בלוקס|blocks|disc blocks'),
      X('צ\'ירפ', 'chirp', 4, 'צ\'ירפ|צירפ|chirp'),
      X('פאר', 'far', 4, 'פאר|far'),
      X('מול', 'mall', 4, 'מול|קניון|mall'),
      X('מלוהי', 'mellohi', 4, 'מלוהי|מלוחי|mellohi|melohi'),
      X('סטאל', 'stal', 4, 'סטאל|סטל|stal'),
      X('סטראד', 'strad', 4, 'סטראד|סטרד|strad'),
      X('וורד', 'ward', 4, 'וורד|ward'),
      X('11', '11', 4, '11|אחת עשרה|eleven|disc 11'),
      X('וייט', 'wait', 4, 'וייט|wait'),
      X('רליק', 'Relic', 4, 'רליק|רלק|relic'),
      X('קריאייטור', 'Creator', 4, 'קריאייטור|קריאטור|creator'),
      X('טירס', 'Tears', 4, 'טירס|דמעות|tears'),
      X('דיסק 5', 'Music Disc 5', 5, 'חמש|five|disc 5|music disc 5|דיסק 5'),
      X('פרסיפיס', 'Precipice', 5, 'פרסיפיס|פריסיפיס|precipice'),
      X("קריאייטור מיוזיק בוקס", 'Creator (Music Box)', 5, "קריאייטור תיבת נגינה|קריאייטור מיוזיק בוקס|creator music box|creator (music box)|music box|קריאייטור (תיבת נגינה)"),
      X('באונס', 'Bounce', 5, 'באונס|bounce'),
    ],
  },

  // ── enchant ──
  {
    id: 'enchant-any', cat: 'enchant', q: "תנו שם של אנצ'נט במיינקראפט",
    answers: [
      A('sharpness', 1), A('protection', 2), A('efficiency', 2), A('unbreaking', 2), A('mending', 2), A('fortune', 2),
      A('silk_touch', 2), A('fire_aspect', 2), A('looting', 3), A('knockback', 3), A('power', 3), A('infinity', 3),
      A('flame', 3), A('punch', 3), A('feather_falling', 3), A('thorns', 3), A('respiration', 4), A('aqua_affinity', 4),
      A('depth_strider', 4), A('frost_walker', 4), A('smite', 4), A('bane', 4), A('blast_protection', 4),
      A('fire_protection', 4), A('projectile_protection', 4), A('soul_speed', 4), A('swift_sneak', 4), A('sweeping_edge', 4),
      A('luck_of_the_sea', 4), A('lure', 4), A('loyalty', 4), A('riptide', 4), A('channeling', 4), A('multishot', 4),
      A('quick_charge', 4), A('piercing', 4), A('curse_binding', 4), A('curse_vanishing', 4), A('impaling', 5),
      A('density', 5), A('breach', 5), A('wind_burst', 5), A('lunge', 5),
    ],
  },
  {
    id: 'enchant-sword', cat: 'enchant', q: "תנו שם של אנצ'נט שאפשר לשים על חרב",
    answers: [
      A('sharpness', 1), A('fire_aspect', 2, 'אש|fire'), A('knockback', 2), A('looting', 2), A('unbreaking', 2), A('mending', 2),
      A('smite', 3), A('bane', 4), A('sweeping_edge', 4), A('curse_vanishing', 5),
    ],
  },
  {
    id: 'enchant-boots', cat: 'enchant', q: "תנו שם של אנצ'נט שאפשר לשים על מגפיים",
    answers: [
      A('feather_falling', 1), A('protection', 2), A('depth_strider', 2), A('unbreaking', 2), A('mending', 2),
      A('soul_speed', 3), A('frost_walker', 3), A('fire_protection', 4), A('blast_protection', 4),
      A('projectile_protection', 4), A('thorns', 4), A('curse_binding', 5), A('curse_vanishing', 5),
    ],
  },

  // ── crafting ──
  {
    id: 'crafting-diamond', cat: 'crafting', q: "תנו שם של משהו שעושים מיהלומים בקראפטינג טייבל",
    answers: [
      X('מכוש יהלום', 'Diamond Pickaxe', 1, 'מכוש יהלום|מכוש יהלומים|פיקאקס יהלום|דיימונד פיקאקס|מכוש|פיקאקס|diamond pickaxe|diamond pick|pickaxe|pick|diamond pickax'),
      X('חרב יהלום', 'Diamond Sword', 1, 'חרב יהלום|חרב יהלומים|דיימונד סורד|חרב|sword|diamond sword'),
      X('גרזן יהלום', 'Diamond Axe', 2, 'גרזן יהלום|גרזן יהלומים|דיימונד אקס|גרזן|axe|diamond axe'),
      X('את יהלום', 'Diamond Shovel', 2, 'את יהלום|את חפירה יהלום|דיימונד שובל|את|את חפירה|shovel|spade|diamond shovel'),
      X("שריון יהלום", 'Diamond Chestplate', 2, "שריון חזה מיהלום|שריון חזה יהלום|שריון יהלום|שריון יהלומים|שריון|שריון חזה|צ'סטפלייט|chestplate|chest plate|diamond chestplate|diamond armor|diamond armour|armor"),
      X('קסדת יהלום', 'Diamond Helmet', 2, 'קסדת יהלום|קסדה מיהלום|קסדת יהלומים|קסדה|helmet|diamond helmet'),
      X('מעדר יהלום', 'Diamond Hoe', 3, 'מעדר יהלום|דיימונד הו|מעדר|hoe|diamond hoe'),
      X('מכנסי יהלום', 'Diamond Leggings', 3, 'מכנסי יהלום|מכנסיים מיהלום|מכנסיים|לגינגס|leggings|pants|diamond leggings|diamond pants'),
      X('מגפי יהלום', 'Diamond Boots', 3, 'מגפי יהלום|מגפיים מיהלום|מגפיים|נעליים|boots|diamond boots|diamond shoes'),
      X('בלוק יהלום', 'Block of Diamond', 3, 'בלוק יהלום|בלוק יהלומים|קוביית יהלום|diamond block|block of diamond'),
      A('enchanting_table', 3),
      X('חנית יהלום', 'Diamond Spear', 4, 'חנית יהלום|ספיר יהלום|דיימונד ספיר|חנית|spear|diamond spear'),
      X('ג\'וקבוקס', 'Jukebox', 4, 'ג\'וקבוקס|ג\'וק בוקס|מכונת תקליטים|jukebox|juke box'),
      X("סמיתינג טמפלייט", 'Smithing Template', 5, "תבנית חישול|תבנית נפחות|תבנית|סמית'ינג טמפלייט|smithing template|template|netherite upgrade|netherite upgrade template|armor trim|trim|תבנית חישול (שכפול)"),
    ],
  },
  {
    id: 'crafting-iron', cat: 'crafting', q: "תנו שם של משהו שעושים מברזל",
    answers: [
      X('מכוש ברזל', 'Iron Pickaxe', 1, 'מכוש ברזל|פיקאקס ברזל|איירון פיקאקס|מכוש|פיקאקס|iron pickaxe|iron pick|pickaxe'),
      A('bucket', 1),
      X('חרב ברזל', 'Iron Sword', 2, 'חרב ברזל|איירון סורד|חרב|iron sword|sword'),
      X("שריון ברזל", 'Iron Chestplate', 2, "שריון חזה מברזל|שריון חזה ברזל|שריון ברזל|שריון|iron chestplate|iron armor|iron armour|chestplate|armor"),
      A('shears', 2), A('anvil', 2), A('minecart', 2),
      X('בלוק ברזל', 'Block of Iron', 2, 'בלוק ברזל|קוביית ברזל|iron block|block of iron'),
      X('גרזן ברזל', 'Iron Axe', 3, 'גרזן ברזל|גרזן|iron axe|axe'),
      X('את ברזל', 'Iron Shovel', 3, 'את ברזל|את|iron shovel|shovel'),
      X('קסדת ברזל', 'Iron Helmet', 3, 'קסדת ברזל|קסדה|iron helmet|helmet'),
      X('מכנסי ברזל', 'Iron Leggings', 3, 'מכנסי ברזל|מכנסיים|iron leggings|leggings|iron pants'),
      X('מגפי ברזל', 'Iron Boots', 3, 'מגפי ברזל|מגפיים|iron boots|boots'),
      A('iron_bars', 3), A('iron_door', 3), A('cauldron', 3), A('hopper', 3), A('rail', 3), A('piston', 3), A('compass', 3),
      A('shield', 3), A('flint_and_steel', 3), A('iron_nugget', 3),
      X('מעדר ברזל', 'Iron Hoe', 4, 'מעדר ברזל|מעדר|iron hoe|hoe'),
      A('iron_trapdoor', 4), A('tripwire_hook', 4), A('crossbow', 4),
      X("הבי וייטד פרשר פלייט", 'Heavy Weighted Pressure Plate', 4, "לוחית לחץ כבדה|לוחית לחץ מברזל|heavy weighted pressure plate|iron pressure plate"),
      A('smithing_table', 4), A('blast_furnace', 4), A('stonecutter', 4), A('chain', 4), A('lantern', 4), A('saddle', 4),
      X('חנית ברזל', 'Iron Spear', 5, 'חנית ברזל|חנית|iron spear|spear'),
      A('detector_rail', 5), A('activator_rail', 5), A('soul_lantern', 5), A('lodestone', 5), A('crafter', 5), A('name_tag', 5),
    ],
  },
  {
    id: 'crafting-gold', cat: 'crafting', q: "תנו שם של משהו שעושים מזהב",
    answers: [
      A('golden_apple', 1),
      X('חרב זהב', 'Golden Sword', 2, 'חרב זהב|חרב מזהב|גולדן סורד|golden sword|gold sword|sword|חרב'),
      X('מכוש זהב', 'Golden Pickaxe', 2, 'מכוש זהב|מכוש מזהב|golden pickaxe|gold pickaxe|pickaxe|מכוש'),
      X("שריון זהב", 'Golden Chestplate', 2, "שריון חזה מזהב|שריון חזה זהב|שריון זהב|שריון|golden chestplate|gold chestplate|gold armor|golden armor|chestplate|armor"),
      A('golden_carrot', 2), A('gold_block', 2),
      X('גרזן זהב', 'Golden Axe', 3, 'גרזן זהב|golden axe|gold axe|axe|גרזן'),
      X('את זהב', 'Golden Shovel', 3, 'את זהב|golden shovel|gold shovel|shovel|את'),
      X('קסדת זהב', 'Golden Helmet', 3, 'קסדת זהב|golden helmet|gold helmet|helmet|קסדה'),
      X('מכנסי זהב', 'Golden Leggings', 3, 'מכנסי זהב|golden leggings|gold leggings|leggings|מכנסיים'),
      X('מגפי זהב', 'Golden Boots', 3, 'מגפי זהב|golden boots|gold boots|boots|מגפיים'),
      A('glistering_melon', 3), A('clock', 3), A('powered_rail', 3), A('gold_nugget', 3),
      X('מעדר זהב', 'Golden Hoe', 4, 'מעדר זהב|golden hoe|gold hoe|hoe|מעדר'),
      X("לייט וייטד פרשר פלייט", 'Light Weighted Pressure Plate', 4, "לוחית לחץ קלה|לוחית לחץ מזהב|light weighted pressure plate|gold pressure plate|golden pressure plate"),
      X('חנית זהב', 'Golden Spear', 5, 'חנית זהב|golden spear|gold spear|spear|חנית'),
      A('golden_dandelion', 5), A('name_tag', 5),
    ],
  },
  {
    id: 'crafting-copper', cat: 'crafting', q: "תנו שם של משהו שעושים מקופר (נחושת)",
    answers: [
      A('lightning_rod', 1),
      X('בלוק נחושת', 'Block of Copper', 2, 'בלוק נחושת|קוביית נחושת|copper block|block of copper'),
      X('משקפת', 'Spyglass', 2, 'משקפת|טלסקופ|ספייגלאס|spyglass|spy glass|telescope'),
      X("שריון נחושת", 'Copper Chestplate', 2, "שריון חזה מנחושת|שריון חזה נחושת|שריון נחושת|שריון|copper chestplate|copper armor|chestplate|armor"),
      X('מכוש נחושת', 'Copper Pickaxe', 2, 'מכוש נחושת|copper pickaxe|copper pick|pickaxe|מכוש'),
      X('חרב נחושת', 'Copper Sword', 2, 'חרב נחושת|copper sword|sword|חרב'),
      X('מברשת', 'Brush', 3, 'מברשת|מברשות|בראש|brush'),
      X('גרזן נחושת', 'Copper Axe', 3, 'גרזן נחושת|copper axe|axe|גרזן'),
      X('את נחושת', 'Copper Shovel', 3, 'את נחושת|copper shovel|shovel|את'),
      X('קסדת נחושת', 'Copper Helmet', 3, 'קסדת נחושת|copper helmet|helmet|קסדה'),
      X('מגפי נחושת', 'Copper Boots', 3, 'מגפי נחושת|copper boots|boots|מגפיים'),
      X('מעדר נחושת', 'Copper Hoe', 4, 'מעדר נחושת|copper hoe|hoe|מעדר'),
      X('מכנסי נחושת', 'Copper Leggings', 4, 'מכנסי נחושת|copper leggings|leggings|מכנסיים'),
      A('copper_bulb', 4),
      X("קופר גרייט", 'Copper Grate', 4, "סבכת נחושת|רשת נחושת|copper grate|grate"),
      X("קאט קופר", 'Cut Copper', 4, "נחושת חתוכה|קאט קופר|cut copper"),
      A('copper_door', 4), A('copper_trapdoor', 4), A('copper_chest', 4), A('copper_torch', 4), A('copper_lantern', 4),
      X("נאגט נחושת", 'Copper Nugget', 4, "גוש נחושת קטן|נאגט נחושת|גרגר נחושת|copper nugget|copper nuggets"),
      X('חנית נחושת', 'Copper Spear', 5, 'חנית נחושת|copper spear|spear|חנית'),
      X("צ'יזלד קופר", 'Chiseled Copper', 5, "נחושת מגולפת|נחושת מסותתת|chiseled copper"),
      X('סורגי נחושת', 'Copper Bars', 5, 'סורגי נחושת|copper bars'),
      X('שרשרת נחושת', 'Copper Chain', 5, 'שרשרת נחושת|copper chain'),
      A('name_tag', 5),
    ],
  },
  {
    id: 'crafting-string', cat: 'crafting', q: "תנו שם של משהו שעושים מחוט",
    answers: [
      A('bow', 1), A('fishing_rod', 1), A('wool', 2), A('crossbow', 3), A('lead', 3), A('loom', 4), A('scaffolding', 4),
      A('candle', 4), A('bundle', 5),
    ],
  },
  {
    id: 'crafting-leather', cat: 'crafting', q: "תנו שם של משהו שעושים מעור",
    answers: [
      X("שריון עור", 'Leather Tunic', 1, "שריון חזה מעור|שריון עור|טוניקת עור|חולצת עור|leather tunic|leather chestplate|leather armor|leather armour|tunic"),
      X('כובע עור', 'Leather Cap', 2, 'כובע עור|קסדת עור|leather cap|leather helmet|cap'),
      X('מכנסי עור', 'Leather Pants', 2, 'מכנסי עור|leather pants|leather leggings'),
      A('leather_boots', 2), A('book', 2), A('item_frame', 3), A('saddle', 3), A('bundle', 4),
      X("שריון סוס עור", 'Leather Horse Armor', 4, "שריון סוס מעור|שריון סוס עור|שריון סוס|leather horse armor|horse armor"),
      A('harness', 4),
    ],
  },
  {
    id: 'crafting-wool', cat: 'crafting', q: "תנו שם של משהו שעושים מצמר",
    answers: [
      A('bed', 1), X('שטיח', 'Carpet', 1, 'שטיח|שטיחים|קרפט|carpet|carpets|rug'),
      X('דגל', 'Banner', 2, 'דגל|דגלים|באנר|banner|banners|flag'),
      X('ציור', 'Painting', 2, 'ציור|ציורים|תמונה|פיינטינג|painting|paintings|picture'),
      X('צמר צבעוני', 'Dyed Wool', 3, 'צמר צבעוני|צמר צבוע|dyed wool|colored wool|red wool|blue wool'),
      A('harness', 4),
      X('מדרגות צמר', 'Wool Stairs', 5, 'מדרגות צמר|wool stairs|wool stair'),
      X("סלאב צמר", 'Wool Slab', 5, "חצי בלוק צמר|לוח צמר|wool slab|wool slabs"),
      X('כרית', 'Cushion', 5, 'כרית|כריות|קושן|cushion|cushions|pillow'),
    ],
  },
  {
    id: 'crafting-wood', cat: 'crafting', q: "תנו שם של משהו שעושים רק מעץ (פלאנקס, מקלות או לוגים)",
    answers: [
      A('crafting_table', 1), A('stick', 1), A('chest', 2), A('door', 2),
      X('מכוש עץ', 'Wooden Pickaxe', 2, 'מכוש עץ|מכוש מעץ|פיקאקס עץ|וודן פיקאקס|wooden pickaxe|wood pickaxe|pickaxe|מכוש'),
      X('חרב עץ', 'Wooden Sword', 2, 'חרב עץ|חרב מעץ|wooden sword|wood sword|sword|חרב'),
      X('סירה', 'Boat', 2, 'סירה|סירות|בוט|boat|boats|oak boat'),
      X('גרזן עץ', 'Wooden Axe', 3, 'גרזן עץ|גרזן מעץ|wooden axe|wood axe|axe|גרזן'),
      X('את עץ', 'Wooden Shovel', 3, 'את עץ|את מעץ|wooden shovel|wood shovel|shovel|את'),
      X('גדר', 'Fence', 3, 'גדר|גדרות|פנס|fence|fences|oak fence'), A('fence_gate', 3), A('trapdoor', 3), A('ladder', 3),
      A('sign', 3), X('קרשים', 'Planks', 3, 'קרשים|קרש|פלאנקס|planks|plank|wooden planks|wood planks'),
      X("סלאב עץ", 'Wooden Slab', 3, "חצי בלוק עץ|חצי בלוק|סלאב|slab|slabs|wooden slab|oak slab"),
      X('מדרגות עץ', 'Wooden Stairs', 3, 'מדרגות עץ|מדרגות|מדרגה|סטיירס|stairs|stair|wooden stairs|oak stairs'),
      A('button', 3), A('pressure_plate', 3),
      X('מעדר עץ', 'Wooden Hoe', 4, 'מעדר עץ|מעדר מעץ|wooden hoe|wood hoe|hoe|מעדר'),
      A('bowl', 4), A('barrel', 4), A('composter', 4),
      X('סירה עם תיבה', 'Boat with Chest', 4, 'סירה עם תיבה|סירה עם ארגז|צ\'סט בוט|chest boat|boat with chest|oak boat with chest'),
      X('חנית עץ', 'Wooden Spear', 5, 'חנית עץ|חנית מעץ|wooden spear|wood spear|spear|חנית'),
      X('מדף ספרים מגולף', 'Chiseled Bookshelf', 5, 'מדף ספרים מגולף|מדף ספרים מסותת|chiseled bookshelf|chiseled book shelf'),
      X("בלוק עץ", 'Wood', 5, "בלוק עץ|עץ עם קליפה|קליפת עץ|wood|oak wood|bark|wood block|בלוק עץ (קליפה)"),
      A('shelf', 5),
      X('רפסודת במבוק', 'Bamboo Raft', 5, 'רפסודת במבוק|רפסודה|במבוק רפט|bamboo raft|raft'),
    ],
  },
  {
    id: 'crafting-cobblestone', cat: 'crafting', q: "תנו שם של משהו שעושים מקובלסטון",
    answers: [
      A('furnace', 1), X('מכוש אבן', 'Stone Pickaxe', 1, 'מכוש אבן|מכוש מאבן|סטון פיקאקס|stone pickaxe|stone pick|pickaxe|מכוש'),
      X('חרב אבן', 'Stone Sword', 2, 'חרב אבן|חרב מאבן|stone sword|sword|חרב'),
      X('גרזן אבן', 'Stone Axe', 2, 'גרזן אבן|גרזן מאבן|stone axe|axe|גרזן'),
      X('את אבן', 'Stone Shovel', 3, 'את אבן|את מאבן|stone shovel|shovel|את'),
      X('מעדר אבן', 'Stone Hoe', 3, 'מעדר אבן|מעדר מאבן|stone hoe|hoe|מעדר'),
      X("אבן", 'Stone', 3, "אבן|אבן חלקה|סטון|stone|smooth stone|אבן (חלקה)"),
      X("מדרגות קובלסטון", 'Cobblestone Stairs', 3, "מדרגות אבן מרוצפת|מדרגות אבן|מדרגות קובלסטון|cobblestone stairs|stone stairs|stairs"),
      X("סלאב קובלסטון", 'Cobblestone Slab', 3, "חצי בלוק אבן מרוצפת|חצי בלוק אבן|cobblestone slab|stone slab|slab"),
      A('dispenser', 3), A('piston', 3),
      X("קיר קובלסטון", 'Cobblestone Wall', 4, "קיר אבן מרוצפת|קיר אבן|חומת אבן|cobblestone wall|stone wall|wall"),
      A('lever', 4), A('dropper', 4), A('brewing_stand', 4), A('observer', 4),
      X("מוסי קובלסטון", 'Mossy Cobblestone', 4, "אבן מרוצפת עם טחב|אבן עם טחב|קובלסטון טחוב|mossy cobblestone|mossy cobble"),
      X('חנית אבן', 'Stone Spear', 5, 'חנית אבן|stone spear|spear|חנית'),
    ],
  },
  {
    id: 'crafting-smelting', cat: 'crafting', q: "תנו שם של משהו (לא אוכל) שיוצא מהתכה בפרנס",
    answers: [
      A('glass', 1), X('מטיל ברזל', 'Iron Ingot', 1, 'מטיל ברזל|מטילי ברזל|ברזל|איירון אינגוט|iron ingot|iron|iron ingots'),
      X('מטיל זהב', 'Gold Ingot', 2, 'מטיל זהב|מטילי זהב|זהב|גולד אינגוט|gold ingot|gold|gold ingots'),
      A('stone', 2), X("צ'רקול", 'Charcoal', 2, "פחם עץ|צ'ארקול|charcoal|char coal"),
      X('לבנה', 'Brick', 3, 'לבנה|לבנים|בריק|brick|bricks'),
      X('מטיל נחושת', 'Copper Ingot', 3, 'מטיל נחושת|מטילי נחושת|נחושת|copper ingot|copper'),
      X('אבן חלקה', 'Smooth Stone', 3, 'אבן חלקה|סמות\' סטון|smooth stone'),
      X("שבב נת'רייט", 'Netherite Scrap', 3, "שבב נתרייט|שבבי נתרייט|גרוטאת נתרייט|נתרייט סקראפ|netherite scrap|netherite scraps|scrap"),
      X('טרקוטה', 'Terracotta', 3, 'טרקוטה|טרה קוטה|terracotta|terra cotta|hardened clay'),
      X("גלייזד טרקוטה", 'Glazed Terracotta', 4, "טרקוטה מזוגגת|glazed terracotta"),
      X("נת'ר בריק", 'Nether Brick', 4, "לבנת נתר|לבני נתר|nether brick|nether bricks"),
      X('צבע ירוק', 'Green Dye', 4, 'צבע ירוק|green dye'),
      X('ספוג', 'Sponge', 4, 'ספוג|ספוג יבש|sponge|dry sponge'),
      X('לבני אבן סדוקות', 'Cracked Stone Bricks', 4, 'לבני אבן סדוקות|לבני אבן שבורות|cracked stone bricks|cracked bricks'),
      X("סמוד סנדסטון", 'Smooth Sandstone', 4, "אבן חול חלקה|smooth sandstone|smooth red sandstone"),
      A('iron_nugget', 4), A('gold_nugget', 4),
      X('יהלום', 'Diamond', 4, 'יהלום|יהלומים|diamond|diamonds'),
      X('פחם', 'Coal', 4, 'פחם|קול|coal'),
      X('קוורץ', 'Nether Quartz', 4, 'קוורץ|קווארץ|quartz|nether quartz'),
      X('צבע ליים', 'Lime Dye', 5, 'צבע ליים|צבע ירוק בהיר|lime dye'),
      X("פופד כורוס פרוט", 'Popped Chorus Fruit', 5, "פרי כורוס מפוצץ|כורוס מפוצץ|popped chorus fruit|popped chorus"),
      A('deepslate', 5),
      X('קוורץ חלק', 'Smooth Quartz', 5, 'קוורץ חלק|smooth quartz|smooth quartz block'),
      X("סמוד באזלט", 'Smooth Basalt', 5, "בזלת חלקה|smooth basalt"),
      X('לבני דיפסלייט סדוקות', 'Cracked Deepslate Bricks', 5, 'לבני דיפסלייט סדוקות|דיפסלייט סדוק|cracked deepslate bricks|cracked deepslate tiles|cracked deepslate'),
      X("נת'ר בריקס סדוקות", 'Cracked Nether Bricks', 5, "לבני נתר סדוקות|cracked nether bricks"),
      X("בלקסטון בריקס סדוקות", 'Cracked Polished Blackstone Bricks', 5, "לבני אבן שחורה סדוקות|cracked polished blackstone bricks|cracked blackstone bricks"),
      X('אמרלד', 'Emerald', 5, 'אמרלד|אזמרגד|emerald|emeralds'),
      X("לאפיס", 'Lapis Lazuli', 5, "לאפיס לזולי|לאפיס|lapis lazuli|lapis"),
      A('redstone_dust', 5),
    ],
  },

  // ── biomes ──
  {
    id: 'biomes-any', cat: 'biomes', q: "תנו שם של ביום במיינקראפט",
    answers: [
      A('desert', 1), A('jungle', 1), A('plains', 2), A('forest', 2), A('ocean', 2), A('taiga', 2), A('savanna', 2), A('swamp', 2),
      A('snowy_plains', 2), A('badlands', 2), A('mushroom_fields', 2), A('cherry_grove', 2), A('deep_dark', 2),
      A('dark_forest', 3), A('birch_forest', 3), A('mangrove_swamp', 3), A('ice_spikes', 3), A('lush_caves', 3),
      A('dripstone_caves', 3), A('meadow', 3), A('bamboo_jungle', 3), A('pale_garden', 3), A('beach', 3), A('river', 3),
      A('flower_forest', 3), A('warm_ocean', 3), A('frozen_ocean', 3), A('deep_ocean', 3), A('crimson_forest', 3),
      A('warped_forest', 3), A('soul_sand_valley', 3), A('nether_wastes', 4), A('basalt_deltas', 4), A('snowy_taiga', 4),
      A('sunflower_plains', 4), A('savanna_plateau', 4), A('windswept_hills', 4), A('grove', 4), A('snowy_slopes', 4),
      A('frozen_peaks', 4), A('jagged_peaks', 4), A('stony_peaks', 4), A('frozen_river', 4), A('snowy_beach', 4),
      A('lukewarm_ocean', 4), A('cold_ocean', 4), A('the_end', 4), A('windswept_gravelly', 5), A('windswept_forest', 5),
      A('windswept_savanna', 5), A('sparse_jungle', 5), A('eroded_badlands', 5), A('wooded_badlands', 5),
      A('old_growth_birch', 5), A('old_growth_pine', 5), A('old_growth_spruce', 5), A('stony_shore', 5),
      A('deep_lukewarm_ocean', 5), A('deep_cold_ocean', 5), A('deep_frozen_ocean', 5), A('end_highlands', 5),
      A('end_midlands', 5), A('small_end_islands', 5), A('end_barrens', 5), A('sulfur_caves', 5), A('dappled_forest', 5),
      A('the_void', 5),
    ],
  },
  {
    id: 'biomes-snowy', cat: 'biomes', q: "תנו שם של ביום עם שלג או קרח",
    answers: [
      A('snowy_plains', 1), A('ice_spikes', 2), A('snowy_taiga', 2), A('frozen_ocean', 2), A('frozen_river', 3),
      A('snowy_beach', 3), A('snowy_slopes', 3), A('frozen_peaks', 3), A('grove', 4), A('jagged_peaks', 4),
      A('deep_frozen_ocean', 4),
    ],
  },

  // ── structures ──
  {
    id: 'structures-any', cat: 'structures', q: "תנו שם של מבנה שנוצר לבד בעולם",
    answers: [
      A('village', 1), A('desert_pyramid', 2), A('jungle_pyramid', 2), A('stronghold', 2), A('mineshaft', 2),
      A('ocean_monument', 2), A('woodland_mansion', 2), A('shipwreck', 2), A('ruined_portal', 2), A('nether_fortress', 2),
      A('bastion', 2), A('end_city', 3, 'ספינת אנד|end ship'), A('pillager_outpost', 3), A('igloo', 3), A('witch_hut', 3),
      A('ancient_city', 3), A('trial_chambers', 3), A('ocean_ruins', 3), A('dungeon', 3), A('trail_ruins', 4),
      A('buried_treasure', 4), A('desert_well', 4), A('fossil', 4), A('geode', 4), A('abandoned_camp', 5), A('nether_fossil', 5),
    ],
  },

  // ── misc ──
  {
    id: 'misc-explodes', cat: 'misc', q: "תנו שם של משהו שגורם לפיצוץ",
    answers: [
      A('tnt', 1), A('creeper', 1), A('ghast', 2), A('wither', 3), A('end_crystal', 3),
      X("מיינקארט טי אן טי", 'Minecart with TNT', 3, "עגלת tnt|עגלת טי אן טי|עגלה עם tnt|מיינקארט tnt|tnt minecart|minecart with tnt|tnt cart|עגלת TNT"),
      A('firework_rocket', 3), A('bed', 4, 'מיטה בנתר|bed in nether'), A('respawn_anchor', 4), A('charged_creeper', 4),
      X('כדור אש', 'Fireball', 4, 'כדור אש|כדורי אש|כדור אש של גאסט|פייר בול|fireball|fire ball|ghast fireball'),
      A('wind_charge', 4), A('breeze', 5), A('sulfur_cube', 5),
    ],
  },
  {
    id: 'misc-hurt-blocks', cat: 'misc', q: "תנו שם של בלוק שיכול לפגוע בך",
    answers: [
      A('lava', 1), X('קקטוס', 'Cactus', 1, 'קקטוס|קקטוסים|cactus|cacti|kaktus'), A('fire', 2), A('magma_block', 2), A('tnt', 2),
      X("שיח סוויט ברי", 'Sweet Berry Bush', 3, "שיח פירות יער|שיח פירות|שיח ברי|שיח|sweet berry bush|berry bush|sweet berries|bush"),
      A('campfire', 3, 'soul campfire|מדורת נשמות'), X("ויתר רוז", 'Wither Rose', 3, "ורד וויתר|ורד ויתר|ורד שחור|וויתר רוז|wither rose|black rose"), A('pointed_dripstone', 3), A('anvil', 3),
      X("פאודר סנואו", 'Powder Snow', 4, "שלג אבקתי|שלג פודרה|שלג טובעני|פאודר סנו|powder snow|powdered snow"),
      A('bed', 4), A('respawn_anchor', 4), A('sand', 4), A('gravel', 4),
      X('מים', 'Water', 4, 'מים|ווטר|water'),
      A('dispenser', 5), A('sulfur_spike', 5),
    ],
  },
  {
    id: 'misc-dye-colors', cat: 'misc', q: "תנו שם של צבע של דיי (צבע) במיינקראפט",
    answers: [
      X('אדום', 'Red', 1, 'אדום|רד|red|red dye'),
      X('כחול', 'Blue', 1, 'כחול|בלו|blue|blue dye'),
      X('ירוק', 'Green', 2, 'ירוק|גרין|green|green dye'),
      X('צהוב', 'Yellow', 2, 'צהוב|ילו|yellow|yellow dye'),
      X('שחור', 'Black', 2, 'שחור|בלאק|black|black dye'),
      X('לבן', 'White', 2, 'לבן|וייט|white|white dye'),
      X('ורוד', 'Pink', 3, 'ורוד|פינק|pink|pink dye'),
      X('כתום', 'Orange', 3, 'כתום|אורנג\'|orange|orange dye'),
      X('סגול', 'Purple', 3, 'סגול|פרפל|purple|purple dye'),
      X('אפור', 'Gray', 3, 'אפור|גריי|gray|grey|gray dye|grey dye'),
      X('חום', 'Brown', 3, 'חום|בראון|brown|brown dye'),
      X('תכלת', 'Light Blue', 3, 'תכלת|כחול בהיר|לייט בלו|light blue|light blue dye'),
      X('ליים', 'Lime', 4, 'ליים|ירוק בהיר|ירוק ליים|לימון|lime|lime dye|light green'),
      X('ציאן', 'Cyan', 4, 'ציאן|טורקיז|סיאן|cyan|cyan dye|turquoise'),
      X('מג\'נטה', 'Magenta', 4, 'מג\'נטה|מגנטה|מג\'נטה|magenta|magenta dye'),
      X('אפור בהיר', 'Light Gray', 4, 'אפור בהיר|לייט גריי|light gray|light grey|light gray dye|silver'),
    ],
  },
];
