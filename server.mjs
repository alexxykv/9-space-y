import * as path from "path";
import fs from "fs";
import express from "express";
import https from "https";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const rootDir = process.cwd();
const port = 3000;
const app = express();

const privateKey = fs.readFileSync(path.join(rootDir, "/certs/server.key"));
const certificate = fs.readFileSync(path.join(rootDir, "/certs/server.cert"));
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);

app.use(express.static(path.join(rootDir, "/spa/build/")));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());
app.use(redirect);

function redirect(req, res, next) {
  const url = req.url;
  if (!req.cookies.username && !url.contains(["/login", "/static/", "/api/"])) {
    if (url !== "/client.mjs")
      res.redirect("/login")
  }

  next();
}

String.prototype.contains = function (items) {
  for (let item of items) {
    if (this.includes(item)) {
      return true;
    }
  } 
  return false;
}

app.get("/client.mjs", (_, res) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.sendFile(path.join(rootDir, "client.mjs"), {
    maxAge: -1,
    cacheControl: false,
  });
});

app.get("/", (_, res) => {
  res.send(":)");
});

app.get("/api/get_user", (req, res) => {
  const username = req.cookies.username;
  res.json({
    username: username,
  });
});

app.get("/api/login_user", (req, res) => {
  const username = req.query.username;
  res.cookie("username", username, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
  res.sendStatus(200);
});

app.get("/api/logout_user", (_, res) => {
  res.clearCookie("username");
  res.sendStatus(200);
});

app.get("/api/info", async (_, res) => {
  const response = await fetch("https://api.spacexdata.com/v3/info");
  const json = await response.json();
  res.json(json);
});

app.get("/api/history", async (req, res) => {
  const id = req.query.id || "";
  const response = await fetch(`https://api.spacexdata.com/v3/history/${id}`);
  const json = await response.json();
  res.json(json);
});

app.get("/api/rockets", async (req, res) => {
  const id = req.query.id || "";
  const response = await fetch(`https://api.spacexdata.com/v3/rockets/${id}`);
  const json = await response.json();
  res.json(json);
});

app.get("/api/roadster", async (_, res) => {
  const response = await fetch("https://api.spacexdata.com/v3/roadster");
  const json = await response.json();
  res.json(json);
});

const items = {};

app.get("/api/get_sent_to_mars", (_, res) => {
  res.json(Object.values(items));
});

app.post("/api/send_to_mars", (req, res) => {
  const item = req.body;
  item.id = Math.random();
  items[item.id] = item;
  res.json(Object.values(items));
});

app.delete("/api/cancel_sending_to_mars", (req, res) => {
  const item = req.body;
  delete items[item.id];
  res.json(Object.values(items));
});

app.get("/*", (_, res) => {
  res.sendFile(path.join(rootDir, "/spa/build/index.html"));
});

httpsServer.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
