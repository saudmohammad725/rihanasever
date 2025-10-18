import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { verifyAdmin } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check default admin credentials
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // Generate admin token
      const token = jwt.sign(
        {
          email: email,
          isAdmin: true,
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('adminToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        token,
        admin: {
          email: email,
          role: 'admin'
        }
      });
    }

    // Check admin table in Supabase (for additional admins)
    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin) {
      return res.status(401).json({
        error: true,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: true,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    // Generate admin token
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        isAdmin: true,
        role: admin.role || 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      error: true,
      message: 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
});

// Verify admin token
router.get('/verify', verifyAdmin, (req, res) => {
  res.json({
    success: true,
    admin: req.admin
  });
});

// Admin logout
router.post('/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
});

export default router;

