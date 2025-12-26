import connectDb from '@/db/connectDb'
import User from '@/models/User'

export async function GET(req) {
  if (process.env.NODE_ENV === 'production') {
    return new Response(JSON.stringify({ message: 'Not available in production' }), { status: 403 })
  }

  try {
    await connectDb()
    const users = await User.find({}, 'username email razorpayid createdAt').sort({ createdAt: -1 }).limit(50)
    return new Response(JSON.stringify({ users }), { status: 200 })
  } catch (err) {
    console.error('Debug users error:', err)
    return new Response(JSON.stringify({ message: 'Failed to fetch users', detail: err?.message }), { status: 500 })
  }
}
