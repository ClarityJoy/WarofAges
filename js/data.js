'use strict';
/* ================= DATA ================= */
const ERAS=[
  {id:0,n:'העת העתיקה',ic:'🏺'},
  {id:1,n:'ימי הביניים',ic:'🏰'},
  {id:2,n:'מלחמות העולם',ic:'🎖️'},
  {id:3,n:'העידן המודרני',ic:'🚁'},
  {id:4,n:'העתיד',ic:'🛸'},
  {id:5,n:'עידן החלל',ic:'🪐'}
];
const TEAMS={
  blue:{n:'כחול',pl:'הכחולים',css:'#4d8dff',main:0x2f6fd6,dark:0x1c3b78,veh:0x4a6488,bar:0x4d8dff,ic:'🔵'},
  red:{n:'אדום',pl:'האדומים',css:'#ff5547',main:0xc9392f,dark:0x6f1c17,veh:0x8c4c3e,bar:0xff5547,ic:'🔴'},
  green:{n:'ירוק',pl:'הירוקים',css:'#47c75a',main:0x2f9a42,dark:0x1b5a26,veh:0x4f7a4f,bar:0x47c75a,ic:'🟢'},
  yellow:{n:'צהוב',pl:'הצהובים',css:'#f2b62e',main:0xd9a21f,dark:0x7a5a10,veh:0x8f7a3c,bar:0xf2b62e,ic:'🟡'}
};
const TEAM_IDS=['blue','red','green','yellow'];
const ZONES={
  blue:{x0:-78,x1:-50,z0:-78,z1:78},
  red:{x0:50,x1:78,z0:-78,z1:78},
  green:{x0:-44,x1:44,z0:-78,z1:-54},
  yellow:{x0:-44,x1:44,z0:54,z1:78}
};
const SKINS=[
  {id:'default',n:'צבע הצוות',uni:null,veh:null,cost:0},
  {id:'desert',n:'מדבר',uni:0xc2a36b,veh:0xb39a6a,cost:0},
  {id:'jungle',n:'ג׳ונגל',uni:0x4f6b34,veh:0x55693a,cost:0},
  {id:'snow',n:'שלג',uni:0xe4e9ee,veh:0xcfd8df,cost:5},
  {id:'urban',n:'אפור עירוני',uni:0x6d737a,veh:0x5d6369,cost:12},
  {id:'navy',n:'כחול צי',uni:0x1e2f55,veh:0x2a3b60,cost:20},
  {id:'black',n:'שחור מבצעי',uni:0x25282c,veh:0x2b2e33,cost:30},
  {id:'royal',n:'סגול מלכותי',uni:0x6a3fa0,veh:0x5a3a85,cost:0,boss:2},
  {id:'gold',n:'זהב',uni:0xd4a72c,veh:0xc9a032,cost:80},
  {id:'neon',n:'ניאון עתידי',uni:0x18d8ff,veh:0x0f90b0,cost:0,boss:5,glow:1},
  {id:'space',n:'לבן חללי',uni:0xeef2f6,veh:0xdde3ea,cost:0,boss:6}
];
const DIFF={
  easy:{n:'קל',mult:.75,smart:0,reserve:0,acc:-.08},
  normal:{n:'רגיל',mult:1,smart:.5,reserve:.1,acc:0},
  hard:{n:'קשה',mult:1.25,smart:1,reserve:.2,acc:.05},
  insane:{n:'אכזרי',mult:1.6,smart:1,reserve:.25,acc:.1}
};
const ATK_NAME={bullet:'ירי',arrow:'חץ',stone:'אבן קלע',melee:'קרב מגע',stomp:'רמיסה',flame:'להבה',heal:'ריפוי',rocket:'רקטה',shell:'פגז',grenade:'רימון',mortar:'מרגמה',boulder:'סלע מושלך',cannonball:'כדור תותח',bomb:'פצצה מהאוויר',laser:'לייזר',plasma:'פלזמה',rail:'רובה רייל',ionball:'כדור יונים',fireball:'כדור אש',command:'פיקוד – לא תוקף'};

/* model meta: aim height, health-bar height, radius, mass, death style */
const MODEL_META={
  inf:{hy:1.2,bar:2.5,rad:.45,mass:1,die:'fall'},
  rider:{hy:2.3,bar:3.4,rad:1.1,mass:5,die:'side',mounted:1},
  chariot:{hy:1.7,bar:3.1,rad:1.5,mass:4,die:'wreck',mounted:1},
  catapult:{hy:1,bar:3.2,rad:1.7,mass:6,die:'wreck'},
  trebuchet:{hy:1.5,bar:6.4,rad:2.3,mass:10,die:'wreck'},
  cannon:{hy:.9,bar:2.4,rad:1.4,mass:6,die:'wreck'},
  tank:{hy:1.2,bar:3.6,rad:2.6,mass:20,die:'wreck'},
  jeep:{hy:1.1,bar:3.1,rad:1.6,mass:8,die:'wreck'},
  heli:{hy:0,bar:2.6,rad:2.2,mass:12,die:'crash'},
  zeppelin:{hy:0,bar:3.6,rad:3,mass:15,die:'crash'},
  drone:{hy:0,bar:1.2,rad:.7,mass:1,die:'crash'},
  mech:{hy:3.2,bar:5.4,rad:1.8,mass:30,die:'mech'},
  elephant:{hy:3.2,bar:6.6,rad:3.4,mass:40,die:'side',mounted:1},
  siege:{hy:4,bar:10.8,rad:3.3,mass:60,die:'wreck'},
  ballista:{hy:1,bar:2.8,rad:1.5,mass:5,die:'wreck'},
  saucer:{hy:0,bar:2.6,rad:2.4,mass:14,die:'crash'},
  dino:{hy:2.6,bar:5.8,rad:2,mass:30,die:'side',organic:1},
  dragon:{hy:0,bar:3.6,rad:3,mass:40,die:'crash',organic:1},
  train:{hy:1.6,bar:4.6,rad:4,mass:200,die:'wreck'},
  plane:{hy:0,bar:3,rad:4,mass:40,die:'crash'},
  spider:{hy:2,bar:4.2,rad:2.2,mass:40,die:'mech'},
  queen:{hy:3,bar:7.2,rad:3.2,mass:60,die:'side',organic:1}
};
const MINI_BOSS={8:'trex',23:'dragon',38:'armoredtrain',53:'bomber',68:'spiderbot',83:'alienqueen'};

