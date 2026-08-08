-- =====================================================================
--  MS-7: удаление демонстрационных данных
--
--  В конце schema.sql лежит иллюстративный набор: 10 реальных изданий с
--  ВЫДУМАННЫМИ баллами. Он нужен, чтобы интерфейс не выглядел пустым при
--  первом запуске, и НЕ является результатом мониторинга.
--
--  Выполните это ПЕРЕД внесением настоящих данных, иначе выдуманные баллы
--  смешаются с реальными и рейтинг будет недостоверным.
-- =====================================================================

-- Сначала оценки (внешний ключ), затем сами издания.
delete from public.evaluations
where evaluator = 'ДЕМО (иллюстративные данные)'
   or period = 'Сайлов-2026, 1-босқич';

delete from public.media_outlets
where slug in (
  'kun-uz', 'gazeta-uz', 'daryo-uz', 'uza', 'qalampir-uz',
  'xabar-uz', 'repost-uz', 'podrobno-uz', 'yuz-uz', 'anhor-uz'
)
and not exists (
  -- страховка: если по изданию уже есть настоящая оценка, издание оставляем
  select 1 from public.evaluations e where e.outlet_id = media_outlets.id
);

-- Проверка: обе цифры должны стать нулями (или отражать только ваши данные).
select
  (select count(*) from public.media_outlets) as outlets,
  (select count(*) from public.evaluations)   as evaluations;
