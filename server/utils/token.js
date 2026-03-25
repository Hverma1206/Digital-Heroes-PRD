import jwt from "jsonwebtoken";

const { sign } = jwt;

export function generateToken(user) {
  return sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}