const DEFS={
/* --- era 0: ancient --- */
caveman:{n:'איש מערות',ic:'🦴',era:0,unlock:1,hp:75,spd:3.6,rng:1.7,dmg:14,rate:.8,atk:'melee',look:{h:'fur',g:'club',bare:1},desc:'זול ומהיר. מכה באלה.'},
spear:{n:'נושא חנית',ic:'🔱',era:0,unlock:1,hp:95,spd:3.2,rng:2.6,dmg:15,rate:.9,atk:'melee',antiCav:2,look:{h:'band',g:'spear'},desc:'נזק כפול נגד פרשים, מרכבות ופילים.'},
slinger:{n:'קלע',ic:'🪨',era:0,unlock:2,hp:60,spd:3.4,rng:15,dmg:9,rate:1.1,acc:.6,atk:'stone',air:1,look:{h:'band',g:'sling'},desc:'זורק אבנים מטווח בינוני.'},
archer:{n:'קשת',ic:'🏹',era:0,unlock:3,hp:65,spd:3.2,rng:24,dmg:12,rate:1.25,acc:.65,atk:'arrow',air:1,look:{h:'hood',g:'bow'},desc:'יורה חצים בקשת מעל הראשים.'},
shaman:{n:'מרפא השבט',ic:'🌿',era:0,unlock:5,hp:60,spd:3.4,rng:3,heal:8,rate:1,atk:'heal',look:{h:'fur',g:'staff',torso:0xe8e0c8},desc:'מרפא לוחמים פצועים.'},
legion:{n:'לגיונר',ic:'🛡️',era:0,unlock:6,hp:170,spd:2.8,rng:1.9,dmg:18,rate:.8,atk:'melee',shield:.55,look:{h:'roman',g:'sword',sh:'tower',cape:1},desc:'מגן גדול עוצר 55% מהפגיעות מלפנים.'},
chariot:{n:'מרכבה',ic:'🏇',era:0,unlock:8,hp:280,spd:7,rng:20,dmg:12,rate:1,acc:.55,atk:'arrow',air:1,armor:.7,model:'chariot',desc:'מהירה, עם קשת על הסיפון.'},
catapult:{n:'קטפולטה',ic:'☄️',era:0,unlock:11,hp:220,spd:1.2,rng:46,minRng:10,dmg:55,rate:5,atk:'boulder',splash:3.5,armor:.6,model:'catapult',desc:'מכונת מצור. משליכה סלעים לטווח רחוק.'},
elephant:{n:'פיל המלחמה',ic:'🐘',era:0,boss:1,unlock:16,hp:4500,spd:2.2,rng:3.4,dmg:90,rate:1.5,atk:'stomp',splash:3.6,armor:.5,model:'elephant',desc:'בוס! רומס את כל מי שסביבו.'},
/* --- era 1: medieval --- */
swordsman:{n:'סייף',ic:'⚔️',era:1,unlock:16,hp:140,spd:3.4,rng:1.9,dmg:22,rate:.8,atk:'melee',armor:.85,look:{h:'kettle',g:'sword',sh:'round'},desc:'לוחם חרב עם מגן עגול.'},
healer:{n:'מרפא',ic:'🩹',era:1,unlock:17,hp:80,spd:3.5,rng:3,heal:12,rate:.9,atk:'heal',look:{h:'hood',g:'staff',torso:0xf0f0f0},desc:'מרפא לוחמים פצועים.'},
crossbow:{n:'צולב',ic:'🎯',era:1,unlock:18,hp:85,spd:3,rng:27,dmg:28,rate:2.3,acc:.72,atk:'arrow',air:1,look:{h:'kettle',g:'crossbow'},desc:'חץ קשת מוצלבת חזק ומדויק.'},
knight:{n:'אביר',ic:'🤺',era:1,unlock:20,hp:270,spd:3,rng:2,dmg:30,rate:.9,atk:'melee',armor:.6,shield:.4,look:{h:'knight',g:'sword',sh:'kite',cape:1},desc:'שריון מלא ומגן.'},
longbow:{n:'קשת ארוכה',ic:'🎋',era:1,unlock:22,hp:70,spd:3.2,rng:36,dmg:14,rate:1.3,acc:.65,atk:'arrow',air:1,look:{h:'hood',g:'longbow'},desc:'טווח ארוך במיוחד.'},
cavalry:{n:'פרש',ic:'🐴',era:1,unlock:24,hp:300,spd:7.5,rng:2.2,dmg:30,rate:.9,atk:'melee',charge:1,armor:.75,model:'rider',look:{h:'knight',g:'lance'},desc:'מסתער: המכה הראשונה אחרי ריצה כפולה.'},
trebuchet:{n:'טרבושה',ic:'🏯',era:1,unlock:27,hp:320,spd:.8,rng:66,minRng:14,dmg:95,rate:7,atk:'boulder',splash:4.5,armor:.5,model:'trebuchet',desc:'הטווח הארוך ביותר בימי הביניים.'},
siege:{n:'מגדל המצור',ic:'🗼',era:1,boss:2,unlock:31,hp:9000,spd:1.3,rng:30,dmg:16,rate:.55,acc:.6,volley:5,atk:'arrow',air:1,armor:.45,model:'siege',desc:'בוס! מטר של חמישה חצים בכל מטח.'},
/* --- era 2: world wars --- */
musket:{n:'מוסקטר',ic:'🎩',era:2,unlock:31,hp:100,spd:3,rng:21,dmg:34,rate:2.6,acc:.55,atk:'bullet',smoke:1,air:1,look:{h:'tricorn',g:'musket'},desc:'ירייה איטית וחזקה, הרבה עשן.'},
wwsoldier:{n:'חייל מלחמת העולם',ic:'🪖',era:2,unlock:32,hp:110,spd:3.2,rng:24,dmg:18,rate:1,acc:.7,atk:'bullet',air:1,look:{h:'brodie',g:'rifle'},desc:'רובאי עם רובה בריח.'},
wwmedic:{n:'חובש שדה',ic:'⛑️',era:2,unlock:33,hp:90,spd:3.6,rng:3,heal:15,rate:.8,atk:'heal',look:{h:'helmet',g:'pistol',torso:0xf0f0f0,cross:1},desc:'מרפא חיילים פצועים.'},
cannon:{n:'תותח שדה',ic:'💣',era:2,unlock:35,hp:250,spd:1.4,rng:42,dmg:70,rate:4,acc:.8,atk:'cannonball',splash:2.6,armor:.6,model:'cannon',desc:'כדורי תותח בקשת שטוחה.'},
hmg:{n:'מקלע כבד',ic:'🔩',era:2,unlock:36,hp:150,spd:1.6,rng:27,dmg:7,rate:.1,acc:.42,atk:'bullet',air:1,look:{h:'helmet',g:'hmg'},desc:'קיר של כדורים.'},
flame:{n:'להביורן',ic:'🔥',era:2,unlock:38,hp:150,spd:3.1,rng:8,dmg:4,rate:.08,atk:'flame',look:{h:'gasmask',g:'flame',pk:'flame'},desc:'שורף קבוצות ומצית אותן.'},
mortar:{n:'מרגמה',ic:'🎇',era:2,unlock:39,hp:90,spd:1.8,rng:62,minRng:12,dmg:60,rate:4.5,atk:'mortar',splash:5,look:{h:'helmet',g:'none',mortar:1},desc:'אש עקיפה מטווח רחוק.'},
wwtank:{n:'טנק מלחמת העולם',ic:'🚜',era:2,unlock:41,hp:800,spd:2.2,rng:30,dmg:80,rate:4,acc:.8,atk:'shell',splash:3,armor:.25,model:'tank',v:'ww',desc:'שריון ראשון בשדה הקרב.'},
zeppelin:{n:'ספינת אוויר',ic:'🎈',era:2,unlock:43,hp:900,spd:1.8,rng:7,dmg:70,rate:2.2,atk:'bomb',splash:4,fly:17,armor:.6,model:'zeppelin',desc:'מטילה פצצות על מי שמתחתיה.'},
supertank:{n:'טנק־העל',ic:'🦏',era:2,boss:3,unlock:46,hp:14000,spd:1.5,rng:40,dmg:170,rate:3,acc:.8,atk:'shell',splash:5,armor:.12,model:'tank',v:'super',scale:1.6,desc:'בוס! טנק ענק עם שני תותחים.'},
/* --- era 3: modern --- */
rifle:{n:'רובאי',ic:'🔫',era:3,unlock:46,hp:100,spd:3.4,rng:24,dmg:13,rate:.85,acc:.72,atk:'bullet',air:1,look:{h:'helmet',g:'rifle'},desc:'חייל מודרני מאוזן.'},
mg:{n:'מקלען',ic:'💥',era:3,unlock:47,hp:130,spd:2.4,rng:24,dmg:6,rate:.12,acc:.45,atk:'bullet',air:1,look:{h:'helmet',g:'mg'},desc:'צרורות ארוכים.'},
medic:{n:'חובש',ic:'🚑',era:3,unlock:48,hp:100,spd:3.7,rng:3,heal:18,rate:.8,atk:'heal',look:{h:'helmet',g:'pistol',torso:0xf0f0f0,cross:1},desc:'מרפא חיילים פצועים.'},
rocket:{n:'בזוקאי',ic:'🚀',era:3,unlock:49,hp:100,spd:2.8,rng:28,dmg:55,rate:3.2,atk:'rocket',splash:2.6,air:1,anti:1,look:{h:'helmet',g:'rocket'},desc:'מעדיף לתקוף רכבים ומסוקים.'},
sniper:{n:'צלף',ic:'🔭',era:3,unlock:50,hp:70,spd:2.8,rng:50,dmg:75,rate:2.6,acc:.9,atk:'bullet',air:1,kite:15,look:{h:'hood',g:'sniper'},desc:'טווח ארוך מאוד. נסוג כשמתקרבים.'},
grenadier:{n:'רימונאי',ic:'🧨',era:3,unlock:51,hp:100,spd:3,rng:19,minRng:4,dmg:45,rate:2.4,atk:'grenade',splash:3.6,look:{h:'helmet',g:'grenade'},desc:'רימונים בקשת מעל מחסות.'},
commando:{n:'קומנדו',ic:'🗡️',era:3,unlock:52,hp:120,spd:6.2,rng:1.8,dmg:35,rate:.6,atk:'melee',look:{h:'beret',g:'knife'},desc:'מהיר מאוד, קרב מגע.'},
riot:{n:'נושא מגן',ic:'🪟',era:3,unlock:53,hp:220,spd:2.4,rng:12,dmg:9,rate:.7,acc:.65,atk:'bullet',air:1,shield:.75,look:{h:'visorM',g:'pistol',sh:'riot'},desc:'מגן מודרני עוצר 75% מלפנים.'},
officer:{n:'מפקד',ic:'⭐',era:3,unlock:47,hp:180,spd:3,rng:1,dmg:0,rate:1,atk:'command',commander:1,escort:'rifle',look:{h:'cap',g:'pistol',flag:1},desc:'מפקד הצבא: מתאם את החיילים. מגיע עם שני שומרי ראש.'},
jeep:{n:'ג׳יפ',ic:'🚙',era:3,unlock:55,hp:320,spd:8,rng:24,dmg:8,rate:.14,acc:.5,atk:'bullet',air:1,armor:.5,model:'jeep',desc:'מהיר, מקלע מסתובב.'},
tank:{n:'טנק מרכבה',ic:'🛡',era:3,unlock:57,hp:1100,spd:2.8,rng:34,dmg:110,rate:3.8,acc:.85,atk:'shell',splash:4,armor:.15,model:'tank',desc:'שריון כבד ותותח חזק.'},
heli:{n:'מסוק קרב',ic:'🚁',era:3,unlock:58,hp:520,spd:6,rng:32,dmg:40,rate:1.4,acc:.8,atk:'rocket',splash:2.6,air:1,fly:10,armor:.4,model:'heli',desc:'טס מעל מכשולים. חלק מהיחידות לא פוגעות בו.'},
gunship:{n:'ספינת התקיפה',ic:'🛩️',era:3,boss:4,unlock:61,hp:16000,spd:3,rng:42,dmg:70,rate:.6,acc:.8,atk:'rocket',splash:3,air:1,fly:16,armor:.35,model:'heli',v:'gunship',scale:1.9,desc:'בוס! מסוק ענק שיורה מטחי רקטות.'},
/* --- era 4: future --- */
laser:{n:'לוחם לייזר',ic:'🔆',era:4,unlock:61,hp:140,spd:3.6,rng:28,dmg:22,rate:.5,acc:.9,atk:'laser',air:1,look:{h:'visor',g:'laser'},desc:'קרן לייזר מדויקת, חודרת שריון חלקית.'},
drone:{n:'רחפן תקיפה',ic:'📡',era:4,unlock:62,hp:120,spd:9,rng:16,dmg:10,rate:.25,acc:.8,atk:'laser',air:1,fly:7,model:'drone',desc:'קטן, מהיר ומעופף.'},
plasma:{n:'משגר פלזמה',ic:'🟣',era:4,unlock:63,hp:150,spd:3.2,rng:26,dmg:70,rate:2,acc:.85,atk:'plasma',splash:3,air:1,look:{h:'visor',g:'plasma'},desc:'כדורי פלזמה מתפוצצים.'},
eshield:{n:'מגן אנרגיה',ic:'🔷',era:4,unlock:64,hp:400,spd:3,rng:16,dmg:14,rate:.6,acc:.8,atk:'laser',air:1,shield:.9,look:{h:'visor',g:'laser',sh:'energy'},desc:'שדה כוח עוצר 90% מלפנים.'},
nanomedic:{n:'ננו־חובש',ic:'💠',era:4,unlock:65,hp:160,spd:4,rng:5,heal:30,rate:.7,atk:'heal',look:{h:'visor',g:'pistol',torso:0xe8f6ff,cross:1},desc:'מרפא מהיר מטווח קצר.'},
rail:{n:'צלף רייל',ic:'⚡',era:4,unlock:66,hp:110,spd:3,rng:60,dmg:180,rate:4,acc:.9,atk:'rail',air:1,pierce:4,kite:16,look:{h:'visor',g:'rail'},desc:'קליע אלקטרומגנטי חודר דרך עד 4 אויבים.'},
mech:{n:'רובוט קרב',ic:'🤖',era:4,unlock:68,hp:1800,spd:2.8,rng:30,dmg:26,rate:.25,acc:.7,atk:'laser',air:1,armor:.3,model:'mech',desc:'רובוט הליכה כבד עם שני תותחי לייזר.'},
hover:{n:'טנק ריחוף',ic:'🛰️',era:4,unlock:71,hp:2200,spd:5,rng:38,dmg:150,rate:3,acc:.85,atk:'plasma',splash:4,armor:.2,model:'tank',v:'hover',desc:'מרחף מעל הקרקע ויורה פלזמה.'},
titan:{n:'הטיטאן',ic:'🦾',era:4,boss:5,unlock:76,hp:30000,spd:2,rng:46,dmg:75,rate:.35,acc:.85,atk:'laser',splash:2.5,air:1,armor:.2,model:'mech',scale:3.2,desc:'בוס! רובוט ענק.'},
/* --- commanders: one per era, weak but they coordinate the army --- */
chief:{n:'ראש השבט',ic:'🪶',era:0,unlock:2,hp:140,spd:3,rng:1,dmg:0,rate:1,atk:'command',commander:1,escort:'spear',look:{h:'chief',g:'staff',bare:1,cape:1},desc:'מפקד הצבא: מתאם את הלוחמים. מגיע עם שני שומרי ראש.'},
king:{n:'אביר המלך',ic:'🏇',era:1,unlock:18,hp:300,spd:5,rng:1,dmg:0,rate:1,atk:'command',armor:.8,commander:1,escort:'swordsman',model:'rider',look:{h:'knight',g:'sword',cape:1,horse:0xf2f0ea},desc:'מפקד הצבא: אביר על סוס לבן שהמלך שלח. מגיע עם שני שומרי ראש.'},
wwgeneral:{n:'גנרל',ic:'🎖️',era:2,unlock:33,hp:170,spd:3,rng:1,dmg:0,rate:1,atk:'command',commander:1,escort:'wwsoldier',look:{h:'cap',g:'pistol',flag:1,cape:1},desc:'מפקד הצבא: מתאם את החיילים. מגיע עם שני שומרי ראש.'},
aicmd:{n:'רובוט פיקוד',ic:'🧠',era:4,unlock:63,hp:420,spd:3,rng:1,dmg:0,rate:1,atk:'command',armor:.6,commander:1,escort:'laser',model:'mech',v:'cmd',scale:.6,desc:'מפקד הצבא: מחשב קרב על רגליים. מגיע עם שני שומרי ראש.'},
overlord:{n:'שליט החייזרים',ic:'🛸',era:5,unlock:78,hp:450,spd:3.5,rng:1,dmg:0,rate:1,atk:'command',commander:1,escort:'spacemarine',look:{h:'crown',g:'staff',alien:1,cape:1},desc:'מפקד הצבא: מתאם את הצבא החייזרי. מגיע עם שני שומרי ראש.'},
/* --- added units --- */
hoplite:{n:'הופליט',ic:'🏛️',era:0,unlock:4,hp:150,spd:2.8,rng:2.6,dmg:16,rate:.9,atk:'melee',shield:.45,antiCav:2,look:{h:'roman',g:'spear',sh:'round'},desc:'חנית ומגן עגול. חזק נגד רוכבים.'},
barbarian:{n:'ברברי',ic:'🪓',era:0,unlock:7,hp:140,spd:4,rng:1.8,dmg:26,rate:1,atk:'melee',look:{h:'horned',g:'axe',bare:1},desc:'מכה חזקה בגרזן כבד.'},
gladiator:{n:'גלדיאטור',ic:'🏟️',era:0,unlock:9,hp:200,spd:3.6,rng:1.9,dmg:24,rate:.7,atk:'melee',shield:.3,look:{h:'roman',g:'sword',sh:'round',bare:1},desc:'לוחם זירה מנוסה ומהיר.'},
horsearcher:{n:'קשת רכוב',ic:'🐎',era:0,unlock:10,hp:200,spd:7,rng:20,dmg:11,rate:1.1,acc:.55,atk:'arrow',air:1,kite:10,model:'rider',look:{h:'band',g:'bow'},desc:'יורה חצים מעל סוס ונסוג כשמתקרבים.'},
ballista:{n:'בליסטרה',ic:'🪃',era:0,unlock:13,hp:200,spd:1.3,rng:40,dmg:70,rate:3.5,acc:.75,atk:'arrow',anti:1,air:1,armor:.6,model:'ballista',desc:'חץ ענק. טוב נגד שריון ופילים.'},
viking:{n:'ויקינג',ic:'⛵',era:1,unlock:16,hp:170,spd:3.8,rng:1.9,dmg:26,rate:.85,atk:'melee',shield:.35,look:{h:'horned',g:'axe',sh:'round'},desc:'לוחם צפוני עם גרזן ומגן.'},
pikeman:{n:'פייקמן',ic:'📍',era:1,unlock:19,hp:160,spd:2.8,rng:3.2,dmg:20,rate:.9,atk:'melee',antiCav:2.5,armor:.85,look:{h:'kettle',g:'pike'},desc:'רומח ארוך מאוד שעוצר פרשים.'},
samurai:{n:'סמוראי',ic:'🥋',era:1,unlock:21,hp:240,spd:3.8,rng:2,dmg:38,rate:.75,atk:'melee',armor:.75,look:{h:'kabuto',g:'katana'},desc:'סייף עילית – מכות חזקות ומהירות.'},
ninja:{n:'נינג׳ה',ic:'🥷',era:1,unlock:23,hp:110,spd:7.5,rng:1.8,dmg:40,rate:.6,atk:'melee',assassin:1,look:{h:'ninja',g:'katana',torso:0x1a1a1a},desc:'מהיר מאוד. צד ארטילריה וחובשים מאחור.'},
heavyknight:{n:'אביר רכוב כבד',ic:'♞',era:1,unlock:26,hp:650,spd:6,rng:2.4,dmg:55,rate:1,atk:'melee',charge:1,armor:.45,model:'rider',look:{h:'knight',g:'lance',cape:1},desc:'שריון כבד על סוס. הסתערות הרסנית.'},
bombard:{n:'בומברדה',ic:'⚫',era:1,unlock:29,hp:260,spd:1,rng:48,minRng:8,dmg:85,rate:6,acc:.75,atk:'cannonball',splash:3.2,armor:.55,model:'cannon',v:'bombard',desc:'תותח קדום וכבד.'},
hussar:{n:'הוסר',ic:'🎖️',era:2,unlock:34,hp:320,spd:8,rng:2.2,dmg:34,rate:.8,atk:'melee',charge:1,armor:.8,model:'rider',look:{h:'shako',g:'saber'},desc:'פרש קל ומהיר עם חרב.'},
wwsniper:{n:'צלף מלחמת העולם',ic:'🔎',era:2,unlock:37,hp:75,spd:2.8,rng:46,dmg:65,rate:2.8,acc:.85,atk:'bullet',air:1,kite:14,look:{h:'brodie',g:'sniper'},desc:'צלף עם כוונת טלסקופית.'},
flak:{n:'תותח נ״מ',ic:'✴️',era:2,unlock:39,hp:300,spd:1.5,rng:42,dmg:28,rate:.35,acc:.6,atk:'bullet',air:1,antiAir:3,armor:.6,model:'cannon',v:'flak',desc:'נגד מטוסים: נזק פי 3 ליחידות מעופפות.'},
bazooka:{n:'בזוקה',ic:'🎆',era:2,unlock:40,hp:105,spd:2.8,rng:24,dmg:60,rate:3.5,atk:'rocket',splash:2.2,air:1,anti:1,look:{h:'brodie',g:'rocket'},desc:'רקטה ראשונה נגד טנקים.'},
armoredcar:{n:'משוריין',ic:'🚓',era:2,unlock:42,hp:600,spd:6.5,rng:24,dmg:9,rate:.15,acc:.55,atk:'bullet',air:1,armor:.35,model:'jeep',v:'armored',desc:'רכב משוריין מהיר עם מקלע.'},
howitzer:{n:'הוביצר',ic:'📯',era:2,unlock:44,hp:380,spd:1,rng:75,minRng:16,dmg:120,rate:6,atk:'mortar',splash:5.5,armor:.5,model:'cannon',v:'howitzer',desc:'ארטילריה כבדה מטווח עצום.'},
heavytank:{n:'טנק כבד',ic:'🦣',era:2,unlock:45,hp:1500,spd:1.8,rng:32,dmg:120,rate:4.5,acc:.8,atk:'shell',splash:3.5,armor:.18,model:'tank',v:'ww',scale:1.25,desc:'טנק ענק ואיטי.'},
stinger:{n:'טיל כתף נ״מ',ic:'🛫',era:3,unlock:53,hp:100,spd:3,rng:34,dmg:80,rate:3.5,atk:'rocket',splash:1.5,air:1,antiAir:3,look:{h:'helmet',g:'rocket'},desc:'מפיל מסוקים: נזק פי 3 ליחידות מעופפות.'},
elite:{n:'לוחם עילית',ic:'💪',era:3,unlock:56,hp:220,spd:4,rng:28,dmg:22,rate:.6,acc:.85,atk:'bullet',air:1,armor:.8,look:{h:'visorM',g:'rifle'},desc:'מאומן ומשוריין קלות.'},
apc:{n:'נגמ״ש',ic:'🚛',era:3,unlock:59,hp:1400,spd:5,rng:24,dmg:10,rate:.12,acc:.5,atk:'bullet',air:1,armor:.25,model:'jeep',v:'apc',desc:'נושא גייסות משוריין.'},
mlrs:{n:'משגר רקטות',ic:'🎑',era:3,unlock:60,hp:500,spd:2.5,rng:70,minRng:15,dmg:50,rate:6,atk:'mortar',volley:6,splash:3.5,armor:.5,model:'jeep',v:'mlrs',desc:'מטח של 6 רקטות בבת אחת.'},
cyborg:{n:'סייבורג',ic:'🦿',era:4,unlock:67,hp:600,spd:5,rng:2,dmg:70,rate:.7,atk:'melee',armor:.55,look:{h:'visor',g:'blade'},desc:'חצי אדם חצי מכונה. להב אנרגיה.'},
jetpack:{n:'לוחם סילון',ic:'🧑‍🚀',era:4,unlock:69,hp:180,spd:6,rng:22,dmg:18,rate:.45,acc:.85,atk:'laser',air:1,fly:5,look:{h:'visor',g:'laser',pk:'jet'},desc:'טס עם תרמיל סילון.'},
ion:{n:'תותח יונים',ic:'🌀',era:4,unlock:72,hp:500,spd:1.5,rng:80,minRng:15,dmg:160,rate:6,atk:'ionball',splash:5,armor:.4,model:'cannon',v:'ion',desc:'ארטילריה אנרגטית מטווח עצום.'},
general:{n:'גנרל עתידי',ic:'🌟',era:4,unlock:74,hp:400,spd:3.5,rng:26,dmg:25,rate:.6,acc:.85,atk:'laser',air:1,aura:18,look:{h:'visor',g:'laser',flag:1},desc:'מחזק את כל החיילים ברדיוס 18 מטר.'},
spacemarine:{n:'חייל חלל',ic:'👨‍🚀',era:5,unlock:76,hp:300,spd:3.8,rng:30,dmg:40,rate:.5,acc:.85,atk:'laser',air:1,armor:.7,look:{h:'space',g:'plasma'},desc:'חליפת חלל משוריינת.'},
alien:{n:'חייזר',ic:'👽',era:5,unlock:77,hp:260,spd:5,rng:18,dmg:30,rate:.4,acc:.8,atk:'laser',air:1,look:{h:'alien',g:'laser',alien:1},desc:'מהיר ויורה קרני אנרגיה.'},
alienhealer:{n:'מרפא חייזרי',ic:'🧬',era:5,unlock:78,hp:240,spd:4.5,rng:6,heal:45,rate:.6,atk:'heal',look:{h:'alien',g:'staff',alien:1},desc:'מרפא מהיר מאוד.'},
ufo:{n:'עב״ם',ic:'🛸',era:5,unlock:80,hp:1500,spd:6,rng:24,dmg:60,rate:.6,acc:.85,atk:'laser',splash:1.5,air:1,fly:12,armor:.4,model:'saucer',desc:'צלחת מעופפת עם קרן מוות.'},
gravtank:{n:'טנק כבידה',ic:'🌌',era:5,unlock:83,hp:4000,spd:4,rng:44,dmg:260,rate:3.5,acc:.85,atk:'plasma',splash:5,armor:.15,model:'tank',v:'hover',scale:1.3,desc:'מרחף על שדה כבידה.'},
starcannon:{n:'תותח כוכבים',ic:'✨',era:5,unlock:86,hp:700,spd:1.2,rng:95,minRng:18,dmg:260,rate:7,atk:'ionball',splash:7,armor:.35,model:'cannon',v:'star',desc:'הטווח הארוך ביותר במשחק.'},
walker:{n:'מהלך חייזרי',ic:'🕷️',era:5,unlock:88,hp:5000,spd:3,rng:36,dmg:60,rate:.3,acc:.8,atk:'laser',splash:1.5,air:1,armor:.25,model:'mech',v:'alien',scale:1.5,desc:'רובוט חייזרי ענק.'},
trex:{n:'טי־רקס',ic:'🦖',era:0,boss:7,mini:1,unlock:9,hp:3000,spd:4.5,rng:3.6,dmg:120,rate:1.2,atk:'stomp',splash:2.6,armor:.6,model:'dino',desc:'מיני־בוס! דינוזאור ענק שנושך ורומס.'},
dragon:{n:'דרקון',ic:'🐉',era:1,boss:8,mini:1,unlock:24,hp:6000,spd:6,rng:26,dmg:80,rate:1.6,acc:.8,atk:'fireball',splash:3.5,air:1,fly:14,circle:1,armor:.5,model:'dragon',desc:'מיני־בוס! טס במעגלים ויורק כדורי אש שמציתים.'},
armoredtrain:{n:'רכבת משוריינת',ic:'🚂',era:2,boss:9,mini:1,unlock:39,hp:12000,spd:2.2,rng:40,dmg:90,rate:1.2,acc:.8,atk:'shell',splash:3.5,armor:.15,model:'train',desc:'מיני־בוס! מבצר על גלגלים עם שלושה תותחים.'},
bomber:{n:'מפציץ אסטרטגי',ic:'✈️',era:3,boss:10,mini:1,unlock:54,hp:9000,spd:9,rng:10,dmg:110,rate:.5,atk:'bomb',splash:6,fly:26,circle:1,armor:.4,model:'plane',desc:'מיני־בוס! מטוס ענק שמטיל שטיח פצצות.'},
spiderbot:{n:'עכביש מכני',ic:'🕸️',era:4,boss:11,mini:1,unlock:69,hp:20000,spd:3.5,rng:38,dmg:55,rate:.25,acc:.8,atk:'laser',splash:2,air:1,armor:.2,model:'spider',scale:2,desc:'מיני־בוס! רובוט עם שש רגליים ולייזר.'},
alienqueen:{n:'מלכת החייזרים',ic:'👾',era:5,boss:12,mini:1,unlock:84,hp:40000,spd:2.5,rng:5,dmg:200,rate:1.2,atk:'stomp',splash:5,armor:.3,model:'queen',spawn:'alien',desc:'מיני־בוס! מזמנת חייזרים לעזרה כל כמה שניות.'},
mothership:{n:'ספינת האם',ic:'🌑',era:5,boss:6,unlock:91,hp:60000,spd:1.5,rng:50,dmg:120,rate:.4,acc:.85,atk:'laser',splash:3.5,air:1,fly:22,armor:.2,model:'saucer',scale:4,desc:'הבוס האחרון! צלחת ענקית שמכסה את השמיים.'}
};


