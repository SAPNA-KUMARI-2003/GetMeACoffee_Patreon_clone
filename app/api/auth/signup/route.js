import connectDb from '@/db/connectDb'
import User from '@/models/User'
import bcrypt from 'bcrypt'

export async function POST(req) {
  try {
    const body = await req.json()
    console.log('Signup body:', JSON.stringify(body))
    let { username, password, razorpayid, razorpaysecret, email } = body

    if (!username || !password) {
      return new Response(JSON.stringify({ message: 'username and password required' }), { status: 400 })
    }

    // normalize username: strip leading @, trim, lowercase, replace spaces with '-'
    username = String(username).trim().replace(/^@+/, '').toLowerCase().replace(/\s+/g, '-')
    // validate username length only (allow broader character set; we normalize later)
    if (username.length < 2 || username.length > 50) {
      return new Response(JSON.stringify({ message: 'Invalid username. Use 2-50 characters.' }), { status: 400 })
    }

    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI not set')
      return new Response(JSON.stringify({ message: 'Server misconfigured: MONGODB_URI missing' }), { status: 500 })
    }

    try {
      await connectDb()
    } catch (err) {
      console.error('connectDb failed:', err)
      return new Response(JSON.stringify({ message: 'Failed to connect to database', detail: err?.message }), { status: 500 })
    }

    const existing = await User.findOne({ username })
    if (existing) {
      return new Response(JSON.stringify({ message: 'Username already taken' }), { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)

    try {
      const newUser = await User.create({
        username,
        password: hashed,
        email: email || undefined,
        razorpayid: razorpayid || undefined,
        razorpaysecret: razorpaysecret || undefined,
      })

      console.log('New user created:', newUser._id.toString(), newUser.username)

      return new Response(JSON.stringify({ message: 'User created', user: { id: newUser._id, username: newUser.username } }), { status: 201 })
    } catch (err) {
      console.error('Error creating user:', err)
      // If the error is a Mongo duplicate key for username
      if (err?.code === 11000) {
        return new Response(JSON.stringify({ message: 'Username already taken' }), { status: 409 })
      }
      return new Response(JSON.stringify({ message: 'Signup failed', detail: err?.message }), { status: 500 })
    }
  } catch (err) {
    console.error('Signup endpoint error:', err)
    return new Response(JSON.stringify({ message: 'Signup failed', detail: err?.message }), { status: 500 })
  }
}
