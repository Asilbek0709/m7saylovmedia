-- =====================================================================
--  MS-7: стартовый справочник СМИ по регионам
--  Выполнить в Supabase → SQL Editor (после 008-admin.sql). Данные, не схема.
--
--  62 изданий: по 14 регионам и запас национальных СМИ.
--  Список собран 11.11.2026 из открытых источников (Википедия, каталоги
--  search.uz и borku.uz, сайты самих изданий). Подробности, статус проверки
--  каждого сайта и пометки «уточнить» — в файле «СМИ Узбекистана по регионам.xlsx».
--
--  Это черновик для специалиста: он проверяет список, лишнее удаляет на
--  странице «Издания», форму собственности и регион правит там же.
--
--  Повторный запуск ничего не дублирует: on conflict (slug) do nothing.
--  Уже заведённые издания (например, Pressa.uz) не затрагиваются.
-- =====================================================================

insert into public.media_outlets (name, slug, website, ownership, region) values
  ('Kun.uz', 'kun-uz', 'kun.uz', 'nodavlat', 'Тошкент'),
  ('Daryo.uz', 'daryo-uz', 'daryo.uz', 'nodavlat', 'Тошкент'),
  ('Gazeta.uz', 'gazeta-uz', 'gazeta.uz', 'nodavlat', 'Тошкент'),
  ('UzA — O‘zbekiston Milliy axborot agentligi', 'uza-uz', 'uza.uz', 'davlat', 'Тошкент'),
  ('Podrobno.uz', 'podrobno-uz', 'podrobno.uz', 'nodavlat', 'Тошкент'),
  ('Qalampir.uz', 'qalampir-uz', 'qalampir.uz', 'nodavlat', 'Тошкент'),
  ('Xabar.uz', 'xabar-uz', 'xabar.uz', 'davlat', 'Тошкент'),
  ('Yangi O‘zbekiston (YuzNews)', 'yuz-uz', 'yuz.uz', 'davlat', 'Тошкент'),
  ('UzNews.uz', 'uznews-uz', 'uznews.uz', 'nodavlat', 'Тошкент'),
  ('Kursiv Uzbekistan', 'uz-kursiv-media', 'uz.kursiv.media', 'nodavlat', 'Тошкент'),
  ('Toshkent haqiqati / Ташкентская правда', 'toshkent-haqiqati', null, 'davlat', 'Тошкент вилояти'),
  ('Toshkent viloyati TV', 'toshkent-viloyati-tv', null, 'davlat', 'Тошкент вилояти'),
  ('Andijonnoma', 'andijonnoma-uz', 'andijonnoma.uz', 'davlat', 'Андижон'),
  ('Andijon24.uz', 'andijon24-uz', 'andijon24.uz', 'nodavlat', 'Андижон'),
  ('Andijon TV', 'andijon-tv', null, 'davlat', 'Андижон'),
  ('Buxoronoma', 'buxoronoma', null, 'davlat', 'Бухоро'),
  ('Бухарский вестник', 'outlet-zpig7s', null, 'davlat', 'Бухоро'),
  ('Buxoro TV', 'buxoro-tv', null, 'davlat', 'Бухоро'),
  ('Istiqlol TV', 'istiqlol-tv', null, 'nodavlat', 'Бухоро'),
  ('Bukhara.uz', 'bukhara-uz', 'bukhara.uz', 'nodavlat', 'Бухоро'),
  ('Farg‘ona24', 'fargona24-uz', 'fargona24.uz', 'nodavlat', 'Фарғона'),
  ('Farg‘ona haqiqati', 'farg-ona-haqiqati', null, 'davlat', 'Фарғона'),
  ('Farg‘ona TV', 'farg-ona-tv', null, 'davlat', 'Фарғона'),
  ('Ruxsor TV', 'ruxsor-tv', null, 'nodavlat', 'Фарғона'),
  ('Muloqot TV (Qo‘qon)', 'muloqot-tv', null, 'nodavlat', 'Фарғона'),
  ('Marg‘ilon TV', 'marg-ilon-tv', null, 'nodavlat', 'Фарғона'),
  ('Jizzax haqiqati / Джизакская правда', 'jizzaxnews-uz', 'jizzaxnews.uz', 'davlat', 'Жиззах'),
  ('Jizzax TV (MTRK)', 'jizzax-tv', null, 'davlat', 'Жиззах'),
  ('Jizzax TV (xususiy)', 'jizzax-tv-2', null, 'nodavlat', 'Жиззах'),
  ('Namangan24.uz', 'namangan24-uz', 'namangan24.uz', 'nodavlat', 'Наманган'),
  ('Namangan haqiqati / Наманганская правда', 'namangan-haqiqati', null, 'davlat', 'Наманган'),
  ('Namangan TV', 'namangan-tv', null, 'davlat', 'Наманган'),
  ('Navoiy TV (MTRK)', 'navoiy-tv', null, 'davlat', 'Навоий'),
  ('Navoiy TV (xususiy)', 'navoiy-tv-2', null, 'nodavlat', 'Навоий'),
  ('Qashqadaryo (gazeta)', 'qashqadaryogz-uz', 'qashqadaryogz.uz', 'davlat', 'Қашқадарё'),
  ('Qashqadaryo TV', 'qashqadaryo-tv', null, 'davlat', 'Қашқадарё'),
  ('Nasaf TV', 'nasaf-tv', null, 'nodavlat', 'Қашқадарё'),
  ('Samarqand (gazeta)', 'samarkandnews-uz', 'samarkandnews.uz', 'davlat', 'Самарқанд'),
  ('Zarafshon (ZarNews)', 'zarnews-uz', 'zarnews.uz', 'davlat', 'Самарқанд'),
  ('Самаркандский вестник', 'sv-zarnews-uz', 'sv.zarnews.uz', 'davlat', 'Самарқанд'),
  ('STV Samarqand', 'stv-uz', 'stv.uz', 'nodavlat', 'Самарқанд'),
  ('Samarqand TV', 'samarqand-tv', null, 'davlat', 'Самарқанд'),
  ('Surxon tongi / Заря Сурхана', 'surxontongi-uz', 'surxontongi.uz', 'davlat', 'Сурхондарё'),
  ('Surxondaryo TV', 'surxondaryo-tv', null, 'davlat', 'Сурхондарё'),
  ('Ishonch TV (Termiz)', 'ishonch-tv', null, 'nodavlat', 'Сурхондарё'),
  ('Yangi Sirdaryo (sobiq «Sirdaryo haqiqati»)', 'sirdaryo24-uz', 'sirdaryo24.uz', 'davlat', 'Сирдарё'),
  ('Sirdaryo TV', 'sirdaryo-tv', null, 'davlat', 'Сирдарё'),
  ('Xorazm haqiqati / Хорезмская правда', 'xorazm-haqiqati', null, 'davlat', 'Хоразм'),
  ('Xorazm TV', 'xorazm-tv', null, 'davlat', 'Хоразм'),
  ('Qoraqalpog‘iston axborot agentligi', 'kknews-uz', 'kknews.uz', 'davlat', 'Қорақалпоғистон'),
  ('Erkin Qaraqalpaqstan', 'erkin-qaraqalpaqstan', null, 'davlat', 'Қорақалпоғистон'),
  ('Qaraqalpaqstan TV', 'qaraqalpaqstan-tv', null, 'davlat', 'Қорақалпоғистон'),
  ('Jaslar TV (Nukus)', 'jaslar-tv', null, 'nodavlat', 'Қорақалпоғистон'),
  ('Ellikqala TV', 'ellikqala-tv', null, 'nodavlat', 'Қорақалпоғистон'),
  ('Anhor.uz', 'anhor-uz', 'anhor.uz', 'nodavlat', 'Тошкент'),
  ('Repost.uz', 'repost-uz', 'repost.uz', 'nodavlat', 'Тошкент'),
  ('Spot.uz', 'spot-uz', 'spot.uz', 'nodavlat', 'Тошкент'),
  ('Nuz.uz', 'nuz-uz', 'nuz.uz', 'nodavlat', 'Тошкент'),
  ('Review.uz', 'review-uz', 'review.uz', 'nodavlat', 'Тошкент'),
  ('Upl.uz', 'upl-uz', 'upl.uz', 'nodavlat', 'Тошкент'),
  ('Zamin.uz', 'zamin-uz', 'zamin.uz', 'nodavlat', 'Тошкент'),
  ('Darakchi.uz', 'darakchi-uz', 'darakchi.uz', 'nodavlat', 'Тошкент')
on conflict (slug) do nothing;

-- Проверка: сколько изданий в каждом регионе.
--   select region, count(*) from public.media_outlets group by region order by region;
