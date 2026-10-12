
import express from "express";
import http from "http";
import { Server } from "socket.io";
import {
  TikTokLiveConnection,
  WebcastEvent
} from "tiktok-live-connector";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME;

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "Duelo LIVE",
    tiktokConnected: Boolean(connectionState)
  });
});

let connectionState = false;

io.on("connection", (socket) => {
  console.log("Site Duelo LIVE conectado:", socket.id);

  socket.emit("server-status", {
    online: true,
    tiktokConnected: connectionState
  });
});

let tiktokConnection;

async function connectTikTok() {
  if (!TIKTOK_USERNAME) {
    console.log(
      "Configure TIKTOK_USERNAME nas variáveis do Render."
    );
    return;
  }

  try {
    tiktokConnection = new TikTokLiveConnection(
      TIKTOK_USERNAME,
      { enableExtendedGiftInfo: true }
    );

    tiktokConnection.on("connected", () => {
      connectionState = true;
      io.emit("server-status", {
        online: true,
        tiktokConnected: true
      });
      console.log("Conectado à TikTok LIVE!");
    });

    tiktokConnection.on(WebcastEvent.GIFT, (data) => {
      if (data.giftType === 1 && !data.repeatEnd) {
        return;
      }

      const alert = {
        user: data.user?.uniqueId || "Alguém",
        gift: data.giftName ||
          data.giftDetails?.giftName ||
          "Presente",
        count: data.repeatCount || 1,
        timestamp: Date.now()
      };

      console.log("Presente recebido:", alert);
      io.emit("gift-alert", alert);
    });

    tiktokConnection.on("disconnected", () => {
      connectionState = false;
      io.emit("server-status", {
        online: true,
        tiktokConnected: false
      });
      console.log("Conexão TikTok encerrada.");
    });

    tiktokConnection.on("error", (error) => {
      console.error("Erro TikTok:", error.message || error);
    });

    await tiktokConnection.connect();
  } catch (error) {
    connectionState = false;
    console.error(
      "Não foi possível conectar à LIVE:",
      error.message || error
    );
  }
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Duelo LIVE iniciado na porta ${PORT}`);
  connectTikTok();
});
