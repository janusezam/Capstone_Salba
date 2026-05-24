db = db.getSiblingDB('capstoneDB');
db.users.updateOne(
  { email: 'sagayocbutch@gmail.com' },
  { $set: { password: '$2b$10$kbYDrmZi7QdCj.aKvxNKcepMJYGe1IkCUhCvJqNajBVLgjYj2kz.K' } }
);
print('✓ Password updated for sagayocbutch@gmail.com');
db.users.findOne({ email: 'sagayocbutch@gmail.com' });
