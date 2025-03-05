import { Hono } from "hono";
import {
  createFolder,
  deleteFile,
  deleteFolder,
  getFolders,
  listFiles,
  updateFile,
  uploadFile,
} from "./files.controllers";
import { Bindings } from "../types/bindings";

const app = new Hono<{
  Bindings: Bindings;
}>();

// list files
app.post("/list", ...listFiles);

// upload file
app.post("/upload", ...uploadFile);

// update file
app.patch("/update", ...updateFile);

// delete file
app.delete("/delete", ...deleteFile);

// list folder
app.get("/list/folders", ...getFolders);

// create folder
app.post("/create/folder", ...createFolder);

// delete folder
app.delete("/delete/folder", ...deleteFolder);

export default app;
