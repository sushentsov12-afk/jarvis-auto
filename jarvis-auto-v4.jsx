import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

/* ── DESIGN TOKENS ───────────────────────────────────────────────── */
const C = {
  bg:"#060c18",bg2:"#08101f",card:"#0b1628",card2:"#0d1a30",
  border:"rgba(255,255,255,0.07)",border2:"rgba(255,255,255,0.13)",
  o:"#FF6B00",oG:"rgba(255,107,0,0.1)",oD:"rgba(255,107,0,0.06)",
  t:"#dde3f0",t2:"#5a7090",t3:"#2e4060",
  g:"#22c55e",gG:"rgba(34,197,94,0.1)",
  y:"#f59e0b",yG:"rgba(245,158,11,0.1)",
  r:"#ef4444",rG:"rgba(239,68,68,0.1)",
  b:"#3b82f6",bG:"rgba(59,130,246,0.1)",
  p:"#8b5cf6",
};
const M="'IBM Plex Mono',monospace", S="'IBM Plex Sans',sans-serif";

/* ── OBD-II OFFLINE DATABASE (40 codes) ─────────────────────────── */
const OBD_DB = {
  P0100:{title:"Расходомер воздуха",system:"Топливная система",danger:"средний",can_drive:true,desc:"Датчик массового расхода воздуха неисправен. Двигатель получает неправильное соотношение топлива и воздуха.",price_min:1500,price_max:8000,price_comment:"Чистка датчика или замена MAF-сенсора",actions:["Почистите датчик специальным спреем MAF Cleaner","Проверьте воздушный фильтр — если засорён, замените","Если не помогло — диагностика и замена датчика"]},
  P0101:{title:"Расходомер воздуха MAF",system:"Топливная система",danger:"средний",can_drive:true,desc:"Сигнал датчика MAF вне допустимого диапазона. Чаще всего причина — грязный датчик или подсос воздуха.",price_min:1000,price_max:6000,price_comment:"Чистка или замена датчика MAF",actions:["Проверьте воздушный фильтр и патрубок на трещины","Почистите датчик MAF спреем","Проверьте все воздушные патрубки на подсосы"]},
  P0171:{title:"Смесь бедная (банк 1)",system:"Топливная система",danger:"средний",can_drive:true,desc:"Топливно-воздушная смесь слишком бедная. Причины: подсос воздуха, слабый насос, забитые форсунки.",price_min:2000,price_max:15000,price_comment:"Диагностика и устранение причины бедной смеси",actions:["Проверьте патрубки на подсосы воздуха (шипение)","Замените топливный фильтр, проверьте давление насоса","Промойте форсунки ультразвуком"]},
  P0172:{title:"Смесь богатая (банк 1)",system:"Топливная система",danger:"средний",can_drive:true,desc:"Топливно-воздушная смесь слишком богатая. Возможный перелив топлива, неисправный датчик кислорода или форсунки.",price_min:2000,price_max:12000,price_comment:"Проверка форсунок и датчиков",actions:["Замените свечи зажигания — могут быть залиты","Диагностика лямбда-зонда","Проверьте форсунки на пропускную способность"]},
  P0174:{title:"Смесь бедная (банк 2)",system:"Топливная система",danger:"средний",can_drive:true,desc:"Аналогично P0171, но для второго ряда цилиндров (V-образные двигатели).",price_min:2000,price_max:15000,price_comment:"Диагностика системы питания банка 2",actions:["Проверьте патрубки банка 2 на подсосы","Диагностика датчика MAP/MAF","Проверьте давление топлива"]},
  P0200:{title:"Цепь управления форсунками",system:"Топливная система",danger:"высокий",can_drive:false,desc:"Неисправность электрической цепи форсунок. Двигатель может работать с перебоями или не завестись.",price_min:3000,price_max:20000,price_comment:"Проверка форсунок и ЭБУ",actions:["Немедленно обратитесь в автосервис","Проверьте предохранители форсунок","Диагностика ЭБУ и жгута проводов"]},
  P0300:{title:"Пропуск воспламенения (общий)",system:"Двигатель",danger:"высокий",can_drive:false,desc:"Случайные пропуски зажигания в нескольких цилиндрах. Это опасно для катализатора и двигателя.",price_min:3000,price_max:25000,price_comment:"Диагностика системы зажигания и форсунок",actions:["Немедленно снизьте нагрузку на двигатель","Замените свечи зажигания и высоковольтные провода","Проверьте форсунки и компрессию в цилиндрах"]},
  P0301:{title:"Пропуск воспламенения №1",system:"Двигатель",danger:"высокий",can_drive:false,desc:"Пропуск зажигания в 1-м цилиндре. Двигатель вибрирует, возможен вред катализатору при длительной езде.",price_min:2000,price_max:20000,price_comment:"Замена свечи, катушки или форсунки цилиндра №1",actions:["Замените свечу зажигания цилиндра №1","Проверьте катушку зажигания (поменяйте местами)","Проверьте форсунку и компрессию цилиндра №1"]},
  P0302:{title:"Пропуск воспламенения №2",system:"Двигатель",danger:"высокий",can_drive:false,desc:"Пропуск зажигания во 2-м цилиндре.",price_min:2000,price_max:20000,price_comment:"Свеча/катушка/форсунка цилиндра №2",actions:["Замените свечу цилиндра №2","Переставьте катушки для диагностики","Проверьте компрессию и форсунку"]},
  P0303:{title:"Пропуск воспламенения №3",system:"Двигатель",danger:"высокий",can_drive:false,desc:"Пропуск зажигания в 3-м цилиндре.",price_min:2000,price_max:20000,price_comment:"Диагностика цилиндра №3",actions:["Замените свечу цилиндра №3","Проверьте катушку","Проверьте компрессию"]},
  P0304:{title:"Пропуск воспламенения №4",system:"Двигатель",danger:"высокий",can_drive:false,desc:"Пропуск зажигания в 4-м цилиндре.",price_min:2000,price_max:20000,price_comment:"Диагностика цилиндра №4",actions:["Замените свечу цилиндра №4","Проверьте катушку зажигания","Диагностика форсунки и компрессии"]},
  P0325:{title:"Датчик детонации",system:"Двигатель",danger:"средний",can_drive:true,desc:"Неисправность датчика детонации. ЭБУ не может оптимально управлять углом опережения зажигания.",price_min:2000,price_max:8000,price_comment:"Замена датчика детонации",actions:["Диагностика датчика детонации","Проверьте качество используемого топлива","Замена датчика (обычно несложная операция)"]},
  P0340:{title:"Датчик положения распредвала",system:"Двигатель",danger:"высокий",can_drive:false,desc:"Нет сигнала от датчика распредвала. Двигатель может не заводиться или глохнуть на ходу.",price_min:2000,price_max:10000,price_comment:"Замена датчика CMP",actions:["Немедленно заглушите двигатель при симптомах","Проверьте проводку датчика распредвала","Замените датчик положения распредвала"]},
  P0420:{title:"КПД катализатора (банк 1)",system:"Выхлопная система",danger:"низкий",can_drive:true,desc:"Эффективность каталитического нейтрализатора ниже нормы. Можно ездить, но экология и расход топлива ухудшаются.",price_min:5000,price_max:60000,price_comment:"Диагностика, возможна замена катализатора",actions:["Проверьте датчики кислорода (лямбда-зонды)","Используйте присадку для раскоксовки катализатора","При подтверждении — замена или удаление катализатора с перепрошивкой"]},
  P0430:{title:"КПД катализатора (банк 2)",system:"Выхлопная система",danger:"низкий",can_drive:true,desc:"Снижение эффективности катализатора банка 2 (V-образный двигатель).",price_min:5000,price_max:60000,price_comment:"Диагностика катализатора банка 2",actions:["Проверьте лямбда-зонды банка 2","Попробуйте присадку для катализатора","При необходимости — замена нейтрализатора"]},
  P0440:{title:"Утечка паров топлива (EVAP)",system:"Топливная система",danger:"низкий",can_drive:true,desc:"Система улавливания паров топлива не держит давление. Обычно причина — неплотная крышка бензобака.",price_min:500,price_max:8000,price_comment:"Проверка крышки бака и системы EVAP",actions:["Проверьте крышку бензобака — плотно закрутите","Проверьте шланги системы EVAP на трещины","Диагностика клапана продувки угольного фильтра"]},
  P0442:{title:"Малая утечка EVAP",system:"Топливная система",danger:"низкий",can_drive:true,desc:"Небольшая утечка в системе улавливания паров. Часто — неплотная крышка или треснувший шланг.",price_min:300,price_max:5000,price_comment:"Замена крышки бака или уплотнителей",actions:["Замените крышку бензобака (часто решает проблему)","Проверьте шланги системы вентиляции бака","Дымовая диагностика системы EVAP"]},
  P0455:{title:"Крупная утечка EVAP",system:"Топливная система",danger:"низкий",can_drive:true,desc:"Значительная утечка в системе паров топлива. Запах бензина возможен в салоне.",price_min:1000,price_max:8000,price_comment:"Поиск и устранение крупной утечки",actions:["Проверьте крышку бака и наливную горловину","Дымовая диагностика всей системы EVAP","Замените неисправные элементы системы"]},
  P0500:{title:"Датчик скорости автомобиля",system:"Трансмиссия",danger:"средний",can_drive:true,desc:"Нет сигнала от датчика скорости. Спидометр может не работать, АКПП переключается некорректно.",price_min:1000,price_max:6000,price_comment:"Замена датчика VSS",actions:["Проверьте проводку датчика скорости","Очистите или замените датчик ABS (если совмещён)","Замените датчик скорости автомобиля"]},
  P0505:{title:"Система холостого хода",system:"Двигатель",danger:"средний",can_drive:true,desc:"Неисправность регулятора холостого хода. Двигатель плавает или глохнет на холостых.",price_min:1500,price_max:8000,price_comment:"Чистка или замена РХХ/дроссельной заслонки",actions:["Почистите дроссельную заслонку","Почистите или замените регулятор холостого хода","Проверьте вакуумные шланги на подсосы"]},
  P0601:{title:"Ошибка памяти ЭБУ",system:"Электроника",danger:"высокий",can_drive:false,desc:"Внутренняя ошибка блока управления двигателем. Требует диагностики и возможно замены ЭБУ.",price_min:10000,price_max:80000,price_comment:"Диагностика и прошивка/замена ЭБУ",actions:["Обратитесь только к специалисту по ЭБУ","Попробуйте сбросить ошибку и обновить прошивку","Рассмотрите восстановление или б/у блок управления"]},
  P0700:{title:"Неисправность АКПП",system:"Трансмиссия",danger:"высокий",can_dive:false,desc:"Блок управления АКПП зафиксировал неисправность и сообщил об этом ЭБУ двигателя.",price_min:5000,price_max:80000,price_comment:"Диагностика АКПП, возможен ремонт или замена",actions:["Проверьте уровень и состояние масла АКПП","Обратитесь в специализированный сервис по АКПП","Не перегружайте трансмиссию до диагностики"]},
  P0715:{title:"Датчик скорости турбины АКПП",system:"Трансмиссия",danger:"средний",can_drive:true,desc:"Неисправность датчика входного вала АКПП. Переключения могут быть рывками или запоздалыми.",price_min:3000,price_max:15000,price_comment:"Замена датчика скорости турбины",actions:["Проверьте уровень масла АКПП","Замените фильтр и масло АКПП","Замените датчик скорости входного вала"]},
  P0720:{title:"Датчик выходного вала АКПП",system:"Трансмиссия",danger:"средний",can_drive:true,desc:"Нет сигнала от датчика выходного вала АКПП. Спидометр может не работать.",price_min:2000,price_max:10000,price_comment:"Замена датчика выходного вала",actions:["Проверьте проводку датчика","Замените датчик скорости выходного вала","Проверьте состояние масла АКПП"]},
  P0730:{title:"Передаточное число АКПП",system:"Трансмиссия",danger:"высокий",can_drive:false,desc:"Некорректное передаточное число. Серьёзная проблема с механической частью или гидроблоком АКПП.",price_min:15000,price_max:100000,price_comment:"Ремонт или замена АКПП",actions:["Немедленно обратитесь в сервис по АКПП","Проверьте уровень и состояние масла","Не продолжайте движение с рывками"]},
  P0740:{title:"Блокировка гидротрансформатора",system:"Трансмиссия",danger:"средний",can_drive:true,desc:"Муфта блокировки гидротрансформатора не работает корректно. Повышенный расход топлива.",price_min:5000,price_max:40000,price_comfort:"Диагностика гидротрансформатора",actions:["Замените масло АКПП с фильтром","Диагностика соленоидов гидроблока","Проверка гидротрансформатора"]},
  P0750:{title:"Соленоид 1 АКПП",system:"Трансмиссия",danger:"средний",can_drive:true,desc:"Неисправность соленоида переключения АКПП. Возможны жёсткие или пропущенные переключения.",price_min:3000,price_max:25000,price_comment:"Замена соленоида или промывка гидроблока",actions:["Замените масло АКПП с фильтром","Диагностика и замена соленоида","Промывка гидроблока"]},
  P0800:{title:"Управление трансмиссией",system:"Трансмиссия",danger:"средний",can_drive:true,desc:"Неисправность в системе управления трансмиссией.",price_min:2000,price_max:20000,price_comment:"Диагностика блока АКПП",actions:["Диагностика блока управления АКПП","Проверьте соединения и проводку","Обновление прошивки ТСМ"]},
  B1000:{title:"Блок управления кузовом",system:"Электроника",danger:"низкий",can_drive:true,desc:"Неисправность блока BCM (кузовная электроника). Может влиять на свет, сигнализацию, стеклоподъёмники.",price_min:2000,price_max:30000,price_comment:"Диагностика BCM",actions:["Проверьте АКБ и генератор (просадки напряжения вызывают ошибки)","Сбросьте ошибку, проверьте повторно","Диагностика и при необходимости замена BCM"]},
  C0035:{title:"Датчик ABS переднего колеса",system:"Тормоза",danger:"высокий",can_drive:false,desc:"Нет сигнала от датчика скорости переднего колеса. ABS и ESP не работают — тормозной путь увеличивается.",price_min:1500,price_max:8000,price_comment:"Замена датчика ABS",actions:["Ездите крайне осторожно без ABS","Проверьте проводку и разъём датчика","Замените датчик ABS переднего колеса"]},
  C0040:{title:"Датчик ABS задн. колеса",system:"Тормоза",danger:"высокий",can_drive:false,desc:"Нет сигнала от датчика скорости заднего колеса. ABS отключена.",price_min:1500,price_max:7000,price_comment:"Замена датчика ABS заднего колеса",actions:["Избегайте экстренного торможения","Замените датчик ABS заднего колеса","Проверьте зубчатый венец датчика на повреждения"]},
  U0001:{title:"Шина CAN — обрыв",system:"Электроника",danger:"высокий",can_drive:false,desc:"Нет связи по шине CAN между блоками. Возможно одновременно несколько ошибок и отказ электроники.",price_min:5000,price_max:40000,price_comment:"Диагностика шины CAN и проводки",actions:["Обратитесь в автосервис немедленно","Проверьте питание и масса всех блоков","Диагностика шины CAN осциллографом"]},
  U0100:{title:"Нет связи с ЭБУ двигателя",system:"Электроника",danger:"высокий",can_drive:false,desc:"Потеря связи с блоком управления двигателем. Другие блоки не получают данные от ЭБУ.",price_min:5000,price_max:50000,price_comment:"Диагностика ЭБУ и шины CAN",actions:["Проверьте питание и заземление ЭБУ","Проверьте предохранители ЭБУ","Диагностика шины CAN и ЭБУ"]},
};

