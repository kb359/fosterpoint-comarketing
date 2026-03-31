"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function handleSeed() {
    const res = await fetch("/api/seed", { method: "POST" });
    const data = await res.json();
    setMessage(data.message || data.error);
  }

  async function handleAddUser() {
    if (!email || !password) return;
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    setMessage(data.message || data.error || "User created");
    setEmail("");
    setPassword("");
    setName("");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Initial Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Create the initial admin user from environment variables
            (ADMIN_EMAIL and ADMIN_PASSWORD).
          </p>
          <Button onClick={handleSeed} variant="outline">
            Seed Admin User
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@oneleet.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>
          <Button onClick={handleAddUser}>Add User</Button>
        </CardContent>
      </Card>

      {message && (
        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
          {message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            API keys are configured via environment variables. Set these in your
            .env file or Vercel dashboard:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>ANTHROPIC_API_KEY</li>
            <li>CALCOM_WEBHOOK_SECRET</li>
            <li>FIREFLIES_API_KEY</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
