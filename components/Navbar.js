"use client"
import React, { useState } from 'react'
import { useSession, signIn, signOut } from "next-auth/react"
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// Donate is available at /donate

const Navbar = () => {
  const { data: session } = useSession()
  const [showdropdown, setShowdropdown] = useState(false)
  const router = useRouter()

  const normalizeUsername = (s) => String(s || '').trim().replace(/^@+/, '').toLowerCase().replace(/\s+/g, '-')

  // compute a safe href for "Your Page"; prefer session.user.name, fallback to other fields; avoid empty path
  const yourPageHref = session
    ? (session.user?.name || session.user?.username || session.user?.email)
      ? `/${encodeURIComponent(normalizeUsername(session.user?.name || session.user?.username || session.user?.email))}`
      : '/dashboard'
    : '/login'

  return (
    <nav className='sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-gray-800 to-slate-900 text-white flex justify-between items-center px-4 py-3 md:h-16 shadow-lg   flex-col md:flex-row gap-4 md:gap-0'>

      <Link className="logo font-bold text-lg flex items-center gap-3" href={"/"}>
        <img className='invertImg rounded-full border border-white/10 p-1' src="tea.gif" width={44} alt="" />
        <span className='text-xl md:text-base my-0 leading-none underline'>Get Me a Coffee!</span>
      </Link>

      {/* <ul className='flex justify-between gap-4'>
        <li>Home</li>
        <li>About</li>
        <li>Projects</li>
        <li>Sign Up</li>
        <li>Login</li>
      </ul> */}

      <div className='flex-1' />

      <div className='flex items-center gap-3'>
        <Link href="/donate">
          <button className='ml-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900 font-semibold px-4 py-2 rounded-full shadow hover:scale-105 transform transition'>☕ Donate/Pay</button>
        </Link>

        <div className='relative'>
        {session && <>
          <button onClick={() => setShowdropdown(!showdropdown)} onBlur={() => {
            setTimeout(() => {
              setShowdropdown(false)
            }, 100);
          }} id="dropdownDefaultButton" data-dropdown-toggle="dropdown" className="text-white mx-2 bg-white/5 hover:bg-white/10 focus:ring-4 focus:outline-none focus:ring-white/10 font-medium rounded-md text-sm px-3 py-2 inline-flex items-center transition" type="button">Account<svg className="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
            </svg>
          </button>

          <div id="dropdown" className={`z-50 ${showdropdown ? "" : "hidden"} absolute right-0 top-12 bg-white divide-y divide-gray-100 rounded-lg shadow-lg w-56 dark:bg-gray-800 overflow-hidden transition`}>
            <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefaultButton">
              <li>
                <Link href="/dashboard" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Dashboard</Link>
              </li>
              <li>
                <Link
                  href={yourPageHref}
                  onClick={() => setShowdropdown(false)}
                  className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                >Your Page</Link>
              </li>
              <li>
                <Link onClick={() => signOut()} href="#" className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Sign out</Link>
              </li>
            </ul>
          </div></>
        }

        {session && <button className='text-white w-fit bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-md text-sm px-4 py-2 text-center me-2 transition transform hover:-translate-y-0.5' onClick={() => { signOut() }}>Logout</button>}
        {!session && <Link href={"/login"}>
          <button className='text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-md text-sm px-4 py-2 text-center me-2 transition transform hover:-translate-y-0.5'>Login</button></Link>} 
        </div>
      </div>
    </nav>
  )
}

export default Navbar
