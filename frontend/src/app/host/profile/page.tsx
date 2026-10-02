'use client';

export default function HostProfilePage() {
  return (
    <div className="p-6 md:p-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-black text-[#000000] mb-2">Host Profile</h1>
        <p className="text-[#64748B] text-sm mb-8">
          Manage your public host profile information.
        </p>
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#E3EAF5] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👤</span>
          </div>
          <h2 className="text-lg font-bold text-[#000000] mb-2">Profile Settings</h2>
          <p className="text-sm text-[#64748B]">
            Coming soon — update your display name, bio, and contact details.
          </p>
        </div>
      </div>
    </div>
  );
}
