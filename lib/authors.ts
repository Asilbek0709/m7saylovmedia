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
      "MS-7: Saylov-Media modeli Oʻzbekiston jurnalistika va ommaviy kommunikatsiyalar universiteti va Jamshid Namozov tomonidan ishlab chiqilgan. Model raqamli ommaviy axborot vositalarining saylov jarayonlarini yoritishdagi faoliyatini kompleks baholash, monitoring qilish va reyting asosida qiyoslash uchun moʻljallangan.",
    registration:
      "Oʻzbekiston Respublikasi Adliya vazirligi huzuridagi Intellektual mulk markazi tomonidan 2026 yil 30 iyulda 010589-sonli deponentlash toʻgʻrisidagi guvohnoma berilgan.",
    authors: [
      {
        id: "namozov",
        photo: PHOTO.namozov,
        name: "Jamshid Abdumoʻminovich Namozov",
        roles: [
          "MS-7: Saylov-Media modeli muallifi",
          "Oʻzbekiston jurnalistika va ommaviy kommunikatsiyalar universiteti mustaqil tadqiqotchisi",
        ],
        contribution:
          "MS-7 modeli va SMSI indeksini ishlab chiqqan; platforma uning dissertatsiya tadqiqoti asosida yaratilgan.",
        sections: [
          {
            title: "Ilmiy tadqiqot",
            items: [
              "Dissertatsiya mavzusi: «Oʻzbekistonda saylov jarayonlarini davlat va nodavlat ommaviy axborot vositalarida yoritilishida yangicha yondashuv» (10.00.09 — Jurnalistika).",
              "Ilmiy rahbar — siyosiy fanlar doktori, professor Sh. T. Qudratxoʻja.",
              "Mavzu 2021 yil 29 iyunda universitet Kengashida tasdiqlangan; dissertatsiya 2025 yil 24 sentyabrda Toʻgʻon va Qudrat Ernazarovlar nomidagi Jamoatchilik bilan aloqalar kafedrasida muhokamadan oʻtgan va ilmiy seminarga taqdim etilgan.",
              "Tadqiqot boʻyicha 10 ta ilmiy ish chop etilgan, jumladan Oliy attestatsiya komissiyasi tavsiya etgan jurnallarda 8 ta maqola (5 tasi — impakt-faktorli xorijiy jurnallarda).",
              "2011 yilda «Axborot kommunikatsion texnologiyalari va Internet jurnalistikasi» oʻquv qoʻllanmasi nashr etilgan.",
            ],
          },
          {
            title: "Taʼlim",
            items: [
              "2008–2012 — Mirzo Ulugʻbek nomidagi Oʻzbekiston Milliy universiteti, jurnalistika fakulteti.",
              "2018–2020 — Oʻzbekiston jurnalistika va ommaviy kommunikatsiyalar universiteti, magistratura.",
            ],
          },
          {
            title: "Faoliyati",
            items: [
              "2007 — Denov ATR telekanali «Axborot» dasturi muharriri.",
              "2007–2009 — NTT telekanali jurnalisti, ijtimoiy koʻrsatuvlar boʻlimi muharriri.",
              "2012–2015 — Oʻzbekiston — Hindiston doʻstlik jamiyati ijrochi direktori.",
              "2012 yildan — Xalqaro kurash assotsiatsiyasi matbuot kotibi, media guruhi rahbari.",
              "2016–2021 — Prezident saylovlari hamda 2019 yilgi Oliy Majlis Qonunchilik palatasi va mahalliy Kengashlar deputatlari saylovini oʻtkazuvchi Respublika matbuot markazi.",
            ],
          },
          {
            title: "Mukofotlar",
            items: ["2009 — «Oʻzbekiston belgisi» koʻkrak nishoni."],
          },
        ],
      },
      {
        id: "qudratxoja",
        photo: PHOTO.qudratxoja,
        name: "Sherzodxon Tojiddinxon oʻgʻli Qudratxoʻja",
        roles: [
          "Oʻzbekiston jurnalistika va ommaviy kommunikatsiyalar universiteti rektori",
          "Siyosiy fanlar doktori, professor",
        ],
        contribution:
          "Tadqiqotning ilmiy rahbari; model uning rahbarligidagi universitetda ishlab chiqilgan.",
        sections: [
          {
            title: "Taʼlim",
            items: [
              "1991–1996 — hozirgi Oʻzbekiston Milliy universiteti, jurnalistika fakulteti.",
            ],
          },
          {
            title: "Faoliyati",
            items: [
              "Turli yillarda Oʻzbekiston Milliy teleradiokompaniyasi, Markaziy saylov komissiyasi matbuot markazi, Prezident matbuot xizmati va Oʻzbekiston Milliy universitetida ishlagan.",
              "2005–2008 — Oʻzbekiston Bosh vazirining matbuot kotibi.",
              "2017–2022 — «Xalqaro press-klub» nodavlat notijorat tashkiloti raisi.",
              "2018 yildan — Oʻzbekiston jurnalistika va ommaviy kommunikatsiyalar universiteti rektori.",
              "2022 yil fevralidan — Oʻzbekiston elektron ommaviy axborot vositalari milliy assotsiatsiyasi boshqaruv raisi.",
            ],
          },
          {
            title: "Mukofotlar",
            items: [
              "2019 — «Oltin qalam» milliy mukofoti gran-pri sohibi, «Mehnat shuhrati» ordeni.",
              "2020 — «Qoraqalpogʻiston Respublikasida xizmat koʻrsatgan jurnalist» unvoni.",
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
