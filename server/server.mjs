import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { readFile } from "fs/promises";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);
const io = new Server().listen(server);
server.listen(
  process.env.PORT || 3000,
  process.env.ADDRESS || "0.0.0.0",
  () => {
    console.log(
      `Running at http://${server.address().address}:${server.address().port}`
    );
  }
);

io.on("connection", (socket) => {
  socket.on("join", (payload) => {
    socket.join(payload);
  });
});

app.use("/streams/:id/buttons", express.static("./buttons/dist"));

app.use("/", express.static("./buttons/dist"));

app.get("/streams/:id", (req, res) => {
  res.sendFile("output.html", { root: "./public" });
});

app.post("/streams/:id", async (req, res) => {
  const stream = io.to(req.params.id);
  if (req.body.play) {
    stream.emit("play", req.body.play);
  } else if (req.body.stop) {
    stream.emit("stop");
  } else if (req.body.reload) {
    stream.emit("reload");
  } else if (req.body.clip) {
    const clips = await getClips();
    const clip = clips.find((clip) => clip.id === req.body.clip);
    if (clip) {
      if (clip.end) {
        stream.emit("play", `${clip.file}#t=${clip.start || 0},${clip.end}`);
      } else if (clip.start) {
        stream.emit("play", `${clip.file}#t=${clip.start}`);
      } else {
        stream.emit("play", `${clip.file}`);
      }
    } else {
      res.status(400).send("Unknown clip");
    }
  }
  res.status(204).end();
});

app.get("/clips", async (req, res) => {
  const clips = await getClips();
  res.json(clips).end();
});

app.get("/clips/:id/thumbnail.jpg", async (req, res) => {
  const clips = await getClips();
  const clip = clips.find((c) => c.id === req.params.id);
  if (!clip) {
    return res.status(404).end();
  }

  const thumbnail = `${clip.id}.jpg`;

  if (!fs.existsSync(path.resolve("./videos/thumbnails", thumbnail))) {
    console.log("creating", thumbnail);
    await new Promise((resolve) => {
      const p = spawn("ffmpeg", [
        "-i",
        path.resolve("./videos", clip.file),
        "-vframes",
        "1",
        "-an",
        "-ss",
        clip.start || 0,
        path.resolve("./videos/thumbnails", thumbnail),
      ]);
      p.on("exit", () => resolve());
    });
  }
  res.sendFile(thumbnail, {
    root: "./videos/thumbnails",
  });
});

app.use("/videos", express.static("./videos"));

async function getClips() {
  return JSON.parse(await readFile("./clips.json", "utf8"));
}
