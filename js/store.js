const STATUSES = ["Received", "In review", "Quoted", "Printing", "Ready"];

const SEED = [
  {
    id: "jn-1048",
    kind: "jug",
    title: "Small jug",
    customer: "M. Adams",
    material: "Grey resin",
    color: "#c8c2b8",
    qty: 1,
    status: "In review",
    price: null,
    paid: false,
    notes: "Scan of the jug. Turn it and check the handle before a repair is printed.",
    fileName: "",
    created: 3000,
  },
  {
    id: "jn-1052",
    kind: "clip",
    title: "Shelf clip",
    customer: "R. Nkosi",
    material: "PLA",
    color: "#e25b12",
    qty: 4,
    status: "Quoted",
    price: 280,
    paid: false,
    notes: "Four clips. Customer file, orange PLA.",
    fileName: "",
    created: 2000,
  },
  {
    id: "jn-1039",
    kind: "cap",
    title: "End cap",
    customer: "Workshop",
    material: "PETG",
    color: "#5e5a55",
    qty: 12,
    status: "Printing",
    price: 640,
    paid: true,
    notes: "Shop job. Twelve caps already on the machine.",
    fileName: "",
    created: 1000,
  },
];

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("3d-works", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("jobs")) db.createObjectStore("jobs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function seed(db) {
  const existing = await new Promise((resolve, reject) => {
    const req = db.transaction("jobs").objectStore("jobs").count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (existing) return;
  const tx = db.transaction("jobs", "readwrite");
  const store = tx.objectStore("jobs");
  SEED.forEach((job) => store.put(job));
  await done(tx);
}

let dbPromise;
function db() {
  if (!dbPromise) {
    dbPromise = openDb().then(async (database) => {
      await seed(database);
      return database;
    });
  }
  return dbPromise;
}

export function statuses() {
  return STATUSES;
}

export function jobNo(id) {
  return String(id || "").toUpperCase();
}

export function money(value) {
  if (value == null || value === "") return "Pending";
  return "$" + Number(value).toLocaleString("en-US");
}

export async function listJobs() {
  const database = await db();
  const jobs = await new Promise((resolve, reject) => {
    const req = database.transaction("jobs").objectStore("jobs").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return jobs.sort((a, b) => b.created - a.created);
}

export async function getJob(id) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const req = database.transaction("jobs").objectStore("jobs").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveJob(job) {
  const database = await db();
  const tx = database.transaction("jobs", "readwrite");
  tx.objectStore("jobs").put(job);
  await done(tx);
  return job;
}

export async function createJob(fields, file) {
  const jobs = await listJobs();
  const nums = jobs.map((job) => parseInt(String(job.id).replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
  const id = "jn-" + (Math.max(1052, ...nums) + 1);
  const job = {
    id,
    kind: "file",
    title: fields.title,
    customer: fields.customer,
    material: fields.material,
    color: fields.color,
    qty: fields.qty,
    status: "Received",
    price: null,
    paid: false,
    notes: fields.notes,
    fileName: file.name,
    created: Date.now(),
  };
  const database = await db();
  const tx = database.transaction(["jobs", "files"], "readwrite");
  tx.objectStore("jobs").put(job);
  tx.objectStore("files").put(file.buffer, id);
  await done(tx);
  return job;
}

export async function getFile(id) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const req = database.transaction("files").objectStore("files").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
