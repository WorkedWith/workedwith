-- Seeded outreach moves from day 0/21/42/56 to a tighter run: day 0, 3, 7, 14.
-- Rename the reminder columns so their names no longer encode the old day numbers.
alter table public.seeded_profiles rename column reminder_21_sent_at to reminder_1_sent_at;
alter table public.seeded_profiles rename column reminder_42_sent_at to reminder_2_sent_at;
alter table public.seeded_profiles rename column reminder_56_sent_at to reminder_3_sent_at;
