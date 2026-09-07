import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Scissors, Clock, Check, ChevronLeft, ChevronRight,
  Lock, Trash2, ArrowLeft, CalendarCheck2, MessageCircle, Mail, Instagram, Loader2, CalendarX2, Search, LogOut,
  MapPin, Phone
} from "lucide-react";
import { supabase } from "./supabaseClient";

const SERVICES = [
  { id: "corte", name: { es: "Corte de pelo", ca: "Tall de cabell" }, duration: 30, price: 15 },
  { id: "barba", name: { es: "Arreglo de barba", ca: "Arranjament de barba" }, duration: 20, price: 12 },
  { id: "corte-barba", name: { es: "Corte + barba", ca: "Tall + barba" }, duration: 45, price: 22 },
  { id: "afeitado", name: { es: "Afeitado clásico a navaja", ca: "Afaitat clàssic a navalla" }, duration: 30, price: 15 },
  { id: "nino", name: { es: "Corte niño (-12 años)", ca: "Tall nen (-12 anys)" }, duration: 25, price: 12 },
  { id: "color", name: { es: "Camuflaje de canas", ca: "Camuflatge de cabells blancs" }, duration: 45, price: 25 },
];

const DAY_NAMES = {
  es: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  ca: ["dg", "dl", "dt", "dc", "dj", "dv", "ds"],
};
const DAY_NAMES_FULL = {
  es: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  ca: ["diumenge", "dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte"],
};
const MONTH_NAMES = {
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  ca: ["gen", "feb", "mar", "abr", "maig", "juny", "jul", "ag", "set", "oct", "nov", "des"],
};

// (El PIN ya no se usa — el panel ahora requiere iniciar sesión de verdad con Supabase Auth)

