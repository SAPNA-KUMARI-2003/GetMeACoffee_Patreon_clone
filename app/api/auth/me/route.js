import { getToken } from 'next-auth/jwt'
import connectDb from '@/db/connectDb'
import User from '@/models/User'

export async function GET(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    console.log('GET /api/auth/me token:', token)
    if (!token) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    await connectDb()

    // Try by token.sub (user id) first, then by username (token.name), then email
    let dbUser = null
    if (token.sub) {
      try {
        dbUser = await User.findById(token.sub)
      } catch (e) {
        console.warn('Invalid token.sub id', token.sub)
      }
    }

    if (!dbUser && token.name) {
      dbUser = await User.findOne({ username: token.name })
    }
    if (!dbUser && token.email) {
      dbUser = await User.findOne({ email: token.email })
    }

    if (!dbUser) {
      console.warn('User not found for token:', token)
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    console.log('GET /api/auth/me found user:', dbUser.username)
    return new Response(JSON.stringify({ username: dbUser.username }), { status: 200 })
  } catch (err) {
    console.error('GET /api/auth/me error:', err)
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 })
  }
}
