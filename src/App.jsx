import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Scissors, Clock, Check, ChevronLeft, ChevronRight,
  Lock, Trash2, ArrowLeft, CalendarCheck2, MessageCircle, Mail, Instagram, Loader2, CalendarX2, Search
} from "lucide-react";
import { supabase } from "./supabaseClient";

const SERVICES = [
  { id: "corte", name: "Corte de pelo", duration: 30, price: 15 },
  { id: "barba", name: "Arreglo de barba", duration: 20, price: 12 },
  { id: "corte-barba", name: "Corte + barba", duration: 45, price: 22 },
  { id: "afeitado", name: "Afeitado clásico a navaja", duration: 30, price: 15 },
  { id: "nino", name: "Corte niño (-12 años)", duration: 25, price: 12 },
  { id: "color", name: "Camuflaje de canas", duration: 45, price: 25 },
];

const DAY_NAMES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DAY_NAMES_FULL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "0000";

// --- Datos de contacto del negocio ---
const SALON_WHATSAPP = "34600000000"; // formato internacional, sin '+' ni espacios — CAMBIA ESTO
const SALON_EMAIL = "hola@labarberia.example"; // CAMBIA ESTO
const SALON_INSTAGRAM = "https://www.instagram.com/labarberia.breda/";

// Horario real: martes a viernes en dos turnos, sábado en turno único, domingo y lunes cerrado
function getDayRanges(dow) {
  if ([2, 3, 4, 5].includes(dow)) return [{ start: 9 * 60, end: 13 * 60 }, { start: 15 * 60, end: 20 * 60 }];
  if (dow === 6) return [{ start: 8 * 60, end: 14 * 60 }];
  return [];
}

function pad(n) { return n.toString().padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function minutesToLabel(m) { return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }
function formatDateLong(d) { return `${DAY_NAMES_FULL[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`; }

function generateUpcomingDays(count) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function generateSlots(service, dateObj, existingBookings) {
  const ranges = getDayRanges(dateObj.getDay());
  if (ranges.length === 0) return [];
  const dur = service.duration;
  const raw = [];
  ranges.forEach((range) => {
    for (let t = range.start; t + dur <= range.end; t += 15) raw.push(t);
  });
  const key = dateKey(dateObj);
  const dayBookings = existingBookings.filter((b) => b.date === key);
  const isFree = (start) => {
    const end = start + dur;
    return !dayBookings.some((b) => start < b.start_minutes + b.duration && end > b.start_minutes);
  };
  const now = new Date();
  const isToday = dateKey(now) === key;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return raw.filter((s) => isFree(s) && (!isToday || s > nowMinutes + 30));
}

function buildConfirmationMessage(b) {
  return `Hola! Confirmo mi cita en La Barbería:\n· Servicio: ${b.service_name}\n· Fecha: ${b.date_label}\n· Hora: ${b.time_label}\n· Nombre: ${b.name}\n· Teléfono: ${b.phone}`;
}
function buildWhatsAppLink(b) {
  return `https://wa.me/${SALON_WHATSAPP}?text=${encodeURIComponent(buildConfirmationMessage(b))}`;
}
function buildMailtoLink(b) {
  const subject = encodeURIComponent(`Confirmación de cita - ${b.service_name}`);
  const body = encodeURIComponent(buildConfirmationMessage(b));
  return `mailto:${SALON_EMAIL}?subject=${subject}&body=${body}`;
}

function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: true })
      .order("start_minutes", { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      setBookings(data || []);
      setError(null);
    }
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addBooking = useCallback(async (booking) => {
    const { data, error: err } = await supabase.from("bookings").insert([booking]).select();
    if (err) return { booking: null, error: err };
    await load();
    return { booking: data ? data[0] : null, error: null };
  }, [load]);

  const removeBooking = useCallback(async (id) => {
    const { error: err } = await supabase.from("bookings").delete().eq("id", id);
    if (err) { setError(err.message); return; }
    await load();
  }, [load]);

  return { bookings, loaded, error, addBooking, removeBooking, reload: load };
}

