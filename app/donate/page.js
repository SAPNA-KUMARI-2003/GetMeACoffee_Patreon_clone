import Donate from '@/components/Donate'

export default function Page() {
  return (
    <div className="container mx-auto  ">
      <div className='flex flex-col justify-center items-center  text-center  p-16'>

      <h1 className="text-2xl font-bold p-4 flex justify-center items-center gap-4 flex-col md:flex-row">
        <div className="flex-shrink-0 mt-1">
						<img src="tea.gif" width={64} alt="logo" className="rounded-full border border-white/10 p-1" />
					</div>
          Donate to your favorite creators</h1>
      <p className='text-gray-500'>
        Support creators by visiting their personalized donation pages. Just enter their username below to get started!
      </p>
      </div>
      <Donate />
    </div>
  )
}
