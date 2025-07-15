import { NextRequest, NextResponse } from 'next/server';
import { API_BASE } from '../../../lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest, context: any) {
  const { agentName } = await context.params;
  const res = await fetch(`${API_BASE}/agent_config/${agentName}`);
  const data = await res.json();
  return NextResponse.json(data);
} 