import jwt from "jsonwebtoken";

const { verify } = jwt;

function protect(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Authorization token missing" });
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		return next();
	} catch (error) {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
}

export { protect };

export default {
	protect,
};