// --- Datos de contacto del negocio ---
const SALON_WHATSAPP = "34638239929"; // formato internacional, sin '+' ni espacios
const SALON_EMAIL = "hola@labarberia.example"; // CAMBIA ESTO
const SALON_INSTAGRAM = "https://www.instagram.com/labarberia.breda/";
const SALON_PHONE = "972970537";
const SALON_PHONE_LABEL = "972 97 05 37";
const SALON_ADDRESS = "C/ Capellans, 22, 17400 Breda (Girona)";
const SALON_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("La Barbería, " + SALON_ADDRESS)}`;

// EDITAR: sustituye por la política real del negocio en cuanto el dueño te la confirme
const CANCELLATION_POLICY = {
  es: "Puedes cancelar o cambiar tu cita gratis hasta 2 horas antes, desde la sección \"Mi reserva\" con tu teléfono y tu código de cancelación. Si no puedes venir, avísanos con tiempo — así podemos ofrecer esa hora a otro cliente.",
  ca: "Pots cancel·lar o canviar la teva cita gratis fins a 2 hores abans, des de la secció \"La meva reserva\" amb el teu telèfon i el teu codi de cancel·lació. Si no pots venir, avisa'ns amb temps — així podem oferir aquesta hora a un altre client.",
};

// --- Traducciones de la interfaz ---
const STR = {
  myBooking: { es: "Mi reserva", ca: "La meva reserva" },
  panel: { es: "Panel", ca: "Panell" },
  reserve: { es: "Reservar", ca: "Reservar" },
  dbErrorPrefix: { es: "Error de conexión con la base de datos:", ca: "Error de connexió amb la base de dades:" },
  dbErrorSuffix: { es: "Revisa tu archivo .env.", ca: "Revisa el teu arxiu .env." },
  ownerAccess: { es: "Acceso del propietario", ca: "Accés del propietari" },
  loginSubtitle: { es: "Inicia sesión para ver las reservas", ca: "Inicia sessió per veure les reserves" },
  emailPlaceholder: { es: "tu@email.com", ca: "el.teu@email.com" },
  passwordPlaceholder: { es: "Contraseña", ca: "Contrasenya" },
  loginErrorEmpty: { es: "Introduce el email y la contraseña", ca: "Introdueix l'email i la contrasenya" },
  loginErrorWrong: { es: "Email o contraseña incorrectos", ca: "Email o contrasenya incorrectes" },
  loggingIn: { es: "Entrando…", ca: "Entrant…" },
  enter: { es: "Entrar", ca: "Entrar" },
  bookingsTitle: { es: "Reservas", ca: "Reserves" },
  logout: { es: "Cerrar sesión", ca: "Tancar sessió" },
  noBookingsYet: { es: "Todavía no hay reservas.", ca: "Encara no hi ha reserves." },
  weekBookings: { es: "Reservas esta semana", ca: "Reserves aquesta setmana" },
  weekRevenue: { es: "Ingresos esta semana", ca: "Ingressos aquesta setmana" },
  popularService: { es: "Servicio más popular", ca: "Servei més popular" },
  clientBookingsHere: { es: "Las reservas de tus clientes aparecerán aquí.", ca: "Les reserves dels teus clients apareixeran aquí." },
  manageTitle: { es: "Mi reserva", ca: "La meva reserva" },
  manageSubtitle: { es: "Introduce el teléfono y el código de cancelación que recibiste al reservar.", ca: "Introdueix el telèfon i el codi de cancel·lació que vas rebre en reservar." },
  phoneFieldPlaceholder: { es: "Teléfono: 600 000 000", ca: "Telèfon: 600 000 000" },
  codePlaceholder: { es: "Código de cancelación (ej. X7K2P9)", ca: "Codi de cancel·lació (ex. X7K2P9)" },
  search: { es: "Buscar", ca: "Cercar" },
  noFutureBooking: { es: "No hemos encontrado ninguna cita futura con esos datos. Revisa el teléfono y el código.", ca: "No hem trobat cap cita futura amb aquestes dades. Revisa el telèfon i el codi." },
  changeTime: { es: "Cambiar hora", ca: "Canviar hora" },
  close: { es: "Cerrar", ca: "Tancar" },
  cancelThisAppt: { es: "Cancelar esta cita", ca: "Cancel·lar aquesta cita" },
  cancelling: { es: "Cancelando…", ca: "Cancel·lant…" },
  noFreeSlotsShort: { es: "No quedan horas libres ese día.", ca: "No queden hores lliures aquest dia." },
  saving: { es: "Guardando…", ca: "Desant…" },
  saveNewTime: { es: "Guardar nueva hora", ca: "Desar nova hora" },
  chooseService: { es: "Elige un servicio", ca: "Tria un servei" },
  scheduleText: { es: "Martes a viernes 9:00–13:00 y 15:00–20:00 · Sábado 8:00–14:00", ca: "Dimarts a divendres 9:00–13:00 i 15:00–20:00 · Dissabte 8:00–14:00" },
  min: { es: "min", ca: "min" },
  changeService: { es: "Cambiar servicio", ca: "Canviar servei" },
  noFreeSlotsLong: { es: "No quedan horas libres este día. Prueba otro día.", ca: "No queden hores lliures aquest dia. Prova un altre dia." },
  continue: { es: "Continuar", ca: "Continuar" },
  yourData: { es: "Tus datos", ca: "Les teves dades" },
  nameLabel: { es: "Nombre", ca: "Nom" },
  namePlaceholder: { es: "Tu nombre", ca: "El teu nom" },
  errName: { es: "Introduce tu nombre", ca: "Introdueix el teu nom" },
  phoneLabel: { es: "Teléfono", ca: "Telèfon" },
  phonePlaceholder: { es: "600 000 000", ca: "600 000 000" },
  errPhone: { es: "Introduce un teléfono válido", ca: "Introdueix un telèfon vàlid" },
  emailOptionalLabel: { es: "Email (opcional — recibirás la confirmación y el código de cancelación automáticamente)", ca: "Email (opcional — rebràs la confirmació i el codi de cancel·lació automàticament)" },
  emailPlaceholder2: { es: "tunombre@email.com", ca: "elteunom@email.com" },
  errEmail: { es: "Ese email no parece válido", ca: "Aquest email no sembla vàlid" },
  consentSuffixEmail: { es: " y email", ca: " i email" },
  consentPrefix: { es: "Acepto que La Barbería trate mis datos (nombre, teléfono", ca: "Accepto que La Barberia tracti les meves dades (nom, telèfon" },
  consentSuffix: { es: ") únicamente para gestionar mi cita, según la normativa de protección de datos.", ca: ") únicament per gestionar la meva cita, segons la normativa de protecció de dades." },
  errConsent: { es: "Tienes que aceptar el tratamiento de datos para reservar", ca: "Has d'acceptar el tractament de dades per reservar" },
  errConflict: { es: "Esa hora se acaba de reservar por otra persona. Elige otra, por favor.", ca: "Aquesta hora s'acaba de reservar per una altra persona. Tria'n una altra, si us plau." },
  errGeneral: { es: "No se pudo completar la reserva. Inténtalo de nuevo.", ca: "No s'ha pogut completar la reserva. Torna-ho a provar." },
  bookingLoading: { es: "Reservando…", ca: "Reservant…" },
  confirmBooking: { es: "Confirmar reserva", ca: "Confirmar reserva" },
  bookingConfirmed: { es: "Reserva confirmada", ca: "Reserva confirmada" },
  rowService: { es: "Servicio", ca: "Servei" },
  rowDate: { es: "Fecha", ca: "Data" },
  rowTime: { es: "Hora", ca: "Hora" },
  rowDuration: { es: "Duración", ca: "Durada" },
  rowPrice: { es: "Precio", ca: "Preu" },
  rowName: { es: "Nombre", ca: "Nom" },
  rowPhone: { es: "Teléfono", ca: "Telèfon" },
  cancelCodeLabel: { es: "Código de cancelación — guárdalo para modificar o cancelar tu cita", ca: "Codi de cancel·lació — guarda'l per modificar o cancel·lar la teva cita" },
  sendConfirmationText: { es: "Envía la confirmación para que quede constancia:", ca: "Envia la confirmació perquè quedi constància:" },
  whatsapp: { es: "WhatsApp", ca: "WhatsApp" },
  emailBtn: { es: "Email", ca: "Email" },
  emailFormLabel: { es: "Te enviamos la confirmación a tu email:", ca: "T'enviem la confirmació al teu email:" },
  send: { es: "Enviar", ca: "Enviar" },
  errEmailForm: { es: "Introduce un email válido", ca: "Introdueix un email vàlid" },
  errEmailSend: { es: "No se pudo enviar el email. Inténtalo de nuevo.", ca: "No s'ha pogut enviar l'email. Torna-ho a provar." },
  emailAutoError: { es: "No se pudo enviar el email automáticamente. Guarda igualmente tu código de cancelación de arriba.", ca: "No s'ha pogut enviar l'email automàticament. Guarda igualment el teu codi de cancel·lació de dalt." },
  addToCalendar: { es: "Añadir a mi calendario", ca: "Afegir al meu calendari" },
  newBooking: { es: "Hacer otra reserva", ca: "Fer una altra reserva" },
  cancellationPolicyLink: { es: "Política de cancelación", ca: "Política de cancel·lació" },
  deleteBookingAria: { es: "Eliminar reserva", ca: "Eliminar reserva" },
};

function pad(n) { return n.toString().padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function minutesToLabel(m) { return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }
function formatDateLong(d, lang) { return `${DAY_NAMES_FULL[lang][d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[lang][d.getMonth()]}`; }

// Horario real: martes a viernes en dos turnos, sábado en turno único, domingo y lunes cerrado
function getDayRanges(dow) {
  if ([2, 3, 4, 5].includes(dow)) return [{ start: 9 * 60, end: 13 * 60 }, { start: 15 * 60, end: 20 * 60 }];
  if (dow === 6) return [{ start: 8 * 60, end: 14 * 60 }];
  return [];
}

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

function generateCancelCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O, 1/I/L, para evitar confusiones
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function buildConfirmationMessage(b) {
  return `Hola! Confirmo mi cita en La Barbería:\n· Servicio: ${b.service_name}\n· Fecha: ${b.date_label}\n· Hora: ${b.time_label}\n· Nombre: ${b.name}\n· Teléfono: ${b.phone}\n· Código de cancelación: ${b.cancel_code}`;
}
function buildWhatsAppLink(b) {
  return `https://wa.me/${SALON_WHATSAPP}?text=${encodeURIComponent(buildConfirmationMessage(b))}`;
}
function buildMailtoLink(b) {
  const subject = encodeURIComponent(`Confirmación de cita - ${b.service_name}`);
  const body = encodeURIComponent(buildConfirmationMessage(b));
  return `mailto:${SALON_EMAIL}?subject=${subject}&body=${body}`;
}

