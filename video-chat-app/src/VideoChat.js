import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3001");

const countryOptions = [
  { code: "", label: "🌐" },
  { code: "TR", label: "🇹🇷" },
  { code: "US", label: "🇺🇸" },
  { code: "DE", label: "🇩🇪" },
  { code: "FR", label: "🇫🇷" }
];

const Button = ({ onClick, children, variant = "default", className = "" }) => {
  const base = "px-6 py-3 rounded-xl font-semibold text-lg";
  const styles = {
    default: "bg-blue-500 text-white hover:bg-blue-600",
    outline: "border border-blue-500 text-blue-500 hover:bg-blue-100",
    destructive: "bg-red-500 text-white hover:bg-red-600"
  };
  return (
    <button onClick={onClick} className={`${base} ${styles[variant] || styles.default} ${className}`}>
      {children}
    </button>
  );
};

export default function VideoChat() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);
  const [chat, setChat] = useState("");
  const [messages, setMessages] = useState([]);
  const [inCall, setInCall] = useState(false);
  const [peerConnection, setPeerConnection] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [theme, setTheme] = useState("light");
  const [country, setCountry] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [callStarted, setCallStarted] = useState(false);

  useEffect(() => {
    socket.on("message", (msg) => {
      setMessages((prev) => [...prev, { from: "karşı", text: msg }]);
    });

    socket.on("offer", async (offer) => {
      const pc = createPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", answer);
      setInCall(true);
      setWaiting(false);
      setCallStarted(true);
    });

    socket.on("answer", async (answer) => {
      await peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
      setInCall(true);
      setWaiting(false);
      setCallStarted(true);
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("ICE Error", e);
      }
    });
  }, [peerConnection]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection();
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", e.candidate);
      }
    };
    pc.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };
    setPeerConnection(pc);
    return pc;
  };

  const startCall = async () => {
    setWaiting(true);
    setCallStarted(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", offer);
  };

  const handleSend = () => {
    if (chat.trim()) {
      socket.emit("message", chat);
      setMessages([...messages, { from: "sen", text: chat }]);
      setChat("");
    }
  };

  const handleNext = () => {
    alert("Yeni kullanıcıya bağlanılıyor...");
    window.location.reload();
  };

  const handleStop = () => {
    setInCall(false);
    setCallStarted(false);
    peerConnection?.close();
    localVideoRef.current.srcObject?.getTracks().forEach(track => track.stop());
    remoteVideoRef.current.srcObject?.getTracks().forEach(track => track.stop());
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleLogin = () => {
    if (username.trim() && password.trim()) {
      setIsLoggedIn(true);
    }
  };

  if (!ageConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center gap-4">
        <h2 className="text-xl font-bold">Bu site 18 yaş ve üzeri kullanıcılar içindir.</h2>
        <Button onClick={() => setAgeConfirmed(true)}>18 yaşından büyüğüm, devam et</Button>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center gap-4">
        <h2 className="text-xl font-bold">Giriş Yap veya Misafir Olarak Devam Et</h2>
        <input
          type="text"
          placeholder="Kullanıcı adı"
          className="border p-2 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Şifre"
          className="border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex gap-2">
          <Button onClick={handleLogin}>Giriş Yap</Button>
          <Button variant="outline" onClick={() => setIsLoggedIn(true)}>Misafir Girişi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 grid grid-cols-2 gap-4 min-h-screen ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
      <div className="col-span-2 flex justify-between items-center mb-4 relative">
        <div className="flex gap-2 items-center relative">
          <button
            className="w-10 h-10 rounded-full border text-xl text-center"
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
          >
            {countryOptions.find((opt) => opt.code === country)?.label || "🌐"}
          </button>
          {showCountryDropdown && (
            <div className={`absolute top-12 left-0 flex gap-2 p-2 rounded shadow border z-10 ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}`}>
              {countryOptions.map((opt) => (
                <button
                  key={opt.code}
                  className={`text-xl ${country === opt.code ? "ring-2 ring-blue-500 rounded-full" : ""}`}
                  onClick={() => {
                    setCountry(opt.code);
                    setShowCountryDropdown(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button onClick={toggleTheme}>{theme === "light" ? "Karanlık Tema" : "Aydınlık Tema"}</Button>
      </div>

      <div className="border border-gray-400 rounded-2xl overflow-hidden aspect-video col-span-1">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <p className="text-center">Sen</p>
      </div>

      <div className="border border-gray-400 rounded-2xl overflow-hidden aspect-video col-span-1">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <p className="text-center">Karşı</p>
      </div>

      <div className="col-span-1 border border-gray-400 rounded-2xl p-4 h-64 flex flex-col justify-between">
        <div className="overflow-y-auto">
          {messages.map((msg, idx) => (
            <div key={idx} className="mb-2">
              <strong>{msg.from}: </strong>{msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-grow border p-2 rounded"
            placeholder="Mesaj yaz..."
          />
          <Button onClick={handleSend} className="px-4 py-2 rounded-md text-sm">Gönder</Button>
        </div>
      </div>

      <div className="col-span-1 flex flex-col gap-2">
        <div className="flex gap-2">
          {!callStarted && <Button onClick={startCall}>Görüşmeye Başla</Button>}
          <Button onClick={handleNext} variant="outline">Geç</Button>
          <Button variant="destructive" onClick={handleStop}>Durdur</Button>
        </div>
      </div>

      {waiting && (
        <div className="col-span-2 text-center text-blue-400 font-semibold animate-pulse mt-4">
          Eşleşme bekleniyor...
        </div>
      )}
    </div>
  );
}
