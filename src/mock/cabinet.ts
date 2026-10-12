import { CabinetPayload, RepairTicket, ChatAnswer } from "../types/cabinet";

export const MOCK_CABINET_PAYLOAD: CabinetPayload = {
  ok: true,
  customer: {
    name: "Алексей Смирнов",
    logged_in: true,
  },
  summary: {
    free_repairs: 1, // Rule 2: 1 free repair available
    bikes_count: 1,
    active_repairs: 1,
  },
  bikes: [
    {
      bike_id: 101,
      nickname: "Основной Scott",
      make: "Scott",
      model: "Scale 970",
      year_window: "2021",
      photo_url: "",
      confirmed: [
        { label: "Задний переключатель", value: "SRAM SX Eagle 12-speed" },
        { label: "Манетка", value: "SRAM SX Eagle Trigger" },
        { label: "Кассета", value: "SRAM PG-1210 Eagle 11-50T" },
        { label: "Цепь", value: "SRAM SX Eagle" },
        { label: "Тормоза", value: "Shimano MT200 Hydraulic Disc" },
        { label: "Роторы", value: "Shimano SM-RT10 CL 180/160 мм" },
        { label: "Размер колес", value: "29 дюймов" },
        { label: "Кареточный узел", value: "SRAM DUB PF 92 MTB" },
      ],
      unknown: ["Точный износ звезд системы", "Серийный номер рамы"],
      repairs_count: 2,
      last_service: "10.10.2026",
    },
  ],
  history: [
    {
      id: "hist-01",
      date: "2026-10-10",
      what: "Диагностика: шум и проскакивание цепи на 7-й передаче",
      kind: "repair",
      amount_rub: 150,
      status: "processing",
      ref: { job_id: 501 },
    },
    {
      id: "hist-02",
      date: "2026-10-09",
      what: "Цепь SRAM NX Eagle 12-speed 126 звеньев",
      kind: "purchase",
      amount_rub: 3450,
      status: "delivered",
      ref: { order_id: 4108, product_id: 201 },
    },
    {
      id: "hist-03",
      date: "2026-10-08",
      what: "Ролик заднего переключателя SRAM Eagle 12T/14T",
      kind: "recommendation",
      amount_rub: null, // null -> em dash
      status: "recommended",
      ref: { job_id: 501, product_id: 202 },
    },
    {
      id: "hist-04",
      date: "2026-09-25",
      what: "Колодки тормозные органические B05S",
      kind: "purchase",
      amount_rub: 1100,
      status: "awaiting_payment", // At least one order awaiting verification / payment
      ref: { order_id: 4085, product_id: 203 },
    },
    {
      id: "hist-05",
      date: "2026-09-12",
      what: "Возврат: замок цепи KMC MissingLink 11S (ошибочный артикул)",
      kind: "return",
      amount_rub: 450,
      status: "returned",
      ref: { order_id: 3990, product_id: 204 },
    },
    {
      id: "hist-06",
      date: "2026-08-30",
      what: "Регулировка натяжения троса и настройка переключателя",
      kind: "repair",
      amount_rub: 0,
      status: "delivered",
      ref: { job_id: 480 },
    },
  ],
  tickets: [
    {
      job_id: 501,
      created_at: "2026-10-10T14:20:00Z",
      status: "processing",
      bike_id: 101,
      symptom: "Проскакивает цепь на 7-й передаче под нагрузкой в подъем",
      causes: [
        { code: "CHAIN_STRETCH", label: "Растяжение цепи выше допустимой нормы 0.75%", confidence: 0.92 },
        { code: "B_TENSION_OUT", label: "Неправильный зазор B-tension между верхним роликом и кассетой", confidence: 0.84 },
        { code: "CABLE_SLACK", label: "Ослабление натяжения троса переключателя", confidence: 0.78 },
        { code: "HANGER_BENT", label: "Незначительное искривление петуха (держателя переключателя)", confidence: 0.71 },
      ],
      selected_cause_code: "CHAIN_STRETCH",
      plan_text: "Замена изношенной цепи на совместимую 12-скоростную SRAM Eagle с проверкой износа кассеты и финальной регулировкой натяжения.",
      steps: [
        {
          index: 1,
          title: "Проверка калибром",
          instruction: "Вставьте калибр цепи стороной 0.75%. Если калибр проваливается полностью — цепь подлежит обязательной замене.",
          image_url: "",
        },
        {
          index: 2,
          title: "Снятие старой цепи",
          instruction: "Найдите замок PowerLock, сожмите пины клещами для замка и аккуратно снимите цепь с роликов переключателя.",
          image_url: "",
        },
        {
          index: 3,
          title: "Подгонка длины новой цепи",
          instruction: "Проложите новую цепь вокруг большой звезды кассеты и передней звезды без переключателя, добавьте 2 полных звена (4 полузвена) и укоротите выжимкой.",
          image_url: "",
        },
        {
          index: 4,
          title: "Установка и фиксация замка",
          instruction: "Проденьте цепь через лапку переключателя, установите новый замок PowerLock стрелкой по направлению вращения и защелкните рывком шатуна с зажатым задним тормозом.",
          image_url: "",
        },
        {
          index: 5,
          title: "Проверка переключения",
          instruction: "Прокрутите педали и переключите все передачи снизу вверх. Убедитесь в отсутствии посторонних звуков и задержек.",
          image_url: "",
        },
      ],
      media: [
        {
          id: 301,
          kind: "video",
          url: "",
          ts: "2026-10-10 14:21",
        },
        {
          id: 302,
          kind: "photo",
          url: "",
          ts: "2026-10-10 14:25",
        },
        {
          id: 303,
          kind: "photo",
          url: "",
          ts: "2026-10-10 14:32",
        },
      ],
      parts: [
        {
          product_id: 201,
          name: "Цепь SRAM NX Eagle 12-speed 126 звеньев",
          state: "purchased", // purchased recommendation
          fit_state: "confirmed",
          price_rub: 3450,
          order_id: 4108,
        },
        {
          product_id: 202,
          name: "Ролики заднего переключателя SRAM Eagle 12T/14T",
          state: "recommended", // recommendation NOT purchased
          fit_state: "confirmed",
          price_rub: 1890,
        },
        {
          product_id: 203,
          name: "Кассета SRAM PG-1230 NX Eagle 11-50T",
          state: "viewed",
          fit_state: "compatible_unverified",
          price_rub: null, // null because not confirmed
        },
      ],
      verification: {
        result: "fit", // Demonstrates "Подошла"
        decided_at: "2026-10-10 16:45",
        findings: "Проверено веломехаником hi5.bike: цепь SRAM NX Eagle 12-speed полностью совместима с кассетой PG-1210 и переключателем SX Eagle вашего Scott Scale 970.",
      },
      events: [
        { ts: "2026-10-10 14:20", label: "Диагностика начата в приложении" },
        { ts: "2026-10-10 14:22", label: "Видео поломки загружено и обработано" },
        { ts: "2026-10-10 14:25", label: "Определена причина: растяжение цепи (92%)" },
        { ts: "2026-10-10 14:30", label: "Рекомендована совместимая цепь SRAM NX Eagle" },
        { ts: "2026-10-10 16:45", label: "Механик hi5.bike подтвердил совместимость запчасти: Подошла" },
      ],
    },
    {
      job_id: 480,
      created_at: "2026-08-30T10:15:00Z",
      status: "delivered",
      bike_id: 101,
      symptom: "Периодический сброс цепи на кочках",
      causes: [
        { code: "CHAIN_SLACK", label: "Ослабление фрикционной муфты переключателя", confidence: 0.89 },
      ],
      selected_cause_code: "CHAIN_SLACK",
      plan_text: "Регулировка преднатяга муфты Type 3 переключателя SRAM.",
      steps: [
        { index: 1, title: "Проверка демпфера", instruction: "Проверьте сопротивление лапки переключателя движению вперед." },
        { index: 2, title: "Регулировка упора", instruction: "Подтяните регулировочный винт муфты на 1/4 оборота." },
      ],
      media: [],
      parts: [],
      verification: {
        result: "insufficient_evidence", // Demonstrates "Нужны дополнительные доказательства"
        decided_at: "2026-08-30 11:10",
        findings: "На предоставленном видео не видна работа лапки переключателя в динамике. Требуется видео сбоку при тряске.",
      },
      events: [
        { ts: "2026-08-30 10:15", label: "Диагностика зарегистрирована" },
        { ts: "2026-08-30 11:10", label: "Запрос дополнительного видео" },
        { ts: "2026-08-30 12:00", label: "Ремонт завершён успешно" },
      ],
    },
  ],
};

