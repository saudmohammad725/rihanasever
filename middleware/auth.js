import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;

    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'غير مصرح - لا يوجد رمز'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: true,
      message: 'رمز غير صالح'
    });
  }
};

export const verifyAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.adminToken;

    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'غير مصرح - مطلوب صلاحيات المدير'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.isAdmin) {
      return res.status(403).json({
        error: true,
        message: 'ممنوع - ليس لديك صلاحيات المدير'
      });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: true,
      message: 'رمز المدير غير صالح'
    });
  }
};