/* ── DEFAULTS ────────────────────────────────────────────────────── */
const DEF_CAR={make:"Toyota",model:"Camry",year:2019,mileage:52400,color:"Белый перламутр",fuel:"Бензин АИ-95",vin:""};
const DEF_SVC=[
  {id:1,name:"Моторное масло",icon:"🛢",lastKm:45000,lastDate:"2025-02-10",intervalKm:10000,intervalMo:12,status:"ok"},
  {id:2,name:"Воздушный фильтр",icon:"💨",lastKm:38000,lastDate:"2024-10-15",intervalKm:20000,intervalMo:18,status:"ok"},
  {id:3,name:"Тормозная жидкость",icon:"🔴",lastKm:28000,lastDate:"2022-08-01",intervalKm:40000,intervalMo:24,status:"overdue"},
  {id:4,name:"Тормозные колодки",icon:"⬛",lastKm:40000,lastDate:"2024-08-20",intervalKm:40000,intervalMo:36,status:"ok"},
  {id:5,name:"Свечи зажигания",icon:"⚡",lastKm:20000,lastDate:"2022-05-10",intervalKm:30000,intervalMo:36,status:"overdue"},
  {id:6,name:"Антифриз",icon:"🧊",lastKm:30000,lastDate:"2023-03-15",intervalKm:60000,intervalMo:24,status:"warning"},
  {id:7,name:"АКПП масло",icon:"⚙️",lastKm:30000,lastDate:"2023-03-01",intervalKm:60000,intervalMo:48,status:"ok"},
  {id:8,name:"Салонный фильтр",icon:"🌬",lastKm:42000,lastDate:"2024-12-01",intervalKm:15000,intervalMo:12,status:"warning"},
];
const DEF_EXP=[
  {id:1,date:"2025-05-10",cat:"топливо",amount:3200,note:"АЗС Лукойл"},
  {id:2,date:"2025-04-18",cat:"сервис",amount:4500,note:"Замена масла"},
  {id:3,date:"2025-04-03",cat:"топливо",amount:2900,note:"АЗС Shell"},
  {id:4,date:"2025-03-20",cat:"страховка",amount:18000,note:"КАСКО 2025"},
  {id:5,date:"2025-03-12",cat:"топливо",amount:3100,note:"АЗС Газпром"},
  {id:6,date:"2025-02-28",cat:"запчасти",amount:2200,note:"Щётки стеклоочист."},
  {id:7,date:"2025-02-10",cat:"сервис",amount:1200,note:"Диагностика подвески"},
  {id:8,date:"2025-01-22",cat:"топливо",amount:3400,note:"АЗС BP"},
  {id:9,date:"2025-01-08",cat:"штрафы",amount:1500,note:"ГИБДД"},
];
const DEF_FUEL=[
  {id:1,date:"2025-05-10",liters:45,cost:3200,odometer:52400,station:"АЗС Лукойл"},
  {id:2,date:"2025-04-03",liters:42,cost:2900,odometer:51650,station:"АЗС Shell"},
  {id:3,date:"2025-03-12",liters:43,cost:3100,odometer:50900,station:"АЗС Газпром"},
  {id:4,date:"2025-01-22",liters:47,cost:3400,odometer:49800,station:"АЗС BP"},
];
const DEF_DOCS=[
  {id:1,name:"ОСАГО",icon:"📄",expires:"2025-11-15",status:"ok",note:"Ингосстрах"},
  {id:2,name:"КАСКО",icon:"🛡",expires:"2026-01-20",status:"ok",note:"АльфаСтрахование"},
  {id:3,name:"Технический осмотр",icon:"🔍",expires:"2025-08-01",status:"warning",note:"Действителен 2 года"},
  {id:4,name:"Водительское удостоверение",icon:"🪪",expires:"2030-05-14",status:"ok",note:"Категория B"},
];
const CAT_CLR={топливо:C.o,сервис:C.b,страховка:C.p,запчасти:C.y,штрафы:C.r,прочее:C.t2};
const SEASONAL_TIPS = [
  {mo:[12,1,2],icon:"❄️",tip:"Зима: проверьте давление шин раз в неделю — на холоде оно падает на 0,1 атм каждые 10°C."},
  {mo:[3,4,5],icon:"🌸",tip:"Весна: промойте кузов от реагентов до начала коррозии. Проверьте тормоза после зимы."},
  {mo:[6,7,8],icon:"☀️",tip:"Лето: следите за температурой двигателя в пробках. Проверьте уровень антифриза и кондиционер."},
  {mo:[9,10,11],icon:"🍂",tip:"Осень: переобуйтесь при стабильной температуре ниже +7°C. Проверьте АКБ — зима близко."},
];

/* ── HOOKS ───────────────────────────────────────────────────────── */
function usePersist(key,init){
  const [v,setV]=useState(()=>{try{const s=localStorage.getItem("ja4_"+key);return s?JSON.parse(s):init}catch{return init}});
  const set=useCallback(fn=>setV(prev=>{const next=typeof fn==="function"?fn(prev):fn;try{localStorage.setItem("ja4_"+key,JSON.stringify(next))}catch{}return next}),[key]);
  return [v,set];
}
function useToast(){
  const [toasts,setToasts]=useState([]);
  const show=useCallback((msg,type="info")=>{const id=Date.now();setToasts(p=>[...p,{id,msg,type}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3200);},[]);
  return{toasts,show};
}

/* ── AI ──────────────────────────────────────────────────────────── */
const DIAG_SYS=`Ты — Джарвис, ИИ-диагност. Только русский. JSON без markdown:
{"title":"до 6 слов","system":"Двигатель|Трансмиссия|Тормоза|Электроника|Подвеска|Топливная система|Охлаждение|Выхлопная","description":"2-3 предложения без жаргона","danger":"низкий|средний|высокий","danger_reason":"1 предложение","can_drive":true|false,"urgency":"сегодня|3 дня|1 неделя|1 месяц","price_min":число,"price_max":число,"price_comment":"что входит","actions":["шаг1","шаг2","шаг3"],"parts":["деталь1"]}
Если не авто — {"error":"Введите код ошибки OBD-II или симптом вашего автомобиля."}`;
const TIPS_SYS=`Ты — Джарвис, автоэксперт-друг. Русский язык. Дружелюбно, конкретно, без воды. До 4 абзацев.`;
const FIND_SYS=`Создай 4 демо-записи сервисов. JSON:
{"tip":"совет по выбору","results":[{"name":"название","type":"тип","address":"улица","rating":4.7,"reviews":120,"price":"от 500 ₽","phone":"+7 (900) 000-00-00","hours":"9:00–21:00","wait":"~20 мин","tags":["быстро","гарантия"]}]}`;

async function ai(system,msg,max=1000){
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:max,system,messages:[{role:"user",content:msg}]})});
  const d=await r.json();
  return d.content?.find(b=>b.type==="text")?.text||"{}";
}

