import express from 'express';
import { verifyAdmin } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', verifyAdmin, async (req, res) => {
  try {
    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total bookings
    const { count: totalBookings } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Get pending bookings
    const { count: pendingBookings } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get completed bookings
    const { count: completedBookings } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Get total revenue (sum of completed booking prices)
    const { data: revenueData } = await supabaseAdmin
      .from('bookings')
      .select('price')
      .eq('status', 'completed');

    const totalRevenue = revenueData?.reduce((sum, booking) => sum + (booking.price || 0), 0) || 0;

    // Get new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newUsersThisMonth } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    // Get bookings by service type
    const { data: bookingsByService } = await supabaseAdmin
      .from('bookings')
      .select('service_type');

    const serviceStats = bookingsByService?.reduce((acc, booking) => {
      acc[booking.service_type] = (acc[booking.service_type] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get recent bookings
    const { data: recentBookings } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get bookings trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const { data: bookingsTrend } = await supabaseAdmin
      .from('bookings')
      .select('created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const trendData = last7Days.map(date => ({
      date,
      count: bookingsTrend?.filter(b => b.created_at.startsWith(date)).length || 0
    }));

    res.json({
      success: true,
      statistics: {
        totalUsers,
        totalBookings,
        pendingBookings,
        completedBookings,
        totalRevenue,
        newUsersThisMonth
      },
      serviceStats,
      recentBookings,
      trendData
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: true,
      message: 'حدث خطأ أثناء جلب الإحصائيات'
    });
  }
});

// Track visitor
router.post('/visitor', async (req, res) => {
  try {
    const { page, userAgent, ip } = req.body;

    const { data: visit, error } = await supabaseAdmin
      .from('visitors')
      .insert([
        {
          page,
          user_agent: userAgent,
          ip_address: ip || req.ip,
          visited_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      visit
    });
  } catch (error) {
    console.error('Track visitor error:', error);
    res.status(500).json({
      error: true,
      message: 'حدث خطأ أثناء تتبع الزائر'
    });
  }
});

// Get visitor statistics
router.get('/visitors', verifyAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data: visitors, count } = await supabaseAdmin
      .from('visitors')
      .select('*', { count: 'exact' })
      .gte('visited_at', startDate.toISOString());

    // Group by page
    const pageViews = visitors?.reduce((acc, visit) => {
      acc[visit.page] = (acc[visit.page] || 0) + 1;
      return acc;
    }, {}) || {};

    // Group by date
    const dailyVisits = visitors?.reduce((acc, visit) => {
      const date = visit.visited_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      totalVisits: count,
      pageViews,
      dailyVisits
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({
      error: true,
      message: 'حدث خطأ أثناء جلب إحصائيات الزوار'
    });
  }
});

export default router;

