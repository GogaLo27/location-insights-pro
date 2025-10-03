// src/config/demo.ts
export const DEMO_EMAIL = "demolip29@gmail.com";

// Fake user object used only in demo mode
export const DEMO_USER = {
  id: "demo-user",
  email: DEMO_EMAIL,
  name: "Demo User",
  avatar_url: "https://avatars.githubusercontent.com/u/0?v=4",
};

// A single localStorage key to toggle demo
export const DEMO_STORAGE_KEY = "lip_demo_mode";

export function isDemoEnabled(): boolean {
  return localStorage.getItem(DEMO_STORAGE_KEY) === "1";
}

export function enableDemo(): void {
  localStorage.setItem(DEMO_STORAGE_KEY, "1");
}

export function disableDemo(): void {
  localStorage.removeItem(DEMO_STORAGE_KEY);
}