const LIGHT={bullet:1,arrow:1,stone:1,melee:1,flame:1,fire:1};
const HEAVY={rocket:1,shell:1,rail:1,plasma:1,boulder:1,ionball:1,fireball:1};
function powerOf(d){
  const armorF=d.armor?1+(1-d.armor)*1.2:1;
  const ehp=d.hp*armorF*(d.shield?1+d.shield*.6:1);
  let dps;
  if(d.atk==='command') dps=4;
  else if(d.atk==='heal') dps=d.heal/d.rate*1.6;
  else dps=d.dmg/d.rate*(d.acc||.85)*(d.splash?1+d.splash*.35:1)*(d.pierce?1.6:1)*(d.volley||1)*(d.charge?1.3:1)*(d.antiCav?1.1:1);
  const rngF=.7+Math.min(d.rng,70)/30;
  const spdF=.85+d.spd/25;
  return Math.sqrt(ehp*dps*rngF)*spdF*(d.air?1.1:1)*(d.fly?1.25:1)*(d.aura?1.3:1)*(d.antiAir?1.15:1)*(d.assassin?1.1:1);
}
function finalizeDef(id,d){
  d.id=id; const mm=MODEL_META[d.model||'inf']; const sc=d.scale||1;
  d.hy=d.hy!=null?d.hy:mm.hy*sc; d.barH=mm.bar*sc; d.rad=d.rad||mm.rad*sc; d.mass=d.mass||mm.mass*sc*sc;
  d.die=d.fly&&!d.model?'crash':mm.die; d.organic=!d.model||d.model==='rider'||d.model==='elephant'||!!mm.organic; d.bloodC=d.look&&d.look.alien||d.model==='queen'?0x3c8a20:0x7a0a0a; d.mounted=!!mm.mounted; d.air=!!d.air;
  d.power=powerOf(d); d.cost=Math.max(10,Math.round(d.power*1.2/5)*5);
  d.role=d.atk==='heal'?'support':d.fly?'air':(d.atk==='melee'||d.atk==='stomp'||(d.shield||0)>=.4)?'front':(d.minRng||(d.rng>=40&&!HEAVY[d.atk]&&d.atk!=='bullet'))?'arty':(d.model&&d.model!=='rider')?'armor':'ranged';
  if(d.atk==='cannonball'||d.atk==='boulder'||d.atk==='mortar'||d.atk==='ionball') d.role='arty';
  return d;
}
for(const k in DEFS) finalizeDef(k,DEFS[k]);
// a commander's price includes his two bodyguards
for(const k in DEFS){ const d=DEFS[k]; if(d.commander&&d.escort){ d.cost+=2*DEFS[d.escort].cost; d.role='support'; } }

