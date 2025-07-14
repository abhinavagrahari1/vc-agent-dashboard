import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '../../lib/api';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_BASE}/start_web_session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
} 