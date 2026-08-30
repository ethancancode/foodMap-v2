import jwt from 'jsonwebtoken';

export function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'foodmap_super_secret_jwt_key_2025';
  return jwt.sign(
    {
      id: user._id || user.id,
      phone: user.phone,
      role: user.role,
      name: user.name
    },
    secret,
    { expiresIn: '30d' }
  );
}