/* ================= MAPS ================= */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const THEMES=[
 {id:'field',n:'שדות',ic:'🌾',ground:['#6f7f45','rgba(90,105,55,.35)','rgba(135,128,82,.3)','rgba(70,82,40,.35)'],outer:0x5d6b3b,mount:0x7c8f86,
  names:['עמק הירוק','גבעות הזהב','שדה החיטה','מישור הרוח','כר הדשא','נחל השקט','גבעת התצפית','שדות האופק','עמק הפרחים','מישור הסערה']},
 {id:'city',n:'עיר',ic:'🏙️',ground:['#6b6b66','rgba(80,80,78,.4)','rgba(120,118,110,.3)','rgba(60,60,58,.4)'],outer:0x55554f,mount:0x7d8590,roads:1,
  names:['מרכז העיר','רובע הנמל','השוק הישן','שכונת המגדלים','כיכר העירייה','אזור התעשייה','הרחוב הראשי','פרבר המזרח','תחנת הרכבת','עיר הבירה']},
 {id:'forest',n:'יער',ic:'🌲',ground:['#4f6b35','rgba(60,85,40,.4)','rgba(95,85,50,.3)','rgba(40,60,30,.4)'],outer:0x3f5a2c,mount:0x5f7a66,
  names:['יער האורנים','היער האפל','יער הקסם','סבך הצללים','יער האלונים','קרחת היער','יער הערפל','היער העתיק','שביל הציידים','לב היער']},
 {id:'desert',n:'מדבר',ic:'🏜️',ground:['#d2b47c','rgba(200,165,110,.4)','rgba(230,205,150,.35)','rgba(180,140,90,.35)'],outer:0xc8a870,mount:0xc79b6b,
  names:['חולות הזהב','נווה המדבר','ערוץ השרב','דיונות הרוח','מכתש האבן','מדבר המלח','עמק הקקטוסים','נווה התמרים','רמת השמש','חוף המדבר']},
 {id:'snow',n:'שלג',ic:'❄️',ground:['#e6ebf0','rgba(200,212,225,.45)','rgba(255,255,255,.5)','rgba(180,195,210,.4)'],outer:0xdfe6ec,mount:0xc6d2de,
  names:['פסגת הקרח','עמק השלג','היער הלבן','מעבר ההרים','האגם הקפוא','טונדרה','מורד הסקי','מבצר הקרח','שדה הכפור','הצפון הרחוק']},
 {id:'village',n:'כפר',ic:'🏡',ground:['#7c8a4c','rgba(140,115,75,.35)','rgba(100,120,60,.35)','rgba(160,140,90,.3)'],outer:0x66733f,mount:0x7c8f86,
  names:['כפר הדייגים','כפר הגבעה','חוות התבואה','כפר הטחנה','כפר העמק','משק הענבים','כפר הנחל','כיכר הכפר','החווה הישנה','כפר הגבול']},
 {id:'ruins',n:'חורבות',ic:'🏛️',ground:['#8a8065','rgba(120,110,85,.4)','rgba(160,150,120,.35)','rgba(100,92,70,.4)'],outer:0x7a7158,mount:0x9a8f7a,
  names:['העיר האבודה','המקדש העתיק','חורבות הטירה','עמודי האבן','המבצר הנטוש','זירת הקרב הישנה','חומות נפולות','הארמון השקוע','חורבות העמק','שער האבן']},
 {id:'lakes',n:'אגמים ונהרות',ic:'🏞️',ground:['#5f8048','rgba(70,100,55,.4)','rgba(120,130,80,.3)','rgba(50,80,45,.4)'],outer:0x4f6b3a,mount:0x6f8a86,
  names:['ארץ האגמים','ביצת הקנים','האי שבמרכז','שפך הנהר','האגם הכחול','מעבר הגשרים','דלתת הנהר','ביצות הערפל','אגם הברבורים','שני האגמים']},
 {id:'base',n:'בסיס צבאי',ic:'🪖',ground:['#7b7458','rgba(110,100,75,.4)','rgba(140,130,100,.3)','rgba(90,85,65,.4)'],outer:0x6b654b,mount:0x8a8a7a,
  names:['בסיס קדמי','מחנה האימונים','עמדת הגבול','שדה התעופה','מחסן התחמושת','קו הביצורים','בסיס ההר','מוצב המדבר','נמל צבאי','המפקדה העליונה']},
 {id:'future',n:'עיר העתיד',ic:'🌆',ground:['#1b2230','rgba(40,50,70,.5)','rgba(25,35,55,.5)','rgba(60,70,90,.35)'],outer:0x141a24,mount:0x2c3548,neon:1,
  names:['ניאו־סיטי','מגדלי הקריסטל','תחנת החלל','הכוכב האדום','מושבת מאדים','עיר הנאון','מעבדת הסייבר','כור ההיתוך','רשת הלייזר','עיר 3000']},
 {id:'mars',n:'מאדים',ic:'🪐',ground:['#a24f2c','rgba(140,60,35,.45)','rgba(190,100,60,.35)','rgba(110,45,25,.45)'],outer:0x8a3f22,mount:0x9a5236,mars:1,
  names:['עמק המאדים','מכתש הברזל','מושבה אלפא','שדה הקריסטלים','סערת אבק','הבסיס האדום','הר אולימפוס','עמק מרינר','קוטב הקרח','שער הכוכבים']}
];
const MAPS=[];
THEMES.forEach((t,ti)=>t.names.forEach((nm,v)=>MAPS.push({id:MAPS.length,theme:t,ti,v,name:nm,seed:1000+(ti*10+v)*7919})));
const MAP_SIZES={normal:80,large:120,huge:160,giant:200,colossal:300,titanic:400};

