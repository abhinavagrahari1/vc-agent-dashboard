import { NextRequest, NextResponse } from 'next/server';

// const API_BASE = 'http://13.233.50.22:8000';
const API_BASE = 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_BASE}/dispatch_call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
} 