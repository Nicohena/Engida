'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Room } from '../../types';

interface Props { listingId: string; initialRooms?: Room[] }
interface RoomForm { title: string; roomNumber: string; capacity: string; pricePerNight: string }
const emptyForm: RoomForm = { title: '', roomNumber: '', capacity: '1', pricePerNight: '' };

export default function HostRoomsManager({ listingId, initialRooms = [] }: Props) {
  const [rooms, setRooms] = useState(initialRooms);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RoomForm>(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function addRoom(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const room = await apiFetch<Room>(`/host/listings/${listingId}/rooms`, { method: 'POST', body: JSON.stringify({ ...form, capacity: Number(form.capacity), pricePerNight: Number(form.pricePerNight) }) });
      setRooms((current) => [...current, room]); setForm(emptyForm);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not add room.'); }
    finally { setBusy(false); }
  }

  async function toggleAvailability(room: Room) {
    setBusy(true); setError('');
    try {
      const updated = await apiFetch<Room>(`/host/listings/${listingId}/rooms/${room.id}`, { method: 'PATCH', body: JSON.stringify({ isAvailable: !room.isAvailable }) });
      setRooms((current) => current.map((item) => item.id === room.id ? updated : item));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update room.'); }
    finally { setBusy(false); }
  }

  async function saveRoom(room: Room) {
    setBusy(true); setError('');
    try {
      const updated = await apiFetch<Room>(`/host/listings/${listingId}/rooms/${room.id}`, { method: 'PATCH', body: JSON.stringify({ ...editForm, capacity: Number(editForm.capacity), pricePerNight: Number(editForm.pricePerNight) }) });
      setRooms((current) => current.map((item) => item.id === room.id ? updated : item)); setEditingId(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save room.'); }
    finally { setBusy(false); }
  }

  async function removeRoom(room: Room) {
    setBusy(true); setError('');
    try {
      await apiFetch(`/host/listings/${listingId}/rooms/${room.id}`, { method: 'DELETE' });
      setRooms((current) => current.filter((item) => item.id !== room.id));
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not remove room.'); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-[#d8d0c8] bg-white p-6 space-y-5">
    <div><h2 className="text-lg font-bold text-[#3a302a]">Room inventory</h2><p className="mt-1 text-sm text-[#605850]">Set room pricing and capacity. Rooms with reservation history are retained and can be marked unavailable.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</p>}
    {rooms.length > 0 && <ul className="divide-y divide-[#f2ece4]">{rooms.map((room) => <li key={room.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-[220px] flex-1">{editingId === room.id ? <div className="grid gap-2 sm:grid-cols-2">
        <input aria-label="Edit room title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="rounded-xl border border-[#d8d0c8] px-3 py-2 text-sm text-[#3a302a] outline-none focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" />
        <input aria-label="Edit room number" value={editForm.roomNumber} onChange={(e) => setEditForm({ ...editForm, roomNumber: e.target.value })} className="rounded-xl border border-[#d8d0c8] px-3 py-2 text-sm text-[#3a302a] outline-none focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" />
        <input aria-label="Edit room capacity" type="number" min="1" max="50" value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} className="rounded-xl border border-[#d8d0c8] px-3 py-2 text-sm text-[#3a302a] outline-none focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" />
        <input aria-label="Edit room price" type="number" min="0.01" step="0.01" value={editForm.pricePerNight} onChange={(e) => setEditForm({ ...editForm, pricePerNight: e.target.value })} className="rounded-xl border border-[#d8d0c8] px-3 py-2 text-sm text-[#3a302a] outline-none focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" />
        <button type="button" disabled={busy} onClick={() => saveRoom(room)} className="rounded-xl bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] px-3 py-2 text-sm font-bold text-white shadow-sm sm:col-span-2 transition">Save room details</button>
      </div> : <><p className="font-semibold text-[#3a302a]">{room.title} · Room {room.roomNumber}</p><p className="text-sm text-[#605850]">ETB {Number(room.pricePerNight).toLocaleString()} / night · {room.capacity} guests · {room.isAvailable ? 'Available' : 'Unavailable'}</p></>}</div>
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => { setEditingId(editingId === room.id ? null : room.id); setEditForm({ title: room.title, roomNumber: room.roomNumber, capacity: String(room.capacity), pricePerNight: String(room.pricePerNight) }); }} className="rounded-xl border border-[#d8d0c8] bg-white hover:bg-[#faf5ee] px-3 py-2 text-sm font-semibold text-[#3a302a] transition">{editingId === room.id ? 'Cancel edit' : 'Edit'}</button><button type="button" disabled={busy} onClick={() => toggleAvailability(room)} className="rounded-xl border border-[#d8d0c8] bg-white hover:bg-[#faf5ee] px-3 py-2 text-sm font-semibold text-[#3a302a] transition">Mark {room.isAvailable ? 'unavailable' : 'available'}</button><button type="button" disabled={busy} onClick={() => removeRoom(room)} className="rounded-xl border border-red-200 bg-white hover:bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition">Remove</button></div>
    </li>)}</ul>}
    <form onSubmit={addRoom} className="grid gap-3 sm:grid-cols-2">
      <input required maxLength={120} aria-label="Room title" placeholder="Room title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border border-[#d8d0c8] px-3 py-2 text-sm text-[#3a302a] outline-none focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" />
      <input required maxLength={50} aria-label="Room number" placeholder="Room number" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} className="rounded-xl border border-[#d8d0c8] px-3 py-2 text-sm text-[#3a302a] outline-none focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" />
      <input required type="number" min="1" max="50" aria-label="Guest capacity" placeholder="Guest capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="rounded-xl border border-[#d8d0c8] px-3 py-2 text-sm text-[#3a302a] outline-none focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" />
      <input required type="number" min="0.01" step="0.01" aria-label="Price per night" placeholder="Price per night (ETB)" value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })} className="rounded-xl border border-[#d8d0c8] px-3 py-2 text-sm text-[#3a302a] outline-none focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" />
      <button disabled={busy} className="rounded-xl bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] px-4 py-2.5 font-bold text-white shadow-sm disabled:opacity-50 sm:col-span-2 transition">{busy ? 'Saving…' : 'Add room'}</button>
    </form>
  </section>;
}
