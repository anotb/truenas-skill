#!/usr/bin/env node
/**
 * List Dockge stacks and their status.
 * Usage: node dockge-list.mjs
 *
 * Requires: DOCKGE_URL, DOCKGE_USER, DOCKGE_PASS
 */

import { io } from "socket.io-client";

const DOCKGE_URL = process.env.DOCKGE_URL;
const DOCKGE_USER = process.env.DOCKGE_USER;
const DOCKGE_PASS = process.env.DOCKGE_PASS;

if (!DOCKGE_URL) {
  console.error("Error: DOCKGE_URL env var required (e.g., http://10.0.0.5:5001)");
  process.exit(1);
}

if (!DOCKGE_USER) {
  console.error("Error: DOCKGE_USER env var required");
  process.exit(1);
}

if (!DOCKGE_PASS) {
  console.error("Error: DOCKGE_PASS env var required");
  process.exit(1);
}

const socket = io(DOCKGE_URL, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("Connected to Dockge");
  socket.emit("login", { username: DOCKGE_USER, password: DOCKGE_PASS, token: "" }, (r) => {
    if (!r.ok) {
      console.log("Login failed:", r.msg);
      process.exit(1);
    }
    console.log("Logged in! Fetching stacks...");
    socket.emit("stackList");
  });
});

socket.on("agent", (eventType, data) => {
  if (eventType === "stackList" && data.ok) {
    console.log("\nStacks:");
    Object.entries(data.stackList).forEach(([name, v]) => {
      console.log(`- ${name}: Status ${v.status} ${v.status === 3 ? "(Running)" : "(Stopped)"}`);
    });
    socket.disconnect();
    process.exit(0);
  }
});

setTimeout(() => {
  console.log("\nTimeout");
  socket.disconnect();
  process.exit(1);
}, 10000);
