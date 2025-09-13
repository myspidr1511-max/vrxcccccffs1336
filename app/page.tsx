'use client'
import ChatPanel from '../components/ChatPanel'
import AvatarCanvas from '../components/AvatarCanvas'

export default function Page() {
  return (
    <main className="max-w-6xl mx-auto p-4 space-y-4">
      <section className="grid md:grid-cols-2 gap-4">
        <ChatPanel />
        <div>
          <div className="text-right text-sm font-semibold mb-2">الأفاتار</div>
          <AvatarCanvas />
          <p className="text-xs text-center text-gray-400 mt-2">
            ضع ملف الشخصية باسم <code>public/avatar.vrm</code> أو حمّله من الواجهة.
          </p>
        </div>
      </section>
    </main>
  )
}
