import { NextResponse } from 'next/server';

const API_BASE = 'http://13.233.50.22:8000';
// const API_BASE = 'http://127.0.0.1:8000';

export async function GET() {
  const res = await fetch(`${API_BASE}/agents`);
  const data = await res.json();
  return NextResponse.json(data);
} 