/* ── UTILS ───────────────────────────────────────────────────────── */
const rub=n=>(n||0).toLocaleString("ru-RU")+" ₽";
const calcHealth=s=>Math.max(0,Math.min(100,100-s.filter(x=>x.status==="overdue").length*18-s.filter(x=>x.status==="warning").length*8));
const sCfg={ok:{color:C.g,bg:C.gG,label:"OK",icon:"✓"},warning:{color:C.y,bg:C.yG,label:"СКОРО",icon:"⚠"},overdue:{color:C.r,bg:C.rG,label:"ПРОСРОЧЕНО",icon:"✗"}};
const dCfg={"низкий":{color:C.g,bg:C.gG,label:"НИЗКИЙ"},"средний":{color:C.y,bg:C.yG,label:"СРЕДНИЙ"},"высокий":{color:C.r,bg:C.rG,label:"ВЫСОКИЙ"}};
const urgClr={"сегодня":C.r,"3 дня":C.r,"1 неделя":C.y,"1 месяц":C.g};
function daysUntil(dateStr){const now=new Date();now.setHours(0,0,0,0);return Math.round((new Date(dateStr)-now)/86400000);}
function docStatus(dateStr){const d=daysUntil(dateStr);return d<0?"overdue":d<30?"warning":"ok";}

/* ── ATOMS ───────────────────────────────────────────────────────── */
function Ring({val,max=100,size=108,sw=9,color,children}){
  const R=(size-sw)/2,C2=2*Math.PI*R,pct=Math.min(val/max,1);
  return <div style={{position:"relative",width:size,height:size}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",display:"block"}}>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw}/>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${pct*C2} ${C2}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)"}}/>
    </svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{children}</div>
  </div>;
}
function Badge({n}){if(!n)return null;return <div style={{position:"absolute",top:-5,right:-5,minWidth:17,height:17,borderRadius:9,background:C.r,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",border:`2px solid ${C.bg}`}}><span style={{fontSize:8,color:"white",fontWeight:700,fontFamily:M}}>{n>9?"9+":n}</span></div>;}
const Pill=({children,color=C.o})=><span style={{fontSize:9,fontWeight:700,letterSpacing:.8,padding:"2px 9px",borderRadius:20,background:color+"20",color,fontFamily:M,whiteSpace:"nowrap"}}>{children}</span>;
const Card=({children,style={},onClick})=><div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",...style,cursor:onClick?"pointer":"default"}}>{children}</div>;
const Lbl=({children,color=C.t2,mb=8,style={}})=><div style={{fontSize:10,color,letterSpacing:2.5,fontFamily:M,marginBottom:mb,...style}}>{children}</div>;
function Input({value,onChange,placeholder,type="text",style={}}){
  const ref=useRef();
  return <input ref={ref} type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{width:"100%",padding:"11px 14px",fontSize:13,fontFamily:M,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:9,color:C.t,outline:"none",boxSizing:"border-box",...style}}
    onFocus={e=>e.target.style.borderColor=C.o} onBlur={e=>e.target.style.borderColor=C.border}/>;
}
function PBtn({children,onClick,disabled,full,color=C.o,style={}}){
  return <button onClick={onClick} disabled={disabled}
    style={{padding:"12px 20px",background:disabled?C.card2:color,color:disabled?C.t3:"white",border:"none",borderRadius:10,fontSize:12,fontFamily:M,fontWeight:700,cursor:disabled?"not-allowed":"pointer",letterSpacing:1,width:full?"100%":undefined,transition:"opacity .15s",opacity:disabled?.5:1,...style}}
    onMouseEnter={e=>!disabled&&(e.currentTarget.style.opacity=".85")}
    onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;
}
function GBtn({children,onClick,full,style={}}){
  return <button onClick={onClick}
    style={{padding:"10px 18px",background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:10,fontSize:11,fontFamily:M,cursor:"pointer",letterSpacing:1,width:full?"100%":undefined,...style}}>{children}</button>;
}
function Spinner(){return <div style={{textAlign:"center",padding:"44px 0"}}><div style={{fontSize:28,color:C.o,display:"inline-block",animation:"spin 1.4s linear infinite"}}>⚙</div><div style={{marginTop:14,fontSize:10,color:C.t2,letterSpacing:3,fontFamily:M}}>ОБРАБОТКА...</div></div>;}
function Toasts({toasts}){const tc={success:C.g,error:C.r,info:C.o};return <div style={{position:"fixed",top:66,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:608,zIndex:999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>{toasts.map(t=><div key={t.id} style={{background:C.card2,border:`1px solid ${tc[t.type]||C.o}50`,borderRadius:10,padding:"10px 16px",fontSize:13,color:C.t,fontFamily:S,display:"flex",gap:10,alignItems:"center",animation:"fadeUp .3s ease",boxShadow:"0 4px 24px rgba(0,0,0,.5)"}}><div style={{width:6,height:6,borderRadius:"50%",background:tc[t.type]||C.o,flexShrink:0}}/>{t.msg}</div>)}</div>;}
function BackHeader({title,onBack}){return <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:4}}><button onClick={onBack} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:20,padding:0,lineHeight:1}}>←</button><div style={{fontSize:16,fontWeight:700,color:C.t,fontFamily:S}}>{title}</div></div>;}
const TT=({data,keys,colors})=><div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",fontSize:11,fontFamily:M,color:C.t}}>{data?.payload?.map((p,i)=><div key={i} style={{color:colors?.[i]||C.o}}>{p.name}: {typeof p.value==="number"&&p.value>999?rub(p.value):p.value}</div>)}</div>;

/* ── ONBOARDING ──────────────────────────────────────────────────── */
function Onboarding({onDone}){
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [car,setCar]=useState(DEF_CAR);
  const valid=[true,name.trim().length>0,car.make.trim()&&car.model.trim()];
  const steps=[
    {icon:"⚙",title:"JARVIS AUTO",sub:"ИИ-платформа для вашего автомобиля",
     content:<div style={{display:"flex",flexDirection:"column",gap:14}}>
       <div style={{fontSize:14,color:C.t2,fontFamily:S,lineHeight:1.7,textAlign:"center"}}>Диагностика, сервисная книжка, учёт расходов, трекер топлива и экстренная помощь — всё в одном месте.</div>
       <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["⚙","ИИ-диагностика","OBD-коды + симптомы"],["📋","Сервисная книжка","Контроль ТО"],["⛽","Трекер топлива","Расход л/100км"],["🆘","Экстренная помощь","ДТП и поломки"]].map(([ic,t,s])=><div key={t} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",textAlign:"center"}}><div style={{fontSize:20,marginBottom:5}}>{ic}</div><div style={{fontSize:10,color:C.t,fontFamily:M,marginBottom:2}}>{t}</div><div style={{fontSize:10,color:C.t2,fontFamily:S}}>{s}</div></div>)}</div>
     </div>},
    {icon:"👤",title:"КАК ВАС ЗОВУТ?",sub:"Джарвис будет обращаться по имени",
     content:<div style={{display:"flex",flexDirection:"column",gap:10}}>
       <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ваше имя"/>
       <div style={{fontSize:12,color:C.t2,fontFamily:S,textAlign:"center"}}>Имя хранится только на вашем устройстве</div>
     </div>},
    {icon:"🚗",title:"ВАШ АВТОМОБИЛЬ",sub:"Данные для точной диагностики",
     content:<div style={{display:"flex",flexDirection:"column",gap:9}}>
       {[["МАРКА","make","text","Toyota"],["МОДЕЛЬ","model","text","Camry"],["ГОД","year","number","2019"],["ПРОБЕГ (КМ)","mileage","number","50000"]].map(([l,k,t,ph])=><div key={k}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:4,fontFamily:M}}>{l}</div><Input type={t} value={car[k]} placeholder={ph} onChange={e=>setCar(p=>({...p,[k]:t==="number"?+e.target.value:e.target.value}))}/></div>)}
       <div><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:6,fontFamily:M}}>ТИП ТОПЛИВА</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["АИ-92","АИ-95","АИ-98","Дизель","Газ"].map(f=><button key={f} onClick={()=>setCar(p=>({...p,fuel:f}))} style={{padding:"5px 12px",fontSize:11,fontFamily:S,background:car.fuel===f?C.oG:"transparent",color:car.fuel===f?C.o:C.t2,border:`1px solid ${car.fuel===f?C.o+"60":C.border}`,borderRadius:5,cursor:"pointer"}}>{f}</button>)}</div></div>
     </div>},
  ];
  const cur=steps[step];
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",fontFamily:M}}>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <div style={{width:"100%",maxWidth:420}}>
      <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center",marginBottom:36}}>
        <div style={{width:44,height:44,borderRadius:"50%",background:C.o,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 24px ${C.o}50`}}><span style={{fontSize:20}}>⚙</span></div>
        <div><div style={{fontSize:18,fontWeight:700,color:C.t}}>JARVIS AUTO</div><div style={{fontSize:9,color:C.t2,letterSpacing:2}}>AI AUTOMOTIVE PLATFORM</div></div>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:30}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?C.o:C.border,transition:"background .4s"}}/>)}</div>
      <div key={step} style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:16,padding:"28px 24px",animation:"fadeUp .35s ease"}}>
        <div style={{textAlign:"center",marginBottom:22}}><div style={{fontSize:30,marginBottom:10}}>{cur.icon}</div><div style={{fontSize:19,fontWeight:700,color:C.t,marginBottom:5}}>{cur.title}</div><div style={{fontSize:13,color:C.t2,fontFamily:S}}>{cur.sub}</div></div>
        {cur.content}
        <PBtn full onClick={()=>{if(!valid[step])return;step<steps.length-1?setStep(s=>s+1):onDone(name.trim()||"Водитель",{...car,year:+car.year,mileage:+car.mileage});}} disabled={!valid[step]} style={{marginTop:18,padding:"14px"}}>
          {step<steps.length-1?"ПРОДОЛЖИТЬ →":"ВОЙТИ В ДЖАРВИС ⚙"}
        </PBtn>
        {step>0&&<GBtn full onClick={()=>setStep(s=>s-1)} style={{marginTop:10}}>← НАЗАД</GBtn>}
      </div>
      <div style={{textAlign:"center",marginTop:18,fontSize:10,color:C.t3,letterSpacing:1}}>BETA · ДАННЫЕ НА ВАШЕМ УСТРОЙСТВЕ</div>
    </div>
  </div>;
}

/* ── DASHBOARD ───────────────────────────────────────────────────── */
function Dashboard({name,car,services,diagHistory,expenses,fuel,setTab,toast}){
  const health=calcHealth(services);
  const hColor=health>=75?C.g:health>=50?C.y:C.r;
  const totalExp=expenses.reduce((s,e)=>s+e.amount,0);
  const overdue=services.filter(s=>s.status==="overdue");
  const warning=services.filter(s=>s.status==="warning");
  const mo=new Date().getMonth()+1;
  const seasonTip=SEASONAL_TIPS.find(t=>t.mo.includes(mo));
  const lastFills=fuel.slice(0,4);
  const avgConsumption=useMemo(()=>{
    if(fuel.length<2)return null;
    const sorted=[...fuel].sort((a,b)=>a.odometer-b.odometer);
    let totalL=0,totalKm=0;
    for(let i=1;i<sorted.length;i++){totalL+=sorted[i-1].liters;totalKm+=sorted[i].odometer-sorted[i-1].odometer;}
    return totalKm>0?((totalL/totalKm)*100).toFixed(1):null;
  },[fuel]);
  const weekly=useMemo(()=>{
    const now=new Date();
    return [4,3,2,1].map(w=>{
      const from=new Date(now);from.setDate(from.getDate()-(w)*7);
      const to=new Date(now);to.setDate(to.getDate()-(w-1)*7);
      return{w:`-${w}н`,sum:expenses.filter(e=>{const d=new Date(e.date);return d>=from&&d<to;}).reduce((s,e)=>s+e.amount,0)};
    });
  },[expenses]);

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Greeting */}
    <div>
      <div style={{fontSize:13,color:C.t2,fontFamily:S}}>{new Date().getHours()<12?"Доброе утро":new Date().getHours()<18?"Добрый день":"Добрый вечер"}, {name}</div>
      <div style={{fontSize:21,fontWeight:700,color:C.t,fontFamily:S,letterSpacing:-.4}}>{car.make} {car.model}</div>
      <div style={{fontSize:11,color:C.t2,fontFamily:M}}>{car.year} · {car.color} · {car.mileage?.toLocaleString("ru-RU")} км</div>
    </div>

    {/* Health hero */}
    <Card style={{background:`linear-gradient(135deg,${C.card} 0%,#0f1f3a 100%)`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",right:-40,top:-40,width:140,height:140,borderRadius:"50%",background:"rgba(255,107,0,0.05)",pointerEvents:"none"}}/>
      <div style={{display:"flex",gap:18,alignItems:"center"}}>
        <Ring val={health} color={hColor} size={100} sw={9}>
          <div style={{fontSize:22,fontWeight:700,color:hColor,fontFamily:M,lineHeight:1}}>{health}</div>
          <div style={{fontSize:8,color:C.t2,letterSpacing:.5}}>/ 100</div>
        </Ring>
        <div style={{flex:1}}>
          <Lbl>ЗДОРОВЬЕ АВТО</Lbl>
          <div style={{fontSize:18,fontWeight:700,color:hColor,fontFamily:M,marginBottom:4}}>{health>=75?"ОТЛИЧНО":health>=50?"ВНИМАНИЕ":"КРИТИЧНО"}</div>
          <div style={{fontSize:12,color:C.t2,fontFamily:S,lineHeight:1.5,marginBottom:8}}>{overdue.length>0?`${overdue.length} операций просрочено`:warning.length>0?`${warning.length} операций скоро истекут`:"Всё в норме"}</div>
          {avgConsumption&&<div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:10,color:C.t2,fontFamily:M}}>РАСХОД:</span><span style={{fontSize:13,fontWeight:700,color:C.o,fontFamily:M}}>{avgConsumption} л/100км</span></div>}
        </div>
      </div>
    </Card>

    {/* Stats row */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      {[{label:"РАСХОДЫ",value:rub(totalExp),sub:`${expenses.length} записей`,color:C.t,tab:"finance"},{label:"ПРОСРОЧЕНО",value:overdue.length,sub:"опер. ТО",color:overdue.length?C.r:C.g,tab:"maintain"},{label:"ДИАГНОЗОВ",value:diagHistory.length,sub:"в истории",color:C.t,tab:"diag"}].map(({label,value,sub,color,tab})=><Card key={label} onClick={()=>setTab(tab)} style={{padding:"12px 14px",cursor:"pointer"}}><Lbl mb={4}>{label}</Lbl><div style={{fontSize:15,fontWeight:700,color,fontFamily:M,marginBottom:2}}>{value}</div><div style={{fontSize:10,color:C.t2,fontFamily:S}}>{sub}</div></Card>)}
    </div>

    {/* Seasonal tip */}
    {seasonTip&&<Card style={{background:`${C.b}08`,borderColor:`${C.b}25`,display:"flex",gap:12,alignItems:"flex-start",padding:"14px 16px"}}>
      <span style={{fontSize:22,flexShrink:0}}>{seasonTip.icon}</span>
      <div><div style={{fontSize:10,color:C.b,fontFamily:M,letterSpacing:1,marginBottom:4}}>СОВЕТ СЕЗОНА</div><div style={{fontSize:12,color:C.t2,fontFamily:S,lineHeight:1.6}}>{seasonTip.tip}</div></div>
    </Card>}

    {/* Alerts */}
    {(overdue.length+warning.length>0)&&<Card style={{background:`${C.r}05`,borderColor:`${C.r}20`}}>
      <Lbl color={C.r}>⚠ НУЖЕН СЕРВИС</Lbl>
      {[...overdue,...warning].slice(0,3).map((s,i,arr)=><div key={s.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
        <span style={{fontSize:16}}>{s.icon}</span>
        <div style={{flex:1,fontSize:13,color:C.t,fontFamily:S}}>{s.name}</div>
        <Pill color={sCfg[s.status].color}>{sCfg[s.status].label}</Pill>
      </div>)}
      <button onClick={()=>setTab("maintain")} style={{marginTop:10,width:"100%",padding:"8px",fontSize:10,fontFamily:M,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",letterSpacing:1}}>ПЕРЕЙТИ В СЕРВИСНУЮ КНИЖКУ →</button>
    </Card>}

    {/* Expense chart */}
    <Card>
      <Lbl>РАСХОДЫ ПО НЕДЕЛЯМ</Lbl>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={weekly}>
          <defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.o} stopOpacity={0.3}/><stop offset="100%" stopColor={C.o} stopOpacity={0}/></linearGradient></defs>
          <XAxis dataKey="w" tick={{fontSize:9,fill:C.t2,fontFamily:M}} axisLine={false} tickLine={false}/>
          <Tooltip content={({active,payload})=>active&&payload?.length?<div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:11,fontFamily:M,color:C.t}}>{rub(payload[0].value)}</div>:null}/>
          <Area type="monotone" dataKey="sum" stroke={C.o} strokeWidth={2} fill="url(#og)"/>
        </AreaChart>
      </ResponsiveContainer>
    </Card>

    {/* Recent diagnoses */}
    {diagHistory.length>0&&<Card>
      <Lbl>ПОСЛЕДНИЕ ДИАГНОЗЫ</Lbl>
      {diagHistory.slice(0,3).map((d,i)=><div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<2?`1px solid ${C.border}`:"none",alignItems:"center"}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:dCfg[d.danger]?.color||C.t2,flexShrink:0}}/>
        <div style={{flex:1}}><div style={{fontSize:13,color:C.t,fontFamily:S}}>{d.title}</div><div style={{fontSize:10,color:C.t2,fontFamily:M}}>{d.query} · {d.time}</div></div>
        <Pill color={dCfg[d.danger]?.color}>{dCfg[d.danger]?.label}</Pill>
      </div>)}
      <button onClick={()=>setTab("diag")} style={{marginTop:10,width:"100%",padding:"8px",fontSize:10,fontFamily:M,background:"transparent",color:C.o,border:`1px solid ${C.o}30`,borderRadius:8,cursor:"pointer",letterSpacing:1}}>ВСЯ ИСТОРИЯ →</button>
    </Card>}
  </div>;
}