export const MOCK_CHAT_ANSWERS: Record<string, ChatAnswer> = {
  default: {
    ok: true,
    answer: "Я Андрей, веломеханик hi5.bike. В вашем кабинете зафиксирован Scott Scale 970 (2021) с 12-скоростной трансмиссией SRAM Eagle. Чем могу помочь по текущему ремонту или запчастям?",
    refs: [{ kind: "bike", id: 101 }],
  },
  цепь: {
    ok: true,
    answer: "По вашему Scott Scale 970 диагностирован износ цепи. Рекомендована и проверена цепь SRAM NX Eagle 12-speed (заказ #4108). Длина новой цепи должна быть подогнана на 2 звена больше обхвата больших звезд.",
    refs: [{ kind: "job", id: 501 }, { kind: "order", id: 4108 }],
  },
  ремонт: {
    ok: true,
    answer: "У вас активен 1 бесплатный ремонт, начисленный за покупку запчастей в hi5.bike. Вы можете запустить его в любой момент кнопкой «Начать новый ремонт».",
    refs: [{ kind: "entitlement", id: 1 }],
  },
  заказ: {
    ok: true,
    answer: "Ваш заказ #4108 (цепь SRAM NX Eagle, 3 450 ₽) успешно доставлен. Заказ #4085 (тормозные колодки B05S, 1 100 ₽) ожидает подтверждения оплаты.",
    refs: [{ kind: "order", id: 4108 }, { kind: "order", id: 4085 }],
  },
};
