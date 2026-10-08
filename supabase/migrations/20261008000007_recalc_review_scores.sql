-- One off: rebuild the headline score and review count for every profile
-- from the reviews that are actually published, so cached numbers cannot drift.
UPDATE trade_profiles tp
SET average_rating = r.avg_rating,
    total_reviews  = r.review_count
FROM (
  SELECT reviewee_id,
         ROUND(AVG(overall_rating)::numeric, 1) AS avg_rating,
         COUNT(*)::int AS review_count
  FROM reviews
  WHERE reviewee_type = 'trade' AND is_visible = true
  GROUP BY reviewee_id
) r
WHERE tp.user_id = r.reviewee_id;

UPDATE client_profiles cp
SET average_rating            = r.avg_rating,
    total_reviews             = r.review_count,
    payment_reliability_score = r.pay,
    communication_score       = r.comm,
    scope_clarity_score       = r.scope,
    red_flag_count            = r.flags
FROM (
  SELECT reviewee_id,
         ROUND(AVG(overall_rating)::numeric, 1)  AS avg_rating,
         COUNT(*)::int                           AS review_count,
         ROUND(AVG(payment_score)::numeric, 1)   AS pay,
         ROUND(AVG(communication_score)::numeric, 1) AS comm,
         ROUND(AVG(scope_clarity_score)::numeric, 1) AS scope,
         COUNT(*) FILTER (WHERE red_flag)::int   AS flags
  FROM reviews
  WHERE reviewee_type = 'client' AND is_visible = true
  GROUP BY reviewee_id
) r
WHERE cp.user_id = r.reviewee_id;
