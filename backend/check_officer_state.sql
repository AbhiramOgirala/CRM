-- Check officer state_id assignment
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.department_id,
  d.name as department_name,
  u.state_id,
  s.name as state_name,
  u.district_id,
  dist.name as district_name
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN states s ON u.state_id = s.id
LEFT JOIN districts dist ON u.district_id = dist.id
WHERE u.email = 'ae.djb.east@delhi.gov.in';

-- Check complaints for DJB department
SELECT 
  c.id,
  c.ticket_number,
  c.title,
  c.status,
  c.department_id,
  d.name as department_name,
  c.state_id,
  s.name as state_name,
  c.district_id,
  dist.name as district_name
FROM complaints c
LEFT JOIN departments d ON c.department_id = d.id
LEFT JOIN states s ON c.state_id = s.id
LEFT JOIN districts dist ON c.district_id = dist.id
WHERE d.code = 'DJB'
LIMIT 10;