/* map generators: add(type,x,z,rq,w,d). K = map half-size / 80 (1 = normal) */
function genMap(map,add,K){
  K=K||1;
  const r=mulberry32(map.seed), R=(a,b)=>a+r()*(b-a), RI=(a,b)=>Math.floor(R(a,b+1)), v=map.v, k=.7+v*.06, A=Math.min(K*K,7);
  const N=n=>Math.round(n*A);
  const E=80*K-3;  // usable half-size
  const mid=(n,type,xr,zr,rot)=>{for(let i=0;i<N(n);i++) add(type,R(-xr*K,xr*K),R(-zr*K,zr*K),rot===undefined?(r()<.5?1:0):rot);};
  const any=(n,type,rot)=>{for(let i=0;i<N(n);i++) add(type,R(-E,E),R(-E,E),rot||0);};
  const grid=(fn,occ)=>{const G=Math.min(6,Math.round(2*K)); for(let gx=-G;gx<=G;gx++) for(let gz=-G;gz<=G;gz++){ if(r()>occ) continue; fn(gx*15+R(-1.5,1.5),gz*19+R(-2,2)); }};
  switch(map.theme.id){
    case 'field':
      mid(RI(8,16),'rock',36,72,0);
      for(let i=0;i<N(RI(15,28));i++) add(r()<.5?'tree':'pine',R(-E,E),(r()<.5?-1:1)*R(50*K,E),0);
      mid(RI(5,10)*k,'sandbag',28,46); mid(RI(2,6),'wall',25,46); mid(RI(4,8),'fence',32,60);
      mid(RI(3,7),'crate',30,46,0); mid(RI(4,8),'barrel',30,46,0); mid(RI(1,3),'silo',30,46,0); mid(RI(1,3),'hut',30,46,0);
      if(v%3===0) mid(1,'house',15,30,0);
      break;
    case 'city':
      grid((x,z)=>{const q=r(); add(q<.35?'building':q<.55?'skyscraper':q<.75?'house':q<.88?'factory':'hangar',x,z,0);},.55+v*.035);
      mid(RI(8,14),'wall',40,48); mid(RI(8,14),'crate',42,48,0); mid(RI(8,14),'barrel',42,48,0); mid(RI(5,9),'sandbag',42,48);
      break;
    case 'forest':
      for(let i=0;i<N(RI(90,150)*k);i++) add(r()<.55?'pine':'tree',R(-E,E),R(-E,E),0);
      mid(RI(10,20),'rock',70,72,0); mid(RI(3,6),'barrel',30,40,0); mid(RI(2,5),'hut',40,48,0); mid(RI(1,3),'tent',40,48,0);
      if(v%2) mid(RI(4,8),'fence',30,40);
      break;
    case 'desert':
      mid(RI(15,25),'rock',72,74,0); mid(RI(15,30),'cactus',72,74,0);
      for(let q=0;q<Math.max(1,Math.round(K));q++){const ox=R(-20*K,20*K),oz=R(-30*K,30*K); add('water',ox,oz,0,R(8,14),R(8,14)); for(let i=0;i<RI(6,12);i++) add('palm',ox+R(-12,12),oz+R(-12,12),0);}
      if(v%2===0) mid(1,'pyramid',25,40,0); mid(RI(1,3),'temple',30,44,0); mid(RI(2,5),'tent',40,48,0);
      mid(RI(3,8),'ruinwall',35,48); mid(RI(3,6),'barrel',35,48,0); mid(RI(2,5),'crate',35,48,0);
      break;
    case 'snow':
      for(let i=0;i<N(RI(40,80)*k);i++) add('snowpine',R(-E,E),R(-E,E),0);
      mid(RI(12,20),'rock',70,72,0); mid(RI(1,4),'bunker',30,40,0); mid(RI(3,6),'sandbag',30,45); mid(RI(2,5),'igloo',40,48,0); mid(RI(0,2),'castletower',30,40,0);
      if(v%2===0) add('water',R(-15*K,15*K),R(-30*K,30*K),0,R(10,20),R(8,16));
      break;
    case 'village':
      for(let i=0;i<N(RI(8,14));i++) add(r()<.7?'house':'hut',R(-38*K,38*K),R(-46*K,46*K),r()<.5?1:0);
      mid(RI(10,18),'fence',40,48); for(let i=0;i<N(RI(12,22));i++) add('tree',R(-E,E),R(-E,E),0);
      mid(RI(5,10),'crate',38,46,0); mid(RI(3,6),'barrel',38,46,0); mid(RI(2,5),'wall',38,46); mid(RI(1,3),'silo',38,46,0);
      break;
    case 'ruins':
      mid(RI(14,24),'ruinwall',42,48);
      for(let q=0;q<Math.max(1,Math.round(K));q++){const cx=R(-15*K,15*K),cz=R(-20*K,20*K); for(let i=0;i<6;i++){add('pillar',cx-8,cz-15+i*6,0); add('pillar',cx+8,cz-15+i*6,0);}}
      mid(RI(8,14),'pillar',40,48,0); mid(RI(8,14),'rock',60,72,0); mid(RI(1,3),'temple',35,44,0); mid(RI(1,3),'castletower',38,46,0);
      for(let i=0;i<N(RI(6,14));i++) add('tree',R(-E,E),R(-E,E),0);
      break;
    case 'lakes': {
      const L=80*K, gaps=[]; const ng=2+(v%2)+Math.round(K-1);
      for(let i=0;i<ng;i++) gaps.push(-L+ (i+.5)*(2*L/ng)+R(-8,8));
      let z=-L; const rw=R(6,10), rx=R(-6,6);
      for(const g of gaps){ const z2=g-4; if(z2>z) add('water',rx,(z+z2)/2,0,rw,z2-z); add('bridge',rx,g,0,rw+3,8); z=g+4; }
      add('water',rx,(z+L)/2,0,rw,L-z);
      for(let i=0;i<N(RI(2,4));i++) add('water',(r()<.5?-1:1)*R(18*K,38*K),R(-55*K,55*K),0,R(8,16),R(8,16));
      for(let i=0;i<N(RI(15,30));i++) add('tree',R(-E,E),R(-E,E),0);
      mid(RI(5,10),'rock',45,60,0); mid(RI(3,6),'sandbag',40,50); mid(RI(1,3),'hut',40,50,0);
      break;}
    case 'base':
      mid(RI(4,8),'bunker',38,46,0); mid(RI(14,24),'sandbag',42,48); mid(RI(4,8),'wall',40,48);
      mid(RI(8,14),'crate',42,48,0); mid(RI(8,14),'barrel',42,48,0); mid(RI(2,4),'tent',40,48,0); mid(RI(1,2),'hangar',30,40,0); mid(RI(1,2),'dome',30,40,0); mid(RI(1,2),'silo',35,44,0);
      if(v%2) mid(1,'building',10,20,0);
      break;
    case 'future':
      grid((x,z)=>{const q=r(); add(q<.4?'tower':q<.65?'skyscraper':q<.85?'dome':'building',x,z,0);},.5+v*.03);
      mid(RI(6,12),'wall',42,48); mid(RI(6,10),'crate',42,48,0); mid(RI(6,12),'barrel',42,48,0);
      break;
    case 'mars':
      mid(RI(18,30),'rock',72,74,0); mid(RI(8,16),'crystal',60,70,0); mid(RI(2,5),'dome',40,48,0); mid(RI(1,3),'tower',35,44,0); mid(RI(3,6),'crate',40,48,0); mid(RI(3,6),'barrel',40,48,0);
      if(v%3===0) add('water',R(-20*K,20*K),R(-30*K,30*K),0,R(8,14),R(8,14));
      break;
  }
}

