import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { api } from "../lib/api";
import { useAvatar } from "../context/AvatarContext";
import { PhotoManagerDialog } from "../components/profile/PhotoManagerDialog";
import type { Profile as ProfileType } from "../types";

export default function Profile() {
  const { setInitials } = useAvatar();

  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("English");
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getProfile().then((p) => {
      setProfile(p);
      setFirstName(p.firstName);
      setLastName(p.lastName);
      setEmail(p.email);
      setPhone(p.phone);
      setLanguage(p.language === "am" ? "Amharic" : "English");
    });
  }, []);

  async function handleSave() {
    await api.updateProfile({
      firstName,
      lastName,
      email,
      phone,
      language: language === "Amharic" ? "am" : "en",
    });
    // Keep initials in sync if name changed
    const first = firstName?.[0] ?? "";
    const last = lastName?.[0] ?? "";
    setInitials((first + last).toUpperCase() || "G");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!profile)
    return <div className="mx-auto max-w-3xl px-4 py-12 text-slate-500 sm:px-6">Loading profile…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Profile</h1>

      {/* ── Profile card with Photo Manager ── */}
      <Card className="mb-6 p-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {/* Avatar + photo management trigger */}
          <PhotoManagerDialog firstName={firstName} lastName={lastName} />

          {/* Name / email / phone summary */}
          <div className="text-center sm:text-left">
            <p className="text-lg font-extrabold text-slate-900">
              {firstName} {lastName}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">{email}</p>
            <p className="text-sm text-slate-500">{phone}</p>
            <p className="mt-2 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-0.5 inline-block">
              Guest account
            </p>
          </div>
        </div>
      </Card>

      {/* ── Personal Information ── */}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-bold text-slate-900">Personal Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>First Name</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* ── Preferences ── */}
      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-bold text-slate-900">Preferences</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Email Notifications</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={emailNotif}
              onChange={() => setEmailNotif((v) => !v)}
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-700">SMS Notifications</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={smsNotif}
              onChange={() => setSmsNotif((v) => !v)}
            />
          </label>
          <div>
            <Label>Language</Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option>English</option>
              <option>Amharic</option>
            </select>
          </div>
          <div>
            <Label>Currency</Label>
            <Input value="ETB" disabled />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button size="lg" onClick={handleSave}>
          Save Changes
        </Button>
        {saved && <span className="text-sm font-medium text-emerald-600">Saved!</span>}
      </div>
    </div>
  );
}
