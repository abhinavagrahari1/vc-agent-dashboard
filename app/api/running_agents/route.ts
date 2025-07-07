import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'http://15.206.88.67:8000';

export async function GET(req: NextRequest) {
  const res = await fetch(`${API_BASE}/running_agents`);
  const data = await res.json();
  return NextResponse.json(data);
} 