import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import mongoose from "mongoose";
import connectDb from '@/db/connectDb';
import User from '@/models/User';
import Payment from '@/models/Payment';
 

export const authoptions =  NextAuth({
    providers: [
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          username: { label: 'Username', type: 'text' },
          password: { label: 'Password', type: 'password' }
        },
        async authorize(credentials) {
          await connectDb()
          if(!credentials?.username || !credentials?.password) return null

          const raw = String(credentials.username).trim()
          const normalized = raw.replace(/^@+/, '').toLowerCase().replace(/\s+/g, '-')
          console.log('authorize login attempt:', { raw, normalized })

          // Try several lookup strategies to handle legacy/edge cases
          let user = await User.findOne({ username: normalized })
          if (!user && raw !== normalized) {
            user = await User.findOne({ username: raw })
          }
          if (!user) {
            // case-insensitive exact match
            const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            user = await User.findOne({ username: { $regex: `^${esc}$`, $options: 'i' } })
          }
          if (!user) {
            // fallback to email
            user = await User.findOne({ email: raw })
          }

          console.log('authorize lookup result:', !!user, user?._id?.toString(), user?.username)

          if (!user) return null
          if (!user.password) {
            console.warn('authorize failed: user has no password set', user._id?.toString())
            return null
          }

          const match = await bcrypt.compare(credentials.password, user.password)
          console.log('password match for user', user.username, ':', !!match)
          if (!match) return null

          return { id: user._id.toString(), name: user.username, email: user.email }
        }
      })
    ],
    callbacks: {
      async session({ session }) {
        await connectDb()
        const dbUser = await User.findOne({ username: session.user.name }) || await User.findOne({ email: session.user.email })
        if (dbUser) {
          session.user.name = dbUser.username
          // also set username for easier client-side use
          session.user.username = dbUser.username
        }
        return session
      },
    } 
  })

  export { authoptions as GET, authoptions as POST}