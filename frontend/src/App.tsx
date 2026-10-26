import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { AvatarProvider } from "./context/AvatarContext";

import Home from "./guest-pages/Home";
import Search from "./guest-pages/Search";
import PropertyDetails from "./guest-pages/PropertyDetails";
import Booking from "./guest-pages/Booking";
import Payment from "./guest-pages/Payment";
import MyTrips from "./guest-pages/MyTrips";
import Messages from "./guest-pages/Messages";
import Profile from "./guest-pages/Profile";
import Notifications from "./guest-pages/Notifications";

// NOTE: Register/Login are intentionally NOT implemented here — that flow
// is owned by another team and this module assumes an already-authenticated
// guest (mocked as userId = 1 on the backend).

export default function App() {
  return (
    <AvatarProvider>
      <div className="flex min-h-screen flex-col bg-surface">
        <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
          <Route path="/booking/:propertyId" element={<Booking />} />
          <Route path="/payment/:bookingId" element={<Payment />} />
          <Route path="/trips" element={<MyTrips />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:bookingId" element={<Messages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </main>
        <Footer />
      </div>
    </AvatarProvider>
  );
}