/* ================= CAMPAIGN ================= */
const LEVELS=90;
const ERA_THEMES=[['field','forest','desert','lakes','ruins'],['village','forest','snow','ruins','lakes'],['field','village','base','snow','city'],['city','base','desert','snow','forest'],['future','future','base','city','future'],['mars','mars','future','mars','snow']];
function levelInfo(L){
  const era=Math.min(5,Math.floor((L-1)/15)), boss=L%15===0?L/15:0;
  const th=ERA_THEMES[era][(L*3)%5], ti=THEMES.findIndex(t=>t.id===th);
  const mapId=ti*10+((L*7)%10);
  const enemyBudget=Math.round(250*Math.pow(1.06,Math.min(L,80)-1)*(L>80?1+(L-80)*.04:1)*(L<=5?.8:1)/10)*10;
  const diff=boss?'insane':L<8?'easy':L<30?'normal':'hard';
  const tod=L%5===0?22:L%3===0?18.2:L%4===0?7:12.5;
  const half=L<=30?80:L<=60?95:110;
  return {L,era,boss,mini:MINI_BOSS[L]||null,mapId,enemyBudget,diff:MINI_BOSS[L]?'hard':diff,tod,half};
}
const BOSS_IDS=['elephant','siege','supertank','gunship','titan','mothership'];

