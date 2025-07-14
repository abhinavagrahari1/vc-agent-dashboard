import { NextResponse } from 'next/server';
import { API_BASE } from '../../lib/api';

export async function GET() {
  const res = await fetch(`${API_BASE}/agents`);
  const data = await res.json();
  return NextResponse.json(data);
} 