function icsTimestamp(d) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildICS(b) {
  const [y, m, d] = b.date.split("-").map(Number);
  const start = new Date(y, m - 1, d, Math.floor(b.start_minutes / 60), b.start_minutes % 60);
  const end = new Date(start.getTime() + b.duration * 60000);
  const escapeText = (t) => String(t).replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//La Barberia//Reservas//ES",
    "BEGIN:VEVENT",
    `UID:${b.id}@labarberia`,
    `DTSTAMP:${icsTimestamp(new Date())}`,
    `DTSTART:${icsTimestamp(start)}`,
    `DTEND:${icsTimestamp(end)}`,
    `SUMMARY:${escapeText(`Cita en La Barbería — ${b.service_name}`)}`,
    `DESCRIPTION:${escapeText(`Código de cancelación: ${b.cancel_code}\\nGestiona tu cita en labarberia-three.vercel.app`)}`,
    "LOCATION:La Barbería",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(b) {
  const blob = new Blob([buildICS(b)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cita-la-barberia.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
    let attempt = 0;
    let lastError = null;
    while (attempt < 3) {
      const withCode = { ...booking, cancel_code: generateCancelCode() };
      const { data, error: err } = await supabase.from("bookings").insert([withCode]).select();
      if (!err) {
        await load();
        return { booking: data ? data[0] : null, error: null };
      }
      lastError = err;
      const isCodeCollision = err.code === "23505" && /cancel_code/i.test(err.message || "");
      if (!isCodeCollision) break;
      attempt++;
    }
    return { booking: null, error: lastError };
  }, [load]);

  const removeBooking = useCallback(async (id) => {
    const { error: err } = await supabase.from("bookings").delete().eq("id", id);
    if (err) { setError(err.message); return; }
    await load();
  }, [load]);

  const updateBooking = useCallback(async (id, updates) => {
    const { data, error: err } = await supabase.from("bookings").update(updates).eq("id", id).select();
    if (err) return { booking: null, error: err };
    await load();
    return { booking: data ? data[0] : null, error: null };
  }, [load]);

  return { bookings, loaded, error, addBooking, removeBooking, updateBooking, reload: load };
}

export default function App() {
  const { bookings, loaded, error, addBooking, removeBooking, updateBooking } = useBookings();

  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("labarberia-lang") || "ca";
    } catch {
      return "ca";
    }
  });
  useEffect(() => {
    try { localStorage.setItem("labarberia-lang", lang); } catch {}
  }, [lang]);
  const t = (key) => (STR[key] ? STR[key][lang] : key);

  const [view, setView] = useState("client");
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [consentChecked, setConsentChecked] = useState(false);
  const [autoEmailStatus, setAutoEmailStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setLoginError("");
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError(t("loginErrorEmpty"));
      return;
    }
    setLoginLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setLoginLoading(false);
    if (err) {
      setLoginError(t("loginErrorWrong"));
    } else {
      setLoginPassword("");
    }
  }

  async function signOutAdmin() {
    await supabase.auth.signOut();
  }

  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showPolicy, setShowPolicy] = useState(false);

  const [managePhone, setManagePhone] = useState("");
  const [manageCode, setManageCode] = useState("");
  const [manageSearched, setManageSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const [editingBooking, setEditingBooking] = useState(null);
  const [editDayOffset, setEditDayOffset] = useState(0);
  const [editDate, setEditDate] = useState(null);
  const [editTime, setEditTime] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

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
    if (!form.name.trim()) errs.name = t("errName");
    if (!form.phone.trim() || form.phone.trim().length < 9) errs.phone = t("errPhone");
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = t("errEmail");
    if (!consentChecked) errs.consent = t("errConsent");
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const booking = {
      date: dateKey(selectedDate),
      date_label: formatDateLong(selectedDate, lang),
      start_minutes: selectedTime,
      time_label: minutesToLabel(selectedTime),
      duration: service.duration,
      service_id: service.id,
      service_name: service.name[lang],
      price: service.price,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      consent: true,
    };
    const saved = await addBooking(booking);
    setSubmitting(false);
    if (saved.error) {
      const isConflict = saved.error.code === "23P01" || /exclu/i.test(saved.error.message || "");
      if (isConflict) {
        setErrors({ general: t("errConflict") });
        setStep(2);
        setSelectedTime(null);
      } else {
        setErrors({ general: t("errGeneral") });
      }
      return;
    }
    if (saved.booking) {
      setConfirmed(saved.booking);
      setStep(4);
      if (saved.booking.email) {
        setAutoEmailStatus("sending");
        try {
          const r = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: saved.booking.email, booking: saved.booking }),
          });
          setAutoEmailStatus(r.ok ? "sent" : "error");
        } catch {
          setAutoEmailStatus("error");
        }
      }
    }
  }

  function resetFlow() {
    setStep(1);
    setService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setForm({ name: "", phone: "", email: "" });
    setConsentChecked(false);
    setAutoEmailStatus(null);
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
      setEmailError(t("errEmailForm"));
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
      setEmailError(t("errEmailSend"));
    }
    setEmailSending(false);
  }

  const myBookings = useMemo(() => {
    if (!manageSearched) return [];
    const normalizedPhone = managePhone.replace(/\s+/g, "");
    const normalizedCode = manageCode.trim().toUpperCase();
    const todayKey = dateKey(new Date());
    return bookings
      .filter((b) =>
        b.phone.replace(/\s+/g, "") === normalizedPhone &&
        (b.cancel_code || "").toUpperCase() === normalizedCode &&
        b.date >= todayKey
      )
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_minutes - b.start_minutes;
      });
  }, [bookings, managePhone, manageCode, manageSearched]);

  async function cancelMyBooking(id) {
    const ok = window.confirm(
      lang === "ca"
        ? "Segur que vols cancel·lar aquesta cita? Aquesta acció no es pot desfer."
        : "¿Seguro que quieres cancelar esta cita? Esta acción no se puede deshacer."
    );
    if (!ok) return;
    setCancellingId(id);
    await removeBooking(id);
    setCancellingId(null);
  }

  function startEditingBooking(b) {
    setEditingBooking(b);
    setEditDate(null);
    setEditTime(null);
    setEditDayOffset(0);
    setEditError("");
  }

  const editSlots = useMemo(() => {
    if (!editingBooking || !editDate) return [];
    const serviceStub = { duration: editingBooking.duration };
    const otherBookings = bookings.filter((b) => b.id !== editingBooking.id);
    return generateSlots(serviceStub, editDate, otherBookings);
  }, [editingBooking, editDate, bookings]);

  async function saveEditedBooking() {
    if (!editingBooking || editTime === null) return;
    setEditSaving(true);
    setEditError("");
    const result = await updateBooking(editingBooking.id, {
      date: dateKey(editDate),
      date_label: formatDateLong(editDate, lang),
      start_minutes: editTime,
      time_label: minutesToLabel(editTime),
    });
    setEditSaving(false);
    if (result.error) {
      const isConflict = result.error.code === "23P01" || /exclu/i.test(result.error.message || "");
      setEditError(isConflict
        ? (lang === "ca" ? "Aquesta hora s'acaba d'ocupar. Tria'n una altra." : "Esa hora se acaba de ocupar. Elige otra.")
        : (lang === "ca" ? "No s'ha pogut desar el canvi. Torna-ho a provar." : "No se pudo guardar el cambio. Inténtalo de nuevo."));
      return;
    }
    setEditingBooking(null);
    setEditDate(null);
    setEditTime(null);
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
        <div style={{ background: "#120C07", padding: "16px 20px", borderBottom: "1px solid #3A2A1C" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <img src="/logo.png" alt="La Barbería" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", background: "#F1E6D8", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div className="brb-serif" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.15, letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>LA BARBERÍA</div>
                <div className="brb-mono" style={{ fontSize: 9, color: "#B99A76", letterSpacing: "0.06em", marginTop: 3 }}>NEW OLD SCHOOL · SINCE 2024</div>
              </div>
            </div>
            <div style={{ display: "flex", border: "1px solid #4A3626", borderRadius: 999, overflow: "hidden", flexShrink: 0 }}>
              <button
                onClick={() => setLang("ca")}
                style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, background: lang === "ca" ? "#C08552" : "transparent", color: lang === "ca" ? "#1A110B" : "#D8B98C", border: "none", cursor: "pointer" }}
              >
                CA
              </button>
              <button
                onClick={() => setLang("es")}
                style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, background: lang === "es" ? "#C08552" : "transparent", color: lang === "es" ? "#1A110B" : "#D8B98C", border: "none", cursor: "pointer" }}
              >
                ES
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view === "client" && (
              <button
                className="brb-btn"
                onClick={() => { setView("manage"); setManagePhone(""); setManageCode(""); setManageSearched(false); }}
                style={{ flex: 1, background: "transparent", border: "1px solid #4A3626", color: "#D8B98C", borderRadius: 999, padding: "8px 10px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                <CalendarX2 size={13} /> {t("myBooking")}
              </button>
            )}
            <button
              className="brb-btn"
              onClick={() => setView(view === "client" ? "admin" : "client")}
              style={{ flex: 1, background: "transparent", border: "1px solid #4A3626", color: "#D8B98C", borderRadius: 999, padding: "8px 10px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {view === "client" ? <><Lock size={13} /> {t("panel")}</> : <><ArrowLeft size={13} /> {t("reserve")}</>}
            </button>
          </div>
        </div>

        <div style={{ padding: "22px 20px" }}>
          {error && (
            <div style={{ background: "#3A1E1E", border: "1px solid #6B3232", color: "#E8B4B4", fontSize: 12, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
              {t("dbErrorPrefix")} {error}. {t("dbErrorSuffix")}
            </div>
          )}

          {!loaded ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0", color: "#8A7358" }}>
              <Loader2 size={22} className="brb-spin" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : view === "admin" ? (
            !sessionChecked ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "60px 0", color: "#8A7358" }}>
                <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : !session ? (
              <div style={{ maxWidth: 320, margin: "40px auto", textAlign: "center" }}>
                <Lock size={26} color="#C08552" style={{ margin: "0 auto 14px" }} />
                <div className="brb-serif" style={{ fontSize: 18, marginBottom: 6 }}>{t("ownerAccess")}</div>
                <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 16 }}>{t("loginSubtitle")}</div>
                <input
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #4A3626", background: "#120C07", color: "#F1E6D8", marginBottom: 10, fontSize: 14 }}
                />
                <input
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && signIn()}
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #4A3626", background: "#120C07", color: "#F1E6D8", marginBottom: 10, fontSize: 14 }}
                />
                {loginError && <div style={{ color: "#E29A9A", fontSize: 12, marginBottom: 10 }}>{loginError}</div>}
                <button
                  className="brb-btn"
                  onClick={signIn}
                  disabled={loginLoading}
                  style={{ background: "#C08552", color: "#1A110B", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: loginLoading ? "default" : "pointer", width: "100%", opacity: loginLoading ? 0.7 : 1 }}
                >
                  {loginLoading ? t("loggingIn") : t("enter")}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div className="brb-serif" style={{ fontSize: 20 }}>{t("bookingsTitle")}</div>
                  <button
                    className="brb-btn"
                    onClick={signOutAdmin}
                    style={{ background: "transparent", border: "none", color: "#B99A76", fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
                  >
                    <LogOut size={12} /> {t("logout")}
                  </button>
                </div>
                <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 16 }}>
                  {sortedBookings.length === 0
                    ? t("noBookingsYet")
                    : `${sortedBookings.length} reserva${sortedBookings.length !== 1 ? "s" : ""} en total`}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 22 }}>
                  <div style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: "12px 10px" }}>
                    <div className="brb-mono" style={{ fontSize: 20, fontWeight: 600, color: "#C08552" }}>{stats.weekCount}</div>
                    <div style={{ fontSize: 10, color: "#B99A76", marginTop: 2 }}>{t("weekBookings")}</div>
                  </div>
                  <div style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: "12px 10px" }}>
                    <div className="brb-mono" style={{ fontSize: 20, fontWeight: 600, color: "#C08552" }}>{stats.weekRevenue}€</div>
                    <div style={{ fontSize: 10, color: "#B99A76", marginTop: 2 }}>{t("weekRevenue")}</div>
                  </div>
                  <div style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: "12px 10px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#C08552", lineHeight: 1.3 }}>{stats.popular}</div>
                    <div style={{ fontSize: 10, color: "#B99A76", marginTop: 4 }}>{t("popularService")}</div>
                  </div>
                </div>

                {Object.keys(grouped).length === 0 && (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "#6E5A44" }}>
                    <CalendarCheck2 size={28} style={{ margin: "0 auto 10px" }} />
                    <div style={{ fontSize: 13 }}>{t("clientBookingsHere")}</div>
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
                              <div style={{ fontSize: 11, color: "#B99A76" }}>{b.phone}{b.email ? ` · ${b.email}` : ""} · {b.duration} {t("min")} · {b.price}€</div>
                            </div>
                          </div>
                          <button
                            className="brb-btn"
                            onClick={() => {
                              const msg = lang === "ca"
                                ? `Vols eliminar la reserva de ${b.name} (${b.time_label})? Aquesta acció no es pot desfer.`
                                : `¿Eliminar la reserva de ${b.name} (${b.time_label})? Esta acción no se puede deshacer.`;
                              const ok = window.confirm(msg);
                              if (ok) removeBooking(b.id);
                            }}
                            aria-label={t("deleteBookingAria")}
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
              <div className="brb-serif" style={{ fontSize: 20, marginBottom: 4 }}>{t("manageTitle")}</div>
              <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 18 }}>
                {t("manageSubtitle")}
              </div>
              <div style={{ marginBottom: 10 }}>
                <input
                  value={managePhone}
                  onChange={(e) => setManagePhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setManageSearched(true)}
                  placeholder={t("phoneFieldPlaceholder")}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #3A2A1C", background: "#120C07", color: "#F1E6D8", fontSize: 14, marginBottom: 8 }}
                />
                <input
                  value={manageCode}
                  onChange={(e) => setManageCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setManageSearched(true)}
                  placeholder={t("codePlaceholder")}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #3A2A1C", background: "#120C07", color: "#F1E6D8", fontSize: 14, textTransform: "uppercase" }}
                />
              </div>
              <button
                className="brb-btn"
                onClick={() => setManageSearched(true)}
                style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: "none", background: "#C08552", color: "#1A110B", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 18 }}
              >
                <Search size={14} /> {t("search")}
              </button>

              {manageSearched && (
                myBookings.length === 0 ? (
                  <div style={{ padding: "30px 0", textAlign: "center", color: "#6E5A44" }}>
                    <CalendarX2 size={26} style={{ margin: "0 auto 10px" }} />
                    <div style={{ fontSize: 13 }}>{t("noFutureBooking")}</div>
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

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="brb-btn"
                            onClick={() => (editingBooking?.id === b.id ? setEditingBooking(null) : startEditingBooking(b))}
                            style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #4A3626", background: "transparent", color: "#D8B98C", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                          >
                            {editingBooking?.id === b.id ? t("close") : t("changeTime")}
                          </button>
                          <button
                            className="brb-btn"
                            onClick={() => cancelMyBooking(b.id)}
                            disabled={cancellingId === b.id}
                            style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #6B3232", background: "transparent", color: "#E29A9A", fontSize: 12, fontWeight: 500, cursor: cancellingId === b.id ? "default" : "pointer", opacity: cancellingId === b.id ? 0.6 : 1 }}
                          >
                            {cancellingId === b.id ? t("cancelling") : t("cancelThisAppt")}
                          </button>
                        </div>

                        {editingBooking?.id === b.id && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #3A2A1C" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                              <button className="brb-btn" onClick={() => setEditDayOffset(Math.max(0, editDayOffset - 6))} disabled={editDayOffset === 0}
                                style={{ background: "#1A110B", border: "1px solid #3A2A1C", borderRadius: 8, padding: 6, cursor: editDayOffset === 0 ? "default" : "pointer", opacity: editDayOffset === 0 ? 0.4 : 1, color: "#F1E6D8" }}>
                                <ChevronLeft size={13} />
                              </button>
                              <div className="brb-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1 }}>
                                {days.slice(editDayOffset, editDayOffset + 6).map((d) => {
                                  const closed = getDayRanges(d.getDay()).length === 0;
                                  const isSelected = editDate && dateKey(d) === dateKey(editDate);
                                  return (
                                    <button
                                      key={dateKey(d)}
                                      className="brb-btn"
                                      disabled={closed}
                                      onClick={() => { setEditDate(d); setEditTime(null); }}
                                      style={{
                                        minWidth: 50, padding: "8px 4px", borderRadius: 8, textAlign: "center", cursor: closed ? "default" : "pointer",
                                        background: isSelected ? "#C08552" : "#1A110B",
                                        border: `1px solid ${isSelected ? "#C08552" : "#3A2A1C"}`,
                                        color: closed ? "#5A4A38" : isSelected ? "#1A110B" : "#F1E6D8",
                                        opacity: closed ? 0.5 : 1,
                                        flexShrink: 0,
                                      }}
                                    >
                                      <div style={{ fontSize: 10, textTransform: "uppercase" }}>{DAY_NAMES[lang][d.getDay()]}</div>
                                      <div className="brb-mono" style={{ fontSize: 13, fontWeight: 600 }}>{d.getDate()}</div>
                                    </button>
                                  );
                                })}
                              </div>
                              <button className="brb-btn" onClick={() => setEditDayOffset(Math.min(days.length - 6, editDayOffset + 6))} disabled={editDayOffset + 6 >= days.length}
                                style={{ background: "#1A110B", border: "1px solid #3A2A1C", borderRadius: 8, padding: 6, cursor: "pointer", color: "#F1E6D8" }}>
                                <ChevronRight size={13} />
                              </button>
                            </div>

                            {editDate && (
                              editSlots.length === 0 ? (
                                <div style={{ fontSize: 12, color: "#6E5A44", padding: "8px 0" }}>{t("noFreeSlotsShort")}</div>
                              ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 6, marginBottom: 10 }}>
                                  {editSlots.map((t2) => (
                                    <button
                                      key={t2}
                                      className="brb-btn brb-mono"
                                      onClick={() => setEditTime(t2)}
                                      style={{
                                        padding: "6px 4px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                                        background: editTime === t2 ? "#C08552" : "#1A110B",
                                        border: `1px solid ${editTime === t2 ? "#C08552" : "#3A2A1C"}`,
                                        color: editTime === t2 ? "#1A110B" : "#F1E6D8",
                                      }}
                                    >
                                      {minutesToLabel(t2)}
                                    </button>
                                  ))}
                                </div>
                              )
                            )}

                            {editError && <div style={{ color: "#E29A9A", fontSize: 12, marginBottom: 8 }}>{editError}</div>}

                            <button
                              className="brb-btn"
                              onClick={saveEditedBooking}
                              disabled={editTime === null || editSaving}
                              style={{
                                width: "100%", padding: "9px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 12,
                                cursor: editTime === null || editSaving ? "default" : "pointer",
                                background: editTime === null ? "#3A2A1C" : "#C08552",
                                color: editTime === null ? "#6E5A44" : "#1A110B",
                              }}
                            >
                              {editSaving ? t("saving") : t("saveNewTime")}
                            </button>
                          </div>
                        )}
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
                  <div className="brb-serif" style={{ fontSize: 20, marginBottom: 4 }}>{t("chooseService")}</div>
                  <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 18 }}>
                    {t("scheduleText")}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                    {SERVICES.map((s) => (
                      <button
                        key={s.id}
                        className="brb-btn"
                        onClick={() => pickService(s)}
                        style={{ textAlign: "left", background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 12, padding: "14px 16px", cursor: "pointer", color: "#F1E6D8" }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{s.name[lang]}</div>
                        <div className="brb-mono" style={{ fontSize: 12, color: "#B99A76", display: "flex", justifyContent: "space-between" }}>
                          <span>{s.duration} {t("min")}</span>
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
                    <ChevronLeft size={14} /> {t("changeService")}
                  </button>
                  <div className="brb-serif" style={{ fontSize: 20, marginBottom: 2 }}>{service.name[lang]}</div>
                  <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 18 }}>{service.duration} {t("min")} · {service.price}€</div>

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
                            <div style={{ fontSize: 11, textTransform: "uppercase" }}>{DAY_NAMES[lang][d.getDay()]}</div>
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
                      <div style={{ fontSize: 12, color: "#B99A76", marginBottom: 10, textTransform: "capitalize" }}>{formatDateLong(selectedDate, lang)}</div>
                      {slots.length === 0 ? (
                        <div style={{ fontSize: 13, color: "#6E5A44", padding: "16px 0" }}>{t("noFreeSlotsLong")}</div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))", gap: 8 }}>
                          {slots.map((t2) => (
                            <button
                              key={t2}
                              className="brb-btn brb-mono"
                              onClick={() => setSelectedTime(t2)}
                              style={{
                                padding: "8px 4px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                                background: selectedTime === t2 ? "#C08552" : "#120C07",
                                border: `1px solid ${selectedTime === t2 ? "#C08552" : "#3A2A1C"}`,
                                color: selectedTime === t2 ? "#1A110B" : "#F1E6D8",
                              }}
                            >
                              {minutesToLabel(t2)}
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
                    {t("continue")}
                  </button>
                </div>
              )}

              {step === 3 && service && selectedDate && (
                <div>
                  <button className="brb-btn" onClick={() => setStep(2)} style={{ background: "none", border: "none", color: "#B99A76", fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 14, padding: 0 }}>
                    <ChevronLeft size={14} /> {t("changeTime")}
                  </button>
                  <div className="brb-serif" style={{ fontSize: 20, marginBottom: 4 }}>{t("yourData")}</div>
                  <div style={{ fontSize: 13, color: "#B99A76", marginBottom: 18, textTransform: "capitalize" }}>
                    {service.name[lang]} · {formatDateLong(selectedDate, lang)} · {minutesToLabel(selectedTime)}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: "#B99A76", display: "block", marginBottom: 6 }}>{t("nameLabel")}</label>
                    <input
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: null }); }}
                      placeholder={t("namePlaceholder")}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${errors.name ? "#B87A7A" : "#3A2A1C"}`, background: "#120C07", color: "#F1E6D8", fontSize: 14 }}
                    />
                    {errors.name && <div style={{ color: "#E29A9A", fontSize: 12, marginTop: 4 }}>{errors.name}</div>}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: "#B99A76", display: "block", marginBottom: 6 }}>{t("phoneLabel")}</label>
                    <input
                      value={form.phone}
                      onChange={(e) => { setForm({ ...form, phone: e.target.value }); if (errors.phone) setErrors({ ...errors, phone: null }); }}
                      placeholder={t("phonePlaceholder")}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${errors.phone ? "#B87A7A" : "#3A2A1C"}`, background: "#120C07", color: "#F1E6D8", fontSize: 14 }}
                    />
                    {errors.phone && <div style={{ color: "#E29A9A", fontSize: 12, marginTop: 4 }}>{errors.phone}</div>}
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, color: "#B99A76", display: "block", marginBottom: 6 }}>{t("emailOptionalLabel")}</label>
                    <input
                      value={form.email}
                      onChange={(e) => { setForm({ ...form, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: null }); }}
                      placeholder={t("emailPlaceholder2")}
                      type="email"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${errors.email ? "#B87A7A" : "#3A2A1C"}`, background: "#120C07", color: "#F1E6D8", fontSize: 14 }}
                    />
                    {errors.email && <div style={{ color: "#E29A9A", fontSize: 12, marginTop: 4 }}>{errors.email}</div>}
                  </div>

                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 20, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => { setConsentChecked(e.target.checked); if (errors.consent) setErrors({ ...errors, consent: null }); }}
                      style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: "#C08552" }}
                    />
                    <span style={{ fontSize: 11, color: "#B99A76", lineHeight: 1.4 }}>
                      {t("consentPrefix")}{form.email.trim() ? t("consentSuffixEmail") : ""}{t("consentSuffix")}
                    </span>
                  </label>
                  {errors.consent && <div style={{ color: "#E29A9A", fontSize: 12, marginTop: -14, marginBottom: 14 }}>{errors.consent}</div>}

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
                    {submitting ? t("bookingLoading") : t("confirmBooking")}
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
                      <div className="brb-serif" style={{ fontSize: 17, fontWeight: 600 }}>{t("bookingConfirmed")}</div>
                    </div>
                    <div style={{ borderTop: "1px dashed #B9A98C", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <Row label={t("rowService")} value={confirmed.service_name} />
                      <Row label={t("rowDate")} value={confirmed.date_label} cap />
                      <Row label={t("rowTime")} value={confirmed.time_label} mono />
                      <Row label={t("rowDuration")} value={`${confirmed.duration} ${t("min")}`} mono />
                      <Row label={t("rowPrice")} value={`${confirmed.price}€`} mono />
                      <Row label={t("rowName")} value={confirmed.name} />
                      <Row label={t("rowPhone")} value={confirmed.phone} mono />
                    </div>
                    <div style={{ marginTop: 16, background: "#2A1B12", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 11, color: "#B9A98C" }}>{t("cancelCodeLabel")}</div>
                      <div className="brb-mono" style={{ fontSize: 22, fontWeight: 700, color: "#F1E6D8", letterSpacing: "0.15em", marginTop: 4 }}>{confirmed.cancel_code}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#B99A76", textAlign: "center", margin: "14px 0 14px" }}>
                    {t("sendConfirmationText")}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <a
                      href={buildWhatsAppLink(confirmed)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="brb-btn"
                      style={{ flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, fontWeight: 500, fontSize: 13, background: "#25D366", color: "#1A110B" }}
                    >
                      <MessageCircle size={15} /> {t("whatsapp")}
                    </a>
                    {!confirmed.email && !emailFormOpen && !emailSent && (
                      <button
                        onClick={() => setEmailFormOpen(true)}
                        className="brb-btn"
                        style={{ flex: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, fontWeight: 500, fontSize: 13, border: "1px solid #4A3626", color: "#F1E6D8", background: "transparent" }}
                      >
                        <Mail size={15} /> {t("emailBtn")}
                      </button>
                    )}
                  </div>

                  {confirmed.email && (
                    <div style={{
                      background: autoEmailStatus === "error" ? "#3A1E1E" : "#16281C",
                      border: `1px solid ${autoEmailStatus === "error" ? "#6B3232" : "#2D4A34"}`,
                      borderRadius: 10, padding: "10px 14px", marginBottom: 10, fontSize: 13,
                      color: autoEmailStatus === "error" ? "#E8B4B4" : "#A8D9B4",
                      display: "flex", alignItems: "center", gap: 8
                    }}>
                      {autoEmailStatus === "sending" && (lang === "ca" ? <>Enviant confirmació a {confirmed.email}…</> : <>Enviando confirmación a {confirmed.email}…</>)}
                      {autoEmailStatus === "sent" && <><Check size={15} /> {lang === "ca" ? `Confirmació enviada a ${confirmed.email}` : `Confirmación enviada a ${confirmed.email}`}</>}
                      {autoEmailStatus === "error" && t("emailAutoError")}
                    </div>
                  )}

                  {!confirmed.email && emailFormOpen && !emailSent && (
                    <div style={{ background: "#120C07", border: "1px solid #3A2A1C", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: "#B99A76", marginBottom: 8 }}>{t("emailFormLabel")}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          value={emailInput}
                          onChange={(e) => { setEmailInput(e.target.value); if (emailError) setEmailError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && sendConfirmationEmail()}
                          placeholder={t("emailPlaceholder2")}
                          style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: `1px solid ${emailError ? "#B87A7A" : "#3A2A1C"}`, background: "#1A110B", color: "#F1E6D8", fontSize: 13 }}
                        />
                        <button
                          onClick={sendConfirmationEmail}
                          disabled={emailSending}
                          className="brb-btn"
                          style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#C08552", color: "#1A110B", fontWeight: 600, fontSize: 13, cursor: emailSending ? "default" : "pointer", opacity: emailSending ? 0.7 : 1 }}
                        >
                          {emailSending ? "..." : t("send")}
                        </button>
                      </div>
                      {emailError && <div style={{ color: "#E29A9A", fontSize: 12, marginTop: 6 }}>{emailError}</div>}
                    </div>
                  )}

                  {!confirmed.email && emailSent && (
                    <div style={{ background: "#16281C", border: "1px solid #2D4A34", borderRadius: 10, padding: "10px 14px", marginBottom: 10, fontSize: 13, color: "#A8D9B4", display: "flex", alignItems: "center", gap: 8 }}>
                      <Check size={15} /> {lang === "ca" ? `Email enviat a ${emailInput.trim()}` : `Email enviado a ${emailInput.trim()}`}
                    </div>
                  )}

                  <button
                    className="brb-btn"
                    onClick={() => downloadICS(confirmed)}
                    style={{ width: "100%", padding: "11px", borderRadius: 10, border: "1px solid #4A3626", fontWeight: 500, fontSize: 13, cursor: "pointer", background: "transparent", color: "#D8B98C", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}
                  >
                    📅 {t("addToCalendar")}
                  </button>

                  <button
                    className="brb-btn"
                    onClick={resetFlow}
                    style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid #4A3626", fontWeight: 500, fontSize: 14, cursor: "pointer", background: "transparent", color: "#F1E6D8" }}
                  >
                    {t("newBooking")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ borderTop: "1px solid #3A2A1C", padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", columnGap: 16, rowGap: 6 }}>
            <a href={SALON_MAPS_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#B99A76", display: "flex", alignItems: "center", gap: 6, fontSize: 12, textDecoration: "none" }}>
              <MapPin size={14} /> {SALON_ADDRESS}
            </a>
            <a href={`tel:+34${SALON_PHONE}`} style={{ color: "#B99A76", display: "flex", alignItems: "center", gap: 6, fontSize: 12, textDecoration: "none" }}>
              <Phone size={14} /> {SALON_PHONE_LABEL}
            </a>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <a href={SALON_INSTAGRAM} target="_blank" rel="noopener noreferrer" style={{ color: "#B99A76", display: "flex", alignItems: "center", gap: 6, fontSize: 12, textDecoration: "none" }}>
              <Instagram size={14} /> @labarberia.breda
            </a>
            <button
              onClick={() => setShowPolicy(!showPolicy)}
              style={{ background: "none", border: "none", color: "#B99A76", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0 }}
            >
              {t("cancellationPolicyLink")}
            </button>
          </div>
          {showPolicy && (
            <div style={{ fontSize: 12, color: "#8A7358", lineHeight: 1.5, textAlign: "center", maxWidth: 360 }}>
              {CANCELLATION_POLICY[lang]}
            </div>
          )}
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