export default function App() {
  const { bookings, loaded, error, addBooking, removeBooking } = useBookings();
  const [view, setView] = useState("client");
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [managePhone, setManagePhone] = useState("");
  const [manageSearched, setManageSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const days = useMemo(() => generateUpcomingDays(21), []);
  const visibleDays = days.slice(dayOffset, dayOffset + 6);

  const slots = useMemo(() => {
    if (!service || !selectedDate) return [];
    return generateSlots(service, selectedDate, bookings);
  }, [service, selectedDate, bookings]);

  function pickService(s) {
    setService(s);
    setStep(2);
    setSelectedDate(null);
    setSelectedTime(null);
  }

  function pickDate(d) {
    setSelectedDate(d);
    setSelectedTime(null);
  }

  function goToDetails() {
    if (selectedTime === null) return;
    setStep(3);
  }

  async function validateAndConfirm() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Introduce tu nombre";
    if (!form.phone.trim() || form.phone.trim().length < 9) errs.phone = "Introduce un teléfono válido";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const booking = {
      date: dateKey(selectedDate),
      date_label: formatDateLong(selectedDate),
      start_minutes: selectedTime,
      time_label: minutesToLabel(selectedTime),
      duration: service.duration,
      service_id: service.id,
      service_name: service.name,
      price: service.price,
      name: form.name.trim(),
      phone: form.phone.trim(),
    };
    const saved = await addBooking(booking);
    setSubmitting(false);
    if (saved.error) {
      const isConflict = saved.error.code === "23P01" || /exclu/i.test(saved.error.message || "");
      if (isConflict) {
        setErrors({ general: "Esa hora se acaba de reservar por otra persona. Elige otra, por favor." });
        setStep(2);
        setSelectedTime(null);
      } else {
        setErrors({ general: "No se pudo completar la reserva. Inténtalo de nuevo." });
      }
      return;
    }
    if (saved.booking) {
      setConfirmed(saved.booking);
      setStep(4);
    }
  }

  function resetFlow() {
    setStep(1);
    setService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setForm({ name: "", phone: "" });
    setErrors({});
    setConfirmed(null);
    setDayOffset(0);
    setEmailFormOpen(false);
    setEmailInput("");
    setEmailSending(false);
    setEmailSent(false);
    setEmailError("");
  }

  async function sendConfirmationEmail() {
    if (!emailInput.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      setEmailError("Introduce un email válido");
      return;
    }
    setEmailSending(true);
    setEmailError("");
    try {
      const r = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailInput.trim(), booking: confirmed }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al enviar");
      setEmailSent(true);
    } catch (err) {
      setEmailError("No se pudo enviar el email. Inténtalo de nuevo.");
    }
    setEmailSending(false);
  }

  function checkPin() {
    if (pinInput === ADMIN_PIN) {
      setAdminUnlocked(true);
      setPinError("");
    } else {
      setPinError("PIN incorrecto");
    }
  }

  const myBookings = useMemo(() => {
    if (!manageSearched) return [];
    const normalized = managePhone.replace(/\s+/g, "");
    const todayKey = dateKey(new Date());
    return bookings
      .filter((b) => b.phone.replace(/\s+/g, "") === normalized && b.date >= todayKey)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_minutes - b.start_minutes;
      });
  }, [bookings, managePhone, manageSearched]);

  async function cancelMyBooking(id) {
    setCancellingId(id);
    await removeBooking(id);
    setCancellingId(null);
  }

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.start_minutes - b.start_minutes;
    });
  }, [bookings]);

  const grouped = useMemo(() => {
    const map = {};
    sortedBookings.forEach((b) => {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [sortedBookings]);

  const stats = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() + diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekBookings = bookings.filter((b) => {
      const bd = new Date(b.date + "T00:00:00");
      return bd >= weekStart && bd < weekEnd;
    });

    const weekCount = weekBookings.length;
    const weekRevenue = weekBookings.reduce((sum, b) => sum + Number(b.price || 0), 0);

    const counts = {};
    bookings.forEach((b) => { counts[b.service_name] = (counts[b.service_name] || 0) + 1; });
    let popular = "—";
    let max = 0;
    Object.entries(counts).forEach(([name, c]) => { if (c > max) { max = c; popular = name; } });

    return { weekCount, weekRevenue, popular };
  }, [bookings]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#1A110B", minHeight: "100vh", color: "#F1E6D8" }}>
      <style>{`
        .brb-serif { font-family: 'Fraunces', serif; }
        .brb-mono { font-family: 'JetBrains Mono', monospace; }
        .brb-btn { transition: all 0.15s ease; }
        .brb-btn:active { transform: scale(0.97); }
        .brb-scroll::-webkit-scrollbar { height: 6px; }
        .brb-scroll::-webkit-scrollbar-thumb { background: #4A3626; border-radius: 4px; }
        .brb-shell { max-width: 480px; margin: 0 auto; padding-bottom: 40px; }
      `}</style>

      <div className="brb-shell">
        {/* Header */}
        <div style={{ background: "#120C07", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #3A2A1C" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="La Barbería" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", background: "#F1E6D8" }} />
            <div>
              <div className="brb-serif" style={{ fontSize: 19, fontWeight: 600, lineHeight: 1, letterSpacing: "0.02em" }}>LA BARBERÍA</div>
              <div className="brb-mono" style={{ fontSize: 9, color: "#B99A76", letterSpacing: "0.08em", marginTop: 3 }}>NEW OLD SCHOOL · SINCE 2024</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {view === "client" && (
              <button
                className="brb-btn"
                onClick={() => { setView("manage"); setManagePhone(""); setManageSearched(false); }}
                style={{ background: "transparent", border: "1px solid #4A3626", color: "#D8B98C", borderRadius: 999, padding: "7px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
              >
                <CalendarX2 size={12} /> Mi reserva
              </button>
            )}
            <button
              className="brb-btn"
              onClick={() => setView(view === "client" ? "admin" : "client")}
              style={{ background: "transparent", border: "1px solid #4A3626", color: "#D8B98C", borderRadius: 999, padding: "7px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}
            >
              {view === "client" ? <><Lock size={12} /> Panel</> : <><ArrowLeft size={12} /> Reservar</>}
            </button>
          </div>
        </div>

        <div style={{ padding: "22px 20px" }}>
          {error && (
            <div style={{ background: "#3A1E1E", border: "1px solid #6B3232", color: "#E8B4B4", fontSize: 12, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
              Error de conexión con la base de datos: {error}. Revisa tu archivo .env.
            </div>
          )}

          {!loaded ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0", color: "#8A7358" }}>
              <Loader2 size={22} className="brb-spin" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : view === "admin" ? (
            !adminUnlocked ? (
              <div style={{ maxWidth: 320, margin: "40px auto", textAlign: "center" }}>
                <Lock size={26} color="#C08552" style={{ margin: "0 auto 14px" }} />
                <div className="brb-serif" style={{ fontSize: 18, marginBottom: 6 }}>Acceso del propietario</div>
                <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 16 }}>Introduce el PIN de acceso</div>
                <input
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkPin()}
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  style={{ width: "100%", textAlign: "center", fontSize: 20, letterSpacing: "0.3em", padding: "10px", borderRadius: 10, border: "1px solid #4A3626", background: "#120C07", color: "#F1E6D8", marginBottom: 10 }}
                />
                {pinError && <div style={{ color: "#E29A9A", fontSize: 12, marginBottom: 10 }}>{pinError}</div>}
                <button className="brb-btn" onClick={checkPin} style={{ background: "#C08552", color: "#1A110B", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", width: "100%" }}>Entrar</button>
              </div>
            ) : (
              <div>
                <div className="brb-serif" style={{ fontSize: 20, marginBottom: 4 }}>Reservas</div>
                <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 16 }}>
                  {sortedBookings.length === 0 ? "Todavía no hay reservas." : `${sortedBookings.length} reserva${sortedBookings.length !== 1 ? "s" : ""} en total`}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 22 }}>
                  <div style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: "12px 10px" }}>
                    <div className="brb-mono" style={{ fontSize: 20, fontWeight: 600, color: "#C08552" }}>{stats.weekCount}</div>
                    <div style={{ fontSize: 10, color: "#B99A76", marginTop: 2 }}>Reservas esta semana</div>
                  </div>
                  <div style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: "12px 10px" }}>
                    <div className="brb-mono" style={{ fontSize: 20, fontWeight: 600, color: "#C08552" }}>{stats.weekRevenue}€</div>
                    <div style={{ fontSize: 10, color: "#B99A76", marginTop: 2 }}>Ingresos esta semana</div>
                  </div>
                  <div style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: "12px 10px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#C08552", lineHeight: 1.3 }}>{stats.popular}</div>
                    <div style={{ fontSize: 10, color: "#B99A76", marginTop: 4 }}>Servicio más popular</div>
                  </div>
                </div>

                {Object.keys(grouped).length === 0 && (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "#6E5A44" }}>
                    <CalendarCheck2 size={28} style={{ margin: "0 auto 10px" }} />
                    <div style={{ fontSize: 13 }}>Las reservas de tus clientes aparecerán aquí.</div>
                  </div>
                )}
                {Object.entries(grouped).map(([date, items]) => (
                  <div key={date} style={{ marginBottom: 18 }}>
                    <div className="brb-mono" style={{ fontSize: 11, color: "#C08552", letterSpacing: "0.05em", marginBottom: 8, textTransform: "uppercase" }}>
                      {items[0].date_label}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {items.map((b) => (
                        <div key={b.id} style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div className="brb-mono" style={{ fontSize: 13, color: "#C08552", minWidth: 44 }}>{b.time_label}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{b.name} — {b.service_name}</div>
                              <div style={{ fontSize: 11, color: "#B99A76" }}>{b.phone} · {b.duration} min · {b.price}€</div>
                            </div>
                          </div>
                          <button
                            className="brb-btn"
                            onClick={() => removeBooking(b.id)}
                            aria-label="Eliminar reserva"
                            style={{ background: "transparent", border: "none", color: "#B87A7A", cursor: "pointer", padding: 6 }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : view === "manage" ? (
            <div>
              <div className="brb-serif" style={{ fontSize: 20, marginBottom: 4 }}>Mi reserva</div>
              <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 18 }}>
                Introduce el teléfono con el que reservaste para ver o cancelar tu cita.
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                <input
                  value={managePhone}
                  onChange={(e) => setManagePhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setManageSearched(true)}
                  placeholder="600 000 000"
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #3A2A1C", background: "#120C07", color: "#F1E6D8", fontSize: 14 }}
                />
                <button
                  className="brb-btn"
                  onClick={() => setManageSearched(true)}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#C08552", color: "#1A110B", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Search size={14} /> Buscar
                </button>
              </div>

              {manageSearched && (
                myBookings.length === 0 ? (
                  <div style={{ padding: "30px 0", textAlign: "center", color: "#6E5A44" }}>
                    <CalendarX2 size={26} style={{ margin: "0 auto 10px" }} />
                    <div style={{ fontSize: 13 }}>No hemos encontrado ninguna cita futura con ese teléfono.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {myBookings.map((b) => (
                      <div key={b.id} style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{b.service_name}</div>
                            <div className="brb-mono" style={{ fontSize: 11, color: "#B99A76", marginTop: 2, textTransform: "capitalize" }}>{b.date_label} · {b.time_label}</div>
                          </div>
                          <div className="brb-mono" style={{ fontSize: 13, color: "#C08552" }}>{b.price}€</div>
                        </div>
                        <button
                          className="brb-btn"
                          onClick={() => cancelMyBooking(b.id)}
                          disabled={cancellingId === b.id}
                          style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #6B3232", background: "transparent", color: "#E29A9A", fontSize: 12, fontWeight: 500, cursor: cancellingId === b.id ? "default" : "pointer", opacity: cancellingId === b.id ? 0.6 : 1 }}
                        >
                          {cancellingId === b.id ? "Cancelando…" : "Cancelar esta cita"}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          ) : (
            <>
              {step < 4 && (
                <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= step ? "#C08552" : "#3A2A1C" }} />
                  ))}
                </div>
              )}

              {step === 1 && (
                <div>
                  <div className="brb-serif" style={{ fontSize: 20, marginBottom: 4 }}>Elige un servicio</div>
                  <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 18 }}>
                    Martes a viernes 9:00–13:00 y 15:00–20:00 · Sábado 8:00–14:00
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                    {SERVICES.map((s) => (
                      <button
                        key={s.id}
                        className="brb-btn"
                        onClick={() => pickService(s)}
                        style={{ textAlign: "left", background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 12, padding: "14px 16px", cursor: "pointer", color: "#F1E6D8" }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{s.name}</div>
                        <div className="brb-mono" style={{ fontSize: 12, color: "#B99A76", display: "flex", justifyContent: "space-between" }}>
                          <span>{s.duration} min</span>
                          <span style={{ color: "#C08552" }}>{s.price}€</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && service && (
                <div>
                  <button className="brb-btn" onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "#B99A76", fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 14, padding: 0 }}>
                    <ChevronLeft size={14} /> Cambiar servicio
                  </button>
                  <div className="brb-serif" style={{ fontSize: 20, marginBottom: 2 }}>{service.name}</div>
                  <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 18 }}>{service.duration} min · {service.price}€</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <button className="brb-btn" onClick={() => setDayOffset(Math.max(0, dayOffset - 6))} disabled={dayOffset === 0}
                      style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 8, padding: 6, cursor: dayOffset === 0 ? "default" : "pointer", opacity: dayOffset === 0 ? 0.4 : 1, color: "#F1E6D8" }}>
                      <ChevronLeft size={14} />
                    </button>
                    <div className="brb-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", flex: 1 }}>
                      {visibleDays.map((d) => {
                        const closed = getDayRanges(d.getDay()).length === 0;
                        const isSelected = selectedDate && dateKey(d) === dateKey(selectedDate);
                        return (
                          <button
                            key={dateKey(d)}
                            className="brb-btn"
                            disabled={closed}
                            onClick={() => pickDate(d)}
                            style={{
                              minWidth: 60, padding: "10px 6px", borderRadius: 10, textAlign: "center", cursor: closed ? "default" : "pointer",
                              background: isSelected ? "#C08552" : "#120C07",
                              border: `1px solid ${isSelected ? "#C08552" : "#3A2A1C"}`,
                              color: closed ? "#5A4A38" : isSelected ? "#1A110B" : "#F1E6D8",
                              opacity: closed ? 0.5 : 1,
                              flexShrink: 0,
                            }}
                          >
                            <div style={{ fontSize: 11, textTransform: "uppercase" }}>{DAY_NAMES[d.getDay()]}</div>
                            <div className="brb-mono" style={{ fontSize: 15, fontWeight: 600 }}>{d.getDate()}</div>
                          </button>
                        );
                      })}
                    </div>
                    <button className="brb-btn" onClick={() => setDayOffset(Math.min(days.length - 6, dayOffset + 6))} disabled={dayOffset + 6 >= days.length}
                      style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 8, padding: 6, cursor: "pointer", color: "#F1E6D8" }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {selectedDate && (
                    <div>
                      <div style={{ fontSize: 12, color: "#B99A76", marginBottom: 10, textTransform: "capitalize" }}>{formatDateLong(selectedDate)}</div>
                      {slots.length === 0 ? (
                        <div style={{ fontSize: 13, color: "#6E5A44", padding: "16px 0" }}>No quedan horas libres este día. Prueba otro día.</div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))", gap: 8 }}>
                          {slots.map((t) => (
                            <button
                              key={t}
                              className="brb-btn brb-mono"
                              onClick={() => setSelectedTime(t)}
                              style={{
                                padding: "8px 4px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                                background: selectedTime === t ? "#C08552" : "#120C07",
                                border: `1px solid ${selectedTime === t ? "#C08552" : "#3A2A1C"}`,
                                color: selectedTime === t ? "#1A110B" : "#F1E6D8",
                              }}
                            >
                              {minutesToLabel(t)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    className="brb-btn"
                    onClick={goToDetails}
                    disabled={selectedTime === null}
                    style={{
                      marginTop: 20, width: "100%", padding: "13px", borderRadius: 10, border: "none", fontWeight: 600, fontSize: 14,
                      cursor: selectedTime === null ? "default" : "pointer",
                      background: selectedTime === null ? "#3A2A1C" : "#C08552",
                      color: selectedTime === null ? "#6E5A44" : "#1A110B",
                    }}
                  >
                    Continuar
                  </button>
                </div>
              )}

              {step === 3 && service && selectedDate && (
                <div>
                  <button className="brb-btn" onClick={() => setStep(2)} style={{ background: "none", border: "none", color: "#B99A76", fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 14, padding: 0 }}>
                    <ChevronLeft size={14} /> Cambiar hora
                  </button>
                  <div className="brb-serif" style={{ fontSize: 20, marginBottom: 4 }}>Tus datos</div>
                  <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 18, textTransform: "capitalize" }}>
                    {service.name} · {formatDateLong(selectedDate)} · {minutesToLabel(selectedTime)}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: "#B99A76", display: "block", marginBottom: 6 }}>Nombre</label>
                    <input
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: null }); }}
                      placeholder="Tu nombre"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${errors.name ? "#B87A7A" : "#3A2A1C"}`, background: "#120C07", color: "#F1E6D8", fontSize: 14 }}
                    />
                    {errors.name && <div style={{ color: "#E29A9A", fontSize: 12, marginTop: 4 }}>{errors.name}</div>}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, color: "#B99A76", display: "block", marginBottom: 6 }}>Teléfono</label>
                    <input
                      value={form.phone}
                      onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (errors.phone) setErrors({ ...errors, phone: null }); }}
                      placeholder="600 000 000"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${errors.phone ? "#B87A7A" : "#3A2A1C"}`, background: "#120C07", color: "#F1E6D8", fontSize: 14 }}
                    />
                    {errors.phone && <div style={{ color: "#E29A9A", fontSize: 12, marginTop: 4 }}>{errors.phone}</div>}
                  </div>

                  {errors.general && (
                    <div style={{ background: "#3A1E1E", border: "1px solid #6B3232", color: "#E8B4B4", fontSize: 12, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                      {errors.general}
                    </div>
                  )}

                  <button
                    className="brb-btn"
                    onClick={validateAndConfirm}
                    disabled={submitting}
                    style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", fontWeight: 600, fontSize: 14, cursor: submitting ? "default" : "pointer", background: "#C08552", color: "#1A110B", opacity: submitting ? 0.7 : 1 }}
                  >
                    {submitting ? "Reservando…" : "Confirmar reserva"}
                  </button>
                </div>
              )}

              {step === 4 && confirmed && (
                <div>
                  <div style={{ background: "#F1E6D8", color: "#2A1B12", borderRadius: 14, padding: "22px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "repeating-linear-gradient(90deg, #C08552 0 8px, transparent 8px 16px)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, marginTop: 6 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#2A1B12", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={16} color="#C08552" />
                      </div>
                      <div className="brb-serif" style={{ fontSize: 17, fontWeight: 600 }}>Reserva confirmada</div>
                    </div>
                    <div style={{ borderTop: "1px dashed #B9A98C", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <Row label="Servicio" value={confirmed.service_name} />
                      <Row label="Fecha" value={confirmed.date_label} cap />
                      <Row label="Hora" value={confirmed.time_label} mono />
                      <Row label="Duración" value={`${confirmed.duration} min`} mono />
                      <Row label="Precio" value={`${confirmed.price}€`} mono />
                      <Row label="Nombre" value={confirmed.name} />
                      <Row label="Teléfono" value={confirmed.phone} mono />
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#B99A76", textAlign: "center", margin: "14px 0 14px" }}>
                    Envía la confirmación para que quede constancia:
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <a
                      href={buildWhatsAppLink(confirmed)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="brb-btn"
                      style={{ flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, fontWeight: 500, fontSize: 13, background: "#25D366", color: "#1A110B" }}
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                    {!emailFormOpen && !emailSent && (
                      <button
                        onClick={() => setEmailFormOpen(true)}
                        className="brb-btn"
                        style={{ flex: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, fontWeight: 500, fontSize: 13, border: "1px solid #4A3626", color: "#F1E6D8", background: "transparent" }}
                      >
                        <Mail size={15} /> Email
                      </button>
                    )}
                  </div>

                  {emailFormOpen && !emailSent && (
                    <div style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: "#B99A76", marginBottom: 8 }}>Te enviamos la confirmación a tu email:</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          value={emailInput}
                          onChange={(e) => { setEmailInput(e.target.value); if (emailError) setEmailError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && sendConfirmationEmail()}
                          placeholder="tunombre@gmail.com"
                          style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: `1px solid ${emailError ? "#B87A7A" : "#3A2A1C"}`, background: "#1A110B", color: "#F1E6D8", fontSize: 13 }}
                        />
                        <button
                          onClick={sendConfirmationEmail}
                          disabled={emailSending}
                          className="brb-btn"
                          style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#C08552", color: "#1A110B", fontWeight: 600, fontSize: 13, cursor: emailSending ? "default" : "pointer", opacity: emailSending ? 0.7 : 1 }}
                        >
                          {emailSending ? "..." : "Enviar"}
                        </button>
                      </div>
                      {emailError && <div style={{ color: "#E29A9A", fontSize: 12, marginTop: 6 }}>{emailError}</div>}
                    </div>
                  )}

                  {emailSent && (
                    <div style={{ background: "#16281C", border: "1px solid #2D4A34", borderRadius: 10, padding: "10px 14px", marginBottom: 10, fontSize: 13, color: "#A8D9B4", display: "flex", alignItems: "center", gap: 8 }}>
                      <Check size={15} /> Email enviado a {emailInput.trim()}
                    </div>
                  )}

                  <button
                    className="brb-btn"
                    onClick={resetFlow}
                    style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid #4A3626", fontWeight: 500, fontSize: 14, cursor: "pointer", background: "transparent", color: "#F1E6D8" }}
                  >
                    Hacer otra reserva
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ borderTop: "1px solid #3A2A1C", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <a href={SALON_INSTAGRAM} target="_blank" rel="noopener noreferrer" style={{ color: "#B99A76", display: "flex", alignItems: "center", gap: 6, fontSize: 12, textDecoration: "none" }}>
            <Instagram size={14} /> @labarberia.breda
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Row({ label, value, mono, cap }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "#7A6650" }}>{label}</span>
      <span className={mono ? "brb-mono" : ""} style={{ fontWeight: 500, textTransform: cap ? "capitalize" : "none" }}>{value}</span>
    </div>
  );
}
