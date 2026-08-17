
delete from public.evaluations
where evaluator = 'ДЕМО (иллюстративные данные)'
   or period = 'Сайлов-2026, 1-босқич';

delete from public.media_outlets
where slug in (
  'kun-uz', 'gazeta-uz', 'daryo-uz', 'uza', 'qalampir-uz',
  'xabar-uz', 'repost-uz', 'podrobno-uz', 'yuz-uz', 'anhor-uz'
)
and not exists (

  select 1 from public.evaluations e where e.outlet_id = media_outlets.id
);


select
  (select count(*) from public.media_outlets) as outlets,
  (select count(*) from public.evaluations)   as evaluations;
