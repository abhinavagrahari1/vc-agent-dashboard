import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '../../../lib/api';

export async function GET(req: NextRequest, { params }: { params: { agentName: string } }) {
  const { agentName } = params;
  const res = await fetch(`${API_BASE}/agent_config/${agentName}`);
  const data = await res.json();
  return NextResponse.json(data);
} 