/* ── DIAGNOSTICS (with offline OBD lookup) ───────────────────────── */
function Diagnostics({history,setHistory,car,toast}){
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [err,setErr]=useState("");
  const [offline,setOffline]=useState(false);
  const ref=useRef(null);
  const examples=["P0301","P0420","P0171","P0300","P0440","стук при торможении","не заводится утром","вибрация 80 км/ч","дёргается при разгоне","плавают обороты"];

  const run=async(q)=>{
    const query=(q!==undefined?q:input).trim();if(!query||loading)return;
    setLoading(true);setResult(null);setErr("");setOffline(false);
    // Check offline DB first
    const code=query.toUpperCase().replace(/\s/g,"");
    const local=OBD_DB[code];
    if(local){
      const r={...local,danger_reason:local.desc?.split(".")[0]+".",urgency:"1 неделя",parts:[]};
      setResult(r);setOffline(true);
      setHistory(prev=>[{...r,query,time:new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}),...local},...prev].slice(0,30));
      toast("Найдено в офлайн-базе","success");
      setLoading(false);return;
    }
    // Fallback to AI
    try{
      const ctx=`Авто: ${car.make} ${car.model} ${car.year}, ${car.mileage?.toLocaleString()} км, топливо: ${car.fuel}. Запрос: ${query}`;
      const text=await ai(DIAG_SYS,ctx);
      const r=JSON.parse(text);
      if(r.error)setErr(r.error);
      else{setResult(r);setHistory(prev=>[{...r,query,time:new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})},...prev].slice(0,30));toast("Диагноз получен","success");}
    }catch{setErr("Ошибка соединения. Проверьте интернет и попробуйте ещё раз.");}
    setLoading(false);
  };

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Card>
      <Lbl>КОД OBD-II ИЛИ СИМПТОМ</Lbl>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <input ref={ref} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()}
          placeholder="P0301 или «стучит при разгоне»"
          style={{flex:1,padding:"11px 14px",fontSize:13,fontFamily:M,background:C.bg2,border:`1px solid ${input?C.o+"60":C.border}`,borderRadius:9,color:C.t,outline:"none",transition:"border-color .2s"}}/>
        <PBtn onClick={()=>run()} disabled={loading||!input.trim()} style={{padding:"11px 20px",fontSize:16}}>→</PBtn>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{examples.map(ex=><button key={ex} onClick={()=>{setInput(ex);setTimeout(()=>run(ex),20);}} style={{padding:"3px 10px",fontSize:10,fontFamily:M,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}} onMouseEnter={e=>{e.target.style.color=C.o;e.target.style.borderColor=C.o;}} onMouseLeave={e=>{e.target.style.color=C.t2;e.target.style.borderColor=C.border;}}>{ex}</button>)}</div>
    </Card>

    <Card style={{background:`${C.g}06`,borderColor:`${C.g}20`,padding:"10px 16px",display:"flex",gap:10,alignItems:"center"}}>
      <span style={{fontSize:16}}>⚡</span>
      <div style={{fontSize:11,color:C.t2,fontFamily:S}}><span style={{color:C.g,fontWeight:600}}>40 кодов</span> в офлайн-базе — мгновенный ответ без интернета. Для остальных — ИИ-анализ.</div>
    </Card>

    {loading&&<Card><Spinner/></Card>}
    {err&&!loading&&<Card style={{background:C.rG,borderColor:`${C.r}30`,color:C.r,fontSize:13,fontFamily:S}}>{err}</Card>}

    {result&&!loading&&<div style={{display:"flex",flexDirection:"column",gap:10,animation:"fadeUp .35s ease"}}>
      <Card style={{borderLeft:`3px solid ${C.o}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <Lbl mb={0}>{(result.system||"").toUpperCase()}</Lbl>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {offline&&<Pill color={C.g}>⚡ ОФЛАЙН</Pill>}
            {result.urgency&&<Pill color={urgClr[result.urgency]||C.t2}>{result.urgency}</Pill>}
          </div>
        </div>
        <div style={{fontSize:18,fontWeight:700,color:C.t,fontFamily:S,lineHeight:1.3,marginBottom:10}}>{result.title}</div>
        <div style={{fontSize:13,color:C.t2,fontFamily:S,lineHeight:1.65}}>{result.description||result.desc}</div>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card style={{background:dCfg[result.danger]?.bg,borderColor:(dCfg[result.danger]?.color||C.t2)+"50"}}>
          <Lbl>ОПАСНОСТЬ</Lbl>
          <div style={{fontSize:15,fontWeight:700,color:dCfg[result.danger]?.color,fontFamily:M,marginBottom:4}}>{dCfg[result.danger]?.label}</div>
          <div style={{fontSize:11,color:C.t2,fontFamily:S,lineHeight:1.45}}>{result.danger_reason}</div>
        </Card>
        <Card style={{background:result.can_drive?C.gG:C.rG,borderColor:(result.can_drive?C.g:C.r)+"40",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"16px 12px"}}>
          <div style={{fontSize:32,color:result.can_drive?C.g:C.r,marginBottom:5}}>{result.can_drive?"✓":"✗"}</div>
          <div style={{fontSize:10,fontWeight:700,color:result.can_drive?C.g:C.r,letterSpacing:1.5,fontFamily:M}}>{result.can_drive?"МОЖНО ЕХАТЬ":"НЕ ЕХАТЬ"}</div>
        </Card>
      </div>

      <Card>
        <Lbl>СТОИМОСТЬ РЕМОНТА</Lbl>
        <div style={{fontSize:22,fontWeight:700,color:C.t,fontFamily:M,marginBottom:4}}>{rub(result.price_min)} – {rub(result.price_max)}</div>
        <div style={{fontSize:12,color:C.t2,fontFamily:S}}>{result.price_comment}</div>
      </Card>

      {result.parts?.length>0&&<Card><Lbl>ВЕРОЯТНО ПОТРЕБУЮТСЯ</Lbl><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{result.parts.map(p=><Pill key={p} color={C.b}>{p}</Pill>)}</div></Card>}

      <Card>
        <Lbl>ЧТО ДЕЛАТЬ</Lbl>
        {(result.actions||[]).map((a,i)=><div key={i} style={{display:"flex",gap:12,marginBottom:i<(result.actions||[]).length-1?12:0,alignItems:"flex-start"}}>
          <div style={{minWidth:24,height:24,borderRadius:"50%",background:`${C.o}20`,border:`1px solid ${C.o}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><span style={{fontSize:9,fontWeight:700,color:C.o,fontFamily:M}}>{i+1}</span></div>
          <span style={{fontSize:13,color:C.t,fontFamily:S,lineHeight:1.55}}>{a}</span>
        </div>)}
      </Card>

      <GBtn full onClick={()=>{setResult(null);setInput("");ref.current?.focus();}}>← НОВЫЙ ЗАПРОС</GBtn>
    </div>}

    {history.length>0&&!result&&!loading&&<Card>
      <Lbl>ИСТОРИЯ ДИАГНОЗОВ ({history.length})</Lbl>
      {history.slice(0,8).map((d,i)=><div key={i} onClick={()=>{setInput(d.query);setTimeout(()=>run(d.query),20);}} style={{display:"flex",gap:10,padding:"9px 4px",borderBottom:i<Math.min(8,history.length)-1?`1px solid ${C.border}`:"none",cursor:"pointer",borderRadius:6,margin:"0 -4px"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <div style={{width:7,height:7,borderRadius:"50%",background:dCfg[d.danger]?.color||C.t2,flexShrink:0,marginTop:6}}/>
        <div style={{flex:1}}><div style={{fontSize:13,color:C.t,fontFamily:S}}>{d.title}</div><div style={{fontSize:10,color:C.t2,fontFamily:M}}>{d.query} · {d.time}</div></div>
        <Pill color={dCfg[d.danger]?.color}>{dCfg[d.danger]?.label}</Pill>
      </div>)}
    </Card>}
  </div>;
}

/* ── SERVICE BOOK ────────────────────────────────────────────────── */
function Maintain({services,setServices,car,setCar,toast}){
  const [editKm,setEditKm]=useState(false);
  const [newKm,setNewKm]=useState(car.mileage);
  const [adding,setAdding]=useState(false);
  const [filter,setFilter]=useState("all");
  const [form,setForm]=useState({name:"",icon:"🔧",lastKm:car.mileage,lastDate:new Date().toISOString().slice(0,10),intervalKm:10000,intervalMo:12});
  const iconOpts=["🛢","💨","🔴","⬛","⚡","🧊","⚙️","🌬","🔧","🔩","💧","🛞","🪛","🔦"];
  const sorted=[...services.filter(s=>filter==="all"||s.status===filter)].sort((a,b)=>({overdue:0,warning:1,ok:2})[a.status]-({overdue:0,warning:1,ok:2})[b.status]);
  const markDone=id=>{setServices(p=>p.map(s=>s.id===id?{...s,lastKm:car.mileage,lastDate:new Date().toISOString().slice(0,10),status:"ok"}:s));toast("Отмечено выполненным ✓","success");};
  const del=id=>{setServices(p=>p.filter(s=>s.id!==id));toast("Удалено","info");};
  const addSvc=()=>{if(!form.name)return;setServices(p=>[...p,{...form,id:Date.now(),status:"ok"}]);setAdding(false);setForm({name:"",icon:"🔧",lastKm:car.mileage,lastDate:new Date().toISOString().slice(0,10),intervalKm:10000,intervalMo:12});toast("Добавлено","success");};

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Card>
      <Lbl>ТЕКУЩИЙ ПРОБЕГ</Lbl>
      {editKm?<div style={{display:"flex",gap:8}}>
        <Input type="number" value={newKm} onChange={e=>setNewKm(+e.target.value)} style={{flex:1,fontSize:18,borderColor:C.o}}/>
        <PBtn color={C.g} onClick={()=>{setCar(c=>({...c,mileage:newKm}));setEditKm(false);toast(`Пробег: ${newKm.toLocaleString()} км`,"success");}} style={{padding:"10px 16px",fontSize:14}}>✓</PBtn>
      </div>:<div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><span style={{fontSize:26,fontWeight:700,color:C.t,fontFamily:M}}>{car.mileage?.toLocaleString("ru-RU")}</span><span style={{fontSize:13,color:C.t2,fontFamily:M,marginLeft:6}}>км</span></div>
        <button onClick={()=>{setEditKm(true);setNewKm(car.mileage);}} style={{padding:"6px 14px",fontSize:10,fontFamily:M,background:C.oG,color:C.o,border:`1px solid ${C.o}40`,borderRadius:7,cursor:"pointer",letterSpacing:1}}>ОБНОВИТЬ</button>
      </div>}
    </Card>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      {[{l:"ПРОСРОЧЕНО",v:services.filter(s=>s.status==="overdue").length,c:C.r},{l:"СКОРО",v:services.filter(s=>s.status==="warning").length,c:C.y},{l:"В НОРМЕ",v:services.filter(s=>s.status==="ok").length,c:C.g}].map(({l,v,c})=><Card key={l} style={{padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:c,fontFamily:M}}>{v}</div><div style={{fontSize:9,color:C.t2,letterSpacing:1.5,fontFamily:M,marginTop:2}}>{l}</div></Card>)}
    </div>

    <div style={{display:"flex",gap:6}}>{[["all","ВСЕ"],["overdue","ПРОСРОЧЕНО"],["warning","СКОРО"],["ok","OK"]].map(([v,l])=><button key={v} onClick={()=>setFilter(v)} style={{padding:"5px 12px",fontSize:9,fontFamily:M,borderRadius:6,cursor:"pointer",letterSpacing:1,border:`1px solid ${filter===v?C.o:C.border}`,background:filter===v?C.oG:"transparent",color:filter===v?C.o:C.t2,flex:1}}>{l}</button>)}</div>

    <Card>
      <Lbl>РЕГЛАМЕНТ ТО — {services.length} ПОЗИЦИЙ</Lbl>
      {sorted.map((s,i)=>{const cfg=sCfg[s.status];const rem=s.lastKm+s.intervalKm-car.mileage;const pct=Math.max(0,Math.min(1,(car.mileage-s.lastKm)/s.intervalKm));
      return <div key={s.id} style={{padding:"12px 0",borderBottom:i<sorted.length-1?`1px solid ${C.border}`:"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:18}}>{s.icon}</span><span style={{fontSize:14,color:C.t,fontFamily:S,fontWeight:500}}>{s.name}</span></div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}><Pill color={cfg.color}>{cfg.icon} {cfg.label}</Pill><button onClick={()=>del(s.id)} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:14,padding:"0 2px",lineHeight:1}}>×</button></div>
        </div>
        <div style={{height:3,background:C.border,borderRadius:2,marginBottom:6}}><div style={{height:3,background:cfg.color,borderRadius:2,width:`${pct*100}%`,transition:"width .6s"}}/></div>
        <div style={{fontSize:11,color:C.t2,fontFamily:M,marginBottom:s.status!=="ok"?8:0}}>{s.lastDate} · {s.lastKm?.toLocaleString()} км · каждые {s.intervalKm?.toLocaleString()} км</div>
        {s.status!=="ok"&&<div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,color:cfg.color,fontFamily:M}}>{s.status==="overdue"?`⚠ просрочено на ${Math.abs(rem).toLocaleString()} км`:`→ осталось ~${rem.toLocaleString()} км`}</span>
          <button onClick={()=>markDone(s.id)} style={{padding:"3px 12px",fontSize:10,fontFamily:M,background:C.gG,color:C.g,border:`1px solid ${C.g}40`,borderRadius:5,cursor:"pointer"}}>СДЕЛАНО ✓</button>
        </div>}
      </div>;})}
    </Card>

    {adding?<Card>
      <Lbl>НОВАЯ ОПЕРАЦИЯ ТО</Lbl>
      <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:6,fontFamily:M}}>ИКОНКА</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{iconOpts.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{padding:"4px 8px",fontSize:16,background:form.icon===ic?C.oG:"transparent",border:`1px solid ${form.icon===ic?C.o:C.border}`,borderRadius:6,cursor:"pointer"}}>{ic}</button>)}</div></div>
      {[["НАЗВАНИЕ","name","text","Замена ремня ГРМ"],["ПРОБЕГ ПРИ ЗАМЕНЕ","lastKm","number",""],["ДАТА ЗАМЕНЫ","lastDate","date",""],["ИНТЕРВАЛ КМ","intervalKm","number","30000"]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={form[k]} placeholder={ph} onChange={e=>setForm(p=>({...p,[k]:t==="number"?+e.target.value:e.target.value}))}/></div>)}
      <div style={{display:"flex",gap:8}}><PBtn full onClick={addSvc}>ДОБАВИТЬ</PBtn><GBtn onClick={()=>setAdding(false)}>ОТМЕНА</GBtn></div>
    </Card>:<button onClick={()=>setAdding(true)} style={{padding:"14px",background:"transparent",border:`1px dashed ${C.border}`,color:C.t2,borderRadius:12,fontSize:10,fontFamily:M,cursor:"pointer",letterSpacing:1}}>+ ДОБАВИТЬ ОПЕРАЦИЮ ТО</button>}
  </div>;
}