/* ================= CIVILIANS & ANIMALS ================= */
const CRIT={
  civ:{n:'אזרח',ic:'🧍',hp:60,spd:1.2,run:4.2,rad:.4,hy:1.2},
  cow:{n:'פרה',ic:'🐄',hp:150,spd:.8,run:3.5,rad:1,hy:1},
  sheep:{n:'כבשה',ic:'🐑',hp:60,spd:.8,run:3.8,rad:.6,hy:.6},
  deer:{n:'צבי',ic:'🦌',hp:70,spd:1.2,run:7,rad:.6,hy:1},
  camel:{n:'גמל',ic:'🐪',hp:180,spd:.9,run:4,rad:1,hy:1.6},
  dog:{n:'כלב',ic:'🐕',hp:40,spd:1.5,run:6,rad:.45,hy:.5},
  chicken:{n:'תרנגולת',ic:'🐔',hp:15,spd:.7,run:4,rad:.3,hy:.3}
};
const THEME_LIFE={field:['cow','cow','sheep','chicken','civ'],city:['civ','civ','civ','dog'],forest:['deer','deer'],desert:['camel','civ'],snow:['deer','dog'],village:['cow','sheep','chicken','civ','civ','dog'],ruins:['civ','deer'],lakes:['deer','sheep','civ'],base:['dog','civ'],future:['civ','civ'],mars:[]};
