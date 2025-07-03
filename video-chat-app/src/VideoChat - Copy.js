
import React, { useRef, useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import io from "socket.io-client";

const socket = io("http://localhost:3001");

export default function VideoChat() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
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
    });

    socket.on("answer", async (answer) => {
      await peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
      setInCall(true);
      setWaiting(false);
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("ICE Error", e);
      }
    });
  }, [peerConnection]);

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
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    const pc = createPeerConnection();
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { offer, country });
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
    peerConnection?.close();
    localVideoRef.current.srcObject?.getTracks().forEach(track => track.stop());
    remoteVideoRef.current.srcObject?.getTracks().forEach(track => track.stop());
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "light");
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
        <h2 className="text-xl font-bold">Hoş geldiniz! Giriş yapabilir veya misafir olarak devam edebilirsiniz.</h2>
        <input type="text" placeholder="Kullanıcı adı (isteğe bağlı)" value={username} onChange={(e) => setUsername(e.target.value)} className="border p-2 rounded" />
        <Button onClick={() => setIsLoggedIn(true)}>Devam Et</Button>
      </div>
    );
  }

  return (
    <div className={`p-4 grid grid-cols-2 gap-4 ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
      <div className="col-span-2 flex justify-between items-center mb-4">
        <div className="flex gap-2 items-center">
          <label>Ülke:</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="border rounded p-1">
            <option value="">Farketmez</option>
            <option value="TR">Türkiye</option>
            <option value="US">ABD</option>
            <option value="DE">Almanya</option>
            <option value="FR">Fransa</option>
          </select>
        </div>
        <Button onClick={toggleTheme}>{theme === "light" ? "Karanlık Tema" : "Aydınlık Tema"}</Button>
      </div>

      <div className="border border-gray-400 rounded-2xl overflow-hidden">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full" />
        <p className="text-center">Sen</p>
      </div>

      <div className="border border-gray-400 rounded-2xl overflow-hidden">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full" />
        <p className="text-center">Karşı</p>
      </div>

      <div className="col-span-2 border border-gray-400 rounded-2xl p-4 h-64 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-2">
            <strong>{msg.from}: </strong>{msg.text}
          </div>
        ))}
      </div>

      <div className="col-span-2 flex gap-2 mt-2">
        <input
          type="text"
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 border p-2 rounded"
          placeholder="Mesaj yaz..."
        />
        <Button onClick={handleSend}>Gönder</Button>
        <Button onClick={handleNext}>Geç</Button>
        <Button variant="destructive" onClick={handleStop}>Durdur</Button>
      </div>

      {!inCall && (
        <div className="col-span-2 text-center mt-4">
          <Button onClick={startCall}>Görüşmeye Başla</Button>
        </div>
      )}

      {waiting && (
        <div className="col-span-2 text-center text-blue-400 font-semibold animate-pulse mt-4">
          Eşleşme bekleniyor...
        </div>
      )}
    </div>
  );
}