/* ── FINANCE + FUEL ──────────────────────────────────────────────── */
function Finance({expenses,setExpenses,fuel,setFuel,car,toast}){
  const [tab,setTab]=useState("exp");
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({date:new Date().toISOString().slice(0,10),cat:"топливо",amount:"",note:""});
  const [fuelForm,setFuelForm]=useState({date:new Date().toISOString().slice(0,10),liters:"",cost:"",odometer:car.mileage,station:""});

  const total=expenses.reduce((s,e)=>s+e.amount,0);
  const byCategory=expenses.reduce((acc,e)=>({...acc,[e.cat]:(acc[e.cat]||0)+e.amount}),{});
  const monthly=useMemo(()=>{const m={};expenses.forEach(e=>{const k=e.date.slice(0,7);m[k]=(m[k]||0)+e.amount;});return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).slice(-5).map(([mo,sum])=>({mo:mo.slice(5),sum}));},[expenses]);
  const pieData=Object.entries(byCategory).map(([name,value])=>({name,value}));

  const avgConsumption=useMemo(()=>{
    if(fuel.length<2)return null;
    const s=[...fuel].sort((a,b)=>a.odometer-b.odometer);
    let tL=0,tK=0;for(let i=1;i<s.length;i++){tL+=s[i-1].liters;tK+=s[i].odometer-s[i-1].odometer;}
    return tK>0?((tL/tK)*100).toFixed(1):null;
  },[fuel]);
  const costPer100=useMemo(()=>{
    if(fuel.length<2)return null;
    const s=[...fuel].sort((a,b)=>a.odometer-b.odometer);
    let tC=0,tK=0;for(let i=1;i<s.length;i++){tC+=s[i-1].cost;tK+=s[i].odometer-s[i-1].odometer;}
    return tK>0?Math.round((tC/tK)*100):null;
  },[fuel]);

  const addExp=()=>{if(!form.amount)return;setExpenses(p=>[{...form,amount:+form.amount,id:Date.now()},...p]);setAdding(false);setForm({date:new Date().toISOString().slice(0,10),cat:"топливо",amount:"",note:""});toast("Расход добавлен","success");};
  const addFuel=()=>{if(!fuelForm.liters||!fuelForm.cost)return;setFuel(p=>[{...fuelForm,liters:+fuelForm.liters,cost:+fuelForm.cost,odometer:+fuelForm.odometer,id:Date.now()},...p]);setAdding(false);setFuelForm({date:new Date().toISOString().slice(0,10),liters:"",cost:"",odometer:car.mileage,station:""});toast("Заправка добавлена","success");};
  const delExp=id=>{setExpenses(p=>p.filter(e=>e.id!==id));toast("Удалено","info");};
  const delFuel=id=>{setFuel(p=>p.filter(e=>e.id!==id));toast("Удалено","info");};

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",gap:6}}>{[["exp","РАСХОДЫ"],["fuel","ТОПЛИВО"],["charts","ГРАФИКИ"]].map(([v,l])=><button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:"8px",fontSize:10,fontFamily:M,borderRadius:8,cursor:"pointer",letterSpacing:1,border:`1px solid ${tab===v?C.o:C.border}`,background:tab===v?C.oG:"transparent",color:tab===v?C.o:C.t2}}>{l}</button>)}</div>

    {tab==="exp"&&<>
      <Card style={{borderLeft:`3px solid ${C.o}`}}>
        <Lbl>ИТОГО 2025</Lbl>
        <div style={{fontSize:28,fontWeight:700,color:C.t,fontFamily:M,marginBottom:4}}>{rub(total)}</div>
        <div style={{fontSize:12,color:C.t2,fontFamily:S}}>{expenses.length} записей · среднее {rub(Math.round(total/(expenses.length||1)))} за запись</div>
      </Card>
      {adding?<Card>
        <Lbl>НОВЫЙ РАСХОД</Lbl>
        <div style={{marginBottom:12}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:7,fontFamily:M}}>КАТЕГОРИЯ</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Object.keys(CAT_CLR).map(cat=><button key={cat} onClick={()=>setForm(p=>({...p,cat}))} style={{padding:"5px 12px",fontSize:10,fontFamily:M,background:form.cat===cat?(CAT_CLR[cat]||C.t2)+"20":"transparent",color:form.cat===cat?CAT_CLR[cat]:C.t2,border:`1px solid ${form.cat===cat?(CAT_CLR[cat]||C.t2)+"60":C.border}`,borderRadius:5,cursor:"pointer",textTransform:"capitalize"}}>{cat}</button>)}</div></div>
        {[["СУММА (₽)","amount","number","3200"],["ДАТА","date","date",""],["ПРИМЕЧАНИЕ","note","text","АЗС Лукойл"]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={form[k]} placeholder={ph} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>)}
        <div style={{display:"flex",gap:8}}><PBtn full onClick={addExp}>ДОБАВИТЬ</PBtn><GBtn onClick={()=>setAdding(false)}>ОТМЕНА</GBtn></div>
      </Card>:<button onClick={()=>setAdding(true)} style={{padding:"14px",background:"transparent",border:`1px dashed ${C.border}`,color:C.t2,borderRadius:12,fontSize:10,fontFamily:M,cursor:"pointer",letterSpacing:1}}>+ ДОБАВИТЬ РАСХОД</button>}
      <Card>
        <Lbl>ВСЕ ЗАПИСИ ({expenses.length})</Lbl>
        {expenses.map((e,i)=><div key={e.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<expenses.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:CAT_CLR[e.cat]||C.t2,flexShrink:0}}/>
          <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.t,fontFamily:S,textTransform:"capitalize"}}>{e.cat}</span><span style={{fontSize:13,color:C.t,fontFamily:M,fontWeight:600}}>{rub(e.amount)}</span></div><div style={{fontSize:11,color:C.t2,fontFamily:M}}>{e.note} · {e.date}</div></div>
          <button onClick={()=>delExp(e.id)} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:15,padding:"0 4px"}}>×</button>
        </div>)}
      </Card>
    </>}

    {tab==="fuel"&&<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card style={{background:`${C.o}08`,borderColor:`${C.o}25`}}><Lbl>РАСХОД</Lbl><div style={{fontSize:22,fontWeight:700,color:C.o,fontFamily:M}}>{avgConsumption||"—"}<span style={{fontSize:12,color:C.t2,marginLeft:4}}>л/100</span></div></Card>
        <Card style={{background:`${C.g}08`,borderColor:`${C.g}25`}}><Lbl>ЦЕНА/100КМ</Lbl><div style={{fontSize:22,fontWeight:700,color:C.g,fontFamily:M}}>{costPer100?rub(costPer100):"—"}</div></Card>
      </div>
      {adding?<Card>
        <Lbl>НОВАЯ ЗАПРАВКА</Lbl>
        {[["ДАТА","date","date",""],["ЛИТРОВ","liters","number","45"],["СТОИМОСТЬ (₽)","cost","number","3200"],["ПРОБЕГ (КМ)","odometer","number",""],["АЗС","station","text","АЗС Лукойл"]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={fuelForm[k]} placeholder={ph} onChange={e=>setFuelForm(p=>({...p,[k]:e.target.value}))}/></div>)}
        <div style={{display:"flex",gap:8}}><PBtn full onClick={addFuel}>ДОБАВИТЬ</PBtn><GBtn onClick={()=>setAdding(false)}>ОТМЕНА</GBtn></div>
      </Card>:<button onClick={()=>setAdding(true)} style={{padding:"14px",background:"transparent",border:`1px dashed ${C.border}`,color:C.t2,borderRadius:12,fontSize:10,fontFamily:M,cursor:"pointer",letterSpacing:1}}>+ ДОБАВИТЬ ЗАПРАВКУ</button>}
      <Card>
        <Lbl>ИСТОРИЯ ЗАПРАВОК</Lbl>
        {fuel.map((f,i)=>{const ppL=f.cost/f.liters;return<div key={f.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<fuel.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}>
          <span style={{fontSize:18,flexShrink:0}}>⛽</span>
          <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.t,fontFamily:S}}>{f.station||"АЗС"}</span><span style={{fontSize:13,color:C.t,fontFamily:M,fontWeight:600}}>{rub(f.cost)}</span></div><div style={{fontSize:11,color:C.t2,fontFamily:M}}>{f.date} · {f.liters}л · {ppL.toFixed(0)} ₽/л · {f.odometer?.toLocaleString()} км</div></div>
          <button onClick={()=>delFuel(f.id)} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:15,padding:"0 4px"}}>×</button>
        </div>;})}
        {!fuel.length&&<div style={{textAlign:"center",padding:"20px",color:C.t2,fontSize:13,fontFamily:S}}>Добавьте первую заправку</div>}
      </Card>
    </>}

    {tab==="charts"&&<>
      <Card><Lbl>РАСХОДЫ ПО МЕСЯЦАМ</Lbl>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthly}>
            <XAxis dataKey="mo" tick={{fontSize:10,fill:C.t2,fontFamily:M}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:9,fill:C.t2,fontFamily:M}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}к`}/>
            <Tooltip content={({active,payload})=>active&&payload?.length?<div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:11,fontFamily:M,color:C.t}}>{rub(payload[0].value)}</div>:null}/>
            <Bar dataKey="sum" fill={C.o} radius={[4,4,0,0]} maxBarSize={40}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card><Lbl>ПО КАТЕГОРИЯМ</Lbl>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <PieChart width={110} height={110}><Pie data={pieData} cx={50} cy={50} innerRadius={28} outerRadius={50} dataKey="value" strokeWidth={0}>{pieData.map((e,i)=><Cell key={i} fill={CAT_CLR[e.name]||C.t2}/>)}</Pie></PieChart>
          <div style={{flex:1}}>{pieData.sort((a,b)=>b.value-a.value).map(({name,value})=><div key={name} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:CAT_CLR[name]||C.t2,flexShrink:0}}/>
            <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:C.t,fontFamily:S,textTransform:"capitalize"}}>{name}</span><span style={{fontSize:12,color:C.t,fontFamily:M}}>{rub(value)}</span></div><div style={{height:2,background:C.border,borderRadius:1,marginTop:3}}><div style={{height:2,background:CAT_CLR[name]||C.t2,borderRadius:1,width:`${(value/total)*100}%`}}/></div></div>
          </div>)}</div>
        </div>
      </Card>
    </>}
  </div>;
}

/* ── MORE HUB ────────────────────────────────────────────────────── */
function More({car,name,toast,setCar,expenses,setExpenses,fuel,setFuel}){
  const [sub,setSub]=useState(null);
  const menu=[
    {id:"service",icon:"🔍",label:"НАЙТИ СЕРВИС",sub:"Автосервисы, шиномонтаж, мойки"},
    {id:"tips",icon:"💡",label:"СОВЕТЫ ДЖАРВИСА",sub:"ИИ-ответы на вопросы об авто"},
    {id:"sos",icon:"🆘",label:"ЭКСТРЕННАЯ ПОМОЩЬ",sub:"ДТП, поломка, пошаговые инструкции"},
    {id:"docs",icon:"📄",label:"МОИ ДОКУМЕНТЫ",sub:"ОСАГО, КАСКО, техосмотр, права"},
    {id:"profile",icon:"🚗",label:"МОЙ АВТОМОБИЛЬ",sub:"Редактировать данные"},
    {id:"export",icon:"📤",label:"ЭКСПОРТ",sub:"Скачать данные в файл"},
  ];
  if(sub==="service")return <FindService car={car} toast={toast} onBack={()=>setSub(null)}/>;
  if(sub==="tips")return <AiTips car={car} onBack={()=>setSub(null)}/>;
  if(sub==="sos")return <Emergency onBack={()=>setSub(null)}/>;
  if(sub==="docs")return <Documents toast={toast} onBack={()=>setSub(null)}/>;
  if(sub==="profile")return <CarProfile car={car} setCar={setCar} toast={toast} onBack={()=>setSub(null)}/>;
  if(sub==="export")return <Export car={car} name={name} expenses={expenses} fuel={fuel} onBack={()=>setSub(null)}/>;
  const handleReset=()=>{if(window.confirm("Сбросить все данные? Нельзя отменить.")){"ja4_car,ja4_services,ja4_diagHistory,ja4_expenses,ja4_fuel,ja4_onboarded,ja4_name".split(",").forEach(k=>localStorage.removeItem(k));window.location.reload();}};
  return <div style={{display:"flex",flexDirection:"column",gap:10}}>
    <div style={{fontSize:18,fontWeight:700,color:C.t,fontFamily:S}}>Ещё</div>
    <Card>{menu.map((m,i)=><div key={m.id}><div onClick={()=>setSub(m.id)} style={{display:"flex",gap:12,padding:"13px 0",alignItems:"center",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.opacity=".75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
      <span style={{fontSize:22,flexShrink:0}}>{m.icon}</span>
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.t,fontFamily:S}}>{m.label}</div><div style={{fontSize:11,color:C.t2,fontFamily:S}}>{m.sub}</div></div>
      <span style={{fontSize:18,color:C.t2}}>›</span>
    </div>{i<menu.length-1&&<div style={{height:1,background:C.border}}/>}</div>)}</Card>
    <button onClick={handleReset} style={{padding:"12px",background:"transparent",border:`1px solid ${C.r}30`,color:C.r,borderRadius:10,fontSize:11,fontFamily:M,cursor:"pointer",letterSpacing:1}}>🔄 СБРОСИТЬ ВСЕ ДАННЫЕ</button>
    <Card style={{background:`${C.o}06`,borderColor:`${C.o}15`,textAlign:"center",padding:"18px"}}><div style={{fontSize:22,marginBottom:6}}>⚙</div><div style={{fontSize:10,fontWeight:700,color:C.o,fontFamily:M,letterSpacing:1,marginBottom:4}}>JARVIS AUTO BETA v4</div><div style={{fontSize:11,color:C.t2,fontFamily:S}}>OBD база · ИИ диагностика · Трекер топлива · Офлайн-коды</div></Card>
  </div>;
}

function FindService({car,toast,onBack}){
  const [q,setQ]=useState("");const [loading,setLoading]=useState(false);const [data,setData]=useState(null);
  const cats=["автосервис","шиномонтаж","автомойка","запчасти","эвакуатор","техосмотр"];
  const search=async(qv)=>{const query=(qv||q).trim();if(!query)return;setLoading(true);setData(null);try{const t=await ai(FIND_SYS,`Ищу: "${query}" для ${car.make} ${car.model} ${car.year}`);setData(JSON.parse(t));}catch{toast("Ошибка поиска","error");}setLoading(false);};
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <BackHeader title="Найти сервис" onBack={onBack}/>
    <Card style={{background:`${C.o}06`,borderColor:`${C.o}20`,padding:"10px 16px",display:"flex",gap:10,alignItems:"center"}}><span>📍</span><div style={{fontSize:11,color:C.t2,fontFamily:S}}><span style={{color:C.o,fontWeight:600}}>DEMO.</span> В финальной версии — реальные сервисы на карте.</div></Card>
    <Card>
      <div style={{display:"flex",gap:8,marginBottom:10}}><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Шиномонтаж, замена масла…" style={{flex:1}}/><PBtn onClick={()=>search()} disabled={loading||!q.trim()} style={{padding:"11px 18px",fontSize:15}}>→</PBtn></div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>{setQ(c);search(c);}} style={{padding:"4px 11px",fontSize:10,fontFamily:M,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:5,cursor:"pointer"}}>{c}</button>)}</div>
    </Card>
    {loading&&<Card><Spinner/></Card>}
    {data&&!loading&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {data.tip&&<Card style={{background:C.gG,borderColor:`${C.g}25`,padding:"10px 16px"}}><div style={{fontSize:12,color:C.t,fontFamily:S}}>💡 {data.tip}</div></Card>}
      {(data.results||[]).map((s,i)=><Card key={i}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div><div style={{fontSize:15,fontWeight:600,color:C.t,fontFamily:S}}>{s.name}</div><Pill color={C.b}>{s.type}</Pill></div>
          <div style={{display:"flex",gap:3,alignItems:"center"}}><span style={{color:C.y}}>★</span><span style={{fontSize:13,color:C.t,fontFamily:M}}>{s.rating}</span><span style={{fontSize:10,color:C.t2,fontFamily:S}}>({s.reviews})</span></div>
        </div>
        <div style={{fontSize:12,color:C.t2,fontFamily:S,marginBottom:3}}>📍 {s.address}</div>
        <div style={{fontSize:12,color:C.t2,fontFamily:S,marginBottom:3}}>📞 {s.phone} · {s.hours}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(s.tags||[]).map(t=><Pill key={t} color={C.o}>{t}</Pill>)}</div><span style={{fontSize:14,fontWeight:700,color:C.g,fontFamily:M}}>{s.price}</span></div>
      </Card>)}
    </div>}
  </div>;
}

function AiTips({car,onBack}){
  const [input,setInput]=useState("");const [loading,setLoading]=useState(false);
  const [msgs,setMsgs]=useState([{role:"j",text:`Привет! Я Джарвис. Задайте любой вопрос о вашем ${car.make} ${car.model} или автомобилях в целом.`}]);
  const bottom=useRef(null);
  const send=async(q)=>{const msg=(q||input).trim();if(!msg||loading)return;setMsgs(p=>[...p,{role:"u",text:msg}]);setInput("");setLoading(true);
    try{const t=await ai(TIPS_SYS,`${car.make} ${car.model} ${car.year}, ${car.mileage?.toLocaleString()} км. ${msg}`,600);setMsgs(p=>[...p,{role:"j",text:t}]);}catch{setMsgs(p=>[...p,{role:"j",text:"Ошибка соединения."}]);}
    setLoading(false);setTimeout(()=>bottom.current?.scrollIntoView({behavior:"smooth"}),100);};
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <BackHeader title="Советы Джарвиса" onBack={onBack}/>
    <div style={{display:"flex",flexDirection:"column",gap:10,minHeight:180}}>
      {msgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="u"?"flex-end":"flex-start"}}><div style={{maxWidth:"85%",padding:"10px 14px",borderRadius:m.role==="u"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="u"?C.o:C.card,border:m.role==="j"?`1px solid ${C.border}`:"none"}}><div style={{fontSize:13,color:m.role==="u"?"white":C.t,fontFamily:S,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{m.text}</div></div></div>)}
      {loading&&<div style={{display:"flex"}}><div style={{padding:"10px 14px",borderRadius:"14px 14px 14px 4px",background:C.card,border:`1px solid ${C.border}`}}><div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.t2,animation:`pulse 1.4s ease ${i*.2}s infinite`}}/>)}</div></div></div>}
      <div ref={bottom}/>
    </div>
    {msgs.length===1&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Как часто менять масло?","Признаки износа колодок","Зимняя vs летняя резина","Что делать если ABS не работает"].map(s=><button key={s} onClick={()=>send(s)} style={{padding:"5px 12px",fontSize:11,fontFamily:S,background:C.card,color:C.t2,border:`1px solid ${C.border}`,borderRadius:20,cursor:"pointer"}}>{s}</button>)}</div>}
    <div style={{display:"flex",gap:8}}><Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Задайте вопрос…" style={{flex:1}}/><PBtn onClick={()=>send()} disabled={loading||!input.trim()} style={{padding:"11px 18px",fontSize:15}}>↑</PBtn></div>
  </div>;
}

function Emergency({onBack}){
  const [step,setStep]=useState(null);
  const G={
    dtb:{title:"ДТП — ПЕРВЫЕ ШАГИ",color:C.r,steps:["Включите аварийную сигнализацию немедленно","Убедитесь в безопасности — при пострадавших звоните 112","Выставьте знак аварийной остановки (15м в городе, 30м на трассе)","Не перемещайте автомобили при пострадавших до ГАИ","Сфотографируйте место ДТП, повреждения, номера всех участников","Запишите ФИО, телефоны, данные страховки всех участников","При согласии обеих сторон — заполните Европротокол","Уведомите страховую в течение 5 рабочих дней"]},
    flat:{title:"ПРОБИТОЕ КОЛЕСО",color:C.y,steps:["Плавно снижайте скорость — не тормозите резко","Включите аварийку, прижмитесь к правой обочине","Выставьте знак аварийной остановки","Убедитесь в ровной поверхности, поставьте на ручник","Ослабьте болты колеса (на земле, 1 оборот)","Поддомкратьте авто под специальную точку","Замените колесо, затяните болты крест-накрест","Через 50 км проверьте момент затяжки болтов"]},
    bat:{title:"НЕ ЗАВОДИТСЯ — ПРИКУРИТЬ",color:C.y,steps:["Красный провод → + вашей АКБ, затем → + донора","Чёрный провод → - донора, другой конец → металл кузова вашего авто","Заведите донора, подождите 5 минут","Заводите свой автомобиль","Отключайте провода в обратном порядке (сначала чёрный)","После старта дайте двигателю работать 30 мин для зарядки АКБ","Если снова не заводится — АКБ нужна замена"]},
    heat:{title:"ПЕРЕГРЕВ ДВИГАТЕЛЯ",color:C.r,steps:["Немедленно остановитесь — продолжение езды = замена двигателя","Заглушите мотор, включите аварийку","НЕ открывайте крышку радиатора — под давлением кипяток!","Подождите минимум 30 минут до остывания","Осторожно откройте крышку через тряпку","Проверьте уровень охлаждающей жидкости — долейте","Если утечка — вызовите эвакуатор","Не рискуйте двигателем ценой 100-300к рублей"]},
  };
  if(step){const g=G[step];return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",gap:10,alignItems:"center"}}><button onClick={()=>setStep(null)} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:20,padding:0}}>←</button><div style={{fontSize:16,fontWeight:700,color:g.color,fontFamily:S}}>{g.title}</div></div>
    <Card>{g.steps.map((s,i)=><div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<g.steps.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
      <div style={{minWidth:26,height:26,borderRadius:"50%",background:g.color+"20",border:`1px solid ${g.color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:10,fontWeight:700,color:g.color,fontFamily:M}}>{i+1}</span></div>
      <span style={{fontSize:13,color:C.t,fontFamily:S,lineHeight:1.6}}>{s}</span>
    </div>)}</Card>
  </div>;}
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <BackHeader title="Экстренная помощь" onBack={onBack}/>
    <a href="tel:112" style={{textDecoration:"none"}}><Card style={{background:`${C.r}12`,borderColor:`${C.r}40`,textAlign:"center",padding:"20px",cursor:"pointer"}}><div style={{fontSize:36,marginBottom:6}}>🆘</div><div style={{fontSize:18,fontWeight:700,color:C.r,fontFamily:M,letterSpacing:2}}>ЗВОНОК 112</div><div style={{fontSize:12,color:C.t2,fontFamily:S,marginTop:4}}>Нажмите для вызова экстренных служб</div></Card></a>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[{id:"dtb",icon:"💥",label:"ДТП",sub:"Что делать при аварии",color:C.r},{id:"flat",icon:"🛞",label:"ПРОБИТОЕ КОЛЕСО",sub:"Пошаговая замена",color:C.y},{id:"bat",icon:"🔋",label:"НЕ ЗАВОДИТСЯ",sub:"Прикурить от другого авто",color:C.y},{id:"heat",icon:"🌡",label:"ПЕРЕГРЕВ",sub:"Срочные действия",color:C.r}].map(({id,icon,label,sub,color})=><Card key={id} onClick={()=>setStep(id)} style={{cursor:"pointer",borderColor:`${color}25`,padding:"14px"}}><div style={{fontSize:26,marginBottom:6}}>{icon}</div><div style={{fontSize:11,fontWeight:700,color,fontFamily:M,letterSpacing:.5,marginBottom:3}}>{label}</div><div style={{fontSize:11,color:C.t2,fontFamily:S}}>{sub}</div></Card>)}</div>
    <Card><Lbl>ПОЛЕЗНЫЕ НОМЕРА</Lbl>{[["112","Единая экстренная"],["800-200-37-71","ОСАГО (бесплатно)"],["101","Пожарная"],["102","Полиция"],["103","Скорая"]].map(([num,name])=><a key={num} href={`tel:${num}`} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`,textDecoration:"none"}}><span style={{fontSize:13,color:C.t,fontFamily:S}}>{name}</span><span style={{fontSize:13,color:C.o,fontFamily:M,fontWeight:700}}>{num}</span></a>)}</Card>
  </div>;
}

function Documents({toast,onBack}){
  const [docs,setDocs]=usePersist("docs",DEF_DOCS);
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({name:"",icon:"📄",expires:new Date(Date.now()+365*86400000).toISOString().slice(0,10),note:""});
  const addDoc=()=>{if(!form.name)return;setDocs(p=>[...p,{...form,id:Date.now(),status:docStatus(form.expires)}]);setAdding(false);setForm({name:"",icon:"📄",expires:new Date(Date.now()+365*86400000).toISOString().slice(0,10),note:""});toast("Документ добавлен","success");};
  const del=id=>{setDocs(p=>p.filter(d=>d.id!==id));toast("Удалено","info");};
  const docIcons=["📄","🛡","🔍","🪪","🚗","📋","🔑"];
  const updated=docs.map(d=>({...d,status:docStatus(d.expires)}));
  const expiring=updated.filter(d=>d.status!=="ok");

  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <BackHeader title="Мои документы" onBack={onBack}/>
    {expiring.length>0&&<Card style={{background:`${C.r}05`,borderColor:`${C.r}20`}}>
      <Lbl color={C.r}>⚠ ТРЕБУЮТ ВНИМАНИЯ</Lbl>
      {expiring.map((d,i)=><div key={d.id} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderBottom:i<expiring.length-1?`1px solid ${C.border}`:"none"}}>
        <span style={{fontSize:18}}>{d.icon}</span>
        <div style={{flex:1}}><div style={{fontSize:13,color:C.t,fontFamily:S}}>{d.name}</div><div style={{fontSize:11,color:C.t2,fontFamily:M}}>до {d.expires}</div></div>
        <Pill color={sCfg[d.status].color}>{d.status==="overdue"?"ПРОСРОЧЕН":"СКОРО"}</Pill>
      </div>)}
    </Card>}
    <Card>
      <Lbl>ВСЕ ДОКУМЕНТЫ</Lbl>
      {updated.map((d,i)=>{const days=daysUntil(d.expires);const cfg=sCfg[d.status];return<div key={d.id} style={{display:"flex",gap:10,padding:"12px 0",borderBottom:i<updated.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}>
        <span style={{fontSize:22,flexShrink:0}}>{d.icon}</span>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,color:C.t,fontFamily:S,fontWeight:500}}>{d.name}</span><Pill color={cfg.color}>{cfg.icon} {cfg.label}</Pill></div>
          <div style={{fontSize:11,color:C.t2,fontFamily:M}}>{d.note} · до {d.expires}</div>
          <div style={{fontSize:11,color:cfg.color,fontFamily:M,marginTop:2}}>{days<0?`Просрочен на ${Math.abs(days)} дн.`:days===0?"Истекает сегодня!":days<30?`Осталось ${days} дн.`:`${days} дней`}</div>
        </div>
        <button onClick={()=>del(d.id)} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:14,padding:"0 2px"}}>×</button>
      </div>;})}
    </Card>
    {adding?<Card>
      <Lbl>НОВЫЙ ДОКУМЕНТ</Lbl>
      <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:6,fontFamily:M}}>ИКОНКА</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{docIcons.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{padding:"4px 8px",fontSize:16,background:form.icon===ic?C.oG:"transparent",border:`1px solid ${form.icon===ic?C.o:C.border}`,borderRadius:6,cursor:"pointer"}}>{ic}</button>)}</div></div>
      {[["НАЗВАНИЕ","name","text","ОСАГО"],["СРОК ДЕЙСТВИЯ","expires","date",""],["ПРИМЕЧАНИЕ","note","text","Ингосстрах"]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={form[k]} placeholder={ph} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>)}
      <div style={{display:"flex",gap:8}}><PBtn full onClick={addDoc}>ДОБАВИТЬ</PBtn><GBtn onClick={()=>setAdding(false)}>ОТМЕНА</GBtn></div>
    </Card>:<button onClick={()=>setAdding(true)} style={{padding:"14px",background:"transparent",border:`1px dashed ${C.border}`,color:C.t2,borderRadius:12,fontSize:10,fontFamily:M,cursor:"pointer",letterSpacing:1}}>+ ДОБАВИТЬ ДОКУМЕНТ</button>}
  </div>;
}

function CarProfile({car,setCar,toast,onBack}){
  const [form,setForm]=useState({...car});const [saved,setSaved]=useState(false);
  const save=()=>{setCar({...form,year:+form.year,mileage:+form.mileage});setSaved(true);toast("Данные сохранены","success");setTimeout(()=>{setSaved(false);onBack();},1200);};
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <BackHeader title="Мой автомобиль" onBack={onBack}/>
    <Card>
      {[["МАРКА","make","text","Toyota"],["МОДЕЛЬ","model","text","Camry"],["ГОД","year","number","2019"],["ПРОБЕГ (КМ)","mileage","number","52000"],["VIN","vin","text","XTA..."],["ЦВЕТ","color","text","Белый перламутр"]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:12}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={form[k]} placeholder={ph} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>)}
      <div style={{marginBottom:16}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:7,fontFamily:M}}>ТИП ТОПЛИВА</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["АИ-92","АИ-95","АИ-98","Дизель","Газ","Гибрид","Электро"].map(f=><button key={f} onClick={()=>setForm(p=>({...p,fuel:f}))} style={{padding:"5px 12px",fontSize:11,fontFamily:S,background:form.fuel===f?C.oG:"transparent",color:form.fuel===f?C.o:C.t2,border:`1px solid ${form.fuel===f?C.o+"60":C.border}`,borderRadius:5,cursor:"pointer"}}>{f}</button>)}</div></div>
      <PBtn full onClick={save} color={saved?C.g:C.o} style={{padding:"13px"}}>{saved?"✓ СОХРАНЕНО":"СОХРАНИТЬ ДАННЫЕ"}</PBtn>
    </Card>
  </div>;
}

function Export({car,name,expenses,fuel,onBack}){
  const totalExp=expenses.reduce((s,e)=>s+e.amount,0);
  const download=()=>{
    const lines=[`JARVIS AUTO — ОТЧЁТ`,`Владелец: ${name}`,`Авто: ${car.make} ${car.model} ${car.year}`,`Пробег: ${car.mileage?.toLocaleString()} км`,`Дата: ${new Date().toLocaleDateString("ru-RU")}`,``,`=== РАСХОДЫ ===`,`Итого: ${rub(totalExp)}`,...expenses.map(e=>`${e.date}  ${e.cat.padEnd(12)}  ${String(e.amount).padStart(8)} ₽  ${e.note}`),``,`=== ЗАПРАВКИ ===`,...fuel.map(f=>`${f.date}  ${f.liters}л  ${rub(f.cost)}  ${f.odometer?.toLocaleString()} км  ${f.station||""}`)];
    const blob=new Blob([lines.join("\n")],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`jarvis-auto-${new Date().toISOString().slice(0,10)}.txt`;a.click();URL.revokeObjectURL(url);
  };
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <BackHeader title="Экспорт данных" onBack={onBack}/>
    <Card><Lbl>СВОДКА</Lbl><div style={{fontSize:13,color:C.t,fontFamily:S,lineHeight:1.8}}><div>👤 {name}</div><div>🚗 {car.make} {car.model} {car.year}</div><div>📍 {car.mileage?.toLocaleString()} км</div><div>💳 {expenses.length} записей расходов · {fuel.length} заправок</div><div>💰 Итого расходов: {rub(totalExp)}</div></div><PBtn full onClick={download} style={{marginTop:16,padding:"13px"}}>📥 СКАЧАТЬ ОТЧЁТ .TXT</PBtn></Card>
  </div>;
}

/* ── ROOT ────────────────────────────────────────────────────────── */
const TABS=[{id:"home",icon:"⌂",label:"ГЛАВНАЯ"},{id:"diag",icon:"⚙",label:"ДИАГНОЗ"},{id:"maintain",icon:"≡",label:"СЕРВИС"},{id:"finance",icon:"₽",label:"ФИНАНСЫ"},{id:"more",icon:"···",label:"ЕЩЁ"}];

export default function JarvisApp(){
  const [onboarded,setOnboarded]=usePersist("onboarded",false);
  const [name,setName]=usePersist("name","");
  const [car,setCar]=usePersist("car",{});
  const [services,setServices]=usePersist("services",DEF_SVC);
  const [diagHistory,setDiagHistory]=usePersist("diagHistory",[]);
  const [expenses,setExpenses]=usePersist("expenses",DEF_EXP);
  const [fuel,setFuel]=usePersist("fuel",DEF_FUEL);
  const [tab,setTab]=useState("home");
  const {toasts,show:toast}=useToast();
  const overdueCount=services.filter(s=>s.status==="overdue"||s.status==="warning").length;

  if(!onboarded)return <><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/><Onboarding onDone={(n,c)=>{setName(n);setCar(c);setOnboarded(true);}}/></>;

  const screens={
    home:<Dashboard name={name} car={car} services={services} diagHistory={diagHistory} expenses={expenses} fuel={fuel} setTab={setTab} toast={toast}/>,
    diag:<Diagnostics history={diagHistory} setHistory={setDiagHistory} car={car} toast={toast}/>,
    maintain:<Maintain services={services} setServices={setServices} car={car} setCar={setCar} toast={toast}/>,
    finance:<Finance expenses={expenses} setExpenses={setExpenses} fuel={fuel} setFuel={setFuel} car={car} toast={toast}/>,
    more:<More car={car} name={name} toast={toast} setCar={setCar} expenses={expenses} setExpenses={setExpenses} fuel={fuel} setFuel={setFuel}/>,
  };

  return <div style={{fontFamily:M,background:C.bg,minHeight:"100vh",display:"flex",flexDirection:"column",maxWidth:640,margin:"0 auto"}}>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <style>{`*{box-sizing:border-box}body{margin:0}input{-webkit-appearance:none}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    <Toasts toasts={toasts}/>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 18px",borderBottom:`1px solid ${C.border}`,background:C.bg2,position:"sticky",top:0,zIndex:50}}>
      <div onClick={()=>setTab("home")} style={{width:32,height:32,borderRadius:"50%",background:C.o,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",boxShadow:`0 0 12px ${C.o}50`}}><span style={{fontSize:15}}>⚙</span></div>
      <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:C.t,fontFamily:S,letterSpacing:-.3}}>JARVIS AUTO</div><div style={{fontSize:9,color:C.t2,letterSpacing:1.5,fontFamily:M}}>{car.make} {car.model} · {car.mileage?.toLocaleString("ru-RU")} км</div></div>
      <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:5,height:5,borderRadius:"50%",background:C.g,boxShadow:`0 0 6px ${C.g}`}}/><span style={{fontSize:8,color:C.g,fontFamily:M,letterSpacing:1}}>ONLINE</span></div>
    </div>
    {/* Content */}
    <div style={{flex:1,padding:"18px 16px 94px",overflowY:"auto"}}><div key={tab} style={{animation:"fadeUp .25s ease"}}>{screens[tab]||screens["home"]}</div></div>
    {/* Bottom nav */}
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:640,background:C.bg2,borderTop:`1px solid ${C.border}`,display:"flex",padding:"8px 0 18px",zIndex:40}}>
      {TABS.map(t=>{const active=tab===t.id;const badge=t.id==="maintain"?overdueCount:0;return <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",color:active?C.o:C.t2,transition:"color .15s",position:"relative",padding:"4px 0"}}>
        {active&&<div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",width:28,height:2,background:C.o,borderRadius:1}}/>}
        <span style={{fontSize:19,lineHeight:1}}>{t.icon}</span>
        <span style={{fontSize:8,letterSpacing:1,fontFamily:M}}>{t.label}</span>
        <Badge n={badge}/>
      </button>;})}
    </div>
  </div>;
}
