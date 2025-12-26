import React from 'react'
import PaymentPage from '@/components/PaymentPage'
import { notFound, redirect } from "next/navigation"
import connectDb from '@/db/connectDb'
import User from '@/models/User'
const Username = async ({ params }) => {
  const normalize = (s) => String(s || '').trim().replace(/^@+/, '').toLowerCase().replace(/\s+/g, '-')
  const raw = params.username ? decodeURIComponent(params.username) : ''
  const normalized = normalize(raw)

  await connectDb()

  console.log('app/[username] hit - raw:', raw, 'normalized:', normalized)

  // Try normalized lookup first
  let u = await User.findOne({ username: normalized })
  console.log('lookup by normalized ->', !!u, u?.username)

  if (u) {
    // Debug: log exactly what user object we found
    console.log('app/[username] - found user:', { username: u.username, profilepic: u.profilepic, coverpic: u.coverpic });
    // If the URL is not the canonical normalized username, redirect
    if (normalized !== decodeURIComponent(String(params.username || ''))) {
      console.log('redirecting to canonical', normalized)
      return redirect(`/${normalized}`)
    }
  } else {
    // Fallback: try exact raw and case-insensitive matches (legacy accounts)
    u = await User.findOne({ username: raw })
    console.log('lookup by raw ->', !!u, u?.username)
    if (!u) {
      // case-insensitive exact match
      const esc = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      u = await User.findOne({ username: { $regex: `^${esc}$`, $options: 'i' } })
      console.log('case-insensitive lookup ->', !!u, u?.username)
    }

    // If still not found, try searching by email if the param looks like an email
    if (!u && raw.includes('@')) {
      u = await User.findOne({ email: raw })
      console.log('lookup by email ->', !!u, u?.username)
    }

    // If still not found, try treating param as ObjectId
    if (!u && /^[0-9a-fA-F]{24}$/.test(raw)) {
      try {
        u = await User.findById(raw)
        console.log('lookup by id ->', !!u, u?.username)
      } catch (e) {
        console.warn('Invalid id lookup', e)
      }
    }

    if (u) {
      // Redirect to the canonical normalized username stored in DB
      const canonical = normalize(u.username)
      console.log('found user via fallback, redirecting to', canonical)
      return redirect(`/${canonical}`)
    }
  }

  if (!u) {
    console.warn('User not found for param:', params.username)
    return notFound()
  }

  return (
    <>
      <PaymentPage username={u.username} />
    </>
  )
}

export default Username
 
export async function generateMetadata({ params }) {
  const normalize = (s) => String(s || '').trim().replace(/^@+/, '').toLowerCase().replace(/\s+/g, '-')
  const raw = params.username ? decodeURIComponent(params.username) : ''
  const username = normalize(raw)
  return {
    title: `Support ${username} - Get Me A Coffee`,
  }
}
