import type { Locale } from "@/i18n/config";

/**
 * Авторы платформы. Источники: биография Ж. Намозова («Tarjimai hol
 * J Namozov.doc») и краткая справка о Ш. Қудратхўже от заказчика; сведения
 * о регистрации модели — из глоссария (термин 57). На странице только
 * профессиональная информация: дат рождения и прочих личных данных нет.
 */
export interface AuthorSection {
  title: string;
  items: string[];
}

export interface Author {
  id: string;
  photo: string;
  name: string;
  /** Должность и степень — под именем. */
  roles: string[];
  /** Роль в создании платформы — одной фразой. */
  contribution: string;
  sections: AuthorSection[];
}

export interface AuthorsContent {
  intro: string;
  /** Сведения о регистрации модели MS-7. */
  registration: string;
  authors: Author[];
}

const PHOTO = {
  namozov: "/authors/namozov.jpg",
  qudratxoja: "/authors/qudratxoja.jpg",
};

const CONTENT: Record<Locale, AuthorsContent> = {
  uz: {
    intro:
      "MS-7: Saylov-Media модели Ўзбекистон журналистика ва оммавий коммуникациялар университети ва Жамшид Намозов томонидан ишлаб чиқилган. Модель рақамли оммавий ахборот воситаларининг сайлов жараёнларини ёритишдаги фаолиятини комплекс баҳолаш, мониторинг қилиш ва рейтинг асосида қиёслаш учун мўлжалланган.",
    registration:
      "Ўзбекистон Республикаси Адлия вазирлиги ҳузуридаги Интеллектуал мулк маркази томонидан 2026 йил 30 июлда 010589-сонли депонентлаш тўғрисидаги гувоҳнома берилган.",
    authors: [
      {
        id: "namozov",
        photo: PHOTO.namozov,
        name: "Жамшид Абдумўминович Намозов",
        roles: [
          "MS-7: Saylov-Media модели муаллифи",
          "Ўзбекистон журналистика ва оммавий коммуникациялар университети мустақил тадқиқотчиси",
        ],
        contribution:
          "MS-7 модели ва SMSI индексини ишлаб чиққан; платформа унинг диссертация тадқиқоти асосида яратилган.",
        sections: [
          {
            title: "Илмий тадқиқот",
            items: [
              "Диссертация мавзуси: «Ўзбекистонда сайлов жараёнларини давлат ва нодавлат оммавий ахборот воситаларида ёритилишида янгича ёндашув» (10.00.09 — Журналистика).",
              "Илмий раҳбар — сиёсий фанлар доктори, профессор Ш. Т. Қудратхўжа.",
              "Мавзу 2021 йил 29 июнда университет Кенгашида тасдиқланган; диссертация 2025 йил 24 сентябрда Тўғон ва Қудрат Эрназаровлар номидаги Жамоатчилик билан алоқалар кафедрасида муҳокамадан ўтган ва илмий семинарга тақдим этилган.",
              "Тадқиқот бўйича 10 та илмий иш чоп этилган, жумладан Олий аттестация комиссияси тавсия этган журналларда 8 та мақола (5 таси — импакт-факторли хорижий журналларда).",
              "2011 йилда «Ахборот коммуникацион технологиялари ва Интернет журналистикаси» ўқув қўлланмаси нашр этилган.",
            ],
          },
          {
            title: "Таълим",
            items: [
              "2008–2012 — Мирзо Улуғбек номидаги Ўзбекистон Миллий университети, журналистика факультети.",
              "2018–2020 — Ўзбекистон журналистика ва оммавий коммуникациялар университети, магистратура.",
            ],
          },
          {
            title: "Фаолияти",
            items: [
              "2007 — Денов АТР телеканали «Ахборот» дастури муҳаррири.",
              "2007–2009 — NTT телеканали журналисти, ижтимоий кўрсатувлар бўлими муҳаррири.",
              "2012–2015 — Ўзбекистон — Ҳиндистон дўстлик жамияти ижрочи директори.",
              "2012 йилдан — Халқаро кураш ассоциацияси матбуот котиби, медиа гуруҳи раҳбари.",
              "2016–2021 — Президент сайловлари ҳамда 2019 йилги Олий Мажлис Қонунчилик палатаси ва маҳаллий Кенгашлар депутатлари сайловини ўтказувчи Республика матбуот маркази.",
            ],
          },
          {
            title: "Мукофотлар",
            items: ["2009 — «Ўзбекистон белгиси» кўкрак нишони."],
          },
        ],
      },
      {
        id: "qudratxoja",
        photo: PHOTO.qudratxoja,
        name: "Шерзодхон Тожиддинхон ўғли Қудратхўжа",
        roles: [
          "Ўзбекистон журналистика ва оммавий коммуникациялар университети ректори",
          "Сиёсий фанлар доктори, профессор",
        ],
        contribution:
          "Тадқиқотнинг илмий раҳбари; модель унинг раҳбарлигидаги университетда ишлаб чиқилган.",
        sections: [
          {
            title: "Таълим",
            items: [
              "1991–1996 — ҳозирги Ўзбекистон Миллий университети, журналистика факультети.",
            ],
          },
          {
            title: "Фаолияти",
            items: [
              "Турли йилларда Ўзбекистон Миллий телерадиокомпанияси, Марказий сайлов комиссияси матбуот маркази, Президент матбуот хизмати ва Ўзбекистон Миллий университетида ишлаган.",
              "2005–2008 — Ўзбекистон Бош вазирининг матбуот котиби.",
              "2017–2022 — «Халқаро пресс-клуб» нодавлат нотижорат ташкилоти раиси.",
              "2018 йилдан — Ўзбекистон журналистика ва оммавий коммуникациялар университети ректори.",
              "2022 йил февралидан — Ўзбекистон электрон оммавий ахборот воситалари миллий ассоциацияси бошқарув раиси.",
            ],
          },
          {
            title: "Мукофотлар",
            items: [
              "2019 — «Олтин қалам» миллий мукофоти гран-при соҳиби, «Меҳнат шуҳрати» ордени.",
              "2020 — «Қорақалпоғистон Республикасида хизмат кўрсатган журналист» унвони.",
            ],
          },
        ],
      },
    ],
  },

  ru: {
    intro:
      "Модель MS-7: Saylov-Media разработана Университетом журналистики и массовых коммуникаций Узбекистана и Жамшидом Намозовым. Модель предназначена для комплексной оценки, мониторинга и рейтингового сравнения работы цифровых СМИ при освещении избирательных процессов.",
    registration:
      "Центром интеллектуальной собственности при Министерстве юстиции Республики Узбекистан 30 июля 2026 года выдано свидетельство о депонировании № 010589.",
    authors: [
      {
        id: "namozov",
        photo: PHOTO.namozov,
        name: "Жамшид Абдумуминович Намозов",
        roles: [
          "Автор модели MS-7: Saylov-Media",
          "Независимый исследователь Университета журналистики и массовых коммуникаций Узбекистана",
        ],
        contribution:
          "Разработал модель MS-7 и индекс SMSI; платформа создана на основе его диссертационного исследования.",
        sections: [
          {
            title: "Научное исследование",
            items: [
              "Тема диссертации: «Новый подход к освещению избирательных процессов в государственных и негосударственных СМИ Узбекистана» (10.00.09 — Журналистика).",
              "Научный руководитель — доктор политических наук, профессор Ш. Т. Кудратходжа.",
              "Тема утверждена Советом университета 29 июня 2021 года; диссертация обсуждена на кафедре связей с общественностью имени Тогона и Кудрата Эрназаровых 24 сентября 2025 года и представлена на научный семинар.",
              "По теме исследования опубликовано 10 научных работ, в том числе 8 статей в журналах, рекомендованных Высшей аттестационной комиссией (5 из них — в зарубежных журналах с импакт-фактором).",
              "В 2011 году издано учебное пособие «Информационно-коммуникационные технологии и интернет-журналистика».",
            ],
          },
          {
            title: "Образование",
            items: [
              "2008–2012 — Национальный университет Узбекистана имени Мирзо Улугбека, факультет журналистики.",
              "2018–2020 — Университет журналистики и массовых коммуникаций Узбекистана, магистратура.",
            ],
          },
          {
            title: "Профессиональный путь",
            items: [
              "2007 — редактор информационной программы телеканала «Денов АТР».",
              "2007–2009 — журналист, редактор отдела социальных программ телеканала NTT.",
              "2012–2015 — исполнительный директор Общества дружбы «Узбекистан — Индия».",
              "С 2012 года — пресс-секретарь, руководитель медиагруппы Международной ассоциации кураша.",
              "2016–2021 — Республиканский пресс-центр по выборам Президента, а также выборам 2019 года в Законодательную палату Олий Мажлиса и местные Кенгаши.",
            ],
          },
          {
            title: "Награды",
            items: ["2009 — нагрудный знак «Ўзбекистон белгиси»."],
          },
        ],
      },
      {
        id: "qudratxoja",
        photo: PHOTO.qudratxoja,
        name: "Шерзодхон Тожиддинхон угли Кудратходжа",
        roles: [
          "Ректор Университета журналистики и массовых коммуникаций Узбекистана",
          "Доктор политических наук, профессор",
        ],
        contribution:
          "Научный руководитель исследования; модель разработана в возглавляемом им университете.",
        sections: [
          {
            title: "Образование",
            items: [
              "1991–1996 — факультет журналистики нынешнего Национального университета Узбекистана.",
            ],
          },
          {
            title: "Профессиональный путь",
            items: [
              "В разные годы работал в Национальной телерадиокомпании Узбекистана, пресс-центре Центральной избирательной комиссии, пресс-службе Президента и Национальном университете Узбекистана.",
              "2005–2008 — пресс-секретарь Премьер-министра Узбекистана.",
              "2017–2022 — председатель ННО «Международный пресс-клуб».",
              "С 2018 года — ректор Университета журналистики и массовых коммуникаций Узбекистана.",
              "С февраля 2022 года — председатель правления Национальной ассоциации электронных СМИ Узбекистана.",
            ],
          },
          {
            title: "Награды",
            items: [
              "2019 — обладатель гран-при национальной премии «Олтин калам», орден «Меҳнат шуҳрати».",
              "2020 — звание «Заслуженный журналист Республики Каракалпакстан».",
            ],
          },
        ],
      },
    ],
  },

  en: {
    intro:
      "The MS-7: Saylov-Media model was developed by the University of Journalism and Mass Communications of Uzbekistan and Jamshid Namozov. It is designed for comprehensive assessment, monitoring and ranking-based comparison of how digital media cover election processes.",
    registration:
      "On 30 July 2026 the Intellectual Property Centre under the Ministry of Justice of the Republic of Uzbekistan issued deposit certificate No. 010589.",
    authors: [
      {
        id: "namozov",
        photo: PHOTO.namozov,
        name: "Jamshid Abdumuminovich Namozov",
        roles: [
          "Author of the MS-7: Saylov-Media model",
          "Independent researcher, University of Journalism and Mass Communications of Uzbekistan",
        ],
        contribution:
          "Developed the MS-7 model and the SMSI index; the platform is built on his dissertation research.",
        sections: [
          {
            title: "Research",
            items: [
              "Dissertation: “A new approach to covering election processes in state and non-state media of Uzbekistan” (10.00.09 — Journalism).",
              "Academic supervisor: Prof. Sh. T. Qudratxoja, Doctor of Political Sciences.",
              "The topic was approved by the University Council on 29 June 2021; the dissertation was discussed at the Tog‘on and Qudrat Ernazarov Department of Public Relations on 24 September 2025 and submitted to the academic seminar.",
              "10 research papers on the topic, including 8 articles in journals recommended by the Higher Attestation Commission (5 of them in international journals with an impact factor).",
              "2011: textbook “Information and Communication Technologies and Internet Journalism”.",
            ],
          },
          {
            title: "Education",
            items: [
              "2008–2012 — Faculty of Journalism, National University of Uzbekistan named after Mirzo Ulugbek.",
              "2018–2020 — Master’s programme, University of Journalism and Mass Communications of Uzbekistan.",
            ],
          },
          {
            title: "Career",
            items: [
              "2007 — editor of the news programme, Denov ATR TV channel.",
              "2007–2009 — journalist and editor of the social programmes department, NTT TV channel.",
              "2012–2015 — executive director, Uzbekistan–India Friendship Society.",
              "Since 2012 — press secretary and head of the media group, International Kurash Association.",
              "2016–2021 — Republican Press Centre for the presidential elections and the 2019 elections to the Legislative Chamber of the Oliy Majlis and local councils.",
            ],
          },
          {
            title: "Awards",
            items: ["2009 — “O‘zbekiston belgisi” badge of honour."],
          },
        ],
      },
      {
        id: "qudratxoja",
        photo: PHOTO.qudratxoja,
        name: "Sherzodxon Tojiddinxon o‘g‘li Qudratxoja",
        roles: [
          "Rector, University of Journalism and Mass Communications of Uzbekistan",
          "Doctor of Political Sciences, Professor",
        ],
        contribution:
          "Academic supervisor of the research; the model was developed at the university he leads.",
        sections: [
          {
            title: "Education",
            items: [
              "1991–1996 — Faculty of Journalism of what is now the National University of Uzbekistan.",
            ],
          },
          {
            title: "Career",
            items: [
              "Worked at the National TV and Radio Company of Uzbekistan, the press centre of the Central Election Commission, the Presidential Press Service and the National University of Uzbekistan.",
              "2005–2008 — press secretary to the Prime Minister of Uzbekistan.",
              "2017–2022 — chairman of the International Press Club NGO.",
              "Since 2018 — Rector of the University of Journalism and Mass Communications of Uzbekistan.",
              "Since February 2022 — chairman of the board, National Association of Electronic Mass Media of Uzbekistan.",
            ],
          },
          {
            title: "Awards",
            items: [
              "2019 — Grand Prix of the “Oltin Qalam” national award; “Mehnat Shuhrati” order.",
              "2020 — title of Honoured Journalist of the Republic of Karakalpakstan.",
            ],
          },
        ],
      },
    ],
  },
};

/** Порядок авторов на странице: первым — ректор, вторым — Ж. Намозов. */
const ORDER = ["qudratxoja", "namozov"];

export const AUTHORS = Object.fromEntries(
  Object.entries(CONTENT).map(([locale, content]) => [
    locale,
    {
      ...content,
      authors: [...content.authors].sort(
        (a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id),
      ),
    },
  ]),
) as Record<Locale, AuthorsContent